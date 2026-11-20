// Deterministic series shaped like the Figma frames, for the gallery and tests.

import type { SeriesPoint } from './scales';

const MIN = 60_000;
const HOUR = 60 * MIN;

export const SAMPLE_TZ = 'Europe/Berlin';
/** Fri, Nov 6, 2026 14:32 in Berlin, the Home frame's "now". */
export const SAMPLE_NOW = Date.parse('2026-11-06T13:32:00Z');
export const SAMPLE_DAY: readonly [number, number] = [SAMPLE_NOW - 24 * HOUR, SAMPLE_NOW];

function minutes(from: number, to: number, step: number, f: (t: number, i: number) => number | null): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let t = from, i = 0; t <= to; t += step, i++) out.push({ t, v: f(t, i) });
  return out;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Drying soil that is watered 5 h before now, as in the Sensors frame. */
export function sampleSoil24h(): SeriesPoint[] {
  const watered = SAMPLE_NOW - 5 * HOUR;
  return minutes(SAMPLE_DAY[0], SAMPLE_DAY[1], 5 * MIN, (t) =>
    round1(
      t < watered ? 47 - (11 * (t - SAMPLE_DAY[0])) / (watered - SAMPLE_DAY[0]) : 66 - (2 * (t - watered)) / (5 * HOUR),
    ),
  );
}

/** A daily temperature wave, low before dawn, with a 25-minute failed-read gap. */
export function sampleTemperature24h(): SeriesPoint[] {
  const gapFrom = SAMPLE_NOW - 9 * HOUR;
  return minutes(SAMPLE_DAY[0], SAMPLE_DAY[1], 5 * MIN, (t) => {
    if (t >= gapFrom && t < gapFrom + 25 * MIN) return null;
    const phase = ((t - SAMPLE_NOW) / (24 * HOUR)) * 2 * Math.PI;
    return round1(22.2 + 2.4 * Math.cos(phase));
  });
}

export function sampleHumidity24h(): SeriesPoint[] {
  return minutes(SAMPLE_DAY[0], SAMPLE_DAY[1], 5 * MIN, (t, i) =>
    round1(57 + 2 * Math.sin(i / 40) + (t > SAMPLE_NOW - 5 * HOUR ? 1.5 : 0)),
  );
}

/** Hourly lux: dark at night, peaking early afternoon. */
export function sampleLightHourly(from = SAMPLE_DAY[0], to = SAMPLE_DAY[1]): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let t = Math.floor(from / HOUR) * HOUR; t <= to; t += HOUR) {
    const hourUtc = new Date(t).getUTCHours();
    const local = (hourUtc + 1) % 24;
    const v = local >= 7 && local <= 17 ? Math.round(1560 * Math.sin((Math.PI * (local - 6)) / 12)) : 0;
    out.push({ t, v });
  }
  return out;
}

/** One week of hourly soil (watered Tue and Sat) and temperature, starting Sun, Nov 1. */
export function sampleWeek(): { soil: SeriesPoint[]; temperature: SeriesPoint[] } {
  const start = Date.parse('2026-10-31T23:00:00Z');
  const end = Math.min(start + 7 * 24 * HOUR, SAMPLE_NOW + 24 * HOUR);
  const waterings = [start + 2 * 24 * HOUR + 9 * HOUR, start + 6 * 24 * HOUR + 8 * HOUR];
  const soil: SeriesPoint[] = [];
  const temperature: SeriesPoint[] = [];
  for (let t = start; t <= end; t += HOUR) {
    const last = [...waterings].reverse().find((w) => w <= t);
    const since = (t - (last ?? start - 12 * HOUR)) / HOUR;
    soil.push({ t, v: round1(Math.max(20, (last ? 64 : 58) - since * 0.3)) });
    const phase = ((t - start) / (24 * HOUR)) * 2 * Math.PI;
    temperature.push({ t, v: round1(21.5 - 2.5 * Math.cos(phase - 0.5)) });
  }
  return { soil, temperature };
}
