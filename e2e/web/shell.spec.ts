import { expect, test, type Page } from '@playwright/test';

import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from '../../src/data/fixtures/generate';

// T6 shell and sign-in on the fixtures build.

const tierOf = (width: number) => (width >= 1728 ? 'xl' : width >= 1280 ? 'lg' : width >= 768 ? 'md' : 'compact');
const sidebarWidth = { xl: 272, lg: 248, md: 72, compact: 0 } as const;

async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

test.describe('session gate', () => {
  test('signed out, a deep link goes to sign in and back after signing in', async ({ page }) => {
    await page.goto('/timeline?session=signed-out');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Ftimeline$/);
    await page.getByLabel('Email').fill(FIXTURE_EMAIL);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
    await page.getByLabel('Password').fill(FIXTURE_PASSWORD);
    await page.getByLabel('Password').press('Enter');
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.getByRole('heading', { name: 'Timeline', level: 1 })).toBeVisible();
  });

  for (const next of ['/\\evil.example', '/\\/evil.example', '/..//evil.example', '/\t/evil.example']) {
    test(`a return path ${JSON.stringify(next)} that leaves the origin goes Home`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`/sign-in?session=signed-out&next=${encodeURIComponent(next)}`);
      await page.getByLabel('Email').fill(FIXTURE_EMAIL);
      await page.getByLabel('Password').fill(FIXTURE_PASSWORD);
      await page.getByLabel('Password').press('Enter');
      await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
      await expect(page.getByTestId('home-screen')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('signed in, sign-in redirects into the app', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/$/);
  });

  const settingsPage: Record<string, string> = { '/settings': 'settings-plant', '/settings/account': 'settings-account' };
  for (const path of ['/timeline', '/chat', '/settings', '/settings/account']) {
    test(`deep link ${path} survives a reload`, async ({ page }) => {
      await page.goto(path);
      const ready = () => (settingsPage[path] ? page.getByTestId(settingsPage[path]) : page.getByRole('heading', { level: 1 }).first());
      await expect(ready()).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(ready()).toBeVisible();
    });
  }
});

test.describe('desktop shell', () => {
  test('sidebar and content follow the width tier', async ({ page }) => {
    await page.goto('/');
    const { width } = page.viewportSize()!;
    const tier = tierOf(width);
    if (tier === 'compact') {
      await expect(page.getByTestId('sidebar')).toHaveCount(0);
      await expect(page.getByTestId('bottom-bar')).toBeVisible();
      return;
    }
    const sidebar = await page.getByTestId('sidebar').boundingBox();
    expect(sidebar?.width).toBe(sidebarWidth[tier]);
    const header = await page.getByRole('heading', { level: 1 }).first().boundingBox();
    expect(header?.x).toBe(sidebarWidth[tier] + { xl: 48, lg: 32, md: 24 }[tier]);
    const card = await page.getByTestId('home-screen').locator('> div').first().boundingBox();
    if (tier === 'xl') expect(card?.width).toBe(Math.min(1552, width - 368));
    if (tier === 'lg') expect(card?.width).toBe(width - 312);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);
  });

  test('the sidebar marks the current page and navigates', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    await nav.getByRole('link', { name: 'Sensors' }).click();
    await expect(page).toHaveURL(/\/sensors$/);
    await expect(nav.getByRole('link', { name: 'Sensors' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
  });

  test('the bottom bar keeps every tab on screen down to 320 px', async ({ page }, info) => {
    test.skip(info.project.name !== 'web-narrow', 'compact web only');
    for (const width of [402, 360, 320]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/');
      const bar = page.getByTestId('bottom-bar');
      for (const label of ['Home', 'Sensors', 'Timeline', 'Chat']) {
        const box = (await bar.getByRole('link', { name: label }).boundingBox())!;
        expect(box.x, `${label} at ${width}`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${label} at ${width}`).toBeLessThanOrEqual(width);
      }
    }
  });

  test('pages scroll as a document, never fitted to the viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-screen')).toBeVisible();
    const viewport = page.viewportSize()!;
    await page.getByTestId('home-screen').evaluate((el) => {
      const tall = document.createElement('div');
      tall.style.height = '3000px';
      el.firstElementChild!.appendChild(tall);
    });
    const metrics = await page.evaluate(() => {
      window.scrollTo(0, 1000);
      return { height: document.documentElement.scrollHeight, scrollY: window.scrollY };
    });
    expect(metrics.height).toBeGreaterThan(viewport.height + 2000);
    expect(metrics.scrollY).toBe(1000);
    if (tierOf(viewport.width) !== 'compact') {
      expect((await page.getByTestId('sidebar').boundingBox())?.y).toBe(0);
    }
  });
});

test.describe('Sign-in layout', () => {
  test.beforeEach(({}, info) => {
    test.skip(!['fhd-1920', 'mbp-1512'].includes(info.project.name), 'the layout is measured at 1920 and 1512');
  });

  test('brand panel and form follow the 1920 / 1512 layout', async ({ page }) => {
    const width = page.viewportSize()!.width;
    await page.goto('/sign-in?session=signed-out');
    await ready(page);
    const form = (await page.getByRole('form').boundingBox())!;
    const panel = (await page.getByTestId('brand-panel').boundingBox())!;
    expect(panel.width).toBe(width === 1920 ? 800 : 672);
    expect(form.width).toBe(360);
    expect(Math.round(form.x)).toBe(Math.round(panel.width + (width - panel.width - 360) / 2));
    const designed = width === 1920 ? { x: 1180, y: 351 } : { x: 912, y: 302 };
    expect(Math.abs(form.x - designed.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(form.y - designed.y)).toBeLessThanOrEqual(1);
  });
});
