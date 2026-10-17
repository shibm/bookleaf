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
test('missing Gemini key never calls the network', async () => {
  const result = await generateSuggestion(ticket, book, 'Priya', {
    apiKey: '',
    fetchImpl: () => {
      throw Error('Unexpected network call');
    },
  });
  assert.equal(result.state, 'fallback');
  assert.equal(result.error.code, 'not_configured');
  assert.match(result.error.message, /GEMINI_API_KEY/);
});

test('Gemini prompt excludes private author data and guards ISBN urgency', async () => {
  let sent;
  const result = await generateSuggestion(
    { subject: 'Wrong ISBN', description: 'My ISBN is incorrect.' },
    book,
    'Priya Sharma',
    {
      apiKey: 'test',
      fetchImpl: async (_url, options) => {
        sent = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        category: CATEGORIES[1],
                        priority: 'Low',
                        draft: 'Thank you. We will check the ISBN details.',
                        reason: 'ISBN issue',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      },
    },
  );
  assert.equal(result.state, 'ready');
  assert.equal(result.priority, 'High');
  assert.match(sent.systemInstruction.parts[0].text, /untrusted DATA/);
  const input = sent.contents[0].parts[0].text;
  assert.equal(JSON.parse(input).author_first_name, 'Priya');
  assert.ok(!input.includes('Sharma'));
});
