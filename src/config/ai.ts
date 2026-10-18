import type { AiOptions } from '../types.ts';
export function getAiConfig(options: AiOptions = {}) {
  const timeout = Number(
    options.timeoutMs ?? process.env.AI_TIMEOUT_MS ?? 12000,
  );
  return {
    provider: 'gemini' as const,
    apiKey: String(options.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim(),
    model:
      String(
        options.model ?? process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite',
      ).trim() || 'gemini-3.1-flash-lite',
    timeoutMs:
      Number.isInteger(timeout) && timeout > 0 && timeout <= 120000
        ? timeout
        : 12000,
  };
}
