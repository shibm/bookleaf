import React from 'react';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  LockKeyhole,
  LifeBuoy,
} from 'lucide-react';
import { api } from '../api';
import { short } from '../utils';
import { useData } from '../hooks/useData';
import { Heading } from '../components/shared';
export default function NewTicket({ navigate, notify }) {
  const [books] = useData('/books', notify);
  const [form, setForm] = useState({
      book_id: '',
      subject: '',
      description: '',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api('/tickets', { method: 'POST', body: form });
      notify('Your query is with the BookLeaf team.');
      navigate(`/tickets/${r.data.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="back" onClick={() => navigate('/tickets')}>
        <ArrowLeft size={15} />
        Back to conversations
      </button>
      <Heading eyebrow="WE’RE HERE TO HELP" title="Let’s talk about it.">
        A few details now will help us find the right answer for you.
      </Heading>
      <div className="form-grid">
        <form className="panel query-form" onSubmit={submit}>
          <h2>New support query</h2>
          <label>
            Which book is this about?
            <select
              value={form.book_id}
              onChange={(e) => setForm({ ...form, book_id: e.target.value })}
            >
              <option value="">General / Account Level</option>
              {books?.data.map((b) => (
                <option value={b.book_id} key={b.book_id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input
              placeholder="A short summary of your question"
              minLength={3}
              maxLength={160}
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>
          <label>
            Tell us a little more
            <textarea
              rows={8}
              minLength={10}
              maxLength={8000}
              required
              placeholder="What happened, and how can we help? Include dates or platform names where useful."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <small>{form.description.length}/8,000 characters</small>
          </label>
          <div className="attachment">
            <LockKeyhole size={19} />
            <div>
              <strong>Have a photo or document?</strong>
              <p>
                Attachments aren’t enabled in this demo. Describe the issue
                here; our team can arrange photo sharing for print verification.
              </p>
            </div>
            <input
              type="file"
              disabled
              aria-label="Attachments unavailable in demo"
            />
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate('/tickets')}
            >
              Cancel
            </button>
            <button className="button" disabled={busy}>
              {busy ? 'Submitting…' : 'Send support query'}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="guidance">
          <span className="help-icon">
            <LifeBuoy />
          </span>
          <h3>You’re in good company.</h3>
          <p>
            Whether it’s a royalty question, a production update, or something
            that doesn’t look quite right, we’ll help you take the next step.
          </p>
          <hr />
          <h4>A helpful query includes</h4>
          <ul>
            <li>The book or platform involved</li>
            <li>Relevant dates and details</li>
            <li>What you expected to happen</li>
          </ul>
          <p className="muted">
            Please don’t include passwords, bank account numbers, or other
            sensitive information.
          </p>
        </aside>
      </div>
    </>
  );
}
