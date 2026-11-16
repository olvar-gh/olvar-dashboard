import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import Gallery from '@/app/(dev)/gallery';
import { colors } from '@/theme';

import { ChartsGallery } from '../ChartsGallery';
import { Gauge, arcPoint } from '../Gauge';
import { HourBars, barPath, toBuckets } from '../HourBars';
import { LineArea } from '../LineArea';
import { RangeBar } from '../RangeBar';
import { StepLine } from '../StepLine';
import { WeekChart } from '../WeekChart';
import { SAMPLE_DAY, SAMPLE_NOW, SAMPLE_TZ, sampleLightHourly, sampleSoil24h, sampleWeek } from '../samples';

const HOUR = 3_600_000;
const MIN = 60_000;

type Node = { type: string; props: Record<string, unknown>; children: Node[] | null };

function texts(json: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const node = n as Node;
    if (node.type === 'RNSVGTSpan' && typeof node.props.content === 'string') out.push(node.props.content);
    node.children?.forEach(walk);
  };
  walk(json);
  return out;
}

async function draw(el: ReactElement) {
  const r = await render(el);
  return { ...r, labels: texts(r.toJSON()) };
}

const base = { domain: SAMPLE_DAY, timeZone: SAMPLE_TZ, color: colors.data.water, width: 724 };

describe('LineArea', () => {
  it('draws grid, band, line, end marker and local-time ticks with Now', async () => {
    const r = await draw(<LineArea {...base} data={sampleSoil24h()} band={{ min: 35, max: 60 }} />);
    expect(r.getByTestId('target-band')).toBeTruthy();
    expect(r.getAllByTestId('series-line')).toHaveLength(1);
    expect(r.getByTestId('end-marker')).toBeTruthy();
    expect(r.labels).toEqual(expect.arrayContaining(['ideal', 'Now', '18:00', '00:00', '06:00', '12:00']));
  });

  it('breaks the line at null readings', async () => {
    const data = [
      { t: SAMPLE_NOW - 3 * HOUR, v: 40 },
      { t: SAMPLE_NOW - 2 * HOUR, v: 41 },
      { t: SAMPLE_NOW - HOUR, v: null },
      { t: SAMPLE_NOW - 30 * MIN, v: 42 },
      { t: SAMPLE_NOW, v: 43 },
    ];
    const r = await draw(<LineArea {...base} data={data} />);
    expect(r.getAllByTestId('series-line')).toHaveLength(2);
  });

  it('shows an isolated reading as a dot', async () => {
    const data = [
      { t: SAMPLE_NOW - 2 * HOUR, v: null },
      { t: SAMPLE_NOW - HOUR, v: 41 },
      { t: SAMPLE_NOW, v: null },
    ];
    const r = await draw(<LineArea {...base} data={data} />);
    expect(r.getByTestId('series-dot')).toBeTruthy();
    expect(r.queryByTestId('end-marker')).toBeNull();
  });

  it('renders axes only for an empty series', async () => {
    const r = await draw(<LineArea {...base} data={[]} />);
    expect(r.getByTestId('y-grid')).toBeTruthy();
    expect(r.queryByTestId('series-line')).toBeNull();
    expect(r.queryByTestId('end-marker')).toBeNull();
  });

  it('renders axes only for an all-null series', async () => {
    const data = sampleSoil24h().map((p) => ({ ...p, v: null }));
    const r = await draw(<LineArea {...base} data={data} />);
    expect(r.queryByTestId('series-line')).toBeNull();
    expect(r.queryByTestId('series-dot')).toBeNull();
    expect(r.queryByTestId('end-marker')).toBeNull();
  });

  it('mini variant has no axes and draws the threshold line', async () => {
    const r = await draw(
      <LineArea
        {...base}
        width={504}
        variant="mini"
        data={sampleSoil24h()}
        threshold={{ value: 35, label: '35% water line' }}
      />,
    );
    expect(r.queryByTestId('y-grid')).toBeNull();
    expect(r.getByTestId('threshold-line')).toBeTruthy();
    expect(r.labels).toEqual(['35% water line']);
  });

  it('keeps a continuous minute series as one line at narrow widths with maxGapMs', async () => {
    const data = Array.from({ length: 1440 }, (_, i) => ({ t: SAMPLE_DAY[0] + i * MIN, v: 40 + (i % 5) }));
    const r = await draw(<LineArea {...base} width={350} maxGapMs={3 * MIN} data={data} />);
    expect(r.getAllByTestId('series-line')).toHaveLength(1);
    expect(r.queryByTestId('series-dot')).toBeNull();
  });

  it('omits the Now label for past windows', async () => {
    const r = await draw(<LineArea {...base} now={false} data={sampleSoil24h()} />);
    expect(r.labels).not.toContain('Now');
  });

  it('waits for layout before drawing when no width is given', async () => {
    const { width: _w, ...rest } = base;
    const r = await draw(
      <LineArea {...rest} data={sampleSoil24h()} accessibilityLabel="Soil moisture, last 24 hours" />,
    );
    expect(r.queryByTestId('series-line')).toBeNull();
    expect(r.getByLabelText('Soil moisture, last 24 hours')).toBeTruthy();
  });
});

