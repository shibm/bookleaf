import React from 'react';
import { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowUpRight,
  ArrowLeft,
  Sparkles,
  Send,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api';
import { money, date, short } from '../utils';
import { useData } from '../hooks/useData';
import { Badge, Heading } from '../components/shared';
export default function TicketDetail({ id, user, navigate, notify }) {
  const admin = user.role === 'admin';
  const [result, setResult] = useData(`/tickets/${id}`, notify, true),
    [meta] = useData('/meta', notify);
  const t = result?.data;
  const [reply, setReply] = useState(''),
    [internal, setInternal] = useState(false),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(null),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    setReply('');
    setSettings(null);
  }, [id]);
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/tickets/${id}/messages`, {
        method: 'POST',
        body: { body: reply, internal },
      });
      setReply('');
      setResult(await api(`/tickets/${id}`));
      notify(internal ? 'Internal note added.' : 'Reply sent.');
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setSaving(true);
    try {
      await api(`/tickets/${id}`, { method: 'PATCH', body: settings });
      setResult(await api(`/tickets/${id}`));
      setSettings(null);
      notify('Ticket details updated.');
    } catch (e) {
      notify(e.message);
      if (e.status === 409) setResult(await api(`/tickets/${id}`));
    } finally {
      setSaving(false);
    }
  }
  if (!t) return <div className="loading">Opening conversation…</div>;
  return (
    <>
      <button className="back" onClick={() => navigate('/tickets')}>
        <ArrowLeft size={15} />
        Back to conversations
      </button>
      <Heading
        eyebrow={`${short(t.id)} · OPENED ${date(t.created_at)}`}
        title={t.subject}
      >
        <span>
          {t.book?.title || 'General / Account Level'} · {t.author_name}
        </span>
      </Heading>
      <div className="detail-grid">
        <div>
          <section className="panel thread">
            <div className="panel-heading">
              <h2>Conversation</h2>
              <span className="sync">
                <span className="live-dot" />
                Live updates
              </span>
            </div>
            <div className="message original">
              <div className="message-heading">
                <strong>{t.author_name}</strong>
                <small>{date(t.created_at)}</small>
              </div>
              <p>{t.description}</p>
            </div>
            {t.messages.map((m) => (
              <article
                className={`message ${m.internal ? 'internal' : m.role === 'admin' ? 'support' : ''}`}
                key={m.id}
              >
                <div className="message-heading">
                  <strong>
                    {m.internal && <LockKeyhole size={13} />} {m.name}
                    <span>
                      {m.internal
                        ? 'Internal note'
                        : m.role === 'admin'
                          ? 'BookLeaf support'
                          : 'Author'}
                    </span>
                  </strong>
                  <small>{date(m.created_at)}</small>
                </div>
                <p>{m.body}</p>
              </article>
            ))}
            {(admin || t.status !== 'Closed') && (
              <form className="reply-form" onSubmit={send}>
                <h3>
                  {internal
                    ? 'Add an internal note'
                    : 'Continue the conversation'}
                </h3>
                {admin && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(e) => setInternal(e.target.checked)}
                    />
                    Internal note · visible to admins only
                  </label>
                )}
                <textarea
                  rows={6}
                  aria-label={internal ? 'Internal note' : 'Reply'}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  required
                  maxLength={10000}
                  placeholder={
                    internal
                      ? 'Context for your team…'
                      : 'Write a thoughtful reply…'
                  }
                />
                <div className="form-actions">
                  <small>
                    {internal
                      ? 'Only your operations team will see this.'
                      : 'This message will be visible to the author.'}
                  </small>
                  <button className="button" disabled={busy || !reply.trim()}>
                    <Send size={15} />
                    {busy ? 'Saving…' : internal ? 'Save note' : 'Send reply'}
                  </button>
                </div>
              </form>
            )}
          </section>
          {admin && (
            <section className="panel ai-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    <Sparkles size={18} />
                    Response assistant
                  </h2>
                  <p>
                    {t.ai_state === 'ready'
                      ? 'AI-generated · human review required'
                      : t.ai_state === 'pending'
                        ? 'Preparing a suggestion…'
                        : 'Policy-based fallback · AI not available'}
                  </p>
                  {t.ai_state !== 'pending' && t.ai_provider && (
                    <small className="ai-provider">Gemini · {t.ai_model}</small>
                  )}
                </div>
                <button
                  className="text-button"
                  disabled={t.ai_state === 'pending'}
                  onClick={async () => {
                    try {
                      await api(`/tickets/${id}/draft`, { method: 'POST' });
                      setResult(await api(`/tickets/${id}`));
                    } catch (e) {
                      notify(e.message);
                    }
                  }}
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
              </div>
              {t.ai_state !== 'pending' && t.ai_error && (
                <div className="ai-error" role="alert">
                  <strong>AI draft unavailable</strong>
                  <p>{t.ai_error.message}</p>
                  <small>
                    {t.ai_error.code}
                    {t.ai_error.status ? ` · HTTP ${t.ai_error.status}` : ''}
                  </small>
                  <p>
                    You can use the policy-based draft below or write a reply
                    manually.
                  </p>
                </div>
              )}
              {t.ai_state === 'pending' && t.draft && (
                <p className="ai-reason">
                  Regenerating. The previous draft remains available below.
                </p>
              )}
              {t.ai_state !== 'pending' && !t.ai_error && t.ai_reason && (
                <p className="ai-reason">{t.ai_reason}</p>
              )}
              {t.draft ? (
                <>
                  <p className="draft-text">{t.draft}</p>
                  <div className="ai-actions">
                    <small>
                      Verify amounts, promises, and next steps before sending.
                    </small>
                    <button
                      className="button secondary small"
                      onClick={() => {
                        if (reply.trim()) {
                          notify(
                            'Clear or send your current reply before inserting a draft.',
                          );
                          return;
                        }
                        setReply(t.draft);
                        setInternal(false);
                        notify(
                          'Draft inserted into reply. Edit it before sending.',
                        );
                      }}
                    >
                      Use draft <ArrowUpRight size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <p className="ai-reason">
                  You can compose and send a manual reply at any time.
                </p>
              )}
            </section>
          )}
        </div>
        <aside>
          <section className="panel ticket-properties">
            <h3>Ticket details</h3>
            {[
              ['status', 'Status', meta?.data.statuses],
              ['category', 'Category', meta?.data.categories],
              ['priority', 'Priority', meta?.data.priorities],
            ].map(([key, label, options]) => (
              <div className="property" key={key}>
                {admin ? (
                  <label>
                    {label}
                    <select
                      aria-label={label}
                      value={settings?.[key] ?? t[key]}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          version: settings?.version ?? t.version,
                          [key]: e.target.value,
                        })
                      }
                    >
                      {options?.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <small>{label}</small>
                    <Badge>{t[key]}</Badge>
                  </>
                )}
              </div>
            ))}
            {admin && (
              <>
                <div className="property">
                  <small>Assigned to</small>
                  <strong>{t.assignee_name || 'Unassigned'}</strong>
                  <button
                    className="text-button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        version: settings?.version ?? t.version,
                        assigned_to: t.assigned_to === user.id ? null : user.id,
                      })
                    }
                  >
                    {settings?.assigned_to !== undefined
                      ? settings.assigned_to
                        ? 'Will assign to you'
                        : 'Will unassign'
                      : t.assigned_to === user.id
                        ? 'Unassign'
                        : 'Assign to me'}
                  </button>
                </div>
                <button
                  className="button full"
                  onClick={save}
                  disabled={!settings || saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            )}
            <div className="property">
              <small>Last activity</small>
              <span>{date(t.updated_at)}</span>
            </div>
          </section>
          {t.book && (
            <section className="panel ticket-book">
              <BookOpen size={22} />
              <h3>{t.book.title}</h3>
              <p>{t.book.status}</p>
              <dl>
                <dt>ISBN</dt>
                <dd>{t.book.isbn}</dd>
                <dt>Pending royalties</dt>
                <dd>{money(t.book.royalty_pending)}</dd>
              </dl>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
