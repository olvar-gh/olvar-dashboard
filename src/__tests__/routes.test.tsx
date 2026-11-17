import { screen } from 'expo-router/testing-library';

import { renderApp } from '@/components/shell/testing/render-app';

// Renders the real src/app route tree, so each URL from PLAN §5.3 must resolve inside the shell.
const routes: [url: string, title: string][] = [
  ['/', 'Home'],
  ['/sensors', 'Sensors'],
  ['/timeline', 'Timeline'],
  ['/chat', 'Chat'],
  ['/calibrate', 'Soil calibration'],
  ['/settings', 'Settings'],
  ['/settings/plant', 'Plant profile'],
  ['/settings/care-targets', 'Care targets'],
  ['/settings/devices', 'Devices & calibration'],
  ['/settings/account', 'Account'],
];

// A built screen puts its title in the native header, which Jest does not draw, so it is found by testID.
const screenTestIds: Record<string, string> = { '/sensors': 'sensors-screen' };

describe('route skeleton', () => {
  it.each(routes)('resolves %s inside the shell', async (url, title) => {
    const screenTestId = screenTestIds[url];
    const app = await renderApp(url);
    expect(app.getPathname()).toBe(url);
    // Native tabs keep every tab mounted, so the other tabs' placeholders render too.
    expect((await screen.findAllByTestId('screen-placeholder')).length).toBeGreaterThan(0);
    if (screenTestId) expect(await screen.findByTestId(screenTestId)).toBeTruthy();
    else expect(screen.getAllByText(title).length).toBeGreaterThan(0);
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
