import mongoose from 'mongoose';
import { User, Book, Ticket, Message } from '../models/index.js';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants.js';
import { fallback } from './ai.js';
import { failure } from '../utils/http-error.js';
import { text } from '../utils/validation.js';
export async function getTicket(id, user) {
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
    delete t.ai_error;
    delete t.assigned_to;
    delete t.assignee_name;
    delete t.ai_state;
  }
  return t;
}
export async function listTickets(query, user) {
  const filter = user.role === 'author' ? { author_id: user._id } : {};
  for (const [key, allowed] of Object.entries({
    status: STATUSES,
    category: CATEGORIES,
    priority: PRIORITIES,
  }))
    if (query[key]) {
      if (!allowed.includes(query[key]))
        throw failure(422, `Invalid ${key} filter.`);
      filter[key] = query[key];
    }
  for (const key of ['from', 'to'])
    if (query[key]) {
      const v = query[key];
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
  if (query.from && query.to && query.from > query.to)
    throw failure(422, 'Start date must precede end date.');
  const page = Number(query.page || 1),
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
  return {
    data: await Promise.all(rows.map((r) => getTicket(r._id, user))),
    meta: { page, limit, total: await Ticket.countDocuments(filter) },
  };
}
export async function createTicket(input, user, jobs) {
  if (user.role !== 'author')
    throw failure(403, 'Only authors can submit tickets.');
  const subject = text(input.subject, 'Subject', 3, 160),
    description = text(input.description, 'Description', 10, 8000),
    bookId = input.book_id || null;
  if (
    bookId &&
    (typeof bookId !== 'string' ||
      !(await Book.exists({ _id: bookId, author_id: user._id })))
  )
    throw failure(422, 'Choose one of your own books.');
  const initial = fallback({ subject, description }, null, user.name);
  const ticket = await Ticket.create({
    author_id: user._id,
    book_id: bookId,
    subject,
    description,
    category: initial.category,
    priority: initial.priority,
  });
  jobs.enqueue(ticket._id);
  return getTicket(ticket._id, user);
}
export async function getConversation(id, user) {
  const ticket = await getTicket(id, user);
  const messages = await Message.find({
    ticket_id: ticket.id,
    ...(user.role === 'admin' ? {} : { internal: false }),
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
  return ticket;
}
export async function updateTicket(id, input, user) {
  const t = await getTicket(id, user),
    changes = {};
  if (!Number.isInteger(input.version))
    throw failure(422, 'Ticket version is required.');
  for (const [key, allowed] of Object.entries({
    status: STATUSES,
    category: CATEGORIES,
    priority: PRIORITIES,
  }))
    if (input[key] !== undefined) {
      if (!allowed.includes(input[key])) throw failure(422, `Invalid ${key}.`);
      changes[key] = input[key];
    }
  if (input.assigned_to !== undefined) {
    if (input.assigned_to !== null && input.assigned_to !== user._id)
      throw failure(422, 'Assign to yourself or unassign.');
    changes.assigned_to = input.assigned_to;
  }
  if (!Object.keys(changes).length)
    throw failure(422, 'No supported changes supplied.');
  const result = await Ticket.updateOne(
    { _id: t.id, version: input.version },
    { $set: { ...changes, updated_at: new Date() }, $inc: { version: 1 } },
  );
  if (!result.modifiedCount)
    throw failure(409, 'Ticket changed. Reload before saving.');
  return getTicket(t.id, user);
}
export async function addMessage(id, input, user) {
  const t = await getTicket(id, user),
    body = text(input.body, 'Message', 1, 10000);
  if (input.internal !== undefined && typeof input.internal !== 'boolean')
    throw failure(422, 'Internal must be boolean.');
  if (input.internal && user.role !== 'admin')
    throw failure(403, 'Authors cannot add internal notes.');
  if (t.status === 'Closed' && user.role === 'author')
    throw failure(422, 'This ticket is closed. Please submit a new query.');
  await Message.create({
    ticket_id: t.id,
    user_id: user._id,
    body,
    internal: input.internal || false,
  });
  const changes = { updated_at: new Date() };
  if (t.status === 'Resolved' && user.role === 'author')
    changes.status = 'Open';
  await Ticket.updateOne(
    { _id: t.id },
    { $set: changes, $inc: { version: 1 } },
  );
}
export async function queueDraft(id, user, jobs) {
  const t = await getTicket(id, user);
  if (!jobs.has(t.id)) {
    await Ticket.updateOne(
      { _id: t.id },
      {
        $set: { ai_state: 'pending', ai_error: null, ai_reason: null },
        $inc: { version: 1 },
      },
    );
    jobs.enqueue(t.id);
  }
}
