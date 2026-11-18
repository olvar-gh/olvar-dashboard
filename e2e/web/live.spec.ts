// T4 live checks against the gateway's local Supabase stack (`supabase start` + seed in olvar-gateway).
// Runs only with SUPABASE_LOCAL=1:
//   SUPABASE_LOCAL=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
//   [SUPABASE_SECRET_KEY=sb_secret_...] npx playwright test e2e/web/live.spec.ts
// SUPABASE_SECRET_KEY (local stack only) lets the suite write readings the way the gateway does: it tops up
// the last 32 h with one reading a minute wherever the seed has gaps, so a seed older than a day still passes.
// Without the key a stale seed skips the history checks instead of failing them.
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../src/data/database.types';
import { createSupabaseSource } from '../../src/data/source/supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.OLVAR_OWNER_EMAIL ?? 'dev@olvar.local';
const password = process.env.OLVAR_OWNER_PASSWORD ?? 'olvar-dev-password';

const MIN = 60_000;
const HOUR = 60 * MIN;
const HISTORY = 32 * HOUR;

test.skip(process.env.SUPABASE_LOCAL !== '1', 'needs the local Supabase stack (SUPABASE_LOCAL=1)');
let historyGap: string | null = null;

test.beforeAll(async ({}, info) => {
  test.skip(info.project.name !== 'fhd-1920', 'live checks do not depend on the viewport; one project writes');
  const { source } = await signedIn();
  const plant = (await source.getPlant())!;
  const device = (await source.getDevice(plant.id))!;
  const now = Date.now();
  const from = now - HISTORY;
  const rows = await source.getReadings(device.id, new Date(from), new Date(now));
  const missing = missingMinutes(
    rows.map((r) => Date.parse(r.recorded_at)),
    from,
    now,
  );
  if (missing.length === 0) return;
  if (!secret) {
    const latest = rows.length ? rows[rows.length - 1].recorded_at : 'none in the last 32 h';
    historyGap =
      `local history has ${missing.length} missing minutes in the last 32 h (latest reading ${latest}); ` +
      'set SUPABASE_SECRET_KEY so live.spec tops it up, or re-seed olvar-gateway';
    return;
  }
  await writeReadings(device.id, missing);
});

/** Minutes to add so no two consecutive readings in [from, to] are more than 2 min apart and one lands at `to`. */
function missingMinutes(times: number[], from: number, to: number) {
  const out: number[] = [];
  let prev = from - MIN;
  for (const t of [...times.filter((x) => x >= from).sort((a, b) => a - b), to]) {
    while (t - prev > 2 * MIN) out.push((prev += MIN));
    prev = Math.max(prev, t);
  }
  if (times.every((t) => t < to - MIN) && out.at(-1) !== to) out.push(to);
  return out;
}

