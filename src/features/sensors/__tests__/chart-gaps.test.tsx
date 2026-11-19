import { fireEvent, render, type RenderResult } from '@testing-library/react-native';

import { SensorChart as HomeSensorChart } from '@/features/home/SensorChart';
import type { SensorCharts } from '@/features/home/useHome';

import { METRICS, type MetricKey, type Range } from '../model';
import { Chart } from '../SensorChart';

const MIN = 60_000;
const HOUR = 60 * MIN;
const t0 = Date.parse('2026-11-05T00:00:00Z');
const spec = (key: MetricKey) => METRICS.find((m) => m.key === key)!;

async function measure(r: RenderResult, testID: string) {
  await fireEvent(r.getByTestId(testID), 'layout', { nativeEvent: { layout: { width: 600, height: 200 } } });
}

/** Points every `step` ms over `count` steps, skipping indexes in `missing`. */
function series(count: number, step: number, missing: number[]) {
  return Array.from({ length: count }, (_, i) => i)
    .filter((i) => !missing.includes(i))
    .map((i) => ({ t: t0 + i * step, v: 20 + (i % 5) }));
}

async function lines(key: MetricKey, range: Range, data: { t: number; v: number }[], span: number) {
  const r = await render(
    <Chart
      spec={spec(key)}
      range={range}
      domain={[new Date(t0), new Date(t0 + span)]}
      data={{ series: data, stats: null }}
      band={null}
      calibrated
      timeZone="UTC"
      height={200}
      label="chart"
    />,
  );
  await measure(r, `chart-${key}`);
  return r.queryAllByTestId('series-line').length;
}

describe('Sensors charts break at gaps', () => {
  it('breaks the 24 h line where the device was offline (no reading for over 180 s)', async () => {
    const data = series(120, MIN, [50, 51, 52, 53, 54, 55]);
    expect(await lines('temperature', '24h', data, 120 * MIN)).toBe(2);
    expect(await lines('soil', '24h', data, 120 * MIN)).toBe(2);
  });

  it('keeps the 24 h line through a single missed reading', async () => {
    expect(await lines('temperature', '24h', series(120, MIN, [50]), 120 * MIN)).toBe(1);
  });

  it('breaks the 7 d line where an hourly bucket is missing', async () => {
    const data = series(48, HOUR, [20]);
    expect(await lines('humidity', '7d', data, 48 * HOUR)).toBe(2);
    expect(await lines('soil', '30d', data, 48 * HOUR)).toBe(2);
  });
});

describe('Home soil chart breaks at gaps', () => {
  it('breaks the 7-day line where an hourly bucket is missing', async () => {
    const charts = {
      timeZone: 'UTC',
      now: new Date(t0 + 48 * HOUR),
      soilWeek: { data: series(48, HOUR, [20, 21]), domain: [new Date(t0), new Date(t0 + 48 * HOUR)] as const },
      bands: { soil: null, light: null, temperature: null, humidity: null },
    } as unknown as SensorCharts;
    const r = await render(<HomeSensorChart metric="soil" charts={charts} variant="desktop" />);
    await measure(r, 'chart-soil');
    expect(r.queryAllByTestId('series-line')).toHaveLength(2);
  });
});
