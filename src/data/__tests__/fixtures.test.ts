import { addDays, localDate, localDayBounds } from '@/domain/time';
import { generateFixtures } from '../fixtures/generate';
import { createFixtureSource } from '../source/fixtures';

const NOW = new Date('2026-11-17T05:30:00Z');
const TZ = 'Asia/Seoul';
const today = localDate(TZ, NOW);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

async function periodsOn(source: ReturnType<typeof createFixtureSource>, date: string) {
  const { start, end } = localDayBounds(TZ, date);
  const to = date === today ? new Date(Math.min(NOW.getTime(), end.getTime())) : end;
  return source.getOfflinePeriods(source.world.device.id, start, to);
}

describe('fixture world', () => {
  const world = generateFixtures({ now: NOW, seed: 7 });

  it('is deterministic per seed', () => {
    const again = generateFixtures({ now: NOW, seed: 7 });
    expect(again.readings).toEqual(world.readings);
    expect(generateFixtures({ now: NOW, seed: 8 }).readings).not.toEqual(world.readings);
  });

  it('covers 90 days, ending with the Figma sample values', () => {
    const first = Date.parse(world.readings[0].recorded_at);
    expect(NOW.getTime() - first).toBeLessThanOrEqual(90 * 86_400_000);
    expect(NOW.getTime() - first).toBeGreaterThan(90 * 86_400_000 - 60_000);
    expect(world.readings.length).toBeGreaterThan(129_000);
    const latest = world.readings[world.readings.length - 1];
    expect(latest).toMatchObject({ temperature_c: 23.4, humidity_pct: 58, lux: 1240 });
    expect(world.plant.nickname).toBe('Sparks');
  });

  it('has null reads for every metric, including null soil_raw on a calibrated device', () => {
    for (const k of ['temperature_c', 'humidity_pct', 'lux', 'soil_raw'] as const) {
      expect(world.readings.some((r) => r[k] === null)).toBe(true);
    }
    expect(world.device.soil_dry_raw).not.toBeNull();
  });

  it('has a calibration event inside the history', () => {
    const at = Date.parse(world.device.soil_calibrated_at!);
    expect(at).toBeGreaterThan(Date.parse(world.readings[0].recorded_at));
    expect(at).toBeLessThan(NOW.getTime());
  });

  it('has a multi-day conversation of more than 50 messages', () => {
    expect(world.chat.length).toBeGreaterThan(50);
    expect(new Set(world.chat.map((m) => localDate(TZ, m.created_at))).size).toBeGreaterThanOrEqual(5);
    expect(world.chat.some((m) => m.error)).toBe(true);
  });
});

describe('fixture offline periods (written by the generator, clipped per day)', () => {
  const source = createFixtureSource({ now: NOW });

  it('has a 2-min gap with no period, then a 4-min outage', async () => {
    const day = addDays(today, -2);
    const gap = Date.parse(source.world.shortGapAt!);
    expect(source.world.readings.some((r) => Date.parse(r.recorded_at) === gap)).toBe(false);
    const periods = await periodsOn(source, day);
    expect(periods.some((p) => Math.abs(Date.parse(p.started_at) - gap) < 5 * 60_000)).toBe(false);
    expect(periods).toContainEqual(expect.objectContaining({ duration_s: 240, cause: 'no_data', ongoing: false }));
  });

  it('has a 40-min outage', async () => {
    expect(await periodsOn(source, addDays(today, -3))).toContainEqual(
      expect.objectContaining({ duration_s: 2400, cause: 'no_data' }),
    );
  });

  it('has an outage crossing midnight that shows on both days', async () => {
    const midnight = localDayBounds(TZ, addDays(today, -4)).start.toISOString();
    const before = await periodsOn(source, addDays(today, -5));
    const after = await periodsOn(source, addDays(today, -4));
    expect(before).toContainEqual(expect.objectContaining({ ended_at: midnight, duration_s: 30 * 60 }));
    expect(after).toContainEqual(expect.objectContaining({ started_at: midnight, duration_s: 40 * 60 }));
  });

  it('has a device_restart gap where the boot id changes', async () => {
    const periods = await periodsOn(source, addDays(today, -1));
    const restart = periods.find((p) => p.cause === 'device_restart')!;
    expect(restart).toBeDefined();
    const before = source.world.readings.filter((r) => r.recorded_at < restart.started_at).at(-1)!;
    const after = source.world.readings.find((r) => r.recorded_at >= restart.ended_at!)!;
    expect(before.boot_id).not.toBe(after.boot_id);
    expect(after.seq).toBe(0);
  });

  it('has no period today in the normal scenario', async () => {
    expect(await periodsOn(source, today)).toEqual([]);
  });

  it('has an ongoing outage in the offline scenario', async () => {
    const offline = createFixtureSource({ now: NOW, scenario: 'offline' });
    const periods = await periodsOn(offline, today);
    expect(periods.at(-1)).toMatchObject({ ongoing: true, cause: 'no_data', ended_at: NOW.toISOString() });
    expect((await offline.getStatus(offline.world.plant.id))?.overall).toBe('offline');
  });

  it('rejects windows over 7 days like the server', async () => {
    await expect(source.getOfflinePeriods('d', new Date(0), new Date(8 * 86_400_000))).rejects.toMatchObject({ code: '22023' });
  });

  it('returns nothing beyond the 90-day retention', async () => {
    expect(await periodsOn(source, addDays(today, -95))).toEqual([]);
  });
});

describe('fixture scenarios', () => {
  it('uncalibrated: no soil_pct anywhere and a Not calibrated label', async () => {
    const source = createFixtureSource({ now: NOW, scenario: 'uncalibrated', days: 2 });
    const [latest] = await source.getLatestReadings('d', 1);
    expect(latest.soil_raw).not.toBeNull();
    expect(latest.soil_pct).toBeNull();
    expect((await source.getStatus('p'))?.soil_label).toBe('Not calibrated');
  });

  it('null-reads: the calibrated device has a null soil_raw on the latest reading', async () => {
    const source = createFixtureSource({ now: NOW, scenario: 'null-reads', days: 2 });
    const [latest] = await source.getLatestReadings('d', 1);
    expect(latest).toMatchObject({ soil_raw: null, soil_pct: null, temperature_c: null });
    expect(source.world.device.soil_dry_raw).not.toBeNull();
  });

  it('soil_pct follows the calibration retroactively', async () => {
    const source = createFixtureSource({ now: NOW, days: 1 });
    const [before] = await source.getLatestReadings('d', 1);
    expect(before.soil_pct).toBe(42);
    await source.updateCalibration('d', 3000, 1000);
    const [after] = await source.getLatestReadings('d', 1);
    expect(after.soil_pct).not.toBe(42);
    await expect(source.updateCalibration('d', 1100, 1050)).rejects.toMatchObject({ code: '23514' });
  });

  it('requires a session like RLS does', async () => {
    const source = createFixtureSource({ now: NOW, days: 1, signedIn: false });
    await expect(source.getPlant()).rejects.toThrow();
    await expect(source.auth.signIn('dev@olvar.local', 'nope')).rejects.toThrow('Invalid login credentials');
    await source.auth.signIn('dev@olvar.local', 'olvar-dev-password');
    expect((await source.getPlant())?.nickname).toBe('Sparks');
  });
});
