import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 320, height: 720 } });

test('a cold load of /settings/devices brings the Devices card into view once the cards above load', async ({ page }) => {
  test.skip(test.info().project.name !== 'web-narrow', 'one narrow run is enough');
  await page.goto('/settings/devices');
  const card = page.getByTestId('devices');
  await expect(card).toBeVisible();
  await expect(page.getByTestId('plant-profile-loading')).toHaveCount(0);
  await expect(page.getByTestId('care-targets-loading')).toHaveCount(0);
  await expect
    .poll(async () => (await card.boundingBox())?.y ?? Infinity, { timeout: 5000 })
    .toBeLessThan(720 / 2);
});
