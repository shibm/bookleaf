import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 12000 },
  use: {
    baseURL: 'http://127.0.0.1:3101',
    actionTimeout: 10000,
    ...(process.platform === 'darwin' ? { channel: 'chrome' } : {}),
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.js',
    url: 'http://127.0.0.1:3101/health',
    timeout: 120000,
    reuseExistingServer: false,
  },
});
