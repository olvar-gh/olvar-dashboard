import { expect, test, type Page } from '@playwright/test';

import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from '../../src/data/fixtures/generate';
import { figmaDiff, type Rect } from './figma';

// T6 shell and sign-in on the fixtures build.

const FIGMA_MAX_DIFF = 0.08;

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

  for (const path of ['/sensors', '/timeline', '/chat', '/settings', '/settings/account']) {
    test(`deep link ${path} survives a reload`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
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

test.describe('Figma', () => {
  test.beforeEach(({}, info) => {
    test.skip(!['fhd-1920', 'mbp-1512'].includes(info.project.name), 'Figma frames exist at 1920 and 1512 only');
  });

  test('sign in matches 227:10075 / 227:10095', async ({ page }, info) => {
    const width = page.viewportSize()!.width;
    await page.goto('/sign-in?session=signed-out');
    await page.getByLabel('Password').fill('••••••••••');
    await ready(page);
    const form = (await page.getByRole('form').boundingBox())!;
    // The form is compared on its own below; here the brand panel and page background count.
    const masks: Rect[] = [{ x: form.x, y: form.y, width: form.width, height: form.height + 36 }];
    const share = await figmaDiff(page, `SignIn-${width}`, info.outputDir, { masks });
    console.log(`SignIn-${width}: ${(share * 100).toFixed(2)} % differs outside the form`);
    expect(share).toBeLessThan(FIGMA_MAX_DIFF);

    const panel = (await page.getByTestId('brand-panel').boundingBox())!;
    expect(panel.width).toBe(width === 1920 ? 800 : 672);
    expect(form.width).toBe(360);
    expect(Math.round(form.x)).toBe(Math.round(panel.width + (width - panel.width - 360) / 2));
  });

  test('the sign-in form sits on the Figma form', async ({ page }, info) => {
    const width = page.viewportSize()!.width;
    await page.goto('/sign-in?session=signed-out');
    await page.getByLabel('Password').fill('••••••••••');
    await ready(page);
    const figma = width === 1920 ? { x: 1180, y: 351 } : { x: 912, y: 302 };
    const form = (await page.getByRole('form').boundingBox())!;
    expect(Math.abs(form.x - figma.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(form.y - figma.y)).toBeLessThanOrEqual(1);
    // Only the subtitle differs: it cannot name the plant before sign-in.
    const share = await figmaDiff(page, `SignIn-${width}`, `${info.outputDir}/form`, {
      clip: { ...figma, width: 360, height: 343 },
      masks: [{ x: figma.x, y: figma.y + 105, width: 360, height: 21 }],
    });
    console.log(`SignIn-${width} form: ${(share * 100).toFixed(2)} % differs`);
    expect(share).toBeLessThan(FIGMA_MAX_DIFF);
  });

  test('sidebar matches the Home frame sidebar', async ({ page }, info) => {
    const width = page.viewportSize()!.width;
    await page.goto('/');
    await expect(page.getByTestId('gateway-status')).toBeVisible();
    await ready(page);
    const w = width === 1920 ? 272 : 248;
    // The plant switcher chevron, search and nav (shifted up without search) are masked; the
    // gateway footer sits on the frame's bottom edge, which is 1024 high in the 1512 export.
    const share = await figmaDiff(page, `Home-${width}`, info.outputDir, {
      clip: { x: 0, y: 0, width: w, height: 300 },
      masks: [
        { x: 180, y: 20, width: 60, height: 40 },
        { x: 0, y: 64, width: w, height: 236 },
      ],
    });
    console.log(`Home-${width} sidebar top: ${(share * 100).toFixed(2)} % differs`);
    expect(share).toBeLessThan(FIGMA_MAX_DIFF);
  });
});
