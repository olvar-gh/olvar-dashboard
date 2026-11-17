import { router } from 'expo-router';
import { useEffect, useReducer } from 'react';

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
  type CaptureStep,
} from './wizard';

const TICK_MS = 1_000;

export type LoadState = 'loading' | 'error' | 'no-device' | 'no-readings' | 'ready';

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
  const latestId = rows?.[0]?.id ?? 0;

  useEffect(() => {
    if (rows) dispatch({ type: 'pin', latestId });
  }, [rows, latestId]);

  const live = rows ? deriveLive(rows, state.baselineId, now, device.data?.status === 'offline') : null;
  const step = wizardStep(state);
  const check = pairCheck(state);

  const load: LoadState =
    plant.isPending || device.isPending || (device.data && readings.isPending)
      ? 'loading'
      : plant.isError || device.isError || readings.isError
        ? 'error'
        : !device.data
          ? 'no-device'
          : !live
            ? 'no-readings'
            : 'ready';

  const retry = () => {
    void plant.refetch();
    void device.refetch();
    void readings.refetch();
  };

  const capture = () => {
    if (step === 'review' || live?.capture == null) return;
    save.reset();
    dispatch({ type: 'capture', step, value: live.capture, latestId });
  };

  const retake = (which: CaptureStep) => {
    save.reset();
    dispatch({ type: 'retake', step: which, latestId });
  };

  /** Resolves null once saved, else the message to show. */
  const submit = async (): Promise<string | null> => {
    const deviceId = device.data?.id;
    if (!deviceId || state.dry == null || state.wet == null) return SAVE_FAILED;
    if (!check?.ok) return check?.message ?? SAVE_FAILED;
    try {
      await save.mutateAsync({ deviceId, dryRaw: state.dry, wetRaw: state.wet });
      return null;
    } catch (e) {
      return saveErrorMessage(e);
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
