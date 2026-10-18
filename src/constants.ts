export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export const money = (n: number | null | undefined) =>
  n == null
    ? 'Not set'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);
