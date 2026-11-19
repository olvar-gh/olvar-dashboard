import { expect, test, type Page } from '@playwright/test';

// The calibration dialog's focus and backdrop on the fixtures build: the modal focus trap must not park focus
// on the backdrop (no ring, so focus looked lost), and the first Tab lands on a dialog control
// that shows its focus ring.

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return {
      testId: el.getAttribute('data-testid'),
      label: el.getAttribute('aria-label') ?? el.textContent,
      inDialog: !!el.closest('[data-testid="calibration"]'),
      outline: getComputedStyle(el).outlineStyle,
    };
  });

test.beforeEach(({}, info) => {
  test.skip(info.project.name === 'web-narrow', 'desktop dialog');
});

for (const how of ['mouse', 'keyboard'] as const) {
  test(`opened by ${how}, focus stays on dialog controls with a visible ring`, async ({ page }) => {
    await page.goto('/settings');
    const recalibrate = page.getByRole('button', { name: 'Recalibrate' });
    if (how === 'mouse') await recalibrate.click();
    else {
      await recalibrate.focus();
      await page.keyboard.press('Enter');
    }
    // Focus moves into the dialog as soon as it renders, before the fade-in ends and the data loads.
    await expect(page.getByTestId('calibration')).toBeAttached();
    await expect.poll(async () => (await focused(page)).inDialog, { timeout: 250 }).toBe(true);
    expect((await focused(page)).testId).not.toBe('calibration-backdrop');
    await page.keyboard.press('Tab');
    const first = await focused(page);
    expect(first).toMatchObject({ inDialog: true, label: 'Cancel' });
    expect(first.outline).not.toBe('none');

    await expect(page.getByText('Live reading')).toBeVisible();
    // Wrapping past the last control comes back into the dialog, never onto the backdrop.
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      const now = await focused(page);
      expect(now.testId).not.toBe('calibration-backdrop');
      expect(now.inDialog).toBe(true);
    }
  });
}

test.describe('backdrop', () => {
  const open = async (page: Page) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Recalibrate' }).click();
    await expect(page.getByText('Live reading')).toBeVisible();
  };
  const dialog = (page: Page) => page.getByTestId('calibration');

  test('a click on the dialog keeps it open; a click on the scrim closes it', async ({ page }) => {
    await open(page);
    await page.getByText('Live reading').click();
    await expect(dialog(page)).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog(page)).toHaveCount(0);
  });

  test('a drag from the dialog that ends on the scrim keeps it open', async ({ page }) => {
    await open(page);
    const box = (await page.getByText('Live reading').boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(8, 8, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(dialog(page)).toBeVisible();
  });

  test('in a short window the first scrim click closes it', async ({ page }) => {
    await page.setViewportSize({ width: 1050, height: 400 });
    await open(page);
    await page.mouse.click(8, 8);
    await expect(dialog(page)).toHaveCount(0);
  });

  test('a touch swipe across the scrim does not close it', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 1512, height: 982 } });
    const page = await context.newPage();
    await open(page);
    const cdp = await context.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 20 }] });
    await touch('touchStart', 40);
    for (const x of [80, 140, 200, 260]) await touch('touchMove', x);
    await touch('touchEnd', 260);
    await page.waitForTimeout(300);
    await expect(dialog(page)).toBeVisible();
    await context.close();
  });
});
