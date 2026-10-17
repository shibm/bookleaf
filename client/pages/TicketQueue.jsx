import React from 'react';
import { useState } from 'react';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { date, short } from '../utils';
import { useData } from '../hooks/useData';
import { Badge, Empty, Heading } from '../components/shared';
export default function TicketQueue({ admin, navigate, notify }) {
  const [filters, setFilters] = useState({
      status: '',
      category: '',
      priority: '',
      from: '',
      to: '',
    }),
    [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const [meta] = useData('/meta', notify);
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    page,
  }).toString();
  const [result] = useData(`/tickets?${query}`, notify, true);
  function filter(k, v) {
    setFilters({ ...filters, [k]: v });
    setPage(1);
  }
  const rows = result?.data.filter((t) =>
    `${t.subject} ${t.author_name} ${short(t.id)}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow={
          admin ? 'AUTHOR CARE, IN ONE PLACE' : 'KEEP THE CONVERSATION GOING'
        }
        title={admin ? 'Ticket queue.' : 'Your conversations.'}
        action={
          !admin && (
            <button className="button" onClick={() => navigate('/tickets/new')}>
              <Plus size={17} />
              New support query
            </button>
          )
        }
      >
        {admin
          ? 'Prioritize the urgent. Make space for every author.'
          : 'Track your queries and hear from the BookLeaf team.'}
      </Heading>
      <section className="panel">
        <div className="queue-toolbar">
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Search current page"
              placeholder="Search this page…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="sync">
            <span className="live-dot" />
            Updates every 4 seconds
          </span>
        </div>
        <div className="filters">
          {[
            ['status', 'All statuses', meta?.data.statuses],
            ['category', 'All categories', meta?.data.categories],
            ['priority', 'All priorities', meta?.data.priorities],
          ].map(([key, label, options]) => (
            <label key={key}>
              <span>{key}</span>
              <select
                value={filters[key]}
                onChange={(e) => filter(key, e.target.value)}
              >
                <option value="">{label}</option>
                {options?.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span>From date (UTC)</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => filter('from', e.target.value)}
            />
          </label>
          <label>
            <span>To date (UTC)</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => filter('to', e.target.value)}
            />
          </label>
          <button
            className="text-button"
            onClick={() => {
              setFilters({
                status: '',
                category: '',
                priority: '',
                from: '',
                to: '',
              });
              setPage(1);
              setSearch('');
            }}
          >
            Reset
          </button>
        </div>
        {!result ? (
          <div className="loading">Loading conversations…</div>
        ) : rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conversation</th>
                  {admin && <th>Author</th>}
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <a
                        href={`/tickets/${t.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/tickets/${t.id}`);
                        }}
                      >
                        <small>{short(t.id)}</small>
                        <strong>{t.subject}</strong>
                        <span>{t.category}</span>
                      </a>
                    </td>
                    {admin && (
                      <td>
                        {t.author_name}
                        <small>{t.book?.title || 'General / Account'}</small>
                      </td>
                    )}
                    <td>
                      <Badge>{t.status}</Badge>
                    </td>
                    <td>
                      <Badge>{t.priority}</Badge>
                    </td>
                    <td className="nowrap">{date(t.created_at)}</td>
                    <td>
                      <button
                        aria-label={`Open ${t.subject}`}
                        className="icon-button"
                        onClick={() => navigate(`/tickets/${t.id}`)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No conversations found">
            Try adjusting your filters, or start a new support query.
          </Empty>
        )}
        <div className="pagination">
          <span>
            {result?.meta.total ?? 0} conversations · page {page}
          </span>
          <div>
            <button
              className="button secondary small"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="button secondary small"
              disabled={!result || page * 20 >= result.meta.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
