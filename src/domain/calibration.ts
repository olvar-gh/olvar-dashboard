// Soil calibration rules (§5.5). Whether the probe is calibrated and whether
// the latest soil read failed are two independent checks.

export const RAW_MIN = 0;
export const RAW_MAX = 4095;
/** Server check: `soil_dry_raw > soil_wet_raw + 100`. */
export const MIN_DRY_WET_GAP = 100;
/** Readings needed for a stable capture. */
export const STABLE_COUNT = 3;
/** Each of the last readings must be within ±2 % of their median. */
export const STABLE_TOLERANCE = 0.02;

export type DeviceCalibration = {
  soil_dry_raw: number | null;
  soil_wet_raw: number | null;
};

/** Calibrated is decided only from the device configuration (both raw values set). */
export function isCalibrated(device: DeviceCalibration | null | undefined): boolean {
  return device?.soil_dry_raw != null && device.soil_wet_raw != null;
}

/**
 * Cross-check against `plant_status_v.soil_calibrated`: true when the status
 * row disagrees with the device row (the status is stale and should refetch).
 */
export function calibrationMismatch(
  device: DeviceCalibration | null | undefined,
  statusSoilCalibrated: boolean | null | undefined,
): boolean {
  return statusSoilCalibrated != null && statusSoilCalibrated !== isCalibrated(device);
}

export type SoilCardState = {
  /** What the big number shows: `soil_pct`, the raw value, or "-". */
  value: 'pct' | 'raw' | 'none';
  /** Show "Read failed at HH:mm". */
  readFailed: boolean;
  /** Show the "Not calibrated" notice and the Calibrate button. */
  notCalibrated: boolean;
};

/** The soil card matrix from §5.5. A null read never prompts recalibration. */
export function soilCardState(calibrated: boolean, soilRaw: number | null | undefined): SoilCardState {
  const readFailed = soilRaw == null;
  return {
    value: readFailed ? 'none' : calibrated ? 'pct' : 'raw',
    readFailed,
    notCalibrated: !calibrated,
  };
}

/** Median of an odd-length list (always the last 3 readings here). */
function median(values: readonly number[]): number {
  return [...values].sort((a, b) => a - b)[values.length >> 1];
}

function lastReadings(raws: readonly (number | null)[]): number[] | null {
  const last = raws.slice(-STABLE_COUNT);
  if (last.length < STABLE_COUNT || last.some((v) => v == null)) return null;
  return last as number[];
}

/** Stable when the last 3 readings (oldest first) are present and within ±2 % of their median. */
export function isStable(raws: readonly (number | null)[]): boolean {
  const last = lastReadings(raws);
  if (!last) return false;
  const m = median(last);
  return last.every((v) => Math.abs(v - m) <= STABLE_TOLERANCE * m);
}

/** The value to capture: the median of the last 3 readings, or null while not stable. */
export function captureValue(raws: readonly (number | null)[]): number | null {
  return isStable(raws) ? Math.round(median(lastReadings(raws) as number[])) : null;
}

export type CalibrationError = 'dry_out_of_range' | 'wet_out_of_range' | 'too_close';

export type CalibrationCheck = { ok: true } | { ok: false; error: CalibrationError; message: string };

function inRange(v: number): boolean {
  return Number.isInteger(v) && v >= RAW_MIN && v <= RAW_MAX;
}

/** Mirrors the server: `0 ≤ raw ≤ 4095` (integers) and `dry > wet + 100`. */
export function validateCalibration(dry: number, wet: number): CalibrationCheck {
  if (!inRange(dry)) {
    return { ok: false, error: 'dry_out_of_range', message: `Dry value must be between ${RAW_MIN} and ${RAW_MAX}.` };
  }
  if (!inRange(wet)) {
    return { ok: false, error: 'wet_out_of_range', message: `Wet value must be between ${RAW_MIN} and ${RAW_MAX}.` };
  }
  if (!(dry > wet + MIN_DRY_WET_GAP)) {
    return {
      ok: false,
      error: 'too_close',
      message: `Dry must read more than ${MIN_DRY_WET_GAP} above wet. Check the probe was dry, then in water.`,
    };
  }
  return { ok: true };
}
