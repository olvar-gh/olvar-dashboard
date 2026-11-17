import { addDays, localDate } from '@/domain/time';
import { advance, renderWithData, settle } from '@/data/testing/render-with-data';

import { useDayActivity } from '../useTimeline';

const TZ = 'Asia/Seoul';
const NOW = new Date('2026-11-17T05:30:00Z');
const TODAY = localDate(TZ, NOW);
const DAYS = Array.from({ length: 6 }, (_, i) => addDays(TODAY, -i));

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

function useWeek() {
  const days = [
    useDayActivity(DAYS[0], TZ),
    useDayActivity(DAYS[1], TZ),
    useDayActivity(DAYS[2], TZ),
    useDayActivity(DAYS[3], TZ),
    useDayActivity(DAYS[4], TZ),
    useDayActivity(DAYS[5], TZ),
  ];
  return days.map((d, i) => ({ date: DAYS[i], ...d }));
}

async function loadWeek(scenario?: 'offline') {
  const { result } = await renderWithData(useWeek, { now: NOW, days: 7, scenario });
  await settle(() => result.current.every((d) => !!d.rows), 200);
  return Object.fromEntries(result.current.map((d) => [d.date, d.rows!.map((r) => `${r.time ?? '--:--'} ${r.title}`)]));
}

describe('Timeline activity per fixture day', () => {
  it('matches the golden event lists', async () => {
    const week = await loadWeek();
    expect(week).toMatchSnapshot();
  });

  it('lists the injected outages and nothing for the 2-min gap', async () => {
    const week = await loadWeek();
    expect(week['2026-11-16']).toContain('14:00 Device restarted, offline 4 min');
    expect(week['2026-11-15']).toContain('09:30 Offline 09:30–09:34 (4 min)');
    expect(week['2026-11-15'].some((e) => e.includes('09:00') || e.startsWith('09:01'))).toBe(false);
    expect(week['2026-11-14']).toContain('03:10 Offline 03:10–03:50 (40 min)');
    expect(week['2026-11-12']).toContain('23:30 Offline 23:30–24:00 (30 min)');
    expect(week['2026-11-13']).toContain('00:00 Offline 00:00–00:40 (40 min)');
  });

  it('shows an ongoing outage as "Offline since"', async () => {
    const week = await loadWeek('offline');
    expect(week[TODAY][0]).toBe('14:06 Offline since 14:06');
  });

  it('adds an ongoing outage to today once the 180 s rule expires while open', async () => {
    const { result } = await renderWithData(useWeek, { now: NOW, days: 7 });
    await settle(() => result.current.every((d) => !!d.rows), 200);
    expect(result.current[0].rows!.some((r) => r.kind === 'offline_ongoing')).toBe(false);
    await advance(185_000);
    await settle(() => result.current[0].rows?.some((r) => r.kind === 'offline_ongoing') ?? false, 200);
    expect(result.current[0].rows![0]).toMatchObject({ kind: 'offline_ongoing', title: 'Offline since 14:31' });
  });
});
