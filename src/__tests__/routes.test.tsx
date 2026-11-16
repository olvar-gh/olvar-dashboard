import { renderRouter } from 'expo-router/testing-library';

// Renders the real src/app route tree, so each URL from PLAN §5.3 must resolve.
const routes: [url: string, text: string][] = [
  ['/', 'Home'],
  ['/sensors', 'Sensors'],
  ['/timeline', 'Timeline'],
  ['/chat', 'Chat'],
  ['/calibrate', 'Soil calibration'],
  ['/sign-in', 'Sign in'],
  ['/settings', 'Settings'],
  ['/settings/plant', 'Plant profile'],
  ['/settings/care-targets', 'Care targets'],
  ['/settings/devices', 'Devices & calibration'],
  ['/settings/account', 'Account'],
  ['/gallery', 'Gallery'],
];

describe('route skeleton', () => {
  it.each(routes)('resolves %s', async (url, text) => {
    const screen = await renderRouter('./src/app', { initialUrl: url });
    expect(screen.getPathname()).toBe(url);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('shows the not-found screen for unknown paths', async () => {
    const screen = await renderRouter('./src/app', { initialUrl: '/nope' });
    expect(screen.getByText('This page doesn’t exist.')).toBeTruthy();
  });
});