async function writeReadings(deviceId: string, times: number[]) {
  const writer = createClient<Database>(url, secret!, { auth: { persistSession: false } });
  const bootId = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const rows = times.map((t, seq) => {
    const phase = Math.sin((2 * Math.PI * (t % (24 * HOUR))) / (24 * HOUR));
    return {
      device_id: deviceId,
      recorded_at: new Date(t).toISOString(),
      received_at: new Date(t).toISOString(),
      boot_id: bootId,
      seq,
      uptime_ms: seq * MIN,
      temperature_c: Math.round((21.5 + 2.5 * phase) * 10) / 10,
      humidity_pct: Math.round(58 - 6 * phase),
      lux: Math.max(0, Math.round(1600 * phase)),
      soil_raw: 2200,
      clock_source: 'ntp' as const,
    };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await writer.from('readings').insert(rows.slice(i, i + 500));
    expect(error).toBeNull();
  }
}

function newClient() {
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signedIn() {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return { client, source: createSupabaseSource(client) };
}

test('signed-out reads fail', async () => {
  const client = newClient();
  for (const table of ['readings_v', 'plants', 'devices', 'plant_status_v', 'chat_messages'] as const) {
    const { data, error } = await client.from(table as 'plants').select('*').limit(1);
    expect(error !== null || (data ?? []).length === 0, `${table} readable without a session`).toBe(true);
  }
});

test('the 24 h query returns every row past the 1,000-row limit, ending at latest_reading_at', async () => {
  test.skip(historyGap !== null, historyGap ?? '');
  const { source } = await signedIn();
  const plant = await source.getPlant();
  expect(plant).not.toBeNull();
  const device = (await source.getDevice(plant!.id))!;
  const status = (await source.getStatus(plant!.id))!;
  const to = new Date();
  const rows = await source.getReadings(device.id, new Date(to.getTime() - 86_400_000), to);
  expect(rows.length).toBeGreaterThan(1000);
  expect(rows.length).toBeGreaterThanOrEqual(1439);
  expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  expect(Date.parse(rows[rows.length - 1].recorded_at)).toBe(Date.parse(status.latest_reading_at!));
  const [latest] = await source.getLatestReadings(device.id, 1);
  expect(latest.id).toBe(rows[rows.length - 1].id);
});

test('device_offline_periods finds no gap in a covered day and returns nothing past retention', async () => {
  test.skip(historyGap !== null, historyGap ?? '');
  const { source } = await signedIn();
  const plant = (await source.getPlant())!;
  const device = (await source.getDevice(plant.id))!;
  const now = Date.now();
  // The last 32 h hold a reading at least every 2 min (seed reboot included), so this day has no offline period.
  const seeded = await source.getOfflinePeriods(device.id, new Date(now - 30 * 3_600_000), new Date(now - 6 * 3_600_000));
  expect(seeded).toEqual([]);
  const old = await source.getOfflinePeriods(device.id, new Date(now - 100 * 86_400_000), new Date(now - 99 * 86_400_000));
  expect(old).toEqual([]);
  await expect(source.getOfflinePeriods(device.id, new Date(now - 8 * 86_400_000), new Date(now))).rejects.toMatchObject({
    code: '22023',
  });
});

test('a new reading reaches the Realtime signal and the latest row within 2 s', async () => {
  test.skip(!secret, 'needs SUPABASE_SECRET_KEY to write a reading like the gateway');
  const { client, source } = await signedIn();
  const plant = (await source.getPlant())!;
  const device = (await source.getDevice(plant.id))!;
  await client.realtime.setAuth();
  let signalled = 0;
  let readingsReady = false;
  const stop = source.subscribe(
    { deviceId: device.id, plantId: plant.id },
    {
      onReading: () => signalled++,
      onDevice: () => {},
      onChatMessage: () => {},
      onReconnect: () => {},
      onReady: (table) => (readingsReady ||= table === 'readings'),
    },
  );
  await expect.poll(() => readingsReady, { timeout: 15_000 }).toBe(true);

  const writer = createClient<Database>(url, secret!, { auth: { persistSession: false } });
  const [prev] = await source.getLatestReadings(device.id, 1);
  const recordedAt = new Date(Math.max(Date.now(), Date.parse(prev.recorded_at) + 1000)).toISOString();
  const sentAt = Date.now();
  const { error } = await writer.from('readings').insert({
    device_id: device.id,
    recorded_at: recordedAt,
    received_at: recordedAt,
    boot_id: prev.boot_id,
    seq: prev.seq + 1,
    uptime_ms: prev.uptime_ms + 60_000,
    temperature_c: 21.7,
    humidity_pct: 50,
    lux: 900,
    soil_raw: 2000,
    clock_source: 'ntp',
  });
  expect(error).toBeNull();
  await expect.poll(() => signalled, { timeout: 2_000, intervals: [50] }).toBeGreaterThan(0);
  const [latest] = await source.getLatestReadings(device.id, 1);
  expect(Date.now() - sentAt).toBeLessThan(2_000);
  expect(Date.parse(latest.recorded_at)).toBe(Date.parse(recordedAt));
  stop();
});
