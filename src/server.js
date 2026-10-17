import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, seed } from './db.js';
import { createApp } from './app.js';
try {
  await connectDatabase();
  if (process.env.SEED_DEMO === 'true') await seed();
  const app = createApp();
  await app.locals.recoverAI();
  const server = app.listen(Number(process.env.PORT) || 3000, () =>
    console.log(
      `BookLeaf running at http://localhost:${server.address().port}`,
    ),
  );
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
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
}
