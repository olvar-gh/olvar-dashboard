// Deterministic fixture world for EXPO_PUBLIC_DATA_SOURCE=fixtures, visual tests and unit tests.
// Outages are injected here and their offline periods are written next to them as data, in the
// shape `device_offline_periods()` returns; nothing downstream detects gaps.

import { addDays, localDate, startOfLocalDay } from '@/domain/time';
import type { ChatMessageRow, Device, Gateway, PlantWithProfile, Reading, Thresholds } from '../types';

export type FixtureScenario = 'normal' | 'offline' | 'uncalibrated' | 'null-reads';

export type FixtureOptions = {
  seed?: number;
  now?: Date;
  /** Days of history (retention is 90). */
  days?: number;
  timeZone?: string;
  scenario?: FixtureScenario;
};

/** An injected outage, unclipped; `ended_at` is null while ongoing. */
export type FixtureOutage = {
  label: 'restart' | 'four_min' | 'forty_min' | 'midnight' | 'ongoing';
  started_at: string;
  ended_at: string | null;
  cause: 'device_restart' | 'no_data';
  ongoing: boolean;
};

export type FixtureWorld = {
  now: Date;
  timeZone: string;
  scenario: FixtureScenario;
  plant: PlantWithProfile;
  device: Device;
  gateway: Gateway;
  /** Oldest first; `soil_pct` is derived from the device calibration when read. */
  readings: Omit<Reading, 'soil_pct'>[];
  outages: FixtureOutage[];
  /** A 2-min gap (one missing reading): no offline period. */
  shortGapAt: string | null;
  /** The injected daily temperature maximum at 23:50 local, two days ago. */
  lateMaxAt: string | null;
  chat: ChatMessageRow[];
};

export const FIXTURE_OWNER_ID = '00000000-0000-4000-8000-0000000000a1';
export const FIXTURE_PLANT_ID = '00000000-0000-4000-8000-0000000000b1';
export const FIXTURE_DEVICE_ID = 'olvar-a1b2c3';
export const FIXTURE_EMAIL = 'dev@olvar.local';
export const FIXTURE_PASSWORD = 'olvar-dev-password';
export const FIXTURE_DRY_RAW = 2900;
export const FIXTURE_WET_RAW = 1300;
/** The values in the Figma frames. */
export const FIGMA_LATEST = { temperature_c: 23.4, humidity_pct: 58, lux: 1240, soil_pct: 42 };

export const SPATHIPHYLLUM_THRESHOLDS: Thresholds = {
  temperature_c: { critical_low: 10, low: 16, ok_low: 18, ok_high: 29, high: 30, critical_high: 32 },
  humidity_pct: { critical_low: 25, low: 40, ok_low: 40, ok_high: 70, high: 85 },
  lux: { critical_low: 270, low: 800, ok_low: 800, ok_high: 5400, high: 10800, critical_high: 27000 },
  soil_pct: { critical_low: 20, low: 35, ok_low: 35, ok_high: 85, high: 90 },
};

const MIN = 60_000;
const DAY_MS = 86_400_000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

export function soilPct(raw: number | null, dry: number | null, wet: number | null): number | null {
  if (raw == null || dry == null || wet == null) return null;
  return Math.max(0, Math.min(100, round(((dry - raw) * 100) / (dry - wet), 1)));
}

function soilRawFor(pct: number): number {
  return Math.round(FIXTURE_DRY_RAW - (pct / 100) * (FIXTURE_DRY_RAW - FIXTURE_WET_RAW));
}

