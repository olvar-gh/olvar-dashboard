import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import layoutJson from '../../../design/layout.json';
import { contentWidth, frames, screenLayout, screens, tierForWidth, tiers } from '../layout';
import { breakpointFor, useBreakpoint } from '../useBreakpoint';

describe('layout.ts matches design/layout.json', () => {
  it('reads tiers, frames and screens from the JSON', () => {
    expect(tiers).toEqual(layoutJson.tiers);
    expect(frames).toEqual(layoutJson.frames);
    expect(screens).toEqual(layoutJson.screens);
  });

  it('carries the measured Figma values', () => {
    expect(tiers.xl).toMatchObject({ sidebarWidth: 272, paddingX: 48, paddingTop: 40, contentMaxWidth: 1552 });
    expect(tiers.lg).toMatchObject({ sidebarWidth: 248, paddingX: 32 });
    expect(tiers.md.sidebarWidth).toBe(72);
    expect(tiers.compact).toMatchObject({ sidebarWidth: 0, paddingX: 16 });
    expect(screens.xl.home.plantCardWidth).toBe(424);
    expect(screens.lg.home.plantCardWidth).toBe(368);
    expect(screens.xl.sensors.chartHeight).toBe(216);
    expect(screens.lg.sensors.chartHeight).toBe(196);
    expect(screens.xl.chat.columns).toBe(3);
    expect(screens.lg.chat.columns).toBe(2);
    expect(screens.xl.settings.paneMaxWidth).toBe(1040);
  });
});

describe('tierForWidth', () => {
  it.each([
    [0, 'compact'],
    [402, 'compact'],
    [767, 'compact'],
    [768, 'md'],
    [1279, 'md'],
    [1280, 'lg'],
    [1512, 'lg'],
    [1727, 'lg'],
    [1728, 'xl'],
    [1920, 'xl'],
    [2560, 'xl'],
  ])('%i px is %s', (width, tier) => {
    expect(tierForWidth(width)).toBe(tier);
  });
});

describe('contentWidth', () => {
  it('matches the Figma frames', () => {
    expect(contentWidth(1920)).toBe(1552);
    expect(contentWidth(1512)).toBe(1200);
  });

  it('stays 1552 above 1920', () => {
    expect(contentWidth(2560)).toBe(1552);
  });

  it('is fluid below xl', () => {
    expect(contentWidth(1728)).toBe(1360);
    expect(contentWidth(1280)).toBe(968);
    expect(contentWidth(1024)).toBe(1024 - 72 - 48);
    expect(contentWidth(402)).toBe(370);
  });

  it('never goes negative', () => {
    expect(contentWidth(10)).toBe(0);
  });

  it('agrees with the measured page header width in each frame', () => {
    expect(contentWidth(frames.xl.width)).toBe(frames.xl.width - 272 - 2 * 48);
    expect(contentWidth(frames.lg.width)).toBe(frames.lg.width - 248 - 2 * 32);
  });
});

describe('screenLayout', () => {
  it('uses the 1920 values for xl and the 1512 values otherwise', () => {
    expect(screenLayout('xl')).toBe(screens.xl);
    expect(screenLayout('lg')).toBe(screens.lg);
    expect(screenLayout('md')).toBe(screens.lg);
  });
});

describe('useBreakpoint', () => {
  it('derives everything from the width', () => {
    expect(breakpointFor(1512)).toEqual({
      tier: 'lg',
      width: 1512,
      shell: tiers.lg,
      contentWidth: 1200,
      screens: screens.lg,
      isDesktop: true,
    });
    expect(breakpointFor(800).isDesktop).toBe(false);
  });

  it('reads the window width', async () => {
    function Probe() {
      const bp = useBreakpoint();
      return <Text>{`${bp.tier}:${bp.contentWidth}`}</Text>;
    }
    await render(<Probe />);
    // jest-expo mocks the window as a 750 px wide iPhone.
    expect(screen.getByText(/^compact:/)).toBeTruthy();
  });
});
