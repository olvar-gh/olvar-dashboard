import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from '@/data/fixtures/generate';

import { renderApp } from '../testing/render-app';

describe('session gate', () => {
  it('sends a signed-out deep link to sign in, then back after signing in', async () => {
    const app = await renderApp('/timeline', { signedIn: false });
    await waitFor(() => expect(app.getPathname()).toBe('/sign-in'));
    expect(app.getSearchParams()).toEqual({ next: '/timeline' });

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), FIXTURE_EMAIL);
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), FIXTURE_PASSWORD);
    await fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => expect(app.getPathname()).toBe('/timeline'));
    expect(await screen.findByTestId('timeline')).toBeTruthy();
  });

  it('keeps a signed-out visitor of / on sign in without a next parameter', async () => {
    const app = await renderApp('/', { signedIn: false });
    await waitFor(() => expect(app.getPathname()).toBe('/sign-in'));
    expect(app.getSearchParams()).toEqual({});
  });

  it('sends a signed-in visitor of sign-in into the app', async () => {
    const app = await renderApp('/sign-in');
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('returns to sign in when the owner signs out', async () => {
    const app = await renderApp('/sensors');
    expect(await screen.findByTestId('sensors-screen')).toBeTruthy();
    await act(async () => {
      await app.source.auth.signOut();
    });
    await waitFor(() => expect(app.getPathname()).toBe('/sign-in'));
  });

  it('shows the setup empty state when there is no plant row', async () => {
    await renderApp('/', { noPlant: true });
    expect(await screen.findByTestId('no-plant')).toBeTruthy();
    expect(screen.getByText('No plant set up yet')).toBeTruthy();
    expect(screen.queryByTestId('screen-placeholder')).toBeNull();
  });
});
