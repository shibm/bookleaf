import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallback, generateSuggestion } from '../src/services/ai.js';
import { CATEGORIES } from '../src/constants.js';
const ticket = {
  subject: 'Missing royalty',
  description: 'I have not received any royalty for 6 months.',
};
const book = {
  title: 'Test Book',
  status: 'Published & Live',
  total_royalty_earned: 11970,
  royalty_paid: 8400,
  royalty_pending: 3570,
};
test('fallback classifies policy examples and detects urgency', () => {
  for (const [subject, category, priority] of [
    ['Royalty unpaid for 6 months', CATEGORIES[0], 'High'],
    ['Wrong ISBN on Amazon', CATEGORIES[1], 'High'],
    ['Blurry pages and binding defects', CATEGORIES[2], 'Medium'],
    ['Currently unavailable on Amazon', CATEGORIES[3], 'Medium'],
    ['Still in typesetting', CATEGORIES[4], 'Medium'],
    ['Can I update my author bio?', CATEGORIES[1], 'Low'],
    ['Hello there', CATEGORIES[5], 'Low'],
  ]) {
    const r = fallback({ subject, description: '' }, null, 'Priya Sharma');
    assert.equal(r.category, category, subject);
    assert.equal(r.priority, priority, subject);
  }
});
test('fallback uses real figures and does not invent a payout date', () => {
  const r = fallback(ticket, book, 'Priya Sharma');
  assert.match(r.draft, /3,570/);
  assert.match(r.draft, /45 days/);
  assert.match(r.draft, /₹1,000/);
  assert.equal(r.state, 'fallback');
});
test('no API key never calls the network', async () => {
  const r = await generateSuggestion(ticket, book, 'Priya', {
    apiKey: '',
    fetchImpl: () => {
      throw Error('Unexpected call');
    },
  });
  assert.equal(r.state, 'fallback');
});
test('rate limits, timeouts, refusals and malformed output degrade gracefully', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 429 }),
    async () => {
      throw Error('timeout');
    },
    async () => ({ ok: true, json: async () => ({ status: 'incomplete' }) }),
    async () => ({
      ok: true,
      json: async () => ({ status: 'completed', output: [] }),
    }),
    async () => ({
      ok: true,
      json: async () => ({
        status: 'completed',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  category: 'wrong',
                  priority: 'High',
                  draft: 'bad',
                }),
              },
            ],
          },
        ],
      }),
    }),
  ]) {
    assert.equal(
      (
        await generateSuggestion(ticket, book, 'Priya', {
          apiKey: 'test',
          fetchImpl,
        })
      ).state,
      'fallback',
    );
  }
});
test('structured AI output is validated and prompt excludes private author data', async () => {
  let sent;
  const r = await generateSuggestion(ticket, book, 'Priya Sharma', {
    apiKey: 'test',
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          status: 'completed',
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    category: CATEGORIES[0],
                    priority: 'High',
                    draft:
                      'Thank you for reaching out. We will review your royalties.',
                    reason: 'Overdue payment',
                  }),
                },
              ],
            },
          ],
        }),
      };
    },
  });
  assert.equal(r.state, 'ready');
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.strict, true);
  assert.match(sent.instructions, /untrusted DATA/);
  assert.equal(JSON.parse(sent.input).author_first_name, 'Priya');
  assert.ok(!sent.input.includes('Sharma'));
});
