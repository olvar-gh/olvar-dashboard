// In-memory DataSource over the generated fixture world. It stands in for the server, so it
// applies the server's own rules where a view or function would (180 s offline, retroactive
// soil %, period clipping); the injected outages themselves are data from the generator.

import { localDate, localDayBounds } from '@/domain/time';
import {
  FIXTURE_EMAIL,
  FIXTURE_PASSWORD,
  generateFixtures,
  soilPct,
  type FixtureOptions,
  type FixtureWorld,
} from '../fixtures/generate';
import { mergeThresholds } from '../thresholds';
import type {
  ChatMessageRow,
  DailyRow,
  HourlyRow,
  OfflinePeriodRow,
  PlantStatus,
  Reading,
  ReadingColumn,
  Session,
} from '../types';
import { ChatError, DataError, type DataSource, type LiveHandlers } from './index';

export type FixtureSourceOptions = FixtureOptions & {
  /** Start signed in (default true, so screens render without a sign-in step). */
  signedIn?: boolean;
  /** Append a reading every 60 s and advance the gateway heartbeat (default false). */
  live?: boolean;
  /** Delay before a canned chat reply. */
  chatDelayMs?: number;
};

export type FixtureSource = DataSource & {
  readonly world: FixtureWorld;
  /** Appends one reading (default: a minute after the latest) and signals subscribers. */
  addReading(patch?: Partial<Reading>): Reading;
  /** Applies a device change and signals subscribers, like a Realtime UPDATE. */
  updateDevice(patch: Partial<FixtureWorld['device']>): void;
  /** Simulates a Realtime reconnect. */
  reconnect(): void;
  stop(): void;
};

const OFFLINE_S = 180;
const MIN = 60_000;
const HEARTBEAT_MS = 300_000;

const SESSION: Session = { userId: '00000000-0000-4000-8000-0000000000a1', email: FIXTURE_EMAIL, name: 'Dongmin' };

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

type Bucket = Omit<HourlyRow, 'bucket'>;

function aggregate(deviceId: string, rows: Reading[]): Bucket {
  const col = (k: ReadingColumn | 'soil_pct') => rows.map((r) => r[k]).filter((v): v is number => v != null);
  const stats = (k: ReadingColumn) => {
    const v = col(k);
    return {
      [`${k}_n`]: v.length,
      [`${k}_avg`]: avg(v),
      [`${k}_min`]: v.length ? Math.min(...v) : null,
      [`${k}_max`]: v.length ? Math.max(...v) : null,
    };
  };
  return {
    device_id: deviceId,
    n: rows.length,
    sealed: false,
    soil_raw_values: [],
    soil_raw_counts: [],
    ...stats('temperature_c'),
    ...stats('humidity_pct'),
    ...stats('lux'),
    ...stats('soil_raw'),
  } as unknown as Bucket;
}

function withSoilPct(row: Bucket, rows: Reading[]) {
  const pct = rows.map((r) => r.soil_pct).filter((v): v is number => v != null);
  return {
    ...row,
    soil_pct_avg: avg(pct),
    soil_pct_min: pct.length ? Math.min(...pct) : null,
    soil_pct_max: pct.length ? Math.max(...pct) : null,
  };
}

function inRange(t: string, from: Date, to: Date, inclusiveEnd = false): boolean {
  const ms = Date.parse(t);
  return ms >= from.getTime() && (inclusiveEnd ? ms <= to.getTime() : ms < to.getTime());
}

