import type { Server } from 'node:http';
import type { SuggestionGenerator } from '../src/types.ts';
import type { Ticket as TicketResponse } from '../client/types.ts';
import type { AddressInfo } from 'node:net';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../src/config/database.ts';
import { seed } from '../src/database/seed.ts';
import { User, Book, Ticket } from '../src/models/index.ts';
import { createApp } from '../src/app.ts';
import { fallback, generateSuggestion } from '../src/services/ai.ts';
let mongo: MongoMemoryServer;
let server: Server;
let base: string;
let app: ReturnType<typeof createApp>;
let author: ReturnType<typeof client>,
  other: ReturnType<typeof client>,
  admin: ReturnType<typeof client>;
let aiSuggestion: SuggestionGenerator = async (ticket, book, name) =>
  fallback(ticket, book, name);
function client() {
  let cookie = '',
    csrf = '';
  return async (
    path: string,
    {
      method = 'GET',
      body,
      token = true,
    }: { method?: string; body?: unknown; token?: boolean } = {},
  ) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        cookie,
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-Token': csrf } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const c = r.headers.getSetCookie();
    if (c.length) cookie = c.map((s) => s.split(';')[0]).join('; ');
    const result = r.status === 204 ? null : await r.json();
    if (result?.data?.csrfToken) csrf = result.data.csrfToken;
    return { status: r.status, ...result };
  };
}
async function login(email: string, password: string) {
  const c = client();
  await c('/api/auth/csrf');
  assert.equal(
    (await c('/api/auth/login', { method: 'POST', body: { email, password } }))
      .status,
    200,
  );
  return c;
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  // Reproduce a shared Atlas URI with no database and incompatible records in test.
  const uri = mongo.getUri().replace(/\/[^/?]*(\?.*)?$/, '/');
  const legacy = await mongoose
    .createConnection(uri, { dbName: 'test' })
    .asPromise();
  await legacy.collection('users').insertMany([{ legacy: 1 }, { legacy: 2 }]);
  await legacy.close();
  await connectDatabase(uri);
  await seed();
  app = createApp({ suggestion: (...args) => aiSuggestion(...args) });
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', () => r(undefined)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  author = await login('priya.sharma@email.com', 'AuthorDemo!2026');
  other = await login('rohit.kapoor@email.com', 'AuthorDemo!2026');
  admin = await login('admin@bookleaf.com', 'AdminDemo!2026');
});
after(async () => {
  if (app) await app.locals.waitForAI();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('an unnamed URI uses bookleaf and preserves the existing test database', async () => {
  assert.equal(mongoose.connection.name, 'bookleaf');
  assert.ok(
    (await mongoose.connection.collection('sessions').countDocuments()) >= 3,
  );
  assert.equal(
    await mongoose.connection
      .getClient()
      .db('test')
      .collection('sessions')
      .countDocuments(),
    0,
  );
  const indexes = await mongoose.connection.collection('sessions').indexes();
  assert.ok(
    indexes.some(
      (index) => index.key.expires === 1 && index.expireAfterSeconds === 0,
    ),
  );
  assert.equal(
    await mongoose.connection
      .getClient()
      .db('test')
      .collection('users')
      .countDocuments(),
    2,
  );
});
test('exact data is seeded idempotently and books are isolated', async () => {
  await seed();
  assert.equal(await User.countDocuments(), 11);
  assert.equal(await Book.countDocuments(), 18);
  const r = await author('/api/books');
  assert.equal(r.data.length, 2);
  assert.equal(r.data[0].book_id, 'BK001');
  assert.equal(r.data[0].royalty_pending, 3570);
  assert.equal((await admin('/api/books')).data.length, 18);
});
test('authentication, CSRF, input validation, and roles are enforced', async () => {
  const guest = client();
  assert.equal((await guest('/api/books')).status, 401);
  await guest('/api/auth/csrf');
  assert.equal(
    (
      await guest('/api/auth/login', {
        method: 'POST',
        body: { email: 'x@email.com', password: 'wrong' },
      })
    ).status,
    401,
  );
  assert.equal(
    (await author('/api/tickets', { method: 'POST', token: false, body: {} }))
      .status,
    403,
  );
  assert.equal(
    (
      await author('/api/tickets', {
        method: 'POST',
        body: { subject: 'Hi', description: 'tiny' },
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await author('/api/tickets', {
        method: 'POST',
        body: {
          book_id: 'BK003',
          subject: 'Wrong book',
          description: 'This is not my book.',
        },
      })
    ).status,
    422,
  );
  assert.equal((await author('/api/tickets?from=2026-02-31')).status, 422);
  assert.equal((await author('/api/tickets?page=-1')).status, 422);
  assert.equal(
    (
      await admin('/api/tickets', {
        method: 'POST',
        body: {
          subject: 'Admin request',
          description: 'This is an admin query',
        },
      })
    ).status,
    403,
  );
});
test('full ticket lifecycle protects private notes and permits manual replies', async () => {
  const created = await author('/api/tickets', {
    method: 'POST',
    body: {
      book_id: 'BK001',
      subject: 'Royalty overdue for 6 months',
      description: 'I have not received my pending royalty. Please check.',
    },
  });
  assert.equal(created.status, 201);
  const id = created.data.id;
  await app.locals.waitForAI();
  assert.equal((await other(`/api/tickets/${id}`)).status, 404);
  assert.equal(
    (
      await author(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: { status: 'Closed', version: 1 },
      })
    ).status,
    403,
  );
  let t = (await admin(`/api/tickets/${id}`)).data;
  assert.equal(t.priority, 'High');
  assert.equal(t.ai_state, 'fallback');
  assert.ok(t.draft);
  let r = await admin(`/api/tickets/${id}`, {
    method: 'PATCH',
    body: {
      version: t.version,
      status: 'In Progress',
      assigned_to: 'ADMIN001',
      category: 'General Inquiry',
      priority: 'Medium',
    },
  });
  assert.equal(r.status, 200);
  assert.equal(
    (
      await admin(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: { version: t.version, status: 'Resolved' },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin(`/api/tickets/${id}/messages`, {
        method: 'POST',
        body: { body: 'PRIVATE team note', internal: true },
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await author(`/api/tickets/${id}/messages`, {
        method: 'POST',
        body: { body: 'My hidden message', internal: true },
      })
    ).status,
    403,
  );
  await admin(`/api/tickets/${id}/messages`, {
    method: 'POST',
    body: {
      body: 'Please confirm your bank account is linked.',
      internal: false,
    },
  });
  let visible = (await author(`/api/tickets/${id}`)).data;
  assert.equal(visible.messages.length, 1);
  assert.ok(!JSON.stringify(visible).includes('PRIVATE'));
  assert.equal(visible.draft, undefined);
  assert.equal(visible.ai_reason, undefined);
  assert.equal(visible.status, 'In Progress');
  assert.equal(
    visible.messages[0].body,
    'Please confirm your bank account is linked.',
  );
  t = (await admin(`/api/tickets/${id}`)).data;
  assert.equal(t.messages.length, 2);
  await admin(`/api/tickets/${id}`, {
    method: 'PATCH',
    body: { version: t.version, status: 'Resolved' },
  });
  await author(`/api/tickets/${id}/messages`, {
    method: 'POST',
    body: { body: 'I still need some help with this.' },
  });
  assert.equal((await admin(`/api/tickets/${id}`)).data.status, 'Open');
  t = (await admin(`/api/tickets/${id}`)).data;
  await admin(`/api/tickets/${id}`, {
    method: 'PATCH',
    body: { version: t.version, status: 'Closed' },
  });
  assert.equal(
    (
      await author(`/api/tickets/${id}/messages`, {
        method: 'POST',
        body: { body: 'This should be rejected.' },
      })
    ).status,
    422,
  );
});
test('queue filters and dashboard counts work', async () => {
  const r = await other('/api/tickets', {
    method: 'POST',
    body: {
      subject: 'Wrong ISBN listing',
      description: 'My ISBN is linked to a different book on Amazon.',
    },
  });
  await app.locals.waitForAI();
  const queue = await admin('/api/tickets?priority=High&status=Open');
  assert.ok(queue.data.some((t: TicketResponse) => t.id === r.data.id));
  assert.ok(
    !(await author('/api/tickets')).data.some(
      (t: TicketResponse) => t.id === r.data.id,
    ),
  );
  const s = await author('/api/dashboard');
  assert.equal(s.data.earned, 19908);
  assert.equal(s.data.pending, 3570);
  assert.equal((await author('/api/tickets/not-an-id')).status, 404);
});
test('AI finishing later preserves a human classification override', async () => {
  const t = await Ticket.create({
    author_id: 'AUTH001',
    subject: 'A pending query',
    description: 'A pending query for testing recovery.',
    category: 'General Inquiry',
    priority: 'Low',
  });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let started!: () => void;
  const ready = new Promise<void>((r) => (started = r));
  const slow = createApp({
    suggestion: async (ticket, book, name) => {
      started();
      await gate;
      return fallback(ticket, book, name);
    },
  });
  await slow.locals.recoverAI();
  await ready;
  await Ticket.updateOne(
    { _id: t._id },
    {
      $set: { category: 'Printing & Quality', priority: 'Critical' },
      $inc: { version: 1 },
    },
  );
  release();
  await slow.locals.waitForAI();
  const updated = await Ticket.findById(t._id).lean();
  assert.ok(updated);
  assert.equal(updated.category, 'Printing & Quality');
  assert.equal(updated.priority, 'Critical');
});

test('Gemini quota failures persist for admins, stay private, and clear on successful regeneration', async () => {
  const previous = aiSuggestion;
  const logs: unknown[][] = [];
  try {
    aiSuggestion = (ticket, book, name) =>
      generateSuggestion(ticket, book, name, {
        apiKey: 'test-key',
        logger: { warn: (...entry: unknown[]) => logs.push(entry) },
        fetchImpl: async () =>
          Response.json(
            {
              error: {
                status: 'RESOURCE_EXHAUSTED',
                message: 'private provider data',
              },
            },
            { status: 429 },
          ),
      });
    const created = await author('/api/tickets', {
      method: 'POST',
      body: {
        subject: 'Royalty payment question',
        description: 'Please explain the royalty payment schedule.',
      },
    });
    const id = created.data.id;
    await app.locals.waitForAI();
    const staff = (await admin(`/api/tickets/${id}`)).data;
    assert.equal(staff.ai_state, 'fallback');
    assert.equal(staff.ai_error.code, 'quota_exceeded');
    assert.match(staff.ai_error.message, /Google AI Studio/);
    assert.ok(staff.draft);
    assert.equal(logs.length, 1);
    const publicTicket = (await author(`/api/tickets/${id}`)).data;
    assert.equal(publicTicket.ai_error, undefined);
    assert.ok(!JSON.stringify(publicTicket).includes('quota_exceeded'));
    aiSuggestion = async (ticket, book, name) => ({
      ...fallback(ticket, book, name),
      state: 'ready',
      error: null,
    });
    assert.equal(
      (await admin(`/api/tickets/${id}/draft`, { method: 'POST' })).status,
      202,
    );
    await app.locals.waitForAI();
    const recovered = (await admin(`/api/tickets/${id}`)).data;
    assert.equal(recovered.ai_state, 'ready');
    assert.equal(recovered.ai_error, null);
  } finally {
    aiSuggestion = previous;
  }
});

test('retired provider diagnostics are replaced and regeneration saves Gemini metadata', async () => {
  const previous = aiSuggestion;
  try {
    const created = await author('/api/tickets', {
      method: 'POST',
      body: {
        subject: 'Historical draft',
        description: 'Please explain my royalty payment schedule.',
      },
    });
    await app.locals.waitForAI();
    const id = created.data.id;
    await Ticket.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          ai_provider: 'retired-provider',
          ai_model: 'retired-model',
          ai_error: {
            provider: 'retired-provider',
            message: 'Obsolete billing error',
            code: 'old_error',
          },
        },
      },
    );
    const staff = (await admin(`/api/tickets/${id}`)).data;
    assert.equal(staff.ai_error.code, 'regeneration_required');
    assert.equal(staff.ai_provider, null);
    assert.equal(staff.ai_model, null);
    assert.ok(!JSON.stringify(staff).includes('Obsolete billing error'));
    const publicTicket = (await author(`/api/tickets/${id}`)).data;
    for (const key of [
      'ai_provider',
      'ai_model',
      'ai_error',
      'draft',
      'ai_reason',
    ])
      assert.equal(publicTicket[key], undefined);
    aiSuggestion = (ticket, book, name) =>
      generateSuggestion(ticket, book, name, {
        apiKey: 'mock-key',
        model: 'gemini-test-model',
        logger: { warn() {} },
        fetchImpl: async () =>
          Response.json({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        category: 'Royalty & Payments',
                        priority: 'Medium',
                        draft: 'We will review your royalty payment schedule.',
                        reason: 'Royalty question.',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });
    assert.equal(
      (await admin(`/api/tickets/${id}/draft`, { method: 'POST' })).status,
      202,
    );
    await app.locals.waitForAI();
    const regenerated = (await admin(`/api/tickets/${id}`)).data;
    assert.equal(regenerated.ai_provider, 'gemini');
    assert.equal(regenerated.ai_model, 'gemini-test-model');
    assert.equal(regenerated.ai_state, 'ready');
    assert.equal(regenerated.ai_error, null);
  } finally {
    aiSuggestion = previous;
  }
});
