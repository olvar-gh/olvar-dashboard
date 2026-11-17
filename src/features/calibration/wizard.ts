// Soil calibration wizard (§5.5): capture dry, then wet, from live soil_raw readings, then save.

import {
  STABLE_COUNT,
  captureValue,
  isCalibrated,
  isStable,
  validateCalibration,
  type CalibrationCheck,
  type DeviceCalibration,
} from '@/domain/calibration';
import { formatAge, formatNumber, formatShortDate, formatTime, secondsSince } from '@/domain/format';
import { DEVICE_OFFLINE_S } from '@/domain/status-freshness';

export type CaptureStep = 'dry' | 'wet';
export type WizardStep = CaptureStep | 'review';

export type WizardState = {
  dry: number | null;
  wet: number | null;
  /** Where the current step began. Null until this session's opening fetch. */
  baseline: Baseline | null;
};

/**
 * Only readings both stored after `id` and recorded after `at` count toward the step: the gateway
 * can flush buffered readings after a reconnect, which get new ids but were measured before the
 * probe was moved.
 */
export type Baseline = { id: number; at: number };

export type WizardAction =
  | { type: 'pin'; baseline: Baseline }
  | { type: 'capture'; step: CaptureStep; value: number; baseline: Baseline }
  | { type: 'retake'; step: CaptureStep; baseline: Baseline };

export const initialWizard: WizardState = { dry: null, wet: null, baseline: null };

export function wizardStep(state: Pick<WizardState, 'dry' | 'wet'>): WizardStep {
  if (state.dry == null) return 'dry';
  if (state.wet == null) return 'wet';
  return 'review';
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'pin':
      return state.baseline == null ? { ...state, baseline: action.baseline } : state;
    case 'capture':
      if (wizardStep(state) !== action.step) return state;
      return { ...state, [action.step]: action.value, baseline: action.baseline };
    case 'retake':
      return { ...state, [action.step]: null, baseline: action.baseline };
  }
}

/** The fields of a `readings_v` row the wizard reads. */
export type RawReading = { id: number; recorded_at: string; soil_raw: number | null };

export type Stability = 'waiting' | 'settling' | 'stable' | 'failed' | 'offline';

export type LiveReading = {
  raw: number | null;
  recordedAt: string;
  ageS: number;
  offline: boolean;
  /** Readings that arrived since the step began, up to 3. */
  freshCount: number;
  stability: Stability;
  /** Median of the 3 fresh readings once they are stable. */
  capture: number | null;
};

/** `readings` newest first, as `useCalibrationReadings` returns them. */
export function deriveLive(
  readings: readonly RawReading[],
  baseline: Baseline | null,
  now: Date,
  deviceOffline = false,
): LiveReading | null {
  const latest = readings[0];
  if (!latest) return null;
  const ageS = Math.max(0, secondsSince(latest.recorded_at, now));
  const offline = deviceOffline || ageS > DEVICE_OFFLINE_S;
  const fresh =
    baseline == null
      ? []
      : readings
          .filter((r) => r.id > baseline.id && Date.parse(r.recorded_at) > baseline.at)
          .slice(0, STABLE_COUNT)
          .reverse()
          .map((r) => r.soil_raw);
  const stability: Stability = offline
    ? 'offline'
    : latest.soil_raw == null
      ? 'failed'
      : fresh.length < STABLE_COUNT
        ? 'waiting'
        : isStable(fresh)
          ? 'stable'
          : 'settling';
  return {
    raw: latest.soil_raw,
    recordedAt: latest.recorded_at,
    ageS,
    offline,
    freshCount: fresh.length,
    stability,
    capture: stability === 'stable' ? captureValue(fresh) : null,
  };
}

export function stabilityLabel(live: LiveReading, timeZone: string): string {
  switch (live.stability) {
    case 'offline':
      return 'No new readings';
    case 'failed':
      return `Read failed at ${formatTime(live.recordedAt, timeZone)}`;
    case 'waiting': {
      const left = STABLE_COUNT - live.freshCount;
      return `Waiting for fresh readings · ${live.freshCount} of ${STABLE_COUNT} · about ${left} min`;
    }
    case 'settling':
      return 'Settling · readings differ by more than 2 %';
    case 'stable':
      return `Stable · last ${STABLE_COUNT} readings agree`;
  }
}

export function ageLabel(live: LiveReading): string {
  return `Updated ${formatAge(live.ageS)} · new reading every minute`;
}

export const SENSOR_LABEL = 'Capacitive · GPIO34';

export type DeviceSummary = DeviceCalibration & { soil_calibrated_at: string | null };

/** "last calibrated Nov 5" or "not calibrated yet", from the device row only. */
export function calibrationSummary(device: DeviceSummary, timeZone: string): string {
  if (!isCalibrated(device)) return 'not calibrated yet';
  const when = device.soil_calibrated_at ? ` ${formatShortDate(device.soil_calibrated_at, timeZone)}` : '';
  return `last calibrated${when} · dry ${formatNumber(device.soil_dry_raw!)} · wet ${formatNumber(device.soil_wet_raw!)}`;
}

export function pairCheck(state: Pick<WizardState, 'dry' | 'wet'>): CalibrationCheck | null {
  return state.dry == null || state.wet == null ? null : validateCalibration(state.dry, state.wet);
}

export const SAVE_FAILED = 'Couldn’t save the calibration. Check your connection and try again.';

/** The server's check constraint (`dry > wet + 100`) reports 23514. */
export function saveErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === '23514') return 'The server rejected these values: dry must read more than 100 above wet.';
  return SAVE_FAILED;
}
