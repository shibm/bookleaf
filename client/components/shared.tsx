import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Book } from '../types.ts';
import { Leaf, MessagesSquare } from 'lucide-react';
import { tone } from '../utils.ts';
export function Badge({ children }: { children: string }) {
  return <span className={`badge ${tone(children)}`}>{children}</span>;
}

export function Empty({
  title = 'A little quiet here',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <MessagesSquare size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  caption,
  icon: Icon,
  color = '',
}: {
  label: string;
  value: ReactNode;
  caption: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        <div className="stat-value">{value}</div>
        <small>{caption}</small>
      </div>
      <div className={`stat-icon ${color}`}>
        <Icon size={21} />
      </div>
    </div>
  );
}

export function Cover({
  book,
  index = 0,
}: {
  book: Pick<Book, 'title'>;
  index?: number;
}) {
  return (
    <div className={`book-cover cover-${index % 4}`} aria-hidden="true">
      <Leaf size={15} />
      <span>{book.title}</span>
      <small>
        BOOKLEAF
        <br />
        PUBLISHING
      </small>
    </div>
  );
}
