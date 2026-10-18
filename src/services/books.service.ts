import type { FilterQuery } from 'mongoose';
import type { BookRecord, BookSummary, UserRecord } from '../types.ts';
import { Book } from '../models/index.ts';

export async function listBooks(user: UserRecord): Promise<BookSummary[]> {
  const filter: FilterQuery<BookRecord> =
    user.role === 'admin' ? {} : { author_id: user._id };
  const rows: BookRecord[] = await Book.find(filter).lean();
  const books: BookSummary[] = rows.map((row: BookRecord): BookSummary => ({
    ...row.details,
    author_id: row.author_id,
  }));
  return books;
}
