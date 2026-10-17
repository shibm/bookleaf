import { listBooks as load } from '../services/books.service.js';
export async function listBooks(req, res) {
  res.json({ data: await load(req.user) });
}
