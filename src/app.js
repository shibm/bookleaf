import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import {
  User,
  Book,
  Ticket,
  Message,
  verifyPassword,
  hashPassword,
} from './db.js';
import { CATEGORIES, PRIORITIES, STATUSES } from './constants.js';
import { fallback, generateSuggestion } from './services/ai.js';
const failure = (status, message) =>
  Object.assign(new Error(message), { status });
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
});
const text = (value, field, min = 1, max = 10000) => {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw failure(422, `${field} must contain ${min}–${max} characters.`);
  return value.trim();
};
const dummyHash = hashPassword('dummy-account-password');
export function createApp({
  suggestion = generateSuggestion,
  sessionStore,
} = {}) {
  const app = express(),
    production = process.env.NODE_ENV === 'production';
  if (
    production &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
  )
    throw new Error(
      'Production requires SESSION_SECRET with at least 32 characters',
    );
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));
  app.use(
    session({
      name: 'bookleaf.sid',
      secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
      store:
        sessionStore ||
        MongoStore.create({
          client: mongoose.connection.getClient(),
          collectionName: 'sessions',
        }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: production,
        maxAge: 8 * 3600000,
      },
    }),
  );
  app.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.session.userId)
      req.user = await User.findById(req.session.userId).lean();
    if (!req.session.csrf) req.session.csrf = randomBytes(24).toString('hex');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers['x-csrf-token'] !== req.session.csrf
    )
      throw failure(403, 'Invalid CSRF token. Reload and try again.');
    next();
  });
  const auth = (req, _res, next) =>
    req.user ? next() : next(failure(401, 'Please log in.'));
  const admin = (req, _res, next) =>
    req.user.role === 'admin'
      ? next()
      : next(failure(403, 'Admin access required.'));
  async function getTicket(id, user) {
    if (!mongoose.isValidObjectId(id)) throw failure(404, 'Ticket not found.');
    const t = await Ticket.findById(id).lean();
    if (!t || (user.role === 'author' && t.author_id !== user._id))
      throw failure(404, 'Ticket not found.');
    const [author, book, assignee] = await Promise.all([
      User.findById(t.author_id).lean(),
      t.book_id ? Book.findById(t.book_id).lean() : null,
      t.assigned_to ? User.findById(t.assigned_to).lean() : null,
    ]);
    t.id = String(t._id);
    delete t._id;
    t.author_name = author.name;
    t.author_email = author.email;
    t.book = book?.details || null;
    t.assignee_name = assignee?.name || null;
    if (user.role !== 'admin') {
      delete t.draft;
      delete t.ai_reason;
      delete t.assigned_to;
      delete t.assignee_name;
      delete t.ai_state;
    }
    return t;
  }
  const jobs = new Map();
  function enqueue(id) {
    id = String(id);
    if (jobs.has(id)) return jobs.get(id);
    const job = (async () => {
      const t = await Ticket.findById(id).lean();
      const [book, author] = await Promise.all([
        t.book_id ? Book.findById(t.book_id).lean() : null,
        User.findById(t.author_id).lean(),
      ]);
      let result;
      try {
        result = await suggestion(t, book?.details || null, author.name);
      } catch {
        result = fallback(t, book?.details || null, author.name);
      }
      // Compare-and-set avoids replacing a human override while a provider call is in flight.
      const changed = await Ticket.updateOne(
        { _id: id, version: t.version },
        {
          $set: {
            draft: result.draft,
            ai_state: result.state,
            ai_reason: result.reason,
            category: result.category,
            priority: result.priority,
            updated_at: new Date(),
          },
          $inc: { version: 1 },
        },
      );
      if (!changed.modifiedCount)
        await Ticket.updateOne(
          { _id: id },
          {
            $set: {
              draft: result.draft,
              ai_state: result.state,
              ai_reason: result.reason,
              updated_at: new Date(),
            },
            $inc: { version: 1 },
          },
        );
    })()
      .catch(async (error) => {
        console.error('AI job failed:', error.message);
        await Ticket.updateOne(
          { _id: id },
          {
            $set: {
              ai_state: 'fallback',
              ai_reason:
                'Suggestion unavailable. Please compose a reply manually.',
            },
          },
        ).catch(() => {});
      })
      .finally(() => jobs.delete(id));
    jobs.set(id, job);
    return job;
  }
  app.locals.waitForAI = () => Promise.all([...jobs.values()]);
  app.locals.recoverAI = async () => {
    for (const t of await Ticket.find({ ai_state: 'pending' })
      .select('_id')
      .lean())
      enqueue(t._id);
  };
  app.get('/health', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({
        status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable',
      }),
  );
  app.get('/api/auth/csrf', (req, res) =>
    res.json({ data: { csrfToken: req.session.csrf } }),
  );
  app.post(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { message: 'Too many login attempts. Try later.' } },
    }),
    async (req, res, next) => {
      const email = text(req.body.email, 'Email', 3, 254).toLowerCase(),
        password = text(req.body.password, 'Password', 1, 200);
      const user = await User.findOne({ email })
        .select('+password_hash')
        .lean();
      const valid = verifyPassword(password, user?.password_hash || dummyHash);
      if (!user || !valid) throw failure(401, 'Incorrect email or password.');
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.userId = user._id;
        req.session.csrf = randomBytes(24).toString('hex');
        req.session.save((error) =>
          error
            ? next(error)
            : res.json({
                data: { user: publicUser(user), csrfToken: req.session.csrf },
              }),
        );
      });
    },
  );
  app.post('/api/auth/logout', auth, (req, res, next) =>
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie('bookleaf.sid');
      res.status(204).end();
    }),
  );
  app.get('/api/auth/me', auth, (req, res) =>
    res.json({ data: publicUser(req.user) }),
  );
  app.get('/api/meta', auth, (_req, res) =>
    res.json({
      data: {
        categories: CATEGORIES,
        priorities: PRIORITIES,
        statuses: STATUSES,
      },
    }),
  );
  app.get('/api/books', auth, async (req, res) => {
    const rows = await Book.find(
      req.user.role === 'admin' ? {} : { author_id: req.user._id },
    ).lean();
    res.json({
      data: rows.map((r) => ({ ...r.details, author_id: r.author_id })),
    });
  });
  app.get('/api/dashboard', auth, async (req, res) => {
    const filter =
      req.user.role === 'author' ? { author_id: req.user._id } : {};
    const [total, unresolved, urgent, resolved, books] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.countDocuments({
        ...filter,
        status: { $in: ['Open', 'In Progress'] },
      }),
      Ticket.countDocuments({
        ...filter,
        status: { $in: ['Open', 'In Progress'] },
        priority: { $in: ['High', 'Critical'] },
      }),
      Ticket.countDocuments({
        ...filter,
        status: { $in: ['Resolved', 'Closed'] },
      }),
      Book.find(
        req.user.role === 'author' ? { author_id: req.user._id } : {},
      ).lean(),
    ]);
    res.json({
      data: {
        total,
        unresolved,
        urgent,
        resolved,
        earned: books.reduce((n, b) => n + b.details.total_royalty_earned, 0),
        pending: books.reduce((n, b) => n + b.details.royalty_pending, 0),
      },
    });
  });
  app.get('/api/tickets', auth, async (req, res) => {
    const filter =
      req.user.role === 'author' ? { author_id: req.user._id } : {};
    for (const [key, allowed] of Object.entries({
      status: STATUSES,
      category: CATEGORIES,
      priority: PRIORITIES,
    }))
      if (req.query[key]) {
        if (!allowed.includes(req.query[key]))
          throw failure(422, `Invalid ${key} filter.`);
        filter[key] = req.query[key];
      }
    for (const key of ['from', 'to'])
      if (req.query[key]) {
        const v = req.query[key];
        if (
          typeof v !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          Number.isNaN(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v
        )
          throw failure(422, `Invalid ${key} date.`);
        filter.created_at ??= {};
        filter.created_at[key === 'from' ? '$gte' : '$lt'] = new Date(
          Date.parse(v) + (key === 'to' ? 86400000 : 0),
        );
      }
    if (req.query.from && req.query.to && req.query.from > req.query.to)
      throw failure(422, 'Start date must precede end date.');
    const page = Number(req.query.page || 1),
      limit = 20;
    if (!Number.isInteger(page) || page < 1)
      throw failure(422, 'Page must be a positive integer.');
    const rows = await Ticket.aggregate([
      { $match: filter },
      {
        $addFields: {
          closed: {
            $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0],
          },
          rank: { $indexOfArray: [PRIORITIES, '$priority'] },
        },
      },
      { $sort: { closed: 1, rank: 1, created_at: 1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
    res.json({
      data: await Promise.all(rows.map((r) => getTicket(r._id, req.user))),
      meta: { page, limit, total: await Ticket.countDocuments(filter) },
    });
  });
  app.post('/api/tickets', auth, async (req, res) => {
    if (req.user.role !== 'author')
      throw failure(403, 'Only authors can submit tickets.');
    const subject = text(req.body.subject, 'Subject', 3, 160),
      description = text(req.body.description, 'Description', 10, 8000),
      bookId = req.body.book_id || null;
    if (
      bookId &&
      (typeof bookId !== 'string' ||
        !(await Book.exists({ _id: bookId, author_id: req.user._id })))
    )
      throw failure(422, 'Choose one of your own books.');
    const initial = fallback({ subject, description }, null, req.user.name);
    const ticket = await Ticket.create({
      author_id: req.user._id,
      book_id: bookId,
      subject,
      description,
      category: initial.category,
      priority: initial.priority,
    });
    enqueue(ticket._id);
    res.status(201).json({ data: await getTicket(ticket._id, req.user) });
  });
  app.get('/api/tickets/:id', auth, async (req, res) => {
    const ticket = await getTicket(req.params.id, req.user);
    const messages = await Message.find({
      ticket_id: ticket.id,
      ...(req.user.role === 'admin' ? {} : { internal: false }),
    })
      .populate('user_id', 'name role')
      .sort({ created_at: 1, _id: 1 })
      .lean();
    ticket.messages = messages.map((m) => ({
      id: String(m._id),
      body: m.body,
      internal: m.internal,
      created_at: m.created_at,
      name: m.user_id.name,
      role: m.user_id.role,
    }));
    res.json({ data: ticket });
  });
  app.patch('/api/tickets/:id', auth, admin, async (req, res) => {
    const t = await getTicket(req.params.id, req.user),
      changes = {};
    if (!Number.isInteger(req.body.version))
      throw failure(422, 'Ticket version is required.');
    for (const [key, allowed] of Object.entries({
      status: STATUSES,
      category: CATEGORIES,
      priority: PRIORITIES,
    }))
      if (req.body[key] !== undefined) {
        if (!allowed.includes(req.body[key]))
          throw failure(422, `Invalid ${key}.`);
        changes[key] = req.body[key];
      }
    if (req.body.assigned_to !== undefined) {
      if (
        req.body.assigned_to !== null &&
        req.body.assigned_to !== req.user._id
      )
        throw failure(422, 'Assign to yourself or unassign.');
      changes.assigned_to = req.body.assigned_to;
    }
    if (!Object.keys(changes).length)
      throw failure(422, 'No supported changes supplied.');
    const result = await Ticket.updateOne(
      { _id: t.id, version: req.body.version },
      { $set: { ...changes, updated_at: new Date() }, $inc: { version: 1 } },
    );
    if (!result.modifiedCount)
      throw failure(409, 'Ticket changed. Reload before saving.');
    res.json({ data: await getTicket(t.id, req.user) });
  });
  app.post('/api/tickets/:id/messages', auth, async (req, res) => {
    const t = await getTicket(req.params.id, req.user),
      body = text(req.body.body, 'Message', 1, 10000);
    if (
      req.body.internal !== undefined &&
      typeof req.body.internal !== 'boolean'
    )
      throw failure(422, 'Internal must be boolean.');
    if (req.body.internal && req.user.role !== 'admin')
      throw failure(403, 'Authors cannot add internal notes.');
    if (t.status === 'Closed' && req.user.role === 'author')
      throw failure(422, 'This ticket is closed. Please submit a new query.');
    await Message.create({
      ticket_id: t.id,
      user_id: req.user._id,
      body,
      internal: req.body.internal || false,
    });
    const changes = { updated_at: new Date() };
    if (t.status === 'Resolved' && req.user.role === 'author')
      changes.status = 'Open';
    await Ticket.updateOne(
      { _id: t.id },
      { $set: changes, $inc: { version: 1 } },
    );
    res.status(201).json({ data: { message: 'Message saved.' } });
  });
  app.post(
    '/api/tickets/:id/draft',
    auth,
    admin,
    rateLimit({
      windowMs: 60000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { message: 'Draft limit reached. Try again shortly.' },
      },
    }),
    async (req, res) => {
      const t = await getTicket(req.params.id, req.user);
      if (!jobs.has(t.id)) {
        await Ticket.updateOne(
          { _id: t.id },
          { $set: { ai_state: 'pending' }, $inc: { version: 1 } },
        );
        enqueue(t.id);
      }
      res.status(202).json({ data: { message: 'Draft generation queued.' } });
    },
  );
  app.use('/api', (_req, _res, next) =>
    next(failure(404, 'Endpoint not found.')),
  );
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
  app.use((error, _req, res, _next) => {
    const status =
      error.status || (error.name === 'ValidationError' ? 422 : 500);
    if (status === 500) console.error('Request failed:', error.message);
    res
      .status(status)
      .json({
        error: {
          message:
            status === 500
              ? 'An unexpected error occurred. Please try again.'
              : error.message,
        },
      });
  });
  return app;
}
