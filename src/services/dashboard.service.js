import { Book, Ticket } from '../models/index.js';
export async function getDashboard(user) {
  const filter = user.role === 'author' ? { author_id: user._id } : {};
  const [total, unresolved, urgent, resolved, books] = await Promise.all([
    Ticket.countDocuments(filter),
    Ticket.countDocuments({
      ...filter,
      status: { $in: ['Open', 'In Progress'] },
    }),
    Ticket.countDocuments({
      ...filter,
      status: { $in: ['Open', 'In Progress'] },
      priority: { $in: ['High', 'Critical'] },
    }),
    Ticket.countDocuments({
      ...filter,
      status: { $in: ['Resolved', 'Closed'] },
    }),
    Book.find(user.role === 'author' ? { author_id: user._id } : {}).lean(),
  ]);
  return {
    total,
    unresolved,
    urgent,
    resolved,
    earned: books.reduce((n, b) => n + b.details.total_royalty_earned, 0),
    pending: books.reduce((n, b) => n + b.details.royalty_pending, 0),
  };
}