export function createFixtureSource(options: FixtureSourceOptions = {}): FixtureSource {
  const world = generateFixtures(options);
  const now = () => new Date();
  let session: Session | null = options.signedIn === false ? null : { ...SESSION };
  const authListeners = new Set<(s: Session | null) => void>();
  const live = new Set<LiveHandlers>();
  let nextChatId = Math.max(0, ...world.chat.map((m) => m.id)) + 1;
  const timer = options.live ? setInterval(() => source.addReading(), MIN) : null;

  const setSession = (s: Session | null) => {
    session = s;
    authListeners.forEach((l) => l(s));
  };
  const requireSession = () => {
    if (!session) throw new DataError('JWT expired or missing', 'PGRST301');
  };
  const reading = (r: FixtureWorld['readings'][number]): Reading => ({
    ...r,
    soil_pct: soilPct(r.soil_raw, world.device.soil_dry_raw, world.device.soil_wet_raw),
  });
  const visible = () => {
    const t = now().getTime();
    return world.readings.filter((r) => Date.parse(r.recorded_at) <= t);
  };
  const between = (from: Date, to: Date, inclusiveEnd = false) =>
    visible()
      .filter((r) => inRange(r.recorded_at, from, to, inclusiveEnd))
      .map(reading);
  const latest = () => {
    const rows = visible();
    return rows.length ? reading(rows[rows.length - 1]) : null;
  };
  const emit = (fn: (h: LiveHandlers) => void) => live.forEach(fn);

  const source: FixtureSource = {
    kind: 'fixtures',
    world,

    auth: {
      async getSession() {
        return session;
      },
      onChange(listener) {
        authListeners.add(listener);
        return () => authListeners.delete(listener);
      },
      async signIn(email, password) {
        if (email.trim().toLowerCase() !== FIXTURE_EMAIL || password !== FIXTURE_PASSWORD) {
          throw new DataError('Invalid login credentials', 'invalid_credentials');
        }
        setSession({ ...SESSION });
        return session!;
      },
      async signOut() {
        setSession(null);
      },
      async updateName(name) {
        requireSession();
        setSession({ ...session!, name });
        return session!;
      },
      async changePassword(currentPassword) {
        requireSession();
        if (currentPassword !== FIXTURE_PASSWORD) throw new DataError('Current password is incorrect');
      },
    },

    async getPlant() {
      requireSession();
      return { ...world.plant };
    },

    async updatePlant(_plantId, patch) {
      requireSession();
      Object.assign(world.plant, patch);
      return { ...world.plant };
    },

    async getEffectiveThresholds() {
      requireSession();
      return mergeThresholds(world.plant.profile.thresholds, world.plant.threshold_overrides);
    },

    async getStatus(plantId) {
      requireSession();
      const last = latest();
      const t = now();
      const offline =
        last != null &&
        (world.device.status === 'offline' || t.getTime() - Date.parse(last.recorded_at) > OFFLINE_S * 1000);
      const calibrated = world.device.soil_dry_raw != null && world.device.soil_wet_raw != null;
      const label = (v: number | null | undefined, ok = 'Just right') => (v == null ? 'No data' : ok);
      const overall = last == null ? 'no_data' : offline ? 'offline' : calibrated ? 'great' : 'okay';
      const row: PlantStatus = {
        plant_id: plantId,
        device_id: world.device.id,
        device_status: world.device.status,
        latest_reading_at: last?.recorded_at ?? null,
        computed_at: t.toISOString(),
        soil_calibrated: calibrated,
        overall,
        overall_label: { great: 'Feeling great', okay: 'Doing okay', offline: 'Offline', no_data: 'No data yet' }[overall],
        summary: {
          great: "All good — I'm feeling great",
          okay: 'All good — calibrate the soil sensor to track watering',
          offline: "No recent readings — check the sensor's power and Wi-Fi",
          no_data: 'Waiting for the first reading',
        }[overall],
        issues: [],
        temperature_status: last?.temperature_c == null ? 'unknown' : 'ok',
        temperature_label: label(last?.temperature_c),
        humidity_status: last?.humidity_pct == null ? 'unknown' : 'ok',
        humidity_label: label(last?.humidity_pct),
        light_status: last?.lux == null ? 'unknown' : 'ok',
        light_label: label(last?.lux),
        soil_status: last?.soil_pct == null ? 'unknown' : 'ok',
        soil_label: calibrated ? label(last?.soil_raw) : 'Not calibrated',
      };
      return row;
    },

    async getDevice() {
      requireSession();
      return { ...world.device };
    },

    async updateCalibration(_deviceId, dryRaw, wetRaw) {
      requireSession();
      if (!(dryRaw > wetRaw + 100)) {
        throw new DataError('new row for relation "devices" violates check constraint', '23514');
      }
      source.updateDevice({ soil_dry_raw: dryRaw, soil_wet_raw: wetRaw, soil_calibrated_at: now().toISOString() });
      return { ...world.device };
    },

    async getGateway() {
      requireSession();
      if (!options.live) return { ...world.gateway };
      const base = Date.parse(world.gateway.last_seen_at);
      const beats = Math.max(0, Math.floor((now().getTime() - base) / HEARTBEAT_MS));
      return { ...world.gateway, last_seen_at: new Date(base + beats * HEARTBEAT_MS).toISOString() };
    },

    async getLatestReadings(_deviceId, limit) {
      requireSession();
      return visible().slice(-limit).reverse().map(reading);
    },

    async getReadings(_deviceId, from, to) {
      requireSession();
      return between(from, to, true);
    },

    async getHourly(deviceId, from, to) {
      requireSession();
      const groups = new Map<number, Reading[]>();
      for (const r of between(from, new Date(to.getTime() + 3_600_000))) {
        const hour = Math.floor(Date.parse(r.recorded_at) / 3_600_000) * 3_600_000;
        if (hour < from.getTime() || hour >= to.getTime()) continue;
        groups.set(hour, [...(groups.get(hour) ?? []), r]);
      }
      return [...groups].map(([hour, rows]) => ({
        ...withSoilPct(aggregate(deviceId, rows), rows),
        bucket: new Date(hour).toISOString(),
      }));
    },

    async getDaily(deviceId, fromDate, toDate) {
      requireSession();
      const tz = world.plant.timezone;
      const from = localDayBounds(tz, fromDate).start;
      const to = localDayBounds(tz, toDate).end;
      const groups = new Map<string, Reading[]>();
      for (const r of between(from, to)) {
        const d = localDate(tz, r.recorded_at);
        groups.set(d, [...(groups.get(d) ?? []), r]);
      }
      return [...groups].map(([bucket, rows]): DailyRow => ({ ...withSoilPct(aggregate(deviceId, rows), rows), bucket }));
    },

    async getOfflinePeriods(_deviceId, from, to) {
      requireSession();
      if (to.getTime() - from.getTime() > 7 * 86_400_000 || to < from) {
        throw new DataError('window longer than 7 days', '22023');
      }
      const t = now().getTime();
      const outages = world.outages.map((o) => ({ ...o }));
      const last = latest();
      if (last && !outages.some((o) => o.ongoing) && t - Date.parse(last.recorded_at) > OFFLINE_S * 1000) {
        outages.push({
          label: 'ongoing',
          started_at: new Date(Date.parse(last.recorded_at) + MIN).toISOString(),
          ended_at: null,
          cause: 'no_data',
          ongoing: true,
        });
      }
      const rows: OfflinePeriodRow[] = [];
      for (const o of outages) {
        const start = Math.max(Date.parse(o.started_at), from.getTime());
        const end = Math.min(o.ended_at ? Date.parse(o.ended_at) : t, to.getTime());
        if (start >= end) continue;
        rows.push({
          started_at: new Date(start).toISOString(),
          ended_at: new Date(end).toISOString(),
          duration_s: Math.round((end - start) / 1000),
          cause: o.cause,
          ongoing: o.ongoing,
        });
      }
      return rows.sort((a, b) => a.started_at.localeCompare(b.started_at));
    },

    async findReadingWithValue(_deviceId, from, to, column, value) {
      requireSession();
      return between(from, to).find((r) => r[column] === value) ?? null;
    },

    async findExtremeReading(_deviceId, from, to, column, direction) {
      requireSession();
      let best: Reading | null = null;
      for (const r of between(from, to)) {
        const v = r[column];
        if (v == null) continue;
        if (best == null || (direction === 'desc' ? v > best[column]! : v < best[column]!)) best = r;
      }
      return best;
    },

    async getChatPage(_plantId, limit, before) {
      requireSession();
      const older = before
        ? world.chat.filter(
            (m) => m.created_at < before.created_at || (m.created_at === before.created_at && m.id < before.id),
          )
        : world.chat;
      return older.slice(-limit).reverse();
    },

    async getFirstUserMessage(_plantId, from, to) {
      requireSession();
      return world.chat.find((m) => m.role === 'user' && inRange(m.created_at, from, to)) ?? null;
    },

    async sendChat(plantId, message) {
      requireSession();
      const text = message.trim();
      if (text.length < 1 || text.length > 1000) throw new ChatError('invalid_message', 'invalid_message');
      const asked: ChatMessageRow = {
        id: nextChatId++,
        plant_id: plantId,
        role: 'user',
        content: text,
        created_at: now().toISOString(),
        reply_to: null,
        error: null,
        based_on_reading_at: null,
        model: null,
        tokens_in: null,
        tokens_out: null,
      };
      world.chat.push(asked);
      emit((h) => h.onChatMessage(asked));
      await new Promise((r) => setTimeout(r, options.chatDelayMs ?? 600));
      const reply: ChatMessageRow = {
        ...asked,
        id: nextChatId++,
        role: 'plant',
        content: "Thanks for asking! I'm comfortable right now — the soil is moist and the light is gentle.",
        created_at: now().toISOString(),
        reply_to: asked.id,
        based_on_reading_at: latest()?.recorded_at ?? null,
        model: 'deepseek-flash',
      };
      world.chat.push(reply);
      emit((h) => h.onChatMessage(reply));
      return reply;
    },

    subscribe(_target, handlers) {
      live.add(handlers);
      return () => live.delete(handlers);
    },

    addReading(patch = {}) {
      const prev = world.readings[world.readings.length - 1];
      const t = patch.recorded_at ? Date.parse(patch.recorded_at) : Date.parse(prev.recorded_at) + MIN;
      const { soil_pct: _ignored, ...rest } = patch;
      const row = {
        ...prev,
        id: prev.id + 1,
        seq: prev.seq + 1,
        uptime_ms: prev.uptime_ms + MIN,
        recorded_at: new Date(t).toISOString(),
        received_at: new Date(t + 400).toISOString(),
        ...rest,
      };
      world.readings.push(row);
      world.device.last_seen_at = row.recorded_at;
      emit((h) => h.onReading());
      return reading(row);
    },

    updateDevice(patch) {
      Object.assign(world.device, patch);
      const row = { ...world.device };
      emit((h) => h.onDevice(row));
    },

    reconnect() {
      emit((h) => h.onReconnect());
    },

    stop() {
      if (timer) clearInterval(timer);
      live.clear();
    },
  };
  return source;
}
