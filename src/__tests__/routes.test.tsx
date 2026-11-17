import { screen } from 'expo-router/testing-library';

import { renderApp } from '@/components/shell/testing/render-app';

// Renders the real src/app route tree, so each URL from PLAN §5.3 must resolve inside the shell.
const routes: [url: string, title: string, testID?: string][] = [
  ['/', 'Home'],
  ['/sensors', 'Sensors'],
  ['/timeline', 'Timeline'],
  ['/chat', 'Chat'],
  ['/calibrate', 'Soil calibration'],
  ['/settings', 'Care targets', 'settings-home'],
  ['/settings/plant', 'Location', 'settings-plant-screen'],
  ['/settings/care-targets', 'Use preset', 'care-targets-screen'],
  ['/settings/devices', 'Sensor node', 'devices-screen'],
  ['/settings/account', 'Change Password', 'account-screen'],
  ['/settings/password', 'Update Password', 'password-screen'],
  ['/settings/timezone', 'Asia/Seoul (GMT+9)', 'timezone-screen'],
];

describe('route skeleton', () => {
  it.each(routes)('resolves %s inside the shell', async (url, title, testID = 'screen-placeholder') => {
    const app = await renderApp(url);
    expect(app.getPathname()).toBe(url);
    // Native tabs keep every tab mounted, so the other tabs' placeholders render too.
    expect((await screen.findAllByTestId(testID)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(title)).length).toBeGreaterThan(0);
  });

  it('resolves the sign-in page when signed out', async () => {
    const app = await renderApp('/sign-in', { signedIn: false });
    expect(app.getPathname()).toBe('/sign-in');
    expect(await screen.findByTestId('sign-in')).toBeTruthy();
  });

  it('resolves the gallery', async () => {
    await renderApp('/gallery');
    expect(await screen.findByTestId('gallery')).toBeTruthy();
  });

  it('shows the not-found screen for unknown paths', async () => {
    await renderApp('/nope');
    expect(screen.getByText('This page doesn’t exist.')).toBeTruthy();
  });
});