export function generateFixtures(options: FixtureOptions = {}): FixtureWorld {
  const seed = options.seed ?? 42;
  const timeZone = options.timeZone ?? 'Asia/Seoul';
  const scenario = options.scenario ?? 'normal';
  const days = options.days ?? 90;
  const now = new Date(Math.floor((options.now ?? new Date()).getTime() / MIN) * MIN);
  const rand = mulberry32(seed);
  const today = localDate(timeZone, now);
  const at = (daysAgo: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return startOfLocalDay(timeZone, addDays(today, -daysAgo)).getTime() + (h * 60 + m) * MIN;
  };

  const lastReading = scenario === 'offline' ? now.getTime() - 25 * MIN : now.getTime();
  const first = now.getTime() - days * DAY_MS;

  // Each outage removes the readings strictly between `before` and `after`; the server reports
  // it as (before + 60 s, after), so `started_at` below is `before + 60 s`.
  const planned: (Omit<FixtureOutage, 'started_at' | 'ended_at'> & { before: number; after: number | null })[] = [
    { label: 'restart', before: at(1, '13:59'), after: at(1, '14:04'), cause: 'device_restart', ongoing: false },
    { label: 'four_min', before: at(2, '09:29'), after: at(2, '09:34'), cause: 'no_data', ongoing: false },
    { label: 'forty_min', before: at(3, '03:09'), after: at(3, '03:50'), cause: 'no_data', ongoing: false },
    { label: 'midnight', before: at(5, '23:29'), after: at(4, '00:40'), cause: 'no_data', ongoing: false },
  ];
  if (scenario === 'offline') {
    planned.push({ label: 'ongoing', before: lastReading, after: null, cause: 'no_data', ongoing: true });
  }
  const outages = planned
    .filter((o) => o.before >= first)
    .map((o) => ({
      label: o.label,
      started_at: new Date(o.before + MIN).toISOString(),
      ended_at: o.after == null ? null : new Date(o.after).toISOString(),
      cause: o.cause,
      ongoing: o.ongoing,
      before: o.before,
      after: o.after ?? Infinity,
    }));
  const shortGap = at(2, '09:00');
  const lateMax = at(2, '23:50');
  const restartAfter = planned[0].after!;
  const calibratedAt = at(3, '10:15');
  const todayMidnight = at(0, '00:00');

  const readings: FixtureWorld['readings'] = [];
  let id = 1;
  let seq = 0;
  let bootId = 'a0c4e7d1';
  let bootStart = first;
  for (let t = Math.ceil(first / MIN) * MIN; t <= lastReading; t += MIN) {
    if (t === shortGap || outages.some((o) => t > o.before && t < o.after)) continue;
    if (t === restartAfter) {
      bootId = 'b7d04e5a';
      bootStart = t;
      seq = 0;
    }
    const hour = (((t - todayMidnight) / 3_600_000) % 24 + 24) % 24;
    const day = Math.sin(((hour - 8) / 24) * 2 * Math.PI);
    const daylight = Math.max(0, Math.sin(((hour - 6) / 13) * Math.PI));
    const cycleDays = ((t - first) / DAY_MS) % 6;
    const n = () => rand() - 0.5;
    let temperature: number | null = round(21.5 + 2.6 * day + n() * 0.4, 1);
    let humidity: number | null = round(58 - 6 * day + n() * 2, 1);
    let lux: number | null = round(daylight * 1500 * (0.85 + rand() * 0.3), 1);
    let soil: number | null = soilRawFor(78 - cycleDays * 9 + n() * 2);
    if (id % 997 === 0) temperature = null;
    if (id % 1009 === 0) humidity = null;
    if (id % 1013 === 0) lux = null;
    if (id % 1019 === 0) soil = null;
    if (t === lateMax) temperature = 27.9;
    readings.push({
      id: id++,
      device_id: FIXTURE_DEVICE_ID,
      boot_id: bootId,
      seq: seq++,
      uptime_ms: t - bootStart,
      recorded_at: new Date(t).toISOString(),
      received_at: new Date(t + 400).toISOString(),
      clock_source: 'ntp',
      temperature_c: temperature,
      humidity_pct: humidity,
      lux,
      soil_raw: soil,
      rssi_dbm: -58,
    });
  }
  const latest = readings[readings.length - 1];
  if (latest) {
    Object.assign(latest, {
      temperature_c: FIGMA_LATEST.temperature_c,
      humidity_pct: FIGMA_LATEST.humidity_pct,
      lux: FIGMA_LATEST.lux,
      soil_raw: soilRawFor(FIGMA_LATEST.soil_pct),
    });
    if (scenario === 'null-reads') Object.assign(latest, { temperature_c: null, soil_raw: null });
  }

  const calibrated = scenario !== 'uncalibrated';
  const device: Device = {
    id: FIXTURE_DEVICE_ID,
    owner_id: FIXTURE_OWNER_ID,
    plant_id: FIXTURE_PLANT_ID,
    fw: '0.1.0+a1b2c3d',
    status: scenario === 'offline' ? 'offline' : 'online',
    status_changed_at: new Date(scenario === 'offline' ? lastReading + 90_000 : restartAfter).toISOString(),
    last_seen_at: latest?.recorded_at ?? null,
    created_at: new Date(first).toISOString(),
    soil_dry_raw: calibrated ? FIXTURE_DRY_RAW : null,
    soil_wet_raw: calibrated ? FIXTURE_WET_RAW : null,
    soil_calibrated_at: calibrated ? new Date(calibratedAt).toISOString() : null,
  };

  const plant: PlantWithProfile = {
    id: FIXTURE_PLANT_ID,
    owner_id: FIXTURE_OWNER_ID,
    profile_id: 'spathiphyllum',
    nickname: 'Sparks',
    location: 'Living room window',
    timezone: timeZone,
    threshold_overrides: {},
    created_at: new Date(first).toISOString(),
    profile: {
      id: 'spathiphyllum',
      common_name: 'Peace lily',
      scientific_name: 'Spathiphyllum spp.',
      thresholds: SPATHIPHYLLUM_THRESHOLDS,
    },
  };

  const gateway: Gateway = {
    id: 'olvar-gw',
    owner_id: FIXTURE_OWNER_ID,
    version: '0.1.0',
    buffer_depth: 0,
    last_seen_at: new Date(now.getTime() - 2 * MIN).toISOString(),
  };

  return {
    now,
    timeZone,
    scenario,
    plant,
    device,
    gateway,
    readings,
    outages: outages.map(({ before: _b, after: _a, ...o }) => o),
    shortGapAt: shortGap >= first ? new Date(shortGap).toISOString() : null,
    lateMaxAt: lateMax >= first ? new Date(lateMax).toISOString() : null,
    chat: generateChat(at, now.getTime()),
  };
}

