import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../src/config/database.ts';
import { seed } from '../src/database/seed.ts';
import { createApp } from '../src/app.ts';
import { fallback, generateSuggestion } from '../src/services/ai.ts';
process.env.NODE_ENV = 'test';
const mongo = await MongoMemoryServer.create();
await connectDatabase(mongo.getUri('bookleaf_browser_test'));
await seed();
const app = createApp({
  suggestion: async (ticket, book, name) =>
    ['AI billing diagnostics', 'Gemini quota diagnostics'].includes(
      ticket.subject,
    )
      ? generateSuggestion(ticket, book, name, {
          apiKey: 'browser-test-key',
          fetchImpl: async () =>
            Response.json(
              {
                error: {
                  status: 'RESOURCE_EXHAUSTED',
                  message: 'Do not expose provider message',
                },
              },
              {
                status: ticket.subject === 'AI billing diagnostics' ? 402 : 429,
              },
            ),
        })
      : fallback(ticket, book, name),
});
const server = app.listen(3101, '127.0.0.1', () =>
  console.log('Browser test server: http://127.0.0.1:3101'),
);
async function shutdown() {
  server.close(async () => {
    await app.locals.waitForAI();
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
