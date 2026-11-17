import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// Unsaved Settings edits on web. Each Settings section is its own route, so moving between them
// remounts the cards; keeping drafts here lets an edit survive that. They are dropped when the
// owner leaves Settings altogether.

const drafts = new Map<string, unknown>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDrafts() {
  if (drafts.size === 0) return;
  drafts.clear();
  emit();
}

/**
 * A draft value: kept in the shared store under `key` when `keep` is set (web Settings), else
 * local state that ends with the screen (iOS: going back discards the edit).
 */
export function useDraft<T>(key: string, keep: boolean, initial: T): [T, (value: T) => void] {
  const [local, setLocal] = useState<T>(initial);
  const stored = useSyncExternalStore(
    subscribe,
    () => drafts.get(key),
    () => drafts.get(key),
  );
  const setStored = useCallback(
    (value: T) => {
      if (value === initial) drafts.delete(key);
      else drafts.set(key, value);
      emit();
    },
    [key, initial],
  );
  if (!keep) return [local, setLocal];
  return [(drafts.has(key) ? (stored as T) : initial), setStored];
}

/** Paths that count as staying in Settings: its sections and the calibration overlay over them. */
export function isSettingsPath(pathname: string): boolean {
  return /^\/(settings|calibrate)(\/|$)/.test(pathname);
}

/**
 * Marks a web Settings page. Switching sections unmounts one page and mounts the next, possibly a
 * moment later, so drafts are dropped only once the URL has left Settings.
 */
export function useDraftScope() {
  useEffect(
    () => () => {
      setTimeout(() => {
        const pathname = (globalThis as { location?: { pathname?: string } }).location?.pathname;
        if (pathname === undefined || !isSettingsPath(pathname)) clearDrafts();
      }, 0);
    },
    [],
  );
}
