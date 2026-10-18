import type { InferSchemaType } from 'mongoose';
import type { userSchema } from './models/user.model.ts';
import type { bookSchema } from './models/book.model.ts';
import type { generateSuggestion } from './services/ai.ts';
import type { createTicketJobs } from './services/ticket-jobs.ts';
import type { CATEGORIES, PRIORITIES, STATUSES } from './constants.ts';

export type UserRecord = InferSchemaType<typeof userSchema>;
export type BookDetails = {
  book_id: string;
  title: string;
  isbn: string | null;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
};
export type BookRecord = InferSchemaType<typeof bookSchema>;
export type BookSummary = BookDetails & { author_id: string };
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRecord['role'];
};
export interface DashboardSummary {
  total: number;
  unresolved: number;
  urgent: number;
  resolved: number;
  earned: number;
  pending: number;
}
export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];
export interface TicketInput {
  subject: string;
  description: string;
}
export interface Suggestion {
  category: Category;
  priority: Priority;
  draft: string;
  reason: string;
}
export interface AiDiagnostic {
  code: string;
  status: number | null;
  provider: 'gemini';
  message: string;
}
export interface SuggestionResult extends Suggestion {
  state: 'ready' | 'fallback';
  provider?: 'gemini';
  model?: string | null;
  error?: AiDiagnostic | null;
}
export interface AiOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, 'warn'>;
}
export type TicketJobs = ReturnType<typeof createTicketJobs>;
export type SuggestionGenerator = typeof generateSuggestion;

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord | null;
    }
  }
}
declare module 'express-session' {
  interface SessionData {
    userId: string;
    csrf: string;
  }
}
