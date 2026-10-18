import type {
  TicketInput,
  BookDetails,
  AiOptions,
  SuggestionResult,
} from '../types.ts';
import { CATEGORIES } from '../constants.ts';
import { getAiConfig } from '../config/ai.ts';
import { fallback } from './ai/fallback.ts';
import { buildPrompt, validSuggestion } from './ai/prompt.ts';
import { generateGemini } from './ai/providers/gemini.ts';
import {
  aiDiagnostic,
  exceptionDiagnostic,
  aiFailure,
  logAiFailure,
} from './ai-errors.ts';

export { fallback } from './ai/fallback.ts';

export async function generateSuggestion(
  ticket: TicketInput,
  book: BookDetails | null,
  name: string,
  options: AiOptions = {},
): Promise<SuggestionResult> {
  const { fetchImpl = fetch, logger = console } = options;
  const config = getAiConfig(options);
  const basic = {
    ...fallback(ticket, book, name),
    provider: config.provider,
    model: config.model || null,
  };
  if (!config.apiKey)
    return {
      ...basic,
      error: aiDiagnostic('not_configured', null, config.provider),
    };
  try {
    const raw = await generateGemini({
      ...config,
      fetchImpl,
      signal: AbortSignal.timeout(config.timeoutMs),
      prompt: buildPrompt(ticket, book, name, basic.category),
    });
    const parsed: unknown = JSON.parse(raw);
    if (!validSuggestion(parsed))
      throw aiFailure(aiDiagnostic('invalid_response', null, config.provider));
    if (
      parsed.category === CATEGORIES[1] &&
      /isbn/i.test(ticket.subject + ' ' + ticket.description) &&
      ['Low', 'Medium'].includes(parsed.priority)
    )
      parsed.priority = 'High';
    return {
      ...parsed,
      provider: config.provider,
      model: config.model,
      state: 'ready',
      error: null,
    };
  } catch (error) {
    const diagnostic = exceptionDiagnostic(error, config.provider);
    logAiFailure(diagnostic, logger);
    return { ...basic, error: diagnostic };
  }
}
