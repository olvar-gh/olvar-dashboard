import { Circle, G, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import { ChartFrame } from './ChartFrame';
import { Label, textWidth } from './parts';
import { clamp, formatTick, linear, type Band } from './scales';

export type RangeBarProps = {
  /** Scale ends, for example 10–35 °C. */
  min: number;
  max: number;
  /** Target range from the effective thresholds. */
  band?: Band | null;
  bandLabel?: string;
  /** Today's low and high; null when no readings yet. */
  low?: number | null;
  high?: number | null;
  value: number | null;
  color?: string;
  unit?: string;
  width?: number;
  accessibilityLabel?: string;
  testID?: string;
};

// Home temperature card (Figma 226:7619): 10 px track, 16 px knob, labels below.
const PAD = 12;
const TRACK = 10;
const TRACK_Y = 24;
const HEIGHT = 50;

export function RangeBar({
  min,
  max,
  band,
  bandLabel = 'ideal zone',
  low,
  high,
  value,
  color = colors.data.temp,
  unit = '°',
  width,
  accessibilityLabel,
  testID = 'range-bar',
}: RangeBarProps) {
  return (
    <ChartFrame height={HEIGHT} width={width} accessibilityLabel={accessibilityLabel} testID={testID}>
      {(w) => {
        const x = (v: number) => clamp(linear([min, max], [PAD, w - PAD])(v), PAD, w - PAD);
        const top = TRACK_Y - TRACK / 2;
        const labelTop = TRACK_Y + 12;
        const fmt = (v: number) => `${formatTick(v)}${unit}`;
        const bandLabels = band
          ? [band.min, band.max].filter((v) => {
              const lx = x(v);
              return (
                lx - textWidth(fmt(v)) / 2 > textWidth(fmt(min)) + 4 &&
                lx + textWidth(fmt(v)) / 2 < w - textWidth(fmt(max)) - 4
              );
            })
          : [];
        return (
          <G>
            <Rect x={PAD} y={top} width={w - 2 * PAD} height={TRACK} rx={TRACK / 2} fill={colors.border.subtle} />
            {band && (
              <G testID="range-band">
                <Rect
                  x={x(band.min)}
                  y={top}
                  width={x(band.max) - x(band.min)}
                  height={TRACK}
                  fill={colors.status.good}
                  fillOpacity={0.15}
                />
                <Label x={x(band.min)} top={0} weight={500} color={colors.brand.sage}>
                  {bandLabel}
                </Label>
              </G>
            )}
            {low != null && high != null && (
              <Rect
                x={x(Math.min(low, high))}
                y={top}
                width={Math.max(TRACK, x(Math.max(low, high)) - x(Math.min(low, high)))}
                height={TRACK}
                rx={TRACK / 2}
                fill={color}
                fillOpacity={0.55}
                testID="range-today"
              />
            )}
            {value != null && (
              <Circle
                cx={x(value)}
                cy={TRACK_Y}
                r={8}
                fill={colors.surface.card}
                stroke={color}
                strokeWidth={3}
                testID="range-value"
              />
            )}
            <Label x={0} top={labelTop}>
              {fmt(min)}
            </Label>
            {bandLabels.map((v) => (
              <Label key={v} x={x(v)} top={labelTop} anchor="middle" color={colors.text.secondary}>
                {fmt(v)}
              </Label>
            ))}
            <Label x={w} top={labelTop} anchor="end">
              {fmt(max)}
            </Label>
          </G>
        );
      }}
    </ChartFrame>
  );
}
