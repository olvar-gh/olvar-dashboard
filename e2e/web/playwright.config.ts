import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.WEB_PORT ?? 8099);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

/**
 * Web E2E on the fixtures build (no network, no keys). `fhd-1920` and `mbp-1512` are the Figma
 * frame sizes; the layout projects only check widths. Set PLAYWRIGHT_BASE_URL to reuse a running
 * `expo start --web` instead of exporting.
 */
export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results',
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: '../../playwright-report' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx expo export -p web && node e2e/web/serve-spa.mjs dist ${port}`,
        cwd: '../..',
        env: { EXPO_PUBLIC_DATA_SOURCE: 'fixtures' },
        url: baseURL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: 'fhd-1920',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
    },
    {
      name: 'mbp-1512',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 },
    },
    { name: 'layout-1000', use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 800 } } },
    { name: 'layout-2560', use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } } },
    { name: 'web-narrow', use: { ...devices['Desktop Chrome'], viewport: { width: 402, height: 874 } } },
  ],
});
