import { toBuckets } from '../HourBars';

const HOUR = 3_600_000;

describe('local hour buckets across an off-grid offset change', () => {
  it('always advances (Africa/Monrovia, 1972-01-07 00:44:30Z)', () => {
    const from = Date.parse('1972-01-06T20:00:00Z');
    const to = Date.parse('1972-01-07T04:00:00Z');
    const buckets = toBuckets([], [from, to], HOUR, to, 'Africa/Monrovia');
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.length).toBeLessThan(12);
    for (let i = 1; i < buckets.length; i++) expect(buckets[i].start).toBeGreaterThan(buckets[i - 1].start);
  });
});
