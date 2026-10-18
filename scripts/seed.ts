import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.ts';
import { seed } from '../src/database/seed.ts';
try {
  await connectDatabase();
  await seed();
  console.log(
    'Seeded 10 authors, 18 books and 1 admin; existing records retained.',
  );
} catch (error) {
  console.error(
    `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
