import { expect, test, type Page } from '@playwright/test';

import { figmaDiff, type Rect } from './figma';
import masks from './figma-masks.json';

// T13 visual suite: every v1 screen on the fixtures build at the two Figma desktop sizes.
// Each screen is compared with its '<Screen> / Desktop <width>' frame (first screenful, advisory
// budget per screen) and pinned with a full-page baseline. Update baselines with `npm run test:visual:update`.

const FIGMA_PROJECTS = ['fhd-1920', 'mbp-1512'];

/** The frames' clocks in Asia/Seoul: Home is Fri Nov 6 14:32, the rest Sat Nov 7 14:30. */
const FRI_1432 = new Date('2026-11-06T05:32:00Z');
const SAT_1430 = new Date('2026-11-07T05:30:00Z');

type Screen = {
  name: string;
  frames: { 1920: string; 1512: string };
  at: Date;
  open: (page: Page) => Promise<void>;
  /** Waits for the data and charts; also run again after a resize, since charts re-measure. */
  ready: (page: Page) => Promise<void>;
  masks?: (page: Page) => Promise<Rect[]>;
  /** Share of differing pixels the current build reaches; a regression past it fails. */
  budget: { 1920: number; 1512: number };
};

const go = (path: string) => async (page: Page) => {
  await page.goto(path);
};

const screens: Screen[] = [
  {
    name: 'SignIn',
    frames: { 1920: '227:10075', 1512: '227:10095' },
    at: SAT_1430,
    open: go('/sign-in?session=signed-out'),
    ready: async (page) => {
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    },
    masks: async (page) => {
      const button = (await page.getByRole('button', { name: 'Sign in' }).boundingBox())!;
      return [{ x: button.x, y: button.y + button.height, width: button.width, height: 48 }];
    },
    budget: { 1920: 0.015, 1512: 0.015 },
  },
  {
    name: 'Home',
    frames: { 1920: '226:7520', 1512: '226:7892' },
    at: FRI_1432,
    open: go('/'),
    ready: async (page) => {
      await expect(page.getByTestId('sensor-soil-value')).toHaveText('42');
      await expect(page.getByTestId('chart-light').getByText('23:00')).toBeVisible();
      await expect(page.getByTestId('chart-soil')).toBeVisible();
    },
    budget: { 1920: 0.03, 1512: 0.035 },
  },
  {
    name: 'Sensors',
    frames: { 1920: '227:7830', 1512: '227:8145' },
    at: SAT_1430,
    open: go('/sensors'),
    ready: async (page) => {
      for (const metric of ['soil', 'light', 'temperature', 'humidity']) {
        await expect(page.getByTestId(`chart-${metric}`).getByText('Now')).toBeVisible();
      }
    },
    budget: { 1920: 0.03, 1512: 0.035 },
  },
  {
    name: 'Timeline',
    frames: { 1920: '227:8461', 1512: '227:9006' },
    at: SAT_1430,
    open: go('/timeline'),
    ready: async (page) => {
      await expect(page.getByText('TODAY · SAT, NOV 7')).toBeVisible();
      await expect(page.getByTestId('week-chart-card').getByText('Sat 7', { exact: true })).toBeVisible();
    },
    budget: { 1920: 0.035, 1512: 0.04 },
  },
  {
    name: 'Chat',
    frames: { 1920: '227:9552', 1512: '227:9813' },
    at: SAT_1430,
    open: go('/chat'),
    ready: async (page) => {
      await expect(page.getByTestId('chat-screen')).toBeVisible();
      await expect(page.getByPlaceholder('Ask Sparks anything…')).toBeVisible();
    },
    budget: { 1920: 0.055, 1512: 0.065 },
  },
  {
    name: 'Calibration',
    frames: { 1920: '227:11051', 1512: '227:11599' },
    at: SAT_1430,
    open: async (page) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: 'Recalibrate' }).click();
    },
    ready: async (page) => {
      await expect(page.getByTestId('calibration')).toBeVisible();
      await expect(page.getByText('Live reading')).toBeVisible();
    },
    budget: { 1920: 0.035, 1512: 0.04 },
  },
  {
    name: 'Settings',
    frames: { 1920: '227:10136', 1512: '227:10593' },
    at: SAT_1430,
    open: go('/settings'),
    ready: async (page) => {
      await expect(page.getByTestId('settings-plant')).toBeVisible();
      await expect(page.getByTestId('plant-profile-loading')).toHaveCount(0);
      await expect(page.getByTestId('care-targets-loading')).toHaveCount(0);
    },
    budget: { 1920: 0.03, 1512: 0.035 },
  },
  {
    name: 'Account',
    frames: { 1920: '227:12148', 1512: '227:12271' },
    at: SAT_1430,
    open: go('/settings/account'),
    ready: async (page) => {
      await expect(page.getByTestId('settings-account')).toBeVisible();
      await expect(page.getByLabel('Name')).toHaveValue('Dongmin');
    },
    budget: { 1920: 0.02, 1512: 0.02 },
  },
];

const maskTable = masks as unknown as Record<string, Record<string, Rect[]>>;

for (const screen of screens) {
  test.describe(screen.name, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(!FIGMA_PROJECTS.includes(info.project.name), 'Figma desktop frames exist at 1920 and 1512 only');
      await page.clock.setFixedTime(screen.at);
      await screen.open(page);
      await screen.ready(page);
      await page.evaluate(() => document.fonts.ready);
    });

    test('first screenful against the Figma frame', async ({ page }, info) => {
      const width = page.viewportSize()!.width as 1920 | 1512;
      const frame = `${screen.name}-${width}`;
      const regions = [
        ...maskTable.common[width],
        ...(maskTable[screen.name === 'Calibration' ? 'Settings' : screen.name]?.[width] ?? []),
        ...((await screen.masks?.(page)) ?? []),
      ];
      const share = await figmaDiff(page, frame, info.outputPath('figma'), { masks: regions });
      const percent = (share * 100).toFixed(1);
      info.annotations.push({ type: 'figma-diff', description: `${frame} (${screen.frames[width]}): ${percent} %` });
      console.log(`figma-diff ${frame}: ${percent} %`);
      expect(share, `${frame} drifted further from Figma; see ${info.outputPath('figma')}`).toBeLessThanOrEqual(
        screen.budget[width],
      );
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
