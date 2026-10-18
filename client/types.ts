import type { BookDetails, Category, Priority, Status } from '../src/types.ts';
import type {
  getTicket,
  getConversation,
  listTickets,
} from '../src/services/ticket.service.ts';
import type { getDashboard } from '../src/services/dashboard.service.ts';
type Json<T> = T extends Date
  ? string
  : T extends readonly unknown[]
    ? { [K in keyof T]: Json<T[K]> }
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'author' | 'admin';
};
export type Ticket = Json<Awaited<ReturnType<typeof getTicket>>>;
export type Conversation = Json<Awaited<ReturnType<typeof getConversation>>>;
export type TicketList = Json<Awaited<ReturnType<typeof listTickets>>>;
export type DashboardStats = Awaited<ReturnType<typeof getDashboard>>;
export type Meta = {
  categories: Category[];
  priorities: Priority[];
  statuses: Status[];
};
export type Data<T> = { data: T };
export type Book = BookDetails & { author_id: string };
export type Navigate = (path: string) => void;
export type Notify = (message: string) => void;
export interface PageProps {
  navigate: Navigate;
  notify: Notify;
}
export type TicketSettings = {
  version: number;
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string | null;
};
