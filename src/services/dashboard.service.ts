import type { FilterQuery, InferSchemaType } from 'mongoose';
import type { BookRecord, DashboardSummary, UserRecord } from '../types.ts';
import { Book, Ticket } from '../models/index.ts';

export async function getDashboard(
  user: UserRecord,
): Promise<DashboardSummary> {
  const filter: FilterQuery<InferSchemaType<typeof Ticket.schema>> =
    user.role === 'author' ? { author_id: user._id } : {};
  const [total, unresolved, urgent, resolved, books]: [
    number,
    number,
    number,
    number,
    BookRecord[],
  ] = await Promise.all([
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
    earned: books.reduce(
      (sum: number, book: BookRecord): number =>
        sum + book.details.total_royalty_earned,
      0,
    ),
    pending: books.reduce(
      (sum: number, book: BookRecord): number =>
        sum + book.details.royalty_pending,
      0,
    ),
  };
}