const QUESTIONS = [
  'How are you feeling today?',
  'Do you need water?',
  'Is it too bright by the window?',
  'Did you sleep well?',
  'Should I move you away from the heater?',
  'How was the light this afternoon?',
];

const ANSWERS = [
  "I'm feeling great — the soil is just right and the light is soft.",
  'Not yet! My soil is still nicely moist. Check again in a couple of days.',
  'The light is just right for me — bright but not direct.',
  'Slept well, thanks. The night was a little cool but comfortable.',
  "I'm fine where I am. The temperature has stayed in my comfort zone.",
  'Lovely and bright, without any harsh sun on my leaves.',
];

function generateChat(at: (daysAgo: number, hhmm: string) => number, now: number): ChatMessageRow[] {
  const rows: ChatMessageRow[] = [];
  let id = 1;
  const slots = ['08:12', '09:40', '11:05', '12:30', '14:20', '16:45'];
  for (let daysAgo = 5; daysAgo >= 0; daysAgo--) {
    for (let i = 0; i < slots.length; i++) {
      const asked = at(daysAgo, slots[i]);
      if (asked + 10_000 > now) break;
      const q = QUESTIONS[(daysAgo + i) % QUESTIONS.length];
      const userId = id++;
      rows.push(chatRow(userId, 'user', q, asked, null));
      const failed = daysAgo === 2 && i === 3;
      rows.push({
        ...chatRow(id++, 'plant', failed ? "Sorry, I couldn't think of an answer just now." : ANSWERS[(daysAgo + i) % ANSWERS.length], asked + 6_000, userId),
        error: failed ? 'upstream_timeout' : null,
        based_on_reading_at: failed ? null : new Date(Math.floor(asked / MIN) * MIN).toISOString(),
      });
    }
  }
  return rows;
}

function chatRow(id: number, role: 'user' | 'plant', content: string, t: number, replyTo: number | null): ChatMessageRow {
  return {
    id,
    plant_id: FIXTURE_PLANT_ID,
    role,
    content,
    created_at: new Date(t).toISOString(),
    reply_to: replyTo,
    error: null,
    based_on_reading_at: null,
    model: role === 'plant' ? 'deepseek-flash' : null,
    tokens_in: null,
    tokens_out: null,
  };
}