describe('StepLine', () => {
  it('uses step segments', async () => {
    const data = [
      { t: SAMPLE_NOW - HOUR, v: 40 },
      { t: SAMPLE_NOW, v: 60 },
    ];
    const r = await draw(<StepLine {...base} data={data} />);
    const d = r.getByTestId('series-line').props.d as string;
    expect(d).toMatch(/^M[\d.]+,[\d.]+L[\d.]+,[\d.]+L[\d.]+,[\d.]+$/);
    expect(r.getByTestId('step-line')).toBeTruthy();
  });
});

describe('HourBars', () => {
  it('buckets by start time and marks current and future buckets', () => {
    const start = Date.parse('2026-11-06T10:00:00Z');
    const buckets = toBuckets([{ t: start + 30 * MIN, v: 5 }], [start, start + 4 * HOUR], HOUR, start + 90 * MIN);
    expect(buckets.map((b) => [b.v, b.current, b.future])).toEqual([
      [5, false, false],
      [null, true, false],
      [null, false, true],
      [null, false, true],
    ]);
  });

  it('rounds bar corners within the bar size', () => {
    expect(barPath(0, 0, 4, 2, 6)).toBe('M0,2Q0,0 2,0H2Q4,0 4,2V2Q4,2 4,2H0Q0,2 0,2Z');
  });

  it('draws one bar per past hour and highlights the current one', async () => {
    const r = await draw(
      <HourBars data={sampleLightHourly()} domain={SAMPLE_DAY} timeZone={SAMPLE_TZ} now={SAMPLE_NOW} width={724} />,
    );
    expect(r.getAllByTestId('bar-current')).toHaveLength(1);
    expect(r.getAllByTestId('bar').length).toBeGreaterThanOrEqual(23);
    expect(r.labels).toEqual(expect.arrayContaining(['1.6k', 'Now']));
  });

  it('mini variant shows future hours as empty slots', async () => {
    const domain = [Date.parse('2026-11-06T05:00:00Z'), Date.parse('2026-11-06T18:00:00Z')] as const;
    const r = await draw(
      <HourBars
        variant="mini"
        data={sampleLightHourly(domain[0], SAMPLE_NOW)}
        domain={domain}
        timeZone={SAMPLE_TZ}
        now={SAMPLE_NOW}
        width={504}
      />,
    );
    expect(r.getAllByTestId('bar-future')).toHaveLength(4);
    expect(r.labels).toEqual(['06:00', '18:00', '14:00']);
  });

  it('mini variant draws future buckets as stubs even when they hold values', async () => {
    const domain = [Date.parse('2026-11-06T05:00:00Z'), Date.parse('2026-11-06T18:00:00Z')] as const;
    const data = sampleLightHourly(domain[0], domain[1]).map((p) => ({ ...p, v: 1000 }));
    const r = await draw(
      <HourBars
        variant="mini"
        data={data}
        domain={domain}
        timeZone={SAMPLE_TZ}
        now={SAMPLE_NOW}
        width={504}
        height={78}
      />,
    );
    for (const bar of r.getAllByTestId('bar-future')) {
      expect(Number((bar.props.d as string).match(/^M[\d.]+,([\d.]+)/)![1])).toBeGreaterThanOrEqual(58 - 1e-6);
    }
  });

  it('ignores future values when scaling observed bars', async () => {
    const domain = [Date.parse('2026-11-06T10:00:00Z'), Date.parse('2026-11-06T14:00:00Z')] as const;
    const now = Date.parse('2026-11-06T11:30:00Z');
    const data = [
      { t: domain[0], v: 100 },
      { t: domain[0] + HOUR, v: 100 },
      { t: domain[0] + 3 * HOUR, v: 100000 },
    ];
    const r = await draw(<HourBars data={data} domain={domain} timeZone="UTC" now={now} width={724} />);
    expect(r.labels).not.toContain('100k');
    expect(r.labels).toContain('100');
  });

  it('renders an empty series without bars', async () => {
    const r = await draw(<HourBars data={[]} domain={SAMPLE_DAY} timeZone={SAMPLE_TZ} width={724} />);
    expect(r.queryByTestId('bar')).toBeNull();
  });
});

