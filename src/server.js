import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import { seed } from './database/seed.js';
import { createApp } from './app.js';
import { listen } from './listen.js';
try {
  await connectDatabase();
  if (process.env.SEED_DEMO === 'true') await seed();
  const app = createApp();
  await app.locals.recoverAI();
  const server = await listen(app, Number(process.env.PORT) || 3000);
  console.log(`BookLeaf running at http://localhost:${server.address().port}`);
  function shutdown() {
    server.close(async () => {
      await app.locals.waitForAI();
      await mongoose.disconnect();
      process.exit(0);
    });
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${process.env.PORT || 3000} is already in use. Stop the existing backend before starting another, or set a different PORT in .env.`
      : error.message,
  );
  await mongoose.disconnect();
  process.exit(1);
}
