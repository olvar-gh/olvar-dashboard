import { expect, test, type Page } from '@playwright/test';

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
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Mina$/ })).toBeVisible();
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
  test.skip(!(width in plantCardWidth), 'the columns are measured at 1920 and 1512');
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
  await expect(page.getByTestId('sensor-temperature-value')).toHaveText('-');
  await expect(page.getByText(/^Read failed at \d\d:\d\d$/).first()).toBeVisible();
});
