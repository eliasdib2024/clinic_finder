import { defineConfig } from '@playwright/test';

// Uses an installed Chrome if CHROME_PATH is set, otherwise Playwright's bundled Chromium
// (run `npx playwright install chromium` once).
const executablePath = process.env.CHROME_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1360, height: 900 },
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
    // Reduced motion swaps the WebGL hero for its static fallback and shortens animations,
    // which keeps parallel runs fast on CI machines without a GPU.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    env: { VITE_MOCK_LATENCY: '60' },
    timeout: 60_000,
  },
});
