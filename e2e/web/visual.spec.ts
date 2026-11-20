import { expect, test, type Page } from '@playwright/test';

// Visual suite: every v1 screen on the fixtures build at the two desktop design sizes, pinned with a
// full-page baseline. Update baselines with `npm run test:visual:update`.

const DESKTOP_PROJECTS = ['fhd-1920', 'mbp-1512'];

/** The frames' clocks in Asia/Seoul: Home is Fri Nov 6 14:32, the rest Sat Nov 7 14:30. */
const FRI_1432 = new Date('2026-11-06T05:32:00Z');
const SAT_1430 = new Date('2026-11-07T05:30:00Z');

type Screen = {
  name: string;
  at: Date;
  open: (page: Page) => Promise<void>;
  /** Waits for the data and charts; also run again after a resize, since charts re-measure. */
  ready: (page: Page) => Promise<void>;
};

const go = (path: string) => async (page: Page) => {
  await page.goto(path);
};

const screens: Screen[] = [
  {
    name: 'SignIn',
    at: SAT_1430,
    open: go('/sign-in?session=signed-out'),
    ready: async (page) => {
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    },
  },
  {
    name: 'Home',
    at: FRI_1432,
    open: go('/'),
    ready: async (page) => {
      await expect(page.getByTestId('sensor-soil-value')).toHaveText('42');
      await expect(page.getByTestId('chart-light').getByText('23:00')).toBeVisible();
      await expect(page.getByTestId('chart-soil')).toBeVisible();
    },
  },
  {
    name: 'Sensors',
    at: SAT_1430,
    open: go('/sensors'),
    ready: async (page) => {
      for (const metric of ['soil', 'light', 'temperature', 'humidity']) {
        await expect(page.getByTestId(`chart-${metric}`).getByText('Now')).toBeVisible();
      }
    },
  },
  {
    name: 'Timeline',
    at: SAT_1430,
    open: go('/timeline'),
    ready: async (page) => {
      await expect(page.getByText('TODAY · SAT, NOV 7')).toBeVisible();
      await expect(page.getByTestId('week-chart-card').getByText('Sat 7', { exact: true })).toBeVisible();
    },
  },
  {
    name: 'Chat',
    at: SAT_1430,
    open: go('/chat'),
    ready: async (page) => {
      await expect(page.getByTestId('chat-screen')).toBeVisible();
      await expect(page.getByPlaceholder('Ask Sparks anything…')).toBeVisible();
    },
  },
  {
    name: 'Calibration',
    at: SAT_1430,
    open: async (page) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: 'Recalibrate' }).click();
    },
    ready: async (page) => {
      await expect(page.getByTestId('calibration')).toBeVisible();
      await expect(page.getByText('Live reading')).toBeVisible();
    },
  },
  {
    name: 'Settings',
    at: SAT_1430,
    open: go('/settings'),
    ready: async (page) => {
      await expect(page.getByTestId('settings-plant')).toBeVisible();
      await expect(page.getByTestId('plant-profile-loading')).toHaveCount(0);
      await expect(page.getByTestId('care-targets-loading')).toHaveCount(0);
    },
  },
  {
    name: 'Account',
    at: SAT_1430,
    open: go('/settings/account'),
    ready: async (page) => {
      await expect(page.getByTestId('settings-account')).toBeVisible();
      await expect(page.getByLabel('Name')).toHaveValue('Mina');
    },
  },
];

for (const screen of screens) {
  test.describe(screen.name, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(!DESKTOP_PROJECTS.includes(info.project.name), 'baselines exist at 1920 and 1512 only');
      await page.clock.setFixedTime(screen.at);
      await screen.open(page);
      await screen.ready(page);
      await page.evaluate(() => document.fonts.ready);
    });

    // Playwright's fullPage capture resizes the page mid-shot and the charts can catch it blank,
    // so the viewport grows to the document height first and the screen settles again.
    test('full-page baseline', async ({ page }) => {
      const { width } = page.viewportSize()!;
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height });
      await screen.ready(page);
      await expect(page).toHaveScreenshot(`${screen.name}.png`, {
        scale: 'css',
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.001,
      });
    });
  });
}
