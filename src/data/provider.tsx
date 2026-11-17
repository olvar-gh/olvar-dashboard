import { focusManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { DataSourceContext, useDataSource } from './context';
import { keys } from './keys';
import { useLiveUpdates } from './realtime';
import type { DataSource } from './source';
import { createDataSource } from './source/create';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2 },
      mutations: { retry: 0 },
    },
  });
}

function AuthSync() {
  const source = useDataSource();
  const qc = useQueryClient();
  useEffect(
    () =>
      source.auth.onChange((session) => {
        if (!session) qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
        qc.setQueryData(keys.session, session);
      }),
    [source, qc],
  );
  return null;
}

function LiveUpdates() {
  useLiveUpdates();
  return null;
}

function useNativeFocus() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setEventListener((setFocused) => {
      const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
      return () => sub.remove();
    });
  }, []);
}

/**
 * Data layer root: QueryClient, the DataSource (Supabase or fixtures, from env), session sync
 * and live updates. Mount once at the app root; tests pass their own `source`/`queryClient`.
 */
export function DataProvider({
  source,
  queryClient,
  children,
}: {
  source?: DataSource;
  queryClient?: QueryClient;
  children: ReactNode;
}) {
  const [src] = useState<DataSource>(() => source ?? createDataSource());
  const [qc] = useState(() => queryClient ?? createQueryClient());
  useNativeFocus();
  return (
    <QueryClientProvider client={qc}>
      <DataSourceContext.Provider value={src}>
        <AuthSync />
        <LiveUpdates />
        {children}
      </DataSourceContext.Provider>
    </QueryClientProvider>
  );
}
