import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`
const DATABASE_PATH = '.test-data/e2e.db'

// Use the system Chromium when it is available (CI images and this dev box),
// otherwise fall back to a browser installed through `bunx playwright install`.
const systemChromium =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'UTC',
    locale: 'en-GB',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    launchOptions: {
      executablePath: systemChromium,
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    // Every run starts from a fresh SQLite database, then builds and boots the
    // real production server against it.
    command:
      'rm -f "$DATABASE_PATH" "$DATABASE_PATH-wal" "$DATABASE_PATH-shm" && bun run build && bun .output/server/index.mjs',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ...(process.env as Record<string, string>),
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(PORT),
      DATABASE_PATH,
      TZ: 'UTC',
    },
  },
})
