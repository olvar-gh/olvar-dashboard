import { expect, test } from '@playwright/test';

import { figmaDiff } from './figma';

// T9 Timeline on the fixtures build, with the clock on the Figma frames' week (Sat Nov 7, 15:00 Seoul).

const FRAME_TIME = new Date('2026-11-07T06:00:00Z');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: FRAME_TIME });
});

test('Timeline matches the desktop frame layout and scrolls as a document', async ({ page }, info) => {
  const { width, height } = page.viewportSize()!;
  await page.goto('/timeline');
  await expect(page.getByRole('heading', { name: 'Timeline', level: 1 })).toBeVisible();
  await expect(page.getByText('Nov 1 – Nov 7, 2026')).toBeVisible();
  await expect(page.getByText('TODAY · SAT, NOV 7')).toBeVisible();
  await expect(page.getByText(/^\d+ events this week$/)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(width);
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(docHeight).toBeGreaterThan(height);

  if (width === 1920 || width === 1512) {
    const name = `Timeline-${width}`;
    const diff = await figmaDiff(page, name, info.outputPath('figma'));
    info.annotations.push({ type: 'figma-diff', description: `${name}: ${(diff * 100).toFixed(1)} %` });
    await page.screenshot({ path: info.outputPath(`${name}-full.png`), fullPage: true, scale: 'css' });
  }
});

test('Jump to date disables days outside the 90-day history', async ({ page }) => {
  await page.goto('/timeline');
  await page.getByTestId('jump-to-date-button').click();
  await expect(page.getByTestId('jump-2026-11-08')).toBeDisabled();
  await page.getByTestId('jump-2026-11-03').click();
  await expect(page.getByText('Nov 1 – Nov 7, 2026')).toBeVisible();
});
