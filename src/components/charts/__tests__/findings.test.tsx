import { render } from '@testing-library/react-native';

import { HourBars, miniLabels, toBuckets } from '../HourBars';
import { StepLine } from '../StepLine';
import { WeekChart, dayLabels } from '../WeekChart';
import { textWidth } from '../parts';
import { downsampleStep, drawableSegments, localHourStart, weekDays, type DefinedPoint } from '../scales';

const HOUR = 3_600_000;
const MIN = 60_000;
const t0 = Date.parse('2026-11-06T00:00:00Z');

function soilDay(jumpAt: number): DefinedPoint[] {
  return Array.from({ length: 1440 }, (_, i) => {
    const t = t0 + i * MIN;
    return { t, v: t < jumpAt ? 40 - i * 0.005 : 70 - (i - 1000) * 0.002 };
  });
}

describe('downsampleStep', () => {
  it('keeps a watering jump at its exact timestamp and values', () => {
    const jumpAt = t0 + 1000 * MIN;
    const points = soilDay(jumpAt);
    const out = downsampleStep(points, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    const i = out.findIndex((p) => p.t === jumpAt);
    expect(i).toBeGreaterThan(0);
    expect(out[i].v).toBe(70);
    expect(out[i - 1].v).toBeLessThan(40);
    expect(out.every((p) => points.some((q) => q.t === p.t && q.v === p.v))).toBe(true);
  });

  it('keeps the reading just before the jump as well as the jump', () => {
    const jumpAt = t0 + 1000 * MIN;
    const points = soilDay(jumpAt);
    const out = downsampleStep(points, 100);
    const i = out.findIndex((p) => p.t === jumpAt);
    expect(out[i - 1]).toEqual(points[999]);
  });

  it('keeps the first and the newest reading', () => {
    const points = soilDay(t0 + 700 * MIN);
    const out = downsampleStep(points, 31);
    expect(out[0]).toEqual(points[0]);
    expect(out[out.length - 1]).toEqual(points[points.length - 1]);
  });

  it('is used by drawableSegments for step runs', () => {
    const jumpAt = t0 + 1000 * MIN;
    const [seg] = drawableSegments(soilDay(jumpAt), 60, undefined, true);
    expect(seg.some((p) => p.t === jumpAt && p.v === 70)).toBe(true);
    const [averaged] = drawableSegments(soilDay(jumpAt), 60);
    expect(averaged.some((p) => p.t === jumpAt && p.v === 70)).toBe(false);
  });

  it('renders a StepLine whose path holds the jump at narrow widths', async () => {
    const jumpAt = t0 + 1000 * MIN;
    const r = await render(
      <StepLine data={soilDay(jumpAt)} domain={[t0, t0 + 1440 * MIN]} timeZone="UTC" color="#4a90c8" width={200} />,
    );
    const d = String(r.getByTestId('series-line').props.d);
    const pts = [...d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const rises = pts.slice(1).map((p, i) => (p[0] === pts[i][0] ? pts[i][1] - p[1] : 0));
    expect(Math.max(...rises)).toBeGreaterThan(30);
  });
});

describe('WeekChart day labels', () => {
  const days = weekDays('2026-11-08', 'Asia/Seoul');

  it('uses full labels when they fit and shorter ones when narrow', () => {
    expect(dayLabels(days, 150)[0]).toBe('Sun 8');
    expect(dayLabels(days, 28)[0]).toBe('Sun');
    expect(dayLabels(days, 18)[0]).toBe('8');
  });

  it('never overlaps on a 320 px chart', async () => {
    const r = await render(
      <WeekChart weekStart="2026-11-08" timeZone="Asia/Seoul" soil={[]} temperature={[]} width={240} />,
    );
    expect(r.toJSON()).toBeTruthy();
    const slot = (240 - 51) / 7;
    for (const l of dayLabels(days, slot)) expect(textWidth(l, 11)).toBeLessThan(slot);
  });
});

describe('mini HourBars', () => {
  it('renders an empty window without crashing', async () => {
    const r = await render(
      <HourBars variant="mini" data={[]} domain={[t0, t0]} timeZone="UTC" width={160} />,
    );
    expect(r.getByTestId('bars-empty')).toBeTruthy();
  });

  it('drops labels that would overlap at narrow widths', () => {
    const buckets = toBuckets([], [t0, t0 + 3 * HOUR], HOUR, t0 + 30 * MIN);
    const labels = miniLabels(buckets, 'UTC', 40 / 3, 40);
    expect(labels).toHaveLength(1);
    expect(labels[0].current).toBe(true);
    for (let i = 1; i < labels.length; i++) expect(labels[i].cx - labels[i - 1].cx).toBeGreaterThan(28);
  });

  it('keeps first, current and last when there is room', () => {
    const buckets = toBuckets([], [t0, t0 + 24 * HOUR], HOUR, t0 + 12 * HOUR + MIN);
    expect(miniLabels(buckets, 'UTC', 300 / 24, 300).map((l) => l.text)).toEqual(['00:00', '12:00', '23:00']);
  });
});

describe('local hour buckets', () => {
  it('aligns hour bars to the plant clock in a half-hour time zone', () => {
    const start = Date.parse('2026-11-05T18:30:00Z');
    const buckets = toBuckets([{ t: start + 10 * MIN, v: 5 }], [start, start + 3 * HOUR], HOUR, start + 3 * HOUR, 'Asia/Kolkata');
    expect(buckets.map((b) => b.start)).toEqual([start, start + HOUR, start + 2 * HOUR]);
    expect(buckets[0].v).toBe(5);
  });

  it('gives a 25-hour fall-back day 25 distinct hours', () => {
    const start = Date.parse('2026-11-01T04:00:00Z');
    const buckets = toBuckets([], [start, start + 25 * HOUR], HOUR, start, 'America/New_York');
    expect(new Set(buckets.map((b) => b.start)).size).toBe(25);
    expect(localHourStart(Date.parse('2026-11-01T06:20:00Z'), 'America/New_York')).toBe(Date.parse('2026-11-01T06:00:00Z'));
  });
});
