import { HourBars, LineArea, StepLine, type Band } from '@/components/charts';

import type { MetricSeries, MetricSpec, Range } from './model';

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
