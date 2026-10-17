import { User, Book, Ticket } from '../models/index.js';
import { fallback, generateSuggestion } from './ai.js';
// Each app instance owns its jobs, preserving dependency injection and isolated tests.
export function createTicketJobs(suggestion = generateSuggestion) {
  const jobs = new Map();
  function enqueue(id) {
    id = String(id);
    if (jobs.has(id)) return jobs.get(id);
    const job = (async () => {
      const t = await Ticket.findById(id).lean();
      const [book, author] = await Promise.all([
        t.book_id ? Book.findById(t.book_id).lean() : null,
        User.findById(t.author_id).lean(),
      ]);
      let result;
      try {
        result = await suggestion(t, book?.details || null, author.name);
      } catch {
        result = fallback(t, book?.details || null, author.name);
      }
      // Compare-and-set avoids replacing a human override while a provider call is in flight.
      const changed = await Ticket.updateOne(
        { _id: id, version: t.version },
        {
          $set: {
            draft: result.draft,
            ai_state: result.state,
            ai_reason: result.reason,
            category: result.category,
            priority: result.priority,
            updated_at: new Date(),
          },
          $inc: { version: 1 },
        },
      );
      if (!changed.modifiedCount)
        await Ticket.updateOne(
          { _id: id },
          {
            $set: {
              draft: result.draft,
              ai_state: result.state,
              ai_reason: result.reason,
              updated_at: new Date(),
            },
            $inc: { version: 1 },
          },
        );
    })()
      .catch(async (error) => {
        console.error('AI job failed:', error.message);
        await Ticket.updateOne(
          { _id: id },
          {
            $set: {
              ai_state: 'fallback',
              ai_reason:
                'Suggestion unavailable. Please compose a reply manually.',
            },
          },
        ).catch(() => {});
      })
      .finally(() => jobs.delete(id));
    jobs.set(id, job);
    return job;
  }
  return {
    enqueue,
    has: (id) => jobs.has(String(id)),
    wait: () => Promise.all([...jobs.values()]),
    recover: async () => {
      for (const ticket of await Ticket.find({ ai_state: 'pending' })
        .select('_id')
        .lean())
        enqueue(ticket._id);
    },
  };
}
