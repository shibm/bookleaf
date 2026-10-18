import type { AiOptions } from '../src/types.ts';
import type { GeminiRequest } from './helpers.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSuggestion } from '../src/services/ai.ts';
import { getAiConfig } from '../src/config/ai.ts';

const ticket = {
  subject: 'Missing royalty',
  description: 'Please check my royalty balance.',
};
const suggestion = {
  category: 'Royalty & Payments',
  priority: 'Medium',
  draft: 'We will review your royalty payment schedule.',
  reason: 'Royalty question.',
};
const logger = { warn() {} };
const response = (
  parts: { text: string; thought?: boolean }[] = [
    { text: JSON.stringify(suggestion) },
  ],
  finishReason = 'STOP',
) => Response.json({ candidates: [{ finishReason, content: { parts } }] });
const generate = (fetchImpl: typeof fetch, extra: AiOptions = {}) =>
  generateSuggestion(ticket, null, 'Priya Sharma', {
    apiKey: 'secret-test-key',
    model: 'gemini-3.1-flash-lite',
    fetchImpl,
    logger,
    ...extra,
  });

test('Gemini uses shared structured output and records provider/model without exposing the key', async () => {
  let sent: GeminiRequest | undefined;
  const result = await generate(async (url, options) => {
    assert.match(
      String(url),
      /models\/gemini-3\.1-flash-lite:generateContent$/,
    );
    assert.ok(!String(url).includes('secret-test-key'));
    assert.equal(
      new Headers(options?.headers).get('x-goog-api-key'),
      'secret-test-key',
    );
    sent = JSON.parse(String(options?.body));
    return response([
      { thought: true, text: 'private reasoning' },
      { text: JSON.stringify(suggestion) },
    ]);
  });
  assert.equal(result.state, 'ready');
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-3.1-flash-lite');
  assert.equal(result.draft, suggestion.draft);
  assert.equal(result.error, null);
  assert.ok(sent);
  assert.equal(
    sent.generationConfig.responseFormat.text.mimeType,
    'APPLICATION_JSON',
  );
  assert.deepEqual(sent.generationConfig.responseFormat.text.schema.required, [
    'category',
    'priority',
    'draft',
    'reason',
  ]);
  assert.ok(sent);
  assert.match(sent.systemInstruction.parts[0].text, /80/);
  assert.equal(
    JSON.parse(sent.contents[0].parts[0].text).author_first_name,
    'Priya',
  );
  assert.ok(!JSON.stringify(sent).includes('secret-test-key'));
});

test('Gemini configuration reads its own credentials and validates timeout defaults', () => {
  const names = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'AI_TIMEOUT_MS'];
  const saved = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  try {
    Object.assign(process.env, {
      GEMINI_API_KEY: 'gemini-key',
      GEMINI_MODEL: 'gemini-model',
      AI_TIMEOUT_MS: '25000',
    });
    assert.deepEqual(getAiConfig(), {
      provider: 'gemini',
      apiKey: 'gemini-key',
      model: 'gemini-model',
      timeoutMs: 25000,
    });
    assert.equal(getAiConfig({ timeoutMs: -1 }).timeoutMs, 12000);
    assert.equal(getAiConfig({ model: '' }).model, 'gemini-3.1-flash-lite');
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});

test('Gemini quota, credentials, permissions, model and outage errors are actionable and sanitized', async () => {
  for (const [status, payload, code] of [
    [429, { error: { status: 'RESOURCE_EXHAUSTED' } }, 'quota_exceeded'],
    [
      400,
      { error: { details: [{ reason: 'API_KEY_INVALID' }] } },
      'invalid_api_key',
    ],
    [403, {}, 'access_denied'],
    [
      403,
      { error: { details: [{ reason: 'BILLING_DISABLED' }] } },
      'billing_required',
    ],
    [404, {}, 'model_not_found'],
    [503, {}, 'provider_unavailable'],
  ] satisfies [
    number,
    {
      error?: {
        status?: string;
        details?: { reason: string }[];
        message?: string;
      };
    },
    string,
  ][]) {
    const logs: unknown[][] = [];
    const errorPayload = {
      error: {
        ...('error' in payload ? payload.error : {}),
        message: 'secret-test-key private ticket data',
      },
    };
    const result = await generate(
      async () => Response.json(errorPayload, { status: status }),
      { logger: { warn: (...entry: unknown[]) => logs.push(entry) } },
    );
    assert.equal(result.state, 'fallback');
    assert.ok(result.error);
    assert.equal(result.error.provider, 'gemini');
    assert.ok(result.error);
    assert.equal(result.error.code, code);
    assert.equal(result.error.status, status);
    assert.match(result.error.message, /Gemini/);
    assert.doesNotMatch(
      JSON.stringify([logs, result]),
      /secret-test-key|private ticket data/,
    );
  }
});

test('Gemini safety blocks, truncation, invalid output, timeouts and network failures retain a usable fallback', async () => {
  for (const [fetchImpl, code] of [
    [async () => response([], 'SAFETY'), 'response_refused'],
    [
      async () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }),
      'response_refused',
    ],
    [async () => response([], 'MAX_TOKENS'), 'incomplete_response'],
    [async () => response([{ text: 'not json' }]), 'invalid_response'],
    [
      async () =>
        response([
          { text: JSON.stringify({ ...suggestion, priority: 'invented' }) },
        ]),
      'invalid_response',
    ],
    [
      async () => {
        throw Object.assign(new Error('private data'), {
          name: 'TimeoutError',
        });
      },
      'timeout',
    ],
    [
      async () => {
        throw new TypeError('secret-test-key');
      },
      'connection_failed',
    ],
  ] satisfies [typeof fetch, string][]) {
    const result = await generate(fetchImpl);
    assert.equal(result.state, 'fallback');
    assert.ok(result.error);
    assert.equal(result.error.code, code);
    assert.ok(result.error);
    assert.equal(result.error.provider, 'gemini');
    assert.ok(result.draft.length > 10);
  }
});
