import { expect, test } from '@playwright/test';

// T9 Timeline on the fixtures build, with the clock on the design frames' week (Sat Nov 7, 15:00 Seoul).

const FRAME_TIME = new Date('2026-11-07T06:00:00Z');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: FRAME_TIME });
});

test('Timeline matches the desktop frame layout and scrolls as a document', async ({ page }) => {
  const { width, height } = page.viewportSize()!;
  await page.goto('/timeline');
  await expect(page.getByRole('heading', { name: 'Timeline', level: 1 })).toBeVisible();
  await expect(page.getByText('Nov 1 – Nov 7, 2026')).toBeVisible();
  await expect(page.getByText('TODAY · SAT, NOV 7')).toBeVisible();
  // Earlier days load as they scroll into view, so the weekly count waits for every group.
  for (const day of [5, 4, 3, 2, 1]) {
    const group = page.getByTestId(`day-2026-11-0${day}`);
    await expect(async () => {
      await page.getByText(`NOV ${day}`, { exact: false }).last().scrollIntoViewIfNeeded({ timeout: 1000 });
      await expect(group).toBeAttached({ timeout: 1000 });
    }).toPass();
  }
  await expect(page.getByText(/^\d+ events this week$/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(width);
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(docHeight).toBeGreaterThan(height);
});

test('Jump to date disables days outside the 90-day history', async ({ page }) => {
  await page.goto('/timeline');
  await page.getByTestId('jump-to-date-button').click();
  await expect(page.getByTestId('jump-2026-11-08')).toBeDisabled();
  await page.getByTestId('jump-2026-11-03').click();
  await expect(page.getByText('Nov 1 – Nov 7, 2026')).toBeVisible();
});
