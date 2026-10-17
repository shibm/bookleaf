import React from 'react';
import { Leaf, MessagesSquare } from 'lucide-react';
import { tone } from '../utils';
export function Badge({ children }) {
  return <span className={`badge ${tone(children)}`}>{children}</span>;
}

export function Empty({ title = 'A little quiet here', children }) {
  return (
    <div className="empty">
      <MessagesSquare size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Heading({ eyebrow, title, children, action }) {
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

export function Stat({ label, value, caption, icon: Icon, color = '' }) {
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

export function Cover({ book, index = 0 }) {
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
