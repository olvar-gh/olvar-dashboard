import { Gauge, HourBars, LineArea, RangeBar } from '@/components/charts';
import { formatNumber } from '@/domain/format';

import type { SensorCharts } from './useHome';
import type { MetricKey } from './model';
import { metricColor, type Variant } from './palette';

/** The hourly soil line breaks where a bucket is missing (the device was offline that hour). */
const HOURLY_MAX_GAP_MS = 1.5 * 3_600_000;

const HEIGHT: Record<Variant, { line: number; bars: number }> = {
  desktop: { line: 64, bars: 78 },
  ios: { line: 48, bars: 56 },
};

/** The mini chart of a Home sensor card (Figma 226:7567 / 7588 / 7619 / 7644 and the iPhone cards). */
export function SensorChart({ metric, charts, variant }: { metric: MetricKey; charts: SensorCharts; variant: Variant }) {
  const color = metricColor(metric, variant);
  const band = charts.bands[metric];
  switch (metric) {
    case 'soil': {
      if (!charts.soilWeek) return null;
      const line = band ? { value: band.min, label: variant === 'desktop' ? `${formatNumber(band.min)}% water line` : undefined } : null;
      return (
        <LineArea
          variant="mini"
          curve="linear"
          data={charts.soilWeek.data}
          domain={charts.soilWeek.domain}
          timeZone={charts.timeZone}
          color={color}
          threshold={line}
          maxGapMs={HOURLY_MAX_GAP_MS}
          height={HEIGHT[variant].line}
          accessibilityLabel="Soil moisture over the last 7 days"
          testID="chart-soil"
        />
      );
    }
    case 'light':
      return (
        <HourBars
          variant="mini"
          data={charts.lightToday.data}
          domain={charts.lightToday.domain}
          timeZone={charts.timeZone}
          now={charts.now}
          color={color}
          height={HEIGHT[variant].bars}
          accessibilityLabel="Light per hour today"
          testID="chart-light"
        />
      );
    case 'temperature': {
      const { value, low, high } = charts.temperature;
      const known = [value, low, high, band?.min, band?.max].filter((v): v is number => v != null);
      return (
        <RangeBar
          min={Math.min(10, ...known.map(Math.floor))}
          max={Math.max(35, ...known.map(Math.ceil))}
          band={band}
          low={low}
          high={high}
          value={value}
          color={color}
          accessibilityLabel="Temperature today: low, high and now against the ideal zone"
          testID="chart-temperature"
        />
      );
    }
    case 'humidity':
      return (
        <Gauge
          value={charts.humidity}
          band={band}
          color={color}
          width={variant === 'ios' ? 96 : 124}
          showLabels={variant === 'desktop'}
          accessibilityLabel="Humidity gauge, 0 to 100 percent"
          testID="chart-humidity"
        />
      );
  }
}
