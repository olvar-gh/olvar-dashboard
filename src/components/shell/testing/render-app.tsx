import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { renderRouter, type RenderRouterResult } from 'expo-router/testing-library';
import type { ReactElement, ReactNode } from 'react';

import { DataProvider } from '@/data';
import type { FixtureScenario } from '@/data/fixtures/generate';
import { createFixtureSource, type FixtureSource } from '@/data/source/fixtures';

export type RenderAppOptions = {
  /** Start signed out (default signed in as the fixture owner). */
  signedIn?: boolean;
  scenario?: FixtureScenario;
  /** The gateway setup has not created the plant row. */
  noPlant?: boolean;
  /** Pin the fixture clock. */
  now?: Date;
};

export type RenderAppResult = RenderRouterResult & { source: FixtureSource; queryClient: QueryClient };

function fixtureData(options: RenderAppOptions) {
  const source = createFixtureSource({
    days: 2,
    signedIn: options.signedIn,
    scenario: options.scenario,
    now: options.now,
  });
  if (options.noPlant) source.getPlant = async () => null;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider source={source} queryClient={queryClient}>
      {children}
    </DataProvider>
  );
  return { source, queryClient, wrapper };
}

/**
 * Renders the real src/app route tree (root layout, session gate, shell) at `url` on the fixture
 * data source: no network, no keys. Screen tests use it to see their screen inside the shell.
 */
export async function renderApp(url: string, options: RenderAppOptions = {}): Promise<RenderAppResult> {
  const { source, queryClient, wrapper } = fixtureData(options);
  const rendered = await renderRouter('./src/app', { initialUrl: url, wrapper });
  return Object.assign(rendered, { source, queryClient });
}

/** Renders one component (a screen body, a card) on the fixture data source, outside the router. */
export async function renderWithFixtures(ui: ReactElement, options: RenderAppOptions = {}) {
  const { source, queryClient, wrapper } = fixtureData(options);
  const rendered = await render(ui, { wrapper });
  return Object.assign(rendered, { source, queryClient });
}
