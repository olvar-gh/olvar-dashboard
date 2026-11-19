import { router } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { hrefs } from '@/components/shell';
import { useCalibrationReadings, useDevice, useNow, usePlant, useSaveCalibration } from '@/data';
import { isCalibrated } from '@/domain/calibration';
import { formatTime } from '@/domain/format';

import {
  deriveLive,
  initialWizard,
  pairCheck,
  SAVE_FAILED,
  saveErrorMessage,
  wizardReducer,
  wizardStep,
  type Baseline,
  type CaptureStep,
} from './wizard';

const TICK_MS = 1_000;

export type LoadState = 'loading' | 'error' | 'no-device' | 'no-readings' | 'ready';

export type SubmitResult = 'saved' | 'gone' | (string & {});

type QueryState = 'pending' | 'error' | 'ok';

/**
 * Errors win over pending: a query waiting on a failed prerequisite stays pending (disabled)
 * forever. The device and readings only count as loading once their prerequisite is there.
 */
export function loadState(q: {
  plant: QueryState;
  device: QueryState;
  readings: QueryState;
  hasPlant: boolean;
  hasDevice: boolean;
  pinned: boolean;
  hasLive: boolean;
}): LoadState {
  if (q.plant === 'error' || (q.hasPlant && q.device === 'error') || (q.hasDevice && q.readings === 'error')) return 'error';
  if (q.plant === 'pending' || (q.hasPlant && q.device === 'pending')) return 'loading';
  if (!q.hasDevice) return 'no-device';
  if (q.readings === 'pending' || (q.hasLive && !q.pinned)) return 'loading';
  return q.hasLive ? 'ready' : 'no-readings';
}

export function closeCalibration() {
  if (router.canGoBack()) router.back();
  else router.replace(hrefs.settings);
}

/** Everything both calibration screens show, and the wizard actions. */
export function useCalibrationWizard() {
  const plant = usePlant();
  const device = useDevice();
  const readings = useCalibrationReadings();
  const save = useSaveCalibration();
  const now = useNow(TICK_MS);
  const [state, dispatch] = useReducer(wizardReducer, initialWizard);
  const timeZone = plant.data?.timezone ?? 'UTC';
  const rows = readings.data;
  // Read at the moment of a capture or a confirmed retake, not from the render that showed
  // the button (a confirmation alert can stay open while readings arrive).
  const latestIdRef = useRef(0);
  useEffect(() => {
    latestIdRef.current = rows?.[0]?.id ?? 0;
  }, [rows]);
  const baselineNow = (): Baseline => ({ id: latestIdRef.current, at: Date.now() });

  // Cached rows (possibly still fresh by staleTime, so no fetch on mount) would count readings
  // taken while the sheet was closed, so every session pins its baseline from its own fetch.
  const deviceId = device.data?.id;
  const { refetch: refetchReadings } = readings;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Fetches the readings and pins the baseline from them, unless one is already pinned. */
  const fetchAndPin = useCallback(async () => {
    const result = await refetchReadings();
    if (!mounted.current || result.isError) return;
    latestIdRef.current = result.data?.[0]?.id ?? 0;
    dispatch({ type: 'pin', baseline: { id: latestIdRef.current, at: Date.now() } });
  }, [refetchReadings]);

  useEffect(() => {
    if (deviceId) void fetchAndPin();
  }, [deviceId, fetchAndPin]);

  const live = rows ? deriveLive(rows, state.baseline, now, device.data?.status === 'offline') : null;
  const step = wizardStep(state);
  const check = pairCheck(state);

  const load = loadState({
    plant: plant.isError ? 'error' : plant.isPending ? 'pending' : 'ok',
    device: device.isError ? 'error' : device.isPending ? 'pending' : 'ok',
    readings: readings.isError ? 'error' : readings.isPending ? 'pending' : 'ok',
    hasPlant: plant.data != null,
    hasDevice: device.data != null,
    pinned: state.baseline != null,
    hasLive: live != null,
  });

  const retry = () => {
    void plant.refetch();
    void device.refetch();
    // The first fetch may have failed before a baseline was pinned.
    if (deviceId) void fetchAndPin();
  };

  const capture = () => {
    if (step === 'review' || live?.capture == null) return;
    save.reset();
    dispatch({ type: 'capture', step, value: live.capture, baseline: baselineNow() });
  };

  const retake = (which: CaptureStep) => {
    save.reset();
    dispatch({ type: 'retake', step: which, baseline: baselineNow() });
  };

  /**
   * Resolves `saved` once stored while this screen is still open, `gone` when it was dismissed
   * during the request (the caller must not navigate then), else the message to show.
   */
  const submit = async (): Promise<SubmitResult> => {
    const deviceId = device.data?.id;
    if (!deviceId || state.dry == null || state.wet == null) return SAVE_FAILED;
    if (!check?.ok) return check?.message ?? SAVE_FAILED;
    try {
      await save.mutateAsync({ deviceId, dryRaw: state.dry, wetRaw: state.wet });
      return mounted.current ? 'saved' : 'gone';
    } catch (e) {
      return mounted.current ? saveErrorMessage(e) : 'gone';
    }
  };

  return {
    load,
    retry,
    retrying: plant.isFetching || device.isFetching || readings.isFetching,
    device: device.data ?? null,
    calibrated: isCalibrated(device.data),
    timeZone,
    live,
    offlineSince: live?.offline
      ? formatTime(
          device.data?.status === 'offline' && device.data.status_changed_at ? device.data.status_changed_at : live.recordedAt,
          timeZone,
        )
      : null,
    state,
    step,
    check,
    canCapture: step !== 'review' && live?.capture != null,
    canSave: step === 'review' && !!check?.ok && !save.isPending,
    capture,
    retake,
    submit,
    saving: save.isPending,
    saveError: save.error ? saveErrorMessage(save.error) : null,
    dirty: state.dry != null || state.wet != null,
  };
}

export type CalibrationWizard = ReturnType<typeof useCalibrationWizard>;
