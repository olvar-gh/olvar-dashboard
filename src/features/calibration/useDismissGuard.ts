import { usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { confirmAlert } from '@/components/ui';

import { closeCalibration } from './useCalibrationWizard';

export const DISCARD_ALERT = {
  title: 'Discard calibration?',
  message: 'The readings you captured will be lost.',
  confirmLabel: 'Discard',
  destructive: true,
} as const;

/**
 * Keeps the native sheet from closing, by any route (Close, swipe-down, back), while captured
 * values would be lost or a save is in flight. `leave()` closes without asking, for after a save.
 */
export function useDismissGuard({ dirty, saving }: { dirty: boolean; saving: boolean }) {
  const [leaving, setLeaving] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  usePreventRemove((dirty || saving) && !leaving, ({ repeat }) => {
    if (saving) return;
    void confirmAlert(DISCARD_ALERT).then((discard) => {
      if (!discard) return;
      pending.current = repeat;
      setLeaving(true);
    });
  });

  // Runs after the render that lifted the prevention, so the removal is not blocked again.
  useEffect(() => {
    if (!leaving) return;
    const action = pending.current ?? closeCalibration;
    pending.current = null;
    action();
  }, [leaving]);

  return {
    /** The Close button: goes through the same guard as a swipe. */
    close: () => {
      if (!saving) closeCalibration();
    },
    leave: () => setLeaving(true),
  };
}
