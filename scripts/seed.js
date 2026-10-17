import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, seed } from '../src/db.js';
try {
  await connectDatabase();
  await seed();
  console.log(
    'Seeded 10 authors, 18 books and 1 admin; existing records retained.',
  );
} finally {
  await mongoose.disconnect();
}
