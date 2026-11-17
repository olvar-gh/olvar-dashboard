import { screen } from 'expo-router/testing-library';

import { renderApp } from '../testing/render-app';
import { pushedStackOptions } from '../TabStack';

type State = { routes: { name: string; state?: State }[]; index?: number };

function routeNames(state: State | undefined): string[] {
  return (state?.routes ?? []).map((r) => r.name);
}

function appStack(state: State | undefined): State | undefined {
  for (const route of state?.routes ?? []) {
    if (route.name === '(app)') return route.state;
    const found = appStack(route.state);
    if (found) return found;
  }
  return undefined;
}

describe('pushed stacks', () => {
  const navigation = (keys: string[]) => ({ getState: () => ({ routes: keys.map((key) => ({ key })) }) });

  it('puts the back item on the first screen, whichever screen that is', () => {
    expect(pushedStackOptions({ route: { key: 'account' }, navigation: navigation(['account']) })).toHaveProperty(
      'unstable_headerLeftItems'
    );
    expect(
      pushedStackOptions({ route: { key: 'index' }, navigation: navigation(['index', 'account']) })
    ).toHaveProperty('unstable_headerLeftItems');
    expect(
      pushedStackOptions({ route: { key: 'account' }, navigation: navigation(['index', 'account']) })
    ).not.toHaveProperty('unstable_headerLeftItems');
  });

  it.each(['/calibrate', '/settings/account'])('a deep link to %s opens over the tabs', async (url) => {
    const app = await renderApp(url);
    expect((await screen.findAllByTestId('screen-placeholder')).length).toBeGreaterThan(0);
    const names = routeNames(appStack(app.getRouterState() as State));
    expect(names[0]).toBe('(tabs)');
    expect(names[names.length - 1]).toBe(url === '/calibrate' ? 'calibrate' : 'settings');
  });
});
