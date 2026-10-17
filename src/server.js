import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import { seed } from './database/seed.js';
import { createApp } from './app.js';
import { listen } from './listen.js';

let app;
let server;
let cleanupPromise;

function cleanup() {
  cleanupPromise ??= (async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await app?.locals.waitForAI();
    await mongoose.disconnect();
  })();
  return cleanupPromise;
}

async function shutdown() {
  try {
    await cleanup();
    process.exit(0);
  } catch {
    console.error('Backend shutdown failed.');
    process.exit(1);
  }
}

try {
  await connectDatabase();
  if (process.env.SEED_DEMO === 'true') await seed();
  app = createApp();
  server = await listen(app, Number(process.env.PORT) || 3000);
  // A duplicate process must not start background work before acquiring its port.
  await app.locals.recoverAI();
  console.log(`BookLeaf running at http://localhost:${server.address().port}`);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${process.env.PORT || 3000} is already in use. Stop the existing backend before starting another, or set a different PORT in .env.`
      : error.message,
  );
  try {
    await cleanup();
  } catch {
    console.error('Backend startup cleanup failed.');
  }
  process.exitCode = 1;
}
