import { area, curveLinear, curveMonotoneX, curveStepAfter, line, type CurveFactory } from 'd3-shape';
import { Circle, G, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { ChartFrame } from './ChartFrame';
import { DashedLine, EndMarker, Label, TargetBand, XLabels, YGrid } from './parts';
import {
  definedValues,
  drawableSegments,
  latestDefined,
  linear,
  normalizeSeries,
  timeTicks,
  toMs,
  valueDomain,
  type Band,
  type DefinedPoint,
  type SeriesPoint,
} from './scales';

export type Curve = 'smooth' | 'linear' | 'step';

const curves: Record<Curve, CurveFactory> = {
  smooth: curveMonotoneX,
  linear: curveLinear,
  step: curveStepAfter,
};

export type Threshold = { value: number; label?: string };

export type LineAreaProps = {
  data: readonly SeriesPoint[];
  /** The visible window; points outside it are dropped. */
  domain: readonly [Date | string | number, Date | string | number];
  /** Plant IANA time zone for the axis labels. */
  timeZone: string;
  color: string;
  /** Target range from the effective thresholds. */
  band?: Band | null;
  bandLabel?: string;
  /** A dashed reference line, such as the soil water line. */
  threshold?: Threshold | null;
  curve?: Curve;
  /** `full` is the Sensors detail chart; `mini` is the Home card sparkline. */
  variant?: 'full' | 'mini';
  height?: number;
  width?: number;
  /** Label the right edge "Now" (live windows ending at the current time). */
  now?: boolean;
  yTicks?: number;
  /** Bounds for the value axis, for example 0–100 for percentages. */
  floor?: number;
  ceil?: number;
  /** Also break the line where readings are further apart than this. */
  maxGapMs?: number;
  accessibilityLabel?: string;
  testID?: string;
};

// Plot insets measured on the Sensors chart (Figma 227:7874, 724 × 216).
const FULL = { left: 45, right: 6, top: 6, bottom: 23.5, labelGap: 8.4 };
const MINI = { x: 4, top: 6, bottom: 6, labelHeight: 12 };

export function LineArea({
  data,
  domain,
  timeZone,
  color,
  band,
  bandLabel = 'ideal',
  threshold,
  curve = 'smooth',
  variant = 'full',
  height = variant === 'mini' ? 64 : 216,
  width,
  now = true,
  yTicks = 5,
  floor,
  ceil,
  maxGapMs,
  accessibilityLabel,
  testID = 'line-area',
}: LineAreaProps) {
  const timeDomain = [toMs(domain[0]), toMs(domain[1])] as const;
  const points = normalizeSeries(data, timeDomain);
  const latest = latestDefined(points);
  const values = definedValues(points);
  const mini = variant === 'mini';

  return (
    <ChartFrame height={height} width={width} accessibilityLabel={accessibilityLabel} testID={testID}>
      {(w) => {
        const left = mini ? MINI.x : FULL.left;
        const right = w - (mini ? MINI.x : FULL.right);
        const top = mini ? MINI.top : FULL.top;
        const plotBottom = mini ? height - (threshold?.label ? MINI.labelHeight : 0) : height - FULL.bottom;
        const lineBottom = mini ? plotBottom - MINI.bottom : plotBottom;

        const include = mini ? [threshold?.value] : [band?.min, band?.max, threshold?.value];
        const { domain: yDomain, ticks } = mini
          ? miniDomain(values, include)
          : valueDomain(values, { ticks: yTicks, include, floor, ceil });

        const x = linear(timeDomain, [left, right]);
        const y = linear(yDomain, [lineBottom, top]);
        const segments = drawableSegments(points, Math.ceil((right - left) / 2), maxGapMs);
        const factory = curves[curve];
        const toLine = line<DefinedPoint>()
          .x((p) => x(p.t))
          .y((p) => y(p.v))
          .curve(factory);
        const toArea = area<DefinedPoint>()
          .x((p) => x(p.t))
          .y0(plotBottom)
          .y1((p) => y(p.v))
          .curve(factory);

        return (
          <G>
            {!mini && <YGrid ticks={ticks} y={y} left={left} right={right} />}
            {!mini && band && (
              <TargetBand top={y(band.max)} bottom={y(band.min)} left={left} right={right} label={bandLabel} />
            )}
            {segments.map((seg) =>
              seg.length === 1 ? (
                <Circle key={seg[0].t} cx={x(seg[0].t)} cy={y(seg[0].v)} r={1.75} fill={color} testID="series-dot" />
              ) : (
                <G key={seg[0].t} testID="series-segment">
                  <Path d={toArea(seg) ?? ''} fill={color} fillOpacity={mini ? 0.12 : 0.1} />
                  <Path
                    d={toLine(seg) ?? ''}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    testID="series-line"
                  />
                </G>
              ),
            )}
            {threshold && (
              <G>
                <DashedLine
                  y={y(threshold.value)}
                  left={mini ? 0 : left}
                  right={mini ? w : right}
                  color={colors.status.warn}
                  width={mini ? 1 : 1.2}
                />
                {threshold.label ? (
                  <Label
                    x={mini ? w : right - 8}
                    top={y(threshold.value) + 2}
                    anchor="end"
                    weight={500}
                    color={colors.status.warn}
                  >
                    {threshold.label}
                  </Label>
                ) : null}
              </G>
            )}
            {latest && <EndMarker x={x(latest.t)} y={y(latest.v)} color={color} />}
            {!mini && (
              <XLabels
                ticks={timeTicks(timeDomain, timeZone, right - left)}
                x={x}
                left={left}
                right={w}
                top={plotBottom + FULL.labelGap}
                nowX={now ? w : undefined}
              />
            )}
          </G>
        );
      }}
    </ChartFrame>
  );
}

function miniDomain(values: readonly number[], include: readonly (number | null | undefined)[]) {
  const all = [...values, ...include].filter((v): v is number => typeof v === 'number');
  if (!all.length) return { domain: [0, 1] as [number, number], ticks: [] };
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = hi - lo < 1e-9 ? 1 : (hi - lo) * 0.1;
  return { domain: [lo - pad, hi + pad] as [number, number], ticks: [] };
}
