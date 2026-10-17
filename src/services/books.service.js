import { Book } from '../models/index.js';
export async function listBooks(user) {
  const rows = await Book.find(
    user.role === 'admin' ? {} : { author_id: user._id },
  ).lean();
  return rows.map((r) => ({ ...r.details, author_id: r.author_id }));
}
