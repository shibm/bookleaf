import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { seed } from '../src/database/seed.js';
try {
  await connectDatabase();
  await seed();
  console.log(
    'Seeded 10 authors, 18 books and 1 admin; existing records retained.',
  );
} catch (error) {
  console.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
