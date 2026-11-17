import { expect, test, type Page } from '@playwright/test';

import { figmaDiff, type Rect } from './figma';

// T8 Sensors on the fixtures build.

const FIGMA_MAX_DIFF = 0.08;
const METRICS = ['soil', 'light', 'temperature', 'humidity'] as const;

async function open(page: Page, query = '') {
  await page.goto(`/sensors${query}`);
  await expect(page.getByRole('heading', { name: 'Sensors', level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function box(page: Page, testId: string) {
  return (await page.getByTestId(testId).boundingBox())!;
}

test.describe('Sensors', () => {
  test('deep link with a range survives a reload', async ({ page }) => {
    await open(page, '?range=7d');
    await expect(page.getByRole('tab', { name: '7 days' })).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await expect(page).toHaveURL(/\/sensors\?range=7d$/);
    await expect(page.getByRole('tab', { name: '7 days' })).toHaveAttribute('aria-selected', 'true');
  });

  test('the range switch updates the URL and the axis', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('chart-temperature').getByText('Now')).toBeVisible();
    await page.getByRole('tab', { name: '30 days' }).click();
    await expect(page).toHaveURL(/range=30d/);
    await expect(page.getByTestId('chart-temperature').getByText(/^(Oct|Nov) \d+$/).first()).toBeVisible();
    await page.getByRole('tab', { name: '24 hours' }).click();
    await expect(page).toHaveURL(/\/sensors$/);
  });

  test('cards sit in two columns on desktop and one on narrow web, without horizontal scroll', async ({ page }) => {
    await open(page);
    const { width } = page.viewportSize()!;
    const boxes = await Promise.all(METRICS.map((m) => box(page, `sensor-card-${m}`)));
    if (width >= 768) {
      expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(1);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width);
      expect(boxes[2].y).toBeGreaterThan(boxes[0].y + boxes[0].height);
    } else {
      expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test('offline fixture shows what to try and the last known readings', async ({ page }) => {
    await open(page, '?fixture=offline');
    await expect(page.getByTestId('sensors-offline')).toBeVisible();
    await expect(page.getByText(/sensor node is offline/)).toBeVisible();
    await expect(page.getByText('Restart the sensor node')).toBeVisible();
    await expect(page.getByTestId('last-known').getByText('23.4 °C')).toBeVisible();
    await expect(page.getByRole('tab', { name: '24 hours' })).toHaveCount(0);
  });

  test('uncalibrated soil shows the raw value and a Calibrate button', async ({ page }) => {
    await open(page, '?fixture=uncalibrated');
    const soil = page.getByTestId('sensor-card-soil');
    await expect(soil.getByTestId('soil-not-calibrated')).toBeVisible();
    await expect(soil.getByText('raw', { exact: true })).toBeVisible();
    await soil.getByRole('button', { name: 'Calibrate' }).click();
    await expect(page).toHaveURL(/\/calibrate$/);
  });

  test('a failed read shows a dash and when it failed, without a calibration prompt', async ({ page }) => {
    await open(page, '?fixture=null-reads');
    await expect(page.getByTestId('sensor-value-soil')).toHaveText('—');
    await expect(page.getByTestId('sensor-hardware-soil')).toContainText('Read failed at');
    await expect(page.getByTestId('sensor-hardware-temperature')).toContainText('Read failed at');
    await expect(page.getByTestId('soil-not-calibrated')).toHaveCount(0);
  });
});

test.describe('Sensors Figma', () => {
  test.beforeEach(({}, info) => {
    test.skip(!['fhd-1920', 'mbp-1512'].includes(info.project.name), 'Figma frames exist at 1920 and 1512 only');
  });

  test('matches 227:7830 / 227:8145 outside live data', async ({ page }, info) => {
    const width = page.viewportSize()!.width;
    await open(page);
    // Fixture readings differ from the Figma sample, so each card's value row, chart and footer
    // text are masked; the deferred header controls, Export CSV and the shell-owned sidebar too.
    const masks: Rect[] = [{ x: 0, y: 0, width: width === 1920 ? 272 : 248, height: page.viewportSize()!.height }];
    masks.push({ x: width - 360, y: 0, width: 360, height: 180 });
    for (const m of METRICS) {
      const card = await box(page, `sensor-card-${m}`);
      masks.push({ x: card.x + 16, y: card.y + 56, width: card.width - 32, height: card.height - 70 });
      masks.push({ x: card.x + card.width - 180, y: card.y + 10, width: 150, height: 40 });
    }
    const filter = await box(page, 'live-chip');
    masks.push({ x: filter.x, y: filter.y, width: filter.width + 10, height: filter.height });
    const share = await figmaDiff(page, `Sensors-${width}`, info.outputDir, { masks });
    console.log(`Sensors-${width}: ${(share * 100).toFixed(2)} % differs outside live data`);
    expect(share).toBeLessThan(FIGMA_MAX_DIFF);

    const soil = await box(page, 'sensor-card-soil');
    const light = await box(page, 'sensor-card-light');
    expect(light.x - (soil.x + soil.width)).toBe(24);
    expect(soil.height).toBeGreaterThanOrEqual(width === 1920 ? 412 : 392);
    expect(await box(page, 'chart-soil')).toMatchObject({ height: width === 1920 ? 216 : 196 });
  });
});
