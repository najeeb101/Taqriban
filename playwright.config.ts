import { defineConfig, devices } from '@playwright/test';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may already be set */
}

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 5'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ar',
    timezoneId: 'Asia/Qatar',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'mobile-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
