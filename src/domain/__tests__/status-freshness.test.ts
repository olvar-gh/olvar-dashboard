import {
  DEVICE_OFFLINE_S,
  GATEWAY_STALE_S,
  displayStatus,
  gatewayAgeS,
  isGatewayStale,
  isReadingFresh,
  offlineSince,
  readingExpiresAt,
  statusRefetchDelayMs,
  type CachedStatus,
} from '../status-freshness';

const T0 = Date.parse('2026-11-16T05:00:00Z');
const at = (s: number) => new Date(T0 + s * 1000);
const latest = at(0).toISOString();

const row = (over: Partial<CachedStatus> = {}): CachedStatus => ({
  overall: 'needs_attention',
  overall_label: 'Needs attention',
  summary: 'Soil is getting dry — water soon',
  latest_reading_at: latest,
  device_status: 'online',
  ...over,
});

describe('reading expiry', () => {
  it('uses the 180 s rule', () => {
    expect(DEVICE_OFFLINE_S).toBe(180);
    expect(readingExpiresAt(latest)).toEqual(at(180));
    expect(readingExpiresAt(null)).toBeNull();
  });

  it('is fresh at 180 s and expired at 181 s', () => {
    expect(isReadingFresh(latest, at(180))).toBe(true);
    expect(isReadingFresh(latest, at(181))).toBe(false);
    expect(isReadingFresh(null, at(0))).toBe(false);
    expect(isReadingFresh(undefined, at(0))).toBe(false);
  });
});

describe('statusRefetchDelayMs', () => {
  it('fires 5 s after the reading expires', () => {
    expect(statusRefetchDelayMs(latest, at(0))).toBe(185_000);
    expect(statusRefetchDelayMs(latest, at(100))).toBe(85_000);
  });

  it('is re-armed from each fetched row', () => {
    // Fetch at t=60 returns a reading from t=60: the deadline moves to t=245.
    const first = statusRefetchDelayMs(latest, at(60));
    const rearmed = statusRefetchDelayMs(at(60).toISOString(), at(60));
    expect(first).toBe(125_000);
    expect(rearmed).toBe(185_000);
  });

  it('has no deadline without a reading or once it has passed', () => {
    expect(statusRefetchDelayMs(null, at(0))).toBeNull();
    expect(statusRefetchDelayMs(latest, at(185))).toBeNull();
    expect(statusRefetchDelayMs(latest, at(400))).toBeNull();
  });
});

describe('displayStatus', () => {
  it('shows the server labels while fresh', () => {
    expect(displayStatus(row(), at(60))).toEqual({
      overall: 'needs_attention',
      overallLabel: 'Needs attention',
      summary: 'Soil is getting dry — water soon',
      offline: false,
      aged: false,
      offlineSince: null,
    });
  });

  it('ages the cached row to Offline after 180 s', () => {
    expect(displayStatus(row(), at(180)).offline).toBe(false);
    expect(displayStatus(row(), at(181))).toEqual({
      overall: 'offline',
      overallLabel: 'Offline',
      summary: 'Offline',
      offline: true,
      aged: true,
      offlineSince: at(0),
    });
  });

  it('keeps the server offline row as is', () => {
    const r = row({ overall: 'offline', overall_label: 'Offline', summary: 'olvar-node stopped reporting' });
    expect(displayStatus(r, at(10))).toMatchObject({
      overall: 'offline',
      overallLabel: 'Offline',
      summary: 'olvar-node stopped reporting',
      offline: true,
      aged: false,
    });
  });

  it('goes offline when the device row is offline, using the LWT time', () => {
    const d = displayStatus(row(), at(30), { status: 'offline', status_changed_at: at(20).toISOString() });
    expect(d).toMatchObject({ overall: 'offline', summary: 'Offline', offline: true, aged: false });
    expect(d.offlineSince).toEqual(at(20));
  });

  it('goes offline when the cached row carries an offline device status', () => {
    expect(displayStatus(row({ device_status: 'offline' }), at(30)).offline).toBe(true);
  });

  it('shows no_data rows unchanged', () => {
    const r = row({ overall: 'no_data', overall_label: 'No data yet', summary: null, latest_reading_at: null });
    expect(displayStatus(r, at(1000))).toMatchObject({ overall: 'no_data', overallLabel: 'No data yet', offline: false });
  });
});

describe('offlineSince', () => {
  it('prefers the LWT time, then the latest reading', () => {
    expect(offlineSince(row(), { status: 'offline', status_changed_at: at(50).toISOString() })).toEqual(at(50));
    expect(offlineSince(row(), { status: 'offline', status_changed_at: null })).toEqual(at(0));
    expect(offlineSince(row(), { status: 'online', status_changed_at: at(50).toISOString() })).toEqual(at(0));
    expect(offlineSince(row({ latest_reading_at: null }), null)).toBeNull();
  });
});

describe('gateway staleness', () => {
  const seen = at(0).toISOString();

  it('uses its own 420 s threshold', () => {
    expect(GATEWAY_STALE_S).toBe(420);
    expect(isGatewayStale(seen, at(299))).toBe(false);
    expect(isGatewayStale(seen, at(400))).toBe(false);
    expect(isGatewayStale(seen, at(420))).toBe(false);
    expect(isGatewayStale(seen, at(421))).toBe(true);
    expect(isGatewayStale(null, at(0))).toBe(true);
  });

  it('reports the real age', () => {
    expect(gatewayAgeS(seen, at(180))).toBe(180);
    expect(gatewayAgeS(seen, at(-5))).toBe(0);
    expect(gatewayAgeS(undefined, at(0))).toBeNull();
  });

  it('never flickers offline with a heartbeat every 300 s over 30 min', () => {
    for (let s = 0; s <= 30 * 60; s += 10) {
      const lastBeat = Math.floor(s / 300) * 300;
      expect(isGatewayStale(at(lastBeat), at(s))).toBe(false);
    }
  });
});
