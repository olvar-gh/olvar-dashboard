import { useMemo } from 'react';

import type { Band, SeriesPoint } from '@/components/charts';
import {
  targetBand,
  useChatHistory,
  useDayEvents,
  useDayReadings,
  useDevice,
  useHourly,
  useLatest,
  useNow,
  useOfflinePeriods,
  usePlant,
  usePlantStatus,
  useSession,
  useThresholds,
} from '@/data';
import { isCalibrated } from '@/domain/calibration';
import { formatTime } from '@/domain/format';
import { localDayBounds, todayWindow } from '@/domain/time';

import {
  dayTrack,
  eventRows,
  formatHeaderDate,
  greeting,
  hourlyMeans,
  latestPlantMessage,
  localHour,
  METRICS,
  sensorCard,
  todayStats,
  type DayTrackModel,
  type EventRow,
  type MetricKey,
  type SensorCardModel,
  type StatusLabels,
} from './model';

export type SensorCharts = {
  timeZone: string;
  now: Date;
  soilWeek: { data: SeriesPoint[]; domain: readonly [Date, Date] } | null;
  lightToday: { data: SeriesPoint[]; domain: readonly [Date, Date] };
  temperature: { value: number | null; low: number | null; high: number | null };
  humidity: number | null;
  bands: Record<MetricKey, Band | null>;
};

export type HomeData = {
  plant: { name: string; species: string | null; location: string | null; subtitle: string };
  greeting: string;
  dateLabel: string;
  status: {
    key: string;
    label: string;
    summary: string | null;
    offline: boolean;
    /** "HH:mm" for "olvar-node offline since HH:mm". */
    offlineSince: string | null;
  };
  lastReading: { time: string; ageS: number } | null;
  message: { text: string; time: string } | null;
  sensors: SensorCardModel[];
  charts: SensorCharts;
  /** A background refresh failed; the cached screen stays up with this inline. */
  refreshError: Error | null;
  today: {
    rows: EventRow[] | undefined;
    track: DayTrackModel | null;
    pending: boolean;
    error: Error | null;
    refetch: () => void;
  };
};

export type HomeState =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error; retry: () => void; retrying: boolean }
  | { kind: 'ready'; data: HomeData; refresh: () => Promise<void>; retry: () => void; retrying: boolean };

const TICK_MS = 15_000;

/** Everything Home shows, from the shared data hooks (no Home-specific queries). */
export function useHome(): HomeState {
  const { session } = useSession();
  const plant = usePlant();
  const device = useDevice();
  const status = usePlantStatus();
  const latest = useLatest();
  const thresholds = useThresholds();
  const week = useHourly(7);
  const chat = useChatHistory();
  const now = useNow(TICK_MS);

  const timeZone = plant.data?.timezone ?? 'UTC';
  const today = todayWindow(timeZone, now);
  const events = useDayEvents(today.date);
  const offlinePeriods = useOfflinePeriods(today.date);
  const todayReadings = useDayReadings(today.date);

  const todayRows = todayReadings.data?.rows;
  const weekRows = week.data;
  const startMs = today.start.getTime();
  const stats = useMemo(() => todayStats(todayRows, new Date(startMs)), [todayRows, startMs]);
  const bounds = useMemo(() => localDayBounds(timeZone, today.date), [timeZone, today.date]);
  const lightToday = useMemo(() => hourlyMeans(todayRows, bounds.start, bounds.end, timeZone), [todayRows, bounds, timeZone]);
  const soilWeek = useMemo(
    () => weekRows && { data: weekRows.rows.map((r) => ({ t: r.bucket, v: r.soil_pct_avg })), domain: [weekRows.from, weekRows.to] as const },
    [weekRows],
  );

  const core = [plant, device, status, latest];
  const retry = () => core.forEach((q) => void q.refetch());
  const retrying = core.some((q) => q.isFetching);
  const error = core.find((q) => q.error && q.data === undefined)?.error;
  if (error) return { kind: 'error', error, retry, retrying };
  // Without a device the latest query never runs, so only wait for it when there is one.
  if (!plant.data || device.isPending || status.isPending || (device.data && latest.isPending)) return { kind: 'loading' };

  const p = plant.data;
  const row = status.data ?? null;
  const display = status.display;
  const reading = latest.data ?? null;
  const calibrated = isCalibrated(device.data);
  const offline = display?.offline ?? false;
  const t = thresholds.data;
  const message = latestPlantMessage(chat.messages);
  const species = p.profile.common_name ?? p.profile.scientific_name ?? null;

  const data: HomeData = {
    plant: {
      name: p.nickname,
      species,
      location: p.location,
      subtitle: [species, p.location].filter(Boolean).join(' · '),
    },
    greeting: greeting(localHour(now, timeZone), session?.name),
    dateLabel: formatHeaderDate(now, timeZone),
    status: {
      key: display?.overall ?? 'no_data',
      label: display?.overallLabel || 'No data yet',
      summary: display?.summary ?? null,
      offline,
      offlineSince: display?.offlineSince ? formatTime(display.offlineSince, timeZone) : null,
    },
    lastReading: reading
      ? { time: formatTime(reading.recorded_at, timeZone), ageS: (now.getTime() - new Date(reading.recorded_at).getTime()) / 1000 }
      : null,
    message: message ? { text: message.content, time: formatTime(message.created_at, timeZone) } : null,
    sensors: METRICS.map((m) =>
      sensorCard(m, {
        latest: reading,
        status: row as StatusLabels | null,
        calibrated,
        thresholds: t,
        today: stats,
        timeZone,
        offline,
      }),
    ),
    charts: {
      timeZone,
      now,
      soilWeek: calibrated ? (soilWeek ?? null) : null,
      lightToday: { data: lightToday, domain: [bounds.start, bounds.end] },
      temperature: { value: reading?.temperature_c ?? null, low: stats.temperature.min, high: stats.temperature.max },
      humidity: reading?.humidity_pct ?? null,
      bands: {
        soil: targetBand(t, 'soil_pct'),
        light: targetBand(t, 'lux'),
        temperature: targetBand(t, 'temperature_c'),
        humidity: targetBand(t, 'humidity_pct'),
      },
    },
    refreshError: core.find((q) => q.error)?.error ?? null,
    today: {
      rows: device.data == null ? [] : events.events && eventRows(events.events, timeZone),
      track:
        device.data == null || events.events
          ? dayTrack(events.events ?? [], offlinePeriods.data ?? [], bounds, now, timeZone)
          : null,
      pending: events.isPending && device.data != null,
      error: events.error,
      refetch: events.refetch,
    },
  };

  const refresh = async () => {
    await Promise.all([status, latest, todayReadings, week, chat, device].map((q) => q.refetch()));
    events.refetch();
  };
  return { kind: 'ready', data, refresh, retry, retrying };
}
