import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../src/config/database.js';
import { seed } from '../src/database/seed.js';
import { createApp } from '../src/app.js';
import { fallback, generateSuggestion } from '../src/services/ai.js';
process.env.NODE_ENV = 'test';
const mongo = await MongoMemoryServer.create();
await connectDatabase(mongo.getUri('bookleaf_browser_test'));
await seed();
const app = createApp({
  suggestion: async (...args) =>
    args[0].subject === 'AI billing diagnostics'
      ? generateSuggestion(...args, {
          apiKey: 'browser-test-key',
          fetchImpl: async () => ({
            ok: false,
            status: 429,
            json: async () => ({
              error: {
                code: 'credit_balance_exhausted',
                message: 'Do not expose provider message',
              },
            }),
          }),
        })
      : fallback(...args),
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
