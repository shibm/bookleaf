import { CATEGORIES } from '../constants.js';
import { getAiConfig } from '../config/ai.js';
import { fallback } from './ai/fallback.js';
import { buildPrompt, validSuggestion } from './ai/prompt.js';
import { generateGemini } from './ai/providers/gemini.js';
import {
  aiDiagnostic,
  exceptionDiagnostic,
  aiFailure,
  logAiFailure,
} from './ai-errors.js';

export { fallback } from './ai/fallback.js';

export async function generateSuggestion(ticket, book, name, options = {}) {
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
    const parsed = JSON.parse(raw);
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
