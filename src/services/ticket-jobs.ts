import type { SuggestionGenerator } from '../types.ts';
import type { Types } from 'mongoose';
import { User, Book, Ticket } from '../models/index.ts';
import { getAiConfig } from '../config/ai.ts';
import { fallback, generateSuggestion } from './ai.ts';
import { aiDiagnostic, logAiFailure } from './ai-errors.ts';
// Each app instance owns its jobs, preserving dependency injection and isolated tests.
export function createTicketJobs(
  suggestion: SuggestionGenerator = generateSuggestion,
) {
  const jobs = new Map<string, Promise<void>>();
  function enqueue(ticketId: string | Types.ObjectId) {
    const id = String(ticketId);
    if (jobs.has(id)) return jobs.get(id);
    const job = (async () => {
      const t = await Ticket.findById(id).lean();
      if (!t) return;
      const [book, author] = await Promise.all([
        t.book_id ? Book.findById(t.book_id).lean() : null,
        User.findById(t.author_id).lean(),
      ]);
      if (!author) throw new Error('Ticket author not found.');
      let result;
      try {
        result = await suggestion(t, book?.details || null, author.name);
      } catch {
        const { provider, model } = getAiConfig();
        const diagnostic = aiDiagnostic('generation_failed', null, provider);
        logAiFailure(diagnostic);
        result = {
          ...fallback(t, book?.details || null, author.name),
          provider,
          model: model || null,
          error: diagnostic,
        };
      }
      // Compare-and-set avoids replacing a human override while a provider call is in flight.
      const changed = await Ticket.updateOne(
        { _id: id, version: t.version },
        {
          $set: {
            draft: result.draft,
            ai_state: result.state,
            ai_reason: result.reason,
            ai_error: result.error || null,
            ai_provider: result.provider || null,
            ai_model: result.model || null,
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
              ai_error: result.error || null,
              ai_provider: result.provider || null,
              ai_model: result.model || null,
              updated_at: new Date(),
            },
            $inc: { version: 1 },
          },
        );
    })()
      .catch(async () => {
        console.error('AI job failed:', {
          ticketId: id,
          code: 'generation_failed',
        });
        await Ticket.updateOne(
          { _id: id },
          {
            $set: {
              ai_state: 'fallback',
              ai_error: aiDiagnostic(
                'generation_failed',
                null,
                getAiConfig().provider,
              ),
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
    has: (id: string | Types.ObjectId) => jobs.has(String(id)),
    wait: () => Promise.all([...jobs.values()]),
    recover: async () => {
      for (const ticket of await Ticket.find({ ai_state: 'pending' })
        .select('_id')
        .lean())
        enqueue(ticket._id);
    },
  };
}
