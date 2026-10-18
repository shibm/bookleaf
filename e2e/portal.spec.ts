import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await expect(
    page.getByRole('heading', {
      name: email.startsWith('admin')
        ? 'Every author, heard.'
        : 'Welcome back, Priya.',
    }),
  ).toBeVisible();
}
test('author and admin complete a conversation with live updates and private notes', async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'priya.sharma@email.com', 'AuthorDemo!2026');
  await page.screenshot({
    path: 'artifacts/author-dashboard.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'My books', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Whispers of the Ganges' }),
  ).toBeVisible();
  await expect(page.getByText('₹3,570', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My tickets', exact: true }).click();
  await page.getByRole('button', { name: 'New support query' }).click();
  await page.getByLabel('Which book is this about?').selectOption('BK001');
  await page
    .getByLabel('Subject', { exact: true })
    .fill('Royalty overdue for 6 months');
  await page
    .getByLabel('Tell us a little more')
    .fill(
      'I have not received my royalties for six months. Can you check the payment?',
    );
  await page.getByRole('button', { name: 'Send support query' }).click();
  await expect(
    page.getByRole('heading', { name: 'Royalty overdue for 6 months' }),
  ).toBeVisible();
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    staff = await context.newPage();
  staff.on('pageerror', (e) => errors.push(e.message));
  await login(staff, 'admin@bookleaf.com', 'AdminDemo!2026');
  await staff
    .getByRole('button')
    .filter({ hasText: 'Royalty overdue for 6 months' })
    .click();
  await expect(
    staff.getByRole('heading', { name: 'Response assistant' }),
  ).toBeVisible();
  await expect(
    staff.getByText('Policy-based fallback · AI not available'),
  ).toBeVisible();
  await staff
    .getByRole('button', { name: 'Assign to me', exact: true })
    .click();
  await staff.getByLabel('Status', { exact: true }).selectOption('In Progress');
  await staff.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('In Progress', { exact: true })).toBeVisible();
  await staff.getByLabel('Internal note · visible to admins only').check();
  await staff
    .getByRole('textbox', { name: 'Internal note', exact: true })
    .fill('PRIVATE: payment verification for operations only.');
  await staff.getByRole('button', { name: 'Save note' }).click();
  await expect(
    staff.getByText('PRIVATE: payment verification for operations only.'),
  ).toBeVisible();
  await staff.getByLabel('Internal note · visible to admins only').uncheck();
  await staff.getByRole('button', { name: 'Use draft' }).click();
  await expect(
    staff.getByRole('textbox', { name: 'Reply', exact: true }),
  ).not.toBeEmpty();
  await staff
    .getByRole('textbox', { name: 'Reply', exact: true })
    .fill(
      'We are reviewing your pending balance and will update you within 48 hours.',
    );
  await staff.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(
    page.getByText(
      'We are reviewing your pending balance and will update you within 48 hours.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText('PRIVATE: payment verification for operations only.'),
  ).toHaveCount(0);
  await staff.screenshot({
    path: 'artifacts/admin-ticket.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'artifacts/author-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome back, Priya.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

test('billing failure is actionable for admins and never shown to authors', async ({
  browser,
  page,
}) => {
  await login(page, 'priya.sharma@email.com', 'AuthorDemo!2026');
  await page.getByRole('button', { name: 'New support query' }).click();
  await page
    .getByLabel('Subject', { exact: true })
    .fill('AI billing diagnostics');
  await page
    .getByLabel('Tell us a little more')
    .fill('Please explain how my royalty payments are scheduled.');
  await page.getByRole('button', { name: 'Send support query' }).click();
  await expect(
    page.getByRole('heading', { name: 'AI billing diagnostics' }),
  ).toBeVisible();
  const ticketPath = new URL(page.url()).pathname;
  const context = await browser.newContext();
  const staff = await context.newPage();
  try {
    await login(staff, 'admin@bookleaf.com', 'AdminDemo!2026');
    await staff.goto(ticketPath);
    const banner = staff
      .getByRole('alert')
      .filter({ hasText: 'AI draft unavailable' });
    await expect(banner).toContainText(
      'Gemini requires billing for this request',
    );
    await expect(banner).toContainText('Google AI Studio');
    await expect(banner).toContainText('billing_required · HTTP 402');
    await expect(
      staff.getByRole('button', { name: 'Regenerate', exact: true }),
    ).toBeEnabled();
    await expect(
      staff.getByText('Preparing a suggestion…', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText('Gemini requires billing for this request', {
        exact: false,
      }),
    ).toHaveCount(0);
    await staff.getByRole('button', { name: 'Use draft' }).click();
    await expect(
      staff.getByRole('textbox', { name: 'Reply', exact: true }),
    ).not.toBeEmpty();
    await staff.screenshot({
      path: 'artifacts/ai-billing-error.png',
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test('Gemini quota errors show provider/model and an actionable message', async ({
  browser,
  page,
}) => {
  await login(page, 'priya.sharma@email.com', 'AuthorDemo!2026');
  await page.getByRole('button', { name: 'New support query' }).click();
  await page
    .getByLabel('Subject', { exact: true })
    .fill('Gemini quota diagnostics');
  await page
    .getByLabel('Tell us a little more')
    .fill('Please explain my royalty payment schedule.');
  await page.getByRole('button', { name: 'Send support query' }).click();
  await expect(
    page.getByRole('heading', { name: 'Gemini quota diagnostics' }),
  ).toBeVisible();
  const path = new URL(page.url()).pathname;
  const context = await browser.newContext();
  try {
    const staff = await context.newPage();
    await login(staff, 'admin@bookleaf.com', 'AdminDemo!2026');
    await staff.goto(path);
    const banner = staff
      .getByRole('alert')
      .filter({ hasText: 'AI draft unavailable' });
    await expect(banner).toContainText('Gemini quota or rate limit reached');
    await expect(banner).toContainText('Google AI Studio');
    await expect(staff.locator('.ai-provider')).toContainText('Gemini');
    await expect(page.locator('.ai-provider')).toHaveCount(0);
    await expect(
      page.getByText('Gemini quota or rate limit reached', { exact: false }),
    ).toHaveCount(0);
    await expect(
      staff.getByRole('button', { name: 'Use draft' }),
    ).toBeEnabled();
  } finally {
    await context.close();
  }
});
