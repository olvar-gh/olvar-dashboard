import { createContext, useContext, useEffect, useState } from 'react';

import type { DataSource } from './source';

export const DataSourceContext = createContext<DataSource | null>(null);

export function useDataSource(): DataSource {
  const source = useContext(DataSourceContext);
  if (!source) throw new Error('useDataSource must be used inside <DataProvider>');
  return source;
}

/** The current time, re-read every `intervalMs` and at `until` (when given) so derived text stays current. */
export function useNow(intervalMs: number, until?: Date | null): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  const untilMs = until?.getTime();
  useEffect(() => {
    if (untilMs == null) return;
    const delay = untilMs - Date.now();
    if (delay < 0) return;
    const id = setTimeout(() => setNow(new Date()), delay + 1);
    return () => clearTimeout(id);
  }, [untilMs]);
  return now;
}
