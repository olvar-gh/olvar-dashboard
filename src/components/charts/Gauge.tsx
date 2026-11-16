import { Circle, G, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { ChartFrame } from './ChartFrame';
import { Label } from './parts';
import { clamp, formatTick, type Band } from './scales';

export type GaugeProps = {
  /** Null (read failed / no data) draws the empty track only. */
  value: number | null;
  min?: number;
  max?: number;
  band?: Band | null;
  color?: string;
  /** Arc width; the height follows the Figma 124 × 64 proportion. */
  width?: number;
  showLabels?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

const STROKE = 10;
const LABELS = 18;

/** Point on the half circle for a 0–1 fraction, from the left end over the top to the right. */
export function arcPoint(cx: number, cy: number, r: number, fraction: number): [number, number] {
  const angle = Math.PI * (1 - clamp(fraction, 0, 1));
  return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
}

export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x0, y0] = arcPoint(cx, cy, r, from);
  const [x1, y1] = arcPoint(cx, cy, r, to);
  return `M${x0},${y0}A${r},${r} 0 0 1 ${x1},${y1}`;
}

/** Half-circle gauge from the Home humidity card (Figma 226:7644). */
export function Gauge({
  value,
  min = 0,
  max = 100,
  band,
  color = colors.data.humidity,
  width = 124,
  showLabels = true,
  accessibilityLabel,
  testID = 'gauge',
}: GaugeProps) {
  const arcHeight = (width * 64) / 124;
  const height = arcHeight + (showLabels ? LABELS : 0);
  const cx = width / 2;
  const cy = arcHeight - 2;
  const r = width / 2 - STROKE;
  const frac = (v: number) => (max === min ? 0 : (v - min) / (max - min));

  return (
    <ChartFrame height={height} width={width} accessibilityLabel={accessibilityLabel} testID={testID}>
      {() => (
        <G>
          <Path
            d={arcPath(cx, cy, r, 0, 1)}
            stroke={colors.border.subtle}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
          {band && (
            <Path
              d={arcPath(cx, cy, r, frac(band.min), frac(band.max))}
              stroke={color}
              strokeOpacity={0.25}
              strokeWidth={STROKE}
              fill="none"
              testID="gauge-band"
            />
          )}
          {value != null && (
            <G testID="gauge-value">
              <Path
                d={arcPath(cx, cy, r, 0, frac(value))}
                stroke={color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
              />
              <Circle
                cx={arcPoint(cx, cy, r, frac(value))[0]}
                cy={arcPoint(cx, cy, r, frac(value))[1]}
                r={7}
                fill={colors.surface.card}
                stroke={color}
                strokeWidth={3}
              />
            </G>
          )}
          {showLabels && (
            <G>
              <Label x={cx - r} top={arcHeight + 4} anchor="middle">
                {formatTick(min)}
              </Label>
              <Label x={cx + r} top={arcHeight + 4} anchor="middle">
                {formatTick(max)}
              </Label>
            </G>
          )}
        </G>
      )}
    </ChartFrame>
  );
}
