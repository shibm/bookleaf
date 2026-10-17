import React from 'react';
import {
  Leaf,
  MessagesSquare,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  Library,
  AlertCircle,
} from 'lucide-react';
import { money, date, short, tone } from '../utils';
import { useData } from '../hooks/useData';
import { Badge, Empty, Heading, Stat, Cover } from '../components/shared';
export default function Dashboard({ user, navigate, notify }) {
  const admin = user.role === 'admin';
  const [stats] = useData('/dashboard', notify, true),
    [tickets] = useData('/tickets', notify, true),
    [books] = useData('/books', notify);
  const s = stats?.data;
  return (
    <>
      <div className="dashboard-welcome">
        <Heading
          eyebrow={
            admin
              ? 'A CLEARER VIEW, A BETTER RESPONSE'
              : 'YOUR PUBLISHING JOURNEY'
          }
          title={
            admin
              ? 'Every author, heard.'
              : `Welcome back, ${user.name.split(' ')[0]}.`
          }
          action={
            <button
              className="button"
              onClick={() => navigate(admin ? '/tickets' : '/tickets/new')}
            >
              {admin ? <MessagesSquare size={17} /> : <Plus size={18} />}{' '}
              {admin ? 'Manage ticket queue' : 'New support query'}
            </button>
          }
        >
          {admin
            ? 'A thoughtful workspace for keeping every conversation moving.'
            : 'A little overview of your books, earnings, and conversations.'}
        </Heading>
      </div>
      <div className="stats">
        {admin ? (
          <>
            <Stat
              label="Total conversations"
              value={s?.total ?? '—'}
              caption="Across all authors"
              icon={MessagesSquare}
            />
            <Stat
              label="Awaiting attention"
              value={s?.unresolved ?? '—'}
              caption="Open and in progress"
              icon={Clock}
              color="amber"
            />
            <Stat
              label="High priority"
              value={s?.urgent ?? '—'}
              caption="Unresolved high & critical"
              icon={AlertCircle}
              color="rose"
            />
            <Stat
              label="Resolved conversations"
              value={s?.resolved ?? '—'}
              caption="Resolved and closed"
              icon={CheckCircle2}
            />
          </>
        ) : (
          <>
            <Stat
              label="Books in your collection"
              value={books?.data.length ?? '—'}
              caption={`${books?.data.filter((b) => b.status === 'Published & Live').length ?? 0} published & live`}
              icon={Library}
            />
            <Stat
              label="Total royalties earned"
              value={s ? money(s.earned) : '—'}
              caption="Your stories, making their mark"
              icon={IndianRupee}
            />
            <Stat
              label="Royalties pending"
              value={s ? money(s.pending) : '—'}
              caption="Subject to quarterly payout policy"
              icon={Clock}
              color="amber"
            />
            <Stat
              label="Active conversations"
              value={s?.unresolved ?? '—'}
              caption="We’re working on it with you"
              icon={MessagesSquare}
            />
          </>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel conversations">
          <div className="panel-heading">
            <div>
              <h2>
                {admin
                  ? 'Conversations needing attention'
                  : 'Your conversations'}
              </h2>
              <p>
                {admin
                  ? 'Urgent first. Then oldest first.'
                  : 'Every question is a step forward.'}
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate('/tickets')}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {!tickets ? (
            <div className="loading">Loading conversations…</div>
          ) : tickets.data.length ? (
            <div className="mini-tickets">
              {tickets.data.slice(0, 4).map((t) => (
                <button key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                  <div className={`conversation-icon ${tone(t.status)}`}>
                    <MessagesSquare size={18} />
                  </div>
                  <div className="ticket-preview">
                    <small>
                      {short(t.id)} ·{' '}
                      {admin
                        ? t.author_name
                        : t.book?.title || 'General inquiry'}
                    </small>
                    <strong>{t.subject}</strong>
                    <span>{date(t.created_at)}</span>
                  </div>
                  <Badge>{t.status}</Badge>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={
                admin
                  ? 'Ready for your first conversation'
                  : 'We’re here when you need us'
              }
            >
              {admin
                ? 'New author queries will appear here.'
                : 'Questions about your book or royalties? Start a support query.'}
            </Empty>
          )}
        </section>
        <section className="policy-card">
          <span className="policy-mark">
            <Leaf size={23} />
          </span>
          <div className="eyebrow">A NOTE FROM BOOKLEAF</div>
          <h2>
            {admin
              ? 'Good support starts with understanding.'
              : 'Your story is our shared success.'}
          </h2>
          <p>
            {admin
              ? 'AI helps with the first draft. Your judgment brings the care, context, and clarity every author deserves.'
              : 'From the first manuscript to the next milestone, we’re here to help you move forward.'}
          </p>
          <div className="policy-divider" />
          <div className="policy-tip">
            <Clock size={18} />
            <p>
              {admin
                ? 'Review suggestions before sending. Internal notes stay within your team.'
                : 'Royalties are calculated quarterly, with payouts within 45 days of quarter end.'}
            </p>
          </div>
          <button onClick={() => navigate(admin ? '/tickets' : '/tickets/new')}>
            {admin ? 'Explore your queue' : 'How can we help?'}{' '}
            <ArrowUpRight size={17} />
          </button>
        </section>
      </div>
      {!admin && (
        <section className="panel book-overview">
          <div className="panel-heading">
            <div>
              <h2>On your bookshelf</h2>
              <p>Stories you’ve brought into the world.</p>
            </div>
            <button className="text-button" onClick={() => navigate('/books')}>
              All books <ArrowRight size={15} />
            </button>
          </div>
          <div className="book-strip">
            {books?.data.slice(0, 3).map((b, i) => (
              <div className="book-strip-item" key={b.book_id}>
                <Cover book={b} index={i} />
                <div>
                  <small>{b.genre}</small>
                  <h3>{b.title}</h3>
                  <Badge>{b.status}</Badge>
                  <p>
                    {b.total_copies_sold.toLocaleString('en-IN')} copies sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
