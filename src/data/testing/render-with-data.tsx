import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DataProvider } from '../provider';
import type { LiveHandlers } from '../source';
import { createFixtureSource, type FixtureSourceOptions } from '../source/fixtures';

export async function renderWithData<T>(hook: () => T, options: FixtureSourceOptions = {}) {
  const source = createFixtureSource({ days: 2, ...options });
  const handlers: LiveHandlers[] = [];
  const subscribe = source.subscribe;
  source.subscribe = (target, h) => {
    handlers.push(h);
    return subscribe(target, h);
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider source={source} queryClient={queryClient}>
      {children}
    </DataProvider>
  );
  const rendered = await renderHook(hook, { wrapper });
  return { ...rendered, source, queryClient, handlers };
}

/** Advances fake timers and lets queries settle. */
export async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** Steps fake time 10 ms at a time (TanStack schedules notifications on timers) until `check` passes. */
export async function settle(check: () => boolean, rounds = 50) {
  for (let i = 0; i < rounds && !check(); i++) await advance(10);
  if (!check()) throw new Error('did not settle');
}
