import type { Json, ThresholdKey, ThresholdMetric, Thresholds } from './types';

const METRICS: ThresholdMetric[] = ['temperature_c', 'humidity_pct', 'lux', 'soil_pct'];
const KEYS: ThresholdKey[] = ['critical_low', 'low', 'ok_low', 'ok_high', 'high', 'critical_high'];

function asObject(v: Json | undefined): Record<string, Json | undefined> {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/**
 * Fallback for `effective_thresholds()`: profile thresholds deep-merged with the plant's
 * overrides, per metric and key. Only numbers are copied; nothing is evaluated.
 */
export function mergeThresholds(profile: Json, overrides: Json): Thresholds {
  const base = asObject(profile);
  const over = asObject(overrides);
  const out: Thresholds = {};
  for (const metric of METRICS) {
    const b = asObject(base[metric]);
    const o = asObject(over[metric]);
    const merged: Partial<Record<ThresholdKey, number>> = {};
    for (const key of KEYS) {
      const v = typeof o[key] === 'number' ? o[key] : b[key];
      if (typeof v === 'number') merged[key] = v;
    }
    if (Object.keys(merged).length) out[metric] = merged;
  }
  return out;
}

/** The target band a chart draws: `ok_low..ok_high`, or null when either is missing. */
export function targetBand(thresholds: Thresholds | null | undefined, metric: ThresholdMetric) {
  const t = thresholds?.[metric];
  return t?.ok_low != null && t.ok_high != null ? { min: t.ok_low, max: t.ok_high } : null;
}
