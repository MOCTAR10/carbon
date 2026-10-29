import { defineConfig, devices } from '@playwright/test'
import './tests/support/env'

// Regression suite. Locally: `npm run test:e2e` starts `next dev` on :3100 (or reuses one already running).
// CI: the workflow builds the app and sets BASE_URL / TEST_SERVER_CMD so it runs against `next start`.
const PORT = Number(process.env.TEST_PORT || 3100)
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`
const CI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/support/global-setup.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Africa/Libreville',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'desktop', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Phone layout: the same E2E specs at 390px; specs tagged @desktop-only are skipped here
    { name: 'mobile', testDir: './tests/e2e', grepInvert: /@desktop-only/, use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: process.env.TEST_SERVER_CMD || `node node_modules/next/dist/bin/next dev -p ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
