import { HourBars, LineArea, StepLine, type Band } from '@/components/charts';
import { DEVICE_OFFLINE_S } from '@/domain/status-freshness';

import type { MetricSeries, MetricSpec, Range } from './model';

const HOUR_MS = 3_600_000;

/**
 * The line breaks where the device was offline (no reading for more than 180 s, the server's
 * offline rule) and, on rollup ranges, where an hourly bucket is missing.
 */
export const MAX_GAP_MS: Record<Range, number> = {
  '24h': DEVICE_OFFLINE_S * 1000,
  '7d': 1.5 * HOUR_MS,
  '30d': 1.5 * HOUR_MS,
};

export type ChartProps = {
  spec: MetricSpec;
  range: Range;
  domain: readonly [Date, Date];
  data: MetricSeries;
  band: Band | null;
  calibrated: boolean;
  timeZone: string;
  height: number;
  label: string;
  yTicks?: number;
};

/** Soil is a step line (waterings are jumps), light over 24 h is hourly bars, the rest are smooth lines. */
export function Chart({ spec, range, domain, data, band, calibrated, timeZone, height, label, yTicks }: ChartProps) {
  if (spec.key === 'light' && range === '24h' && data.bars) {
    return (
      <HourBars
        data={data.bars}
        domain={domain}
        now={domain[1]}
        timeZone={timeZone}
        color={spec.color}
        height={height}
        accessibilityLabel={label}
        testID={`chart-${spec.key}`}
      />
    );
  }
  const common = {
    data: data.series,
    domain,
    timeZone,
    color: spec.color,
    height,
    yTicks,
    maxGapMs: MAX_GAP_MS[range],
    accessibilityLabel: label,
    testID: `chart-${spec.key}`,
  };
  if (spec.key === 'soil') {
    return calibrated ? (
      <StepLine {...common} band={band} floor={0} ceil={100} />
    ) : (
      <StepLine {...common} floor={0} ceil={4095} />
    );
  }
  return <LineArea {...common} band={band} floor={spec.key === 'light' ? 0 : undefined} ceil={spec.unit === '%' ? 100 : undefined} />;
}
