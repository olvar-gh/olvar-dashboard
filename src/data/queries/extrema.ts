import type { Extremum, ExtremumKind } from '@/domain/timeline-events';
import { localDayBounds } from '@/domain/time';
import type { DataSource } from '../source';
import type { DailyRow, ReadingColumn } from '../types';

const SPECS: { kind: ExtremumKind; column: ReadingColumn; direction: 'asc' | 'desc'; daily: keyof DailyRow }[] = [
  { kind: 'temperature_max', column: 'temperature_c', direction: 'desc', daily: 'temperature_c_max' },
  { kind: 'light_max', column: 'lux', direction: 'desc', daily: 'lux_max' },
  { kind: 'humidity_min', column: 'humidity_pct', direction: 'asc', daily: 'humidity_pct_min' },
  // Higher raw means drier.
  { kind: 'soil_driest', column: 'soil_raw', direction: 'desc', daily: 'soil_raw_max' },
];

/**
 * Daily extrema for one local day. Completed days take the value from `readings_daily_v`
 * (exact local dates) and the time from a raw `limit 1` lookup; today takes both from raw,
 * because the daily row lags until the next rollup. Hourly rows are never used: UTC hours
 * straddle local midnight in :30/:45 zones.
 */
export async function fetchDayExtrema(
  source: DataSource,
  deviceId: string,
  timeZone: string,
  date: string,
  isToday: boolean,
  now: Date,
): Promise<Extremum[]> {
  const day = localDayBounds(timeZone, date);
  if (isToday) {
    const end = new Date(Math.min(now.getTime() + 1, day.end.getTime()));
    return Promise.all(
      SPECS.map(async (s): Promise<Extremum> => {
        const r = await source.findExtremeReading(deviceId, day.start, end, s.column, s.direction);
        return {
          kind: s.kind,
          value: r?.[s.column] ?? null,
          at: r?.recorded_at ?? null,
          ...(s.kind === 'soil_driest' ? { soilPct: r?.soil_pct ?? null } : {}),
        };
      }),
    );
  }
  const [row] = await source.getDaily(deviceId, date, date);
  if (!row) return [];
  return Promise.all(
    SPECS.map(async (s): Promise<Extremum> => {
      const value = row[s.daily] as number | null;
      const match =
        value == null ? null : await source.findReadingWithValue(deviceId, day.start, day.end, s.column, value);
      return {
        kind: s.kind,
        value,
        at: match?.recorded_at ?? null,
        ...(s.kind === 'soil_driest' ? { soilPct: row.soil_pct_min } : {}),
      };
    }),
  );
}
