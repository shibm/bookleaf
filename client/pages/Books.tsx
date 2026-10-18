import type { Notify, Data, Book } from '../types.ts';
import { money, date } from '../utils.ts';
import { useData } from '../hooks/useData.ts';
import { Badge, Heading, Cover } from '../components/shared.tsx';
export default function Books({ notify }: { notify: Notify }) {
  const [result] = useData<Data<Book[]>>('/books', notify);
  return (
    <>
      <Heading eyebrow="WRITTEN BY YOU" title="Your bookshelf.">
        Every title, every milestone, all in one place.
      </Heading>
      {!result ? (
        <div className="loading">Opening your bookshelf…</div>
      ) : (
        <div className="books-grid">
          {result.data.map((b, i) => (
            <article className="panel book-card" key={b.book_id}>
              <div className="book-card-top">
                <Cover book={b} index={i} />
                <div>
                  <span className="eyebrow">{b.genre}</span>
                  <h2>{b.title}</h2>
                  <Badge>{b.status}</Badge>
                  <p className="isbn">ISBN {b.isbn}</p>
                </div>
              </div>
              <dl className="book-details">
                <div>
                  <dt>Publication date</dt>
                  <dd>{date(b.publication_date)}</dd>
                </div>
                <div>
                  <dt>MRP</dt>
                  <dd>{money(b.mrp)}</dd>
                </div>
                <div>
                  <dt>Copies sold</dt>
                  <dd>{b.total_copies_sold.toLocaleString('en-IN')}</dd>
                </div>
                <div>
                  <dt>Royalty per copy</dt>
                  <dd>{money(b.author_royalty_per_copy)}</dd>
                </div>
                <div>
                  <dt>Total earned</dt>
                  <dd>{money(b.total_royalty_earned)}</dd>
                </div>
                <div>
                  <dt>Royalty paid</dt>
                  <dd>{money(b.royalty_paid)}</dd>
                </div>
                <div className="highlight">
                  <dt>Royalty pending</dt>
                  <dd>{money(b.royalty_pending)}</dd>
                </div>
                <div>
                  <dt>Last payout</dt>
                  <dd>{date(b.last_royalty_payout_date)}</dd>
                </div>
                <div>
                  <dt>Print partner</dt>
                  <dd>{b.print_partner || 'Not assigned'}</dd>
                </div>
              </dl>
              <div className="available">
                <small>AVAILABLE ON</small>
                <p>
                  {b.available_on.length
                    ? b.available_on.join(' · ')
                    : 'Listings will appear after publication.'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
