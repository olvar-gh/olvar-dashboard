import { expect, test, type Page } from '@playwright/test';

// The calibration dialog's focus on the fixtures build: the modal focus trap must not park focus
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