describe('Gauge', () => {
  it('maps 0, 50 and 100 % onto the half circle', () => {
    expect(arcPoint(62, 62, 52, 0).map(Math.round)).toEqual([10, 62]);
    expect(arcPoint(62, 62, 52, 0.5).map(Math.round)).toEqual([62, 10]);
    expect(arcPoint(62, 62, 52, 1).map(Math.round)).toEqual([114, 62]);
    expect(arcPoint(62, 62, 52, 2).map(Math.round)).toEqual([114, 62]);
  });

  it('draws value, band and end labels', async () => {
    const r = await draw(<Gauge value={58} band={{ min: 40, max: 70 }} />);
    expect(r.getByTestId('gauge-value')).toBeTruthy();
    expect(r.getByTestId('gauge-band')).toBeTruthy();
    expect(r.labels).toEqual(['0', '100']);
  });

  it('draws only the track for a failed read', async () => {
    const r = await draw(<Gauge value={null} showLabels={false} />);
    expect(r.queryByTestId('gauge-value')).toBeNull();
    expect(r.labels).toEqual([]);
  });
});

describe('RangeBar', () => {
  it('draws band, today range, knob and labels', async () => {
    const r = await draw(
      <RangeBar min={10} max={35} band={{ min: 18, max: 27 }} low={19.8} high={24.6} value={23.4} width={504} />,
    );
    expect(r.getByTestId('range-today')).toBeTruthy();
    expect(r.getByTestId('range-value')).toBeTruthy();
    expect(r.labels).toEqual(['ideal zone', '10°', '18°', '27°', '35°']);
  });

  it('keeps the knob on the track for out-of-range values and skips missing data', async () => {
    const r = await draw(<RangeBar min={10} max={35} value={50} width={504} />);
    expect(r.getByTestId('range-value').props.cx).toBe(492);
    expect(r.queryByTestId('range-today')).toBeNull();
    expect(r.queryByTestId('range-band')).toBeNull();
  });
});

describe('WeekChart', () => {
  it('draws 7 day labels, 6 separators, both series and today in bold', async () => {
    const week = sampleWeek();
    const r = await draw(
      <WeekChart
        weekStart="2026-11-01"
        timeZone={SAMPLE_TZ}
        soil={week.soil}
        temperature={week.temperature}
        waterLine={{ value: 35, label: '35% water line' }}
        today="2026-11-06"
        width={1062}
      />,
    );
    expect(r.getAllByTestId('day-separator')).toHaveLength(6);
    expect(r.getAllByTestId('soil-segment')).toHaveLength(1);
    expect(r.getAllByTestId('temp-segment')).toHaveLength(1);
    expect(r.labels).toEqual(expect.arrayContaining(['20%', '80%', 'Sun 1', 'Sat 7', '35% water line']));
    expect(texts(r.getByTestId('day-today'))).toEqual(['Fri 6']);
  });

  it('clips points to the local week and handles empty series', async () => {
    const outside = [{ t: Date.parse('2026-10-20T00:00:00Z'), v: 50 }];
    const r = await draw(
      <WeekChart weekStart="2026-11-01" timeZone="America/New_York" soil={outside} temperature={[]} width={800} />,
    );
    expect(r.queryByTestId('soil-segment')).toBeNull();
    expect(r.queryByTestId('end-marker')).toBeNull();
    expect(r.getAllByTestId('day-separator')).toHaveLength(6);
  });
});

describe('WeekChart axis', () => {
  it('never labels soil above 100 %', async () => {
    const soil = [
      { t: Date.parse('2026-11-02T12:00:00Z'), v: 20 },
      { t: Date.parse('2026-11-03T12:00:00Z'), v: 99 },
    ];
    const r = await draw(<WeekChart weekStart="2026-11-01" timeZone="UTC" soil={soil} temperature={[]} width={800} />);
    const pct = r.labels.filter((l) => l.endsWith('%')).map((l) => parseFloat(l));
    expect(Math.max(...pct)).toBe(100);
  });
});

describe('ChartsGallery', () => {
  it('renders every chart', async () => {
    const r = await render(<ChartsGallery />);
    expect(r.getByTestId('charts-gallery')).toBeTruthy();
    expect(r.getByText('Charts')).toBeTruthy();
  });
});

describe('gallery route', () => {
  it('puts the charts in a top-aligned scroll view', async () => {
    const r = await render(<Gallery />);
    const scroll = r.getByTestId('gallery-scroll');
    expect(scroll.type).toBe('RCTScrollView');
    expect(JSON.stringify(scroll.props.contentContainerStyle ?? {})).not.toContain('justifyContent');
  });
});
