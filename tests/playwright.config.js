// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for SA-cost-governance Tests
 *
 * Run tests: npx playwright test
 * Run specific file: npx playwright test settings-thresholds.spec.js
 * Run with UI: npx playwright test --ui
 * Debug: npx playwright test --debug
 */

module.exports = defineConfig({
  testDir: './',
  testMatch: '**/*.spec.js',
  testIgnore: ['**/unit/**', '**/node_modules/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  use: {
    baseURL: process.env.SPLUNK_URL || 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Global timeout for each test
  timeout: 120000,

  // Expect timeout
  expect: {
    timeout: 30000,
  },
});
