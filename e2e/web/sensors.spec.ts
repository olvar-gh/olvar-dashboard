import { expect, test, type Page } from '@playwright/test';

// T8 Sensors on the fixtures build.

const METRICS = ['soil', 'light', 'temperature', 'humidity'] as const;
const FIXED_NOW = new Date('2026-11-17T05:00:00Z');

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
    // The fixtures generate history back from the browser clock, so the date labels need a fixed one.
    await page.clock.install({ time: FIXED_NOW });
    await open(page);
    await expect(page.getByTestId('chart-temperature').getByText('Now')).toBeVisible();
    await page.getByRole('tab', { name: '30 days' }).click();
    await expect(page).toHaveURL(/range=30d/);
    await expect(page.getByTestId('chart-temperature').getByText(/^(Oct|Nov) \d+$/).first()).toBeVisible();
    await page.getByRole('tab', { name: '24 hours' }).click();
    await expect(page).toHaveURL(/\/sensors$/);
  });

  for (const range of ['7d', '30d'] as const) {
    test(`${range} charts show date labels that do not overlap`, async ({ page }) => {
      await page.clock.install({ time: FIXED_NOW });
      await open(page, `?range=${range}`);
      for (const m of METRICS) {
        const labels = page.getByTestId(`chart-${m}`).getByText(/^(Oct|Nov) \d+$|^Now$/);
        await expect(labels.first()).toBeVisible();
        const boxes = (await Promise.all((await labels.all()).map((l) => l.boundingBox()))).map((b) => b!);
        expect(boxes.length, `${m} labels`).toBeGreaterThanOrEqual(range === '7d' ? 3 : 2);
        boxes.sort((a, b) => a.x - b.x);
        for (let i = 1; i < boxes.length; i++) {
          expect(boxes[i].x, `${m} label ${i}`).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width);
        }
      }
    });
  }

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

  test('card titles show in full at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 874 });
    for (const fixture of ['', '?fixture=uncalibrated']) {
      await open(page, fixture);
      for (const m of METRICS) {
        const title = page.getByTestId(`sensor-card-${m}`).getByRole('heading');
        const clipped = await title.evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
        expect(clipped, `${m} title clipped`).toBe(false);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
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
    await expect(page.getByTestId('sensor-value-soil')).toHaveText('-');
    await expect(page.getByTestId('sensor-hardware-soil')).toContainText('Read failed at');
    await expect(page.getByTestId('sensor-hardware-temperature')).toContainText('Read failed at');
    await expect(page.getByTestId('soil-not-calibrated')).toHaveCount(0);
  });
});

test.describe('Sensors desktop layout', () => {
  test.beforeEach(({}, info) => {
    test.skip(!['fhd-1920', 'mbp-1512'].includes(info.project.name), 'the layout is measured at 1920 and 1512');
  });

  test('cards and charts follow the 1920 / 1512 layout', async ({ page }) => {
    const width = page.viewportSize()!.width;
    await open(page);
    const soil = await box(page, 'sensor-card-soil');
    const light = await box(page, 'sensor-card-light');
    expect(light.x - (soil.x + soil.width)).toBe(24);
    expect(soil.height).toBeGreaterThanOrEqual(width === 1920 ? 412 : 392);
    expect(await box(page, 'chart-soil')).toMatchObject({ height: width === 1920 ? 216 : 196 });
  });
});
