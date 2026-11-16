import {
  addDays,
  daysBetween,
  isSelectableDate,
  localDate,
  localDayBounds,
  oldestSelectableDate,
  startOfLocalDay,
  todayWindow,
  tzOffsetMs,
} from '../time';

const iso = (d: Date) => d.toISOString();

describe('tzOffsetMs', () => {
  it('returns the offset east of UTC', () => {
    expect(tzOffsetMs('Asia/Kolkata', '2026-11-16T00:00:00Z')).toBe(5.5 * 3_600_000);
    expect(tzOffsetMs('Asia/Kathmandu', new Date('2026-11-16T00:00:00Z'))).toBe(5.75 * 3_600_000);
    expect(tzOffsetMs('America/New_York', Date.parse('2026-07-01T12:00:00.250Z'))).toBe(-4 * 3_600_000);
    expect(tzOffsetMs('UTC', -1500)).toBe(0);
  });
});

describe('localDate', () => {
  it('gives the calendar date in the zone', () => {
    expect(localDate('Asia/Kolkata', '2026-11-15T18:29:59Z')).toBe('2026-11-15');
    expect(localDate('Asia/Kolkata', '2026-11-15T18:30:00Z')).toBe('2026-11-16');
    expect(localDate('America/Los_Angeles', '2026-11-16T07:00:00Z')).toBe('2026-11-15');
  });
});

describe('addDays / daysBetween', () => {
  it('does calendar arithmetic across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-10', '2026-11-16')).toBe(6);
    expect(daysBetween('2026-11-16', '2026-11-10')).toBe(-6);
  });

  it('rejects malformed dates', () => {
    expect(() => addDays('2026-1-1', 1)).toThrow('Invalid local date');
  });
});

describe('localDayBounds', () => {
  it('is 24 h on an ordinary day', () => {
    const b = localDayBounds('Asia/Seoul', '2026-11-16');
    expect(iso(b.start)).toBe('2026-11-15T15:00:00.000Z');
    expect(iso(b.end)).toBe('2026-11-16T15:00:00.000Z');
    expect(b.hours).toBe(24);
  });

  it('is 23 h on a spring-forward day', () => {
    const b = localDayBounds('America/New_York', '2026-03-08');
    expect(iso(b.start)).toBe('2026-03-08T05:00:00.000Z');
    expect(iso(b.end)).toBe('2026-03-09T04:00:00.000Z');
    expect(b.hours).toBe(23);
  });

  it('is 25 h on a fall-back day', () => {
    const b = localDayBounds('America/New_York', '2026-11-01');
    expect(iso(b.start)).toBe('2026-11-01T04:00:00.000Z');
    expect(iso(b.end)).toBe('2026-11-02T05:00:00.000Z');
    expect(b.hours).toBe(25);
  });

  it('runs from 18:30 UTC in Asia/Kolkata (+05:30)', () => {
    const b = localDayBounds('Asia/Kolkata', '2026-11-16');
    expect(iso(b.start)).toBe('2026-11-15T18:30:00.000Z');
    expect(iso(b.end)).toBe('2026-11-16T18:30:00.000Z');
    expect(b.hours).toBe(24);
  });

  it('runs from 18:15 UTC in Asia/Kathmandu (+05:45)', () => {
    const b = localDayBounds('Asia/Kathmandu', '2026-11-16');
    expect(iso(b.start)).toBe('2026-11-15T18:15:00.000Z');
    expect(iso(b.end)).toBe('2026-11-16T18:15:00.000Z');
  });

  it('handles zones far from UTC', () => {
    expect(iso(startOfLocalDay('Pacific/Kiritimati', '2026-11-16'))).toBe('2026-11-15T10:00:00.000Z');
    expect(iso(startOfLocalDay('Pacific/Pago_Pago', '2026-11-16'))).toBe('2026-11-16T11:00:00.000Z');
  });

  it('starts at the transition when DST skips midnight (America/Santiago)', () => {
    // 2026-09-06 00:00 -04 jumps to 01:00 -03: the day starts at 04:00 UTC and lasts 23 h.
    const b = localDayBounds('America/Santiago', '2026-09-06');
    expect(iso(b.start)).toBe('2026-09-06T04:00:00.000Z');
    expect(b.hours).toBe(23);
  });

  it('takes the first midnight when DST repeats the hour before it (America/Santiago)', () => {
    // 2026-04-05 00:00 -03 falls back to 2026-04-04 23:00 -04: the 4th lasts 25 h.
    const b = localDayBounds('America/Santiago', '2026-04-04');
    expect(iso(b.start)).toBe('2026-04-04T03:00:00.000Z');
    expect(iso(b.end)).toBe('2026-04-05T04:00:00.000Z');
    expect(b.hours).toBe(25);
  });
});

describe('todayWindow', () => {
  it('runs from local midnight to now', () => {
    const now = new Date('2026-11-16T05:00:00Z');
    expect(todayWindow('Asia/Seoul', now)).toEqual({
      date: '2026-11-16',
      start: new Date('2026-11-15T15:00:00Z'),
      end: now,
    });
  });
});

describe('retention', () => {
  const now = new Date('2026-11-16T05:00:00Z');

  it('allows the last 90 days up to today', () => {
    expect(oldestSelectableDate('Asia/Seoul', now)).toBe('2026-08-18');
    expect(isSelectableDate('Asia/Seoul', '2026-08-18', now)).toBe(true);
    expect(isSelectableDate('Asia/Seoul', '2026-11-16', now)).toBe(true);
  });

  it('disables older and future dates', () => {
    expect(isSelectableDate('Asia/Seoul', '2026-08-17', now)).toBe(false);
    expect(isSelectableDate('Asia/Seoul', '2026-11-17', now)).toBe(false);
  });
});
