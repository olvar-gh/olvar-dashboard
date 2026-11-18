import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { RANGES, type Range } from './model';

/** The selected range lives in the URL (`/sensors?range=7d`) so it survives reloads and deep links. */
export function useRangeParam(): [Range, (next: Range) => void] {
  const { range } = useLocalSearchParams<{ range?: string }>();
  const router = useRouter();
  const value = RANGES.includes(range as Range) ? (range as Range) : '24h';
  const set = useCallback((next: Range) => router.setParams({ range: next === '24h' ? undefined : next }), [router]);
  return [value, set];
}
