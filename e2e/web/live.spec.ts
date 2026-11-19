// T4 live checks against the gateway's local Supabase stack (`supabase start` + seed in olvar-gateway).
// Runs only with SUPABASE_LOCAL=1:
//   SUPABASE_LOCAL=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
//   [SUPABASE_SECRET_KEY=sb_secret_...] npx playwright test e2e/web/live.spec.ts
// With SUPABASE_SECRET_KEY and a loopback URL the suite writes readings the way the gateway does: it seeds one
// reading on every whole minute of the last 32 h that has none, so a seed older than a day still passes. It never
// writes to any other host; there, or without the key, missing minutes skip the history checks instead.
import { expect, test } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

/** Why this run may not write readings, or null when it may. */
const writeBlock = !secret
  ? 'needs SUPABASE_SECRET_KEY to write readings like the gateway'
  : !isLoopback(url)
    ? `refuses to write readings to ${url}: live.spec only writes to a localhost / 127.0.0.1 Supabase`
    : null;

test.skip(process.env.SUPABASE_LOCAL !== '1', 'needs the local Supabase stack (SUPABASE_LOCAL=1)');
let historyGap: string | null = null;

test.beforeAll(async ({}, info) => {
  test.skip(info.project.name !== 'fhd-1920', 'live checks do not depend on the viewport; one project writes');
  const { client, source } = await signedIn();
  const plant = (await source.getPlant())!;
  const device = (await source.getDevice(plant.id))!;
  const to = Math.floor(Date.now() / MIN) * MIN;
  const from = to - HISTORY;
  const missing = uncoveredMinutes(await recordedTimes(client, device.id, from, to), from, to);
  if (missing.length === 0) return;
  if (writeBlock) {
    historyGap = `${missing.length} minutes of the last 32 h have no reading; live.spec ${writeBlock}`;
    return;
  }
  await writeSeries(device.id, missing);
  expect(uncoveredMinutes(await recordedTimes(client, device.id, from, to), from, to)).toEqual([]);
});

function isLoopback(target: string) {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(target).hostname);
  } catch {
    return false;
  }
}

/** recorded_at of every reading within 30 s of [from, to], read straight from the table, page by page. */
async function recordedTimes(client: SupabaseClient<Database>, deviceId: string, from: number, to: number) {
  const out: number[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await client
      .from('readings')
      .select('recorded_at')
      .eq('device_id', deviceId)
      .gte('recorded_at', new Date(from - MIN / 2).toISOString())
      .lt('recorded_at', new Date(to + MIN / 2).toISOString())
      .order('recorded_at')
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    expect(error).toBeNull();
    out.push(...data!.map((r) => Date.parse(r.recorded_at)));
    if (data!.length < 1000) return out;
  }
}

/** Whole minutes in [from, to] with no reading within 30 s; covering them all leaves no gap over 2 min. */
function uncoveredMinutes(sorted: number[], from: number, to: number) {
  const out: number[] = [];
  let i = 0;
  for (let slot = from; slot <= to; slot += MIN) {
    while (i < sorted.length && sorted[i] < slot - MIN / 2) i++;
    if (i === sorted.length || sorted[i] >= slot + MIN / 2) out.push(slot);
  }
  return out;
}

async function writeSeries(deviceId: string, minutes: number[]) {
  const writer = createClient<Database>(url, secret!, { auth: { persistSession: false } });
  const bootId = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const rows = minutes.map((t, seq) => {
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
  const { client, source } = await signedIn();
  const plant = await source.getPlant();
  expect(plant).not.toBeNull();
  const device = (await source.getDevice(plant!.id))!;
  const status = (await source.getStatus(plant!.id))!;
  const to = new Date();
  const from = new Date(to.getTime() - 86_400_000);
  const rows = await source.getReadings(device.id, from, to);
  const { count, error } = await client
    .from('readings')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', device.id)
    .gte('recorded_at', from.toISOString())
    .lte('recorded_at', to.toISOString());
  expect(error).toBeNull();
  expect(rows.length).toBeGreaterThanOrEqual(1439);
  expect(rows.length).toBe(count);
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
  // Every minute of the last 32 h has a reading (seed reboot included), so this day has no offline period.
  const seeded = await source.getOfflinePeriods(device.id, new Date(now - 30 * 3_600_000), new Date(now - 6 * 3_600_000));
  expect(seeded).toEqual([]);
  const old = await source.getOfflinePeriods(device.id, new Date(now - 100 * 86_400_000), new Date(now - 99 * 86_400_000));
  expect(old).toEqual([]);
  await expect(source.getOfflinePeriods(device.id, new Date(now - 8 * 86_400_000), new Date(now))).rejects.toMatchObject({
    code: '22023',
  });
});

test('a new reading reaches the Realtime signal and the latest row within 2 s', async () => {
  test.skip(writeBlock !== null, `live.spec ${writeBlock}`);
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
