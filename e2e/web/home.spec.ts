import { expect, test, type Page } from '@playwright/test';

import { figmaDiff } from './figma';

// T7 Home on the fixtures build.

const plantCardWidth = { 1920: 424, 1512: 368 } as Record<number, number>;

async function ready(page: Page) {
  await expect(page.getByTestId('home-screen')).toBeVisible();
  await expect(page.getByTestId('sensor-soil-value')).toHaveText('42');
  await page.evaluate(() => document.fonts.ready);
}

test('Home shows the plant, four sensors, today and the insights placeholder', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Dongmin$/ })).toBeVisible();
  await expect(page.getByTestId('sensor-light-value')).toHaveText('1,240');
  await expect(page.getByTestId('sensor-temperature-value')).toHaveText('23.4');
  await expect(page.getByTestId('sensor-humidity-value')).toHaveText('58');
  await expect(page.getByTestId('plant-mood')).toHaveText('Feeling great');
  await expect(page.getByTestId('insights-card')).toContainText('Insights are coming soon');
  await expect(page.getByText('Log care')).toHaveCount(0);
  await expect(page.getByText('Health score')).toHaveCount(0);
  const { width } = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});

test('desktop columns follow the frames', async ({ page }) => {
  const { width } = page.viewportSize()!;
  test.skip(!(width in plantCardWidth), 'Figma columns are measured at 1920 and 1512');
  await page.goto('/');
  await ready(page);
  expect((await page.getByTestId('plant-card').boundingBox())?.width).toBe(plantCardWidth[width]);
  const soil = (await page.getByTestId('sensor-soil').boundingBox())!;
  const light = (await page.getByTestId('sensor-light').boundingBox())!;
  expect(light.x - (soil.x + soil.width)).toBe(16);
  expect(soil.height).toBeGreaterThanOrEqual(232);
});

test('offline, uncalibrated and failed-read fixtures', async ({ page }) => {
  await page.goto('/?fixture=offline');
  await expect(page.getByTestId('home-offline')).toContainText(/olvar-node offline since \d\d:\d\d/);
  await page.goto('/?fixture=uncalibrated');
  await expect(page.getByRole('button', { name: 'Calibrate' })).toBeVisible();
  await page.goto('/?fixture=null-reads');
  await expect(page.getByTestId('sensor-temperature-value')).toHaveText('—');
  await expect(page.getByText(/^Read failed at \d\d:\d\d$/).first()).toBeVisible();
});

test('Figma Home 226:7520 / 226:7892', async ({ page }, info) => {
  const { width } = page.viewportSize()!;
  test.skip(!['fhd-1920', 'mbp-1512'].includes(info.project.name), 'Figma frames exist at 1920 and 1512 only');
  await page.goto('/');
  await ready(page);
  // The header text and controls are live (greeting, date, no bell or date arrows); the sidebar has its own test.
  const header = (await page.getByRole('heading', { level: 1 }).first().boundingBox())!;
  const share = await figmaDiff(page, `Home-${width}`, info.outputDir, {
    masks: [
      { x: header.x, y: header.y - 10, width: width - header.x, height: 80 },
      { x: 0, y: 0, width: width === 1920 ? 272 : 248, height: page.viewportSize()!.height },
    ],
  });
  console.log(`Home-${width}: ${(share * 100).toFixed(2)} % differs`);
  expect(share).toBeLessThan(0.08);
});
