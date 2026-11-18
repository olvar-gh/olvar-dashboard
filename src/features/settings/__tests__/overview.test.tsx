import { QueryClient } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DataProvider } from '@/data';
import { createFixtureSource } from '@/data/source/fixtures';

import { SettingsOverview } from '../web/SettingsOverview';

jest.mock('../web/SettingsFrame', () => ({ SettingsFrame: ({ children }: { children: ReactNode }) => children }));
jest.mock('../web/PlantProfileCard', () => ({ PlantProfileCard: () => null }));
jest.mock('../web/CareTargetsCard', () => ({ CareTargetsCard: () => null }));
jest.mock('../web/DevicesCard', () => ({ DevicesCard: () => null }));

it('scrolls on the initial layout only, not when a query refetches after a save', async () => {
  const source = createFixtureSource({ days: 2 });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const scrollTo = jest.fn();
  const saved = globalThis.scrollTo;
  globalThis.scrollTo = scrollTo as never;
  try {
    await render(
      <DataProvider source={source} queryClient={queryClient}>
        <SettingsOverview active="plant" />
      </DataProvider>,
    );
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(2));
    const settled = scrollTo.mock.calls.length;

    // A saved range changes the thresholds key; a slow answer leaves the new query pending a while.
    const real = source.getEffectiveThresholds.bind(source);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    source.getEffectiveThresholds = jest.fn(async (...args: Parameters<typeof real>) => {
      await gate;
      return real(...args);
    });
    await act(async () => {
      await source.updatePlant('p', { threshold_overrides: { soil_pct: { ok_low: 30 } } });
      await queryClient.invalidateQueries({ queryKey: ['plant'] });
    });
    await waitFor(() => expect(source.getEffectiveThresholds).toHaveBeenCalled());
    await act(async () => release());
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(scrollTo).toHaveBeenCalledTimes(settled);
  } finally {
    globalThis.scrollTo = saved;
    source.stop();
    queryClient.clear();
  }
});
