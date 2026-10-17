import { readFileSync } from 'node:fs';
import { User, Book } from '../models/index.js';
import { hashPassword } from '../utils/password.js';

export async function seed() {
  const data = JSON.parse(
    readFileSync(
      new URL('../../data/sample-data.json', import.meta.url),
      'utf8',
    ),
  );
  const authorHash = hashPassword(
    process.env.DEMO_AUTHOR_PASSWORD || 'AuthorDemo!2026',
  );
  for (const { books, ...author } of data.authors) {
    await User.updateOne(
      { _id: author.author_id },
      {
        $setOnInsert: {
          email: author.email,
          name: author.name,
          role: 'author',
          password_hash: authorHash,
          profile: author,
        },
      },
      { upsert: true },
    );
    for (const book of books)
      await Book.updateOne(
        { _id: book.book_id },
        { $setOnInsert: { author_id: author.author_id, details: book } },
        { upsert: true },
      );
  }
  await User.updateOne(
    { _id: 'ADMIN001' },
    {
      $setOnInsert: {
        email: 'admin@bookleaf.com',
        name: 'BookLeaf Operations',
        role: 'admin',
        password_hash: hashPassword(
          process.env.DEMO_ADMIN_PASSWORD || 'AdminDemo!2026',
        ),
        profile: {},
      },
    },
    { upsert: true },
  );
}
