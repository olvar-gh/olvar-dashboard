import { area, curveLinear, curveMonotoneX, line } from 'd3-shape';
import { Circle, G, Line, Path } from 'react-native-svg';

import type { LocalDate } from '@/domain/time';
import { colors } from '@/theme';

import { ChartFrame } from './ChartFrame';
import type { Threshold } from './LineArea';
import { DashedLine, EndMarker, Label, YGrid } from './parts';
import {
  definedValues,
  latestDefined,
  linear,
  normalizeSeries,
  splitSegments,
  valueDomain,
  weekDays,
  type DefinedPoint,
  type SeriesPoint,
} from './scales';

export type WeekChartProps = {
  /** First local date of the week (plant time zone). */
  weekStart: LocalDate;
  timeZone: string;
  /** Soil % per hour (`readings_hourly_v`); plotted on the labelled axis. */
  soil: readonly SeriesPoint[];
  /** Temperature per hour; scaled to its own range, without an axis. */
  temperature: readonly SeriesPoint[];
  waterLine?: Threshold | null;
  /** Highlights this day's label. */
  today?: LocalDate;
  height?: number;
  width?: number;
  maxGapMs?: number;
  accessibilityLabel?: string;
  testID?: string;
};

// Timeline "This week" chart (Figma 227:8509, 1062 × 228).
const INSET = { left: 43, right: 8, top: 8, bottom: 27, labelGap: 10.6 };

export function WeekChart({
  weekStart,
  timeZone,
  soil,
  temperature,
  waterLine,
  today,
  height = 228,
  width,
  maxGapMs,
  accessibilityLabel,
  testID = 'week-chart',
}: WeekChartProps) {
  const days = weekDays(weekStart, timeZone);
  const domain = [days[0].start, days[6].end] as const;
  const soilPoints = normalizeSeries(soil, domain);
  const tempPoints = normalizeSeries(temperature, domain);
  const soilAxis = valueDomain(definedValues(soilPoints), {
    ticks: 4,
    include: [20, 80, waterLine?.value],
    floor: 0,
    ceil: 100,
  });
  const tempDomain = paddedExtent(definedValues(tempPoints));
  const latest = latestDefined(soilPoints);

  return (
    <ChartFrame height={height} width={width} accessibilityLabel={accessibilityLabel} testID={testID}>
      {(w) => {
        const left = INSET.left;
        const right = w - INSET.right;
        const bottom = height - INSET.bottom;
        const x = linear(domain, [left, right]);
        const ySoil = linear(soilAxis.domain, [bottom, INSET.top]);
        const yTemp = linear(tempDomain, [bottom, INSET.top]);
        const soilLine = line<DefinedPoint>()
          .x((p) => x(p.t))
          .y((p) => ySoil(p.v))
          .curve(curveLinear);
        const soilArea = area<DefinedPoint>()
          .x((p) => x(p.t))
          .y0(bottom)
          .y1((p) => ySoil(p.v))
          .curve(curveLinear);
        const tempLine = line<DefinedPoint>()
          .x((p) => x(p.t))
          .y((p) => yTemp(p.v))
          .curve(curveMonotoneX);

        return (
          <G>
            <YGrid ticks={soilAxis.ticks} y={ySoil} left={left} right={right} format={(v) => `${v}%`} />
            {days.slice(1).map((d) => (
              <Line
                key={d.date}
                x1={x(d.start)}
                x2={x(d.start)}
                y1={INSET.top}
                y2={bottom}
                stroke={colors.border.subtle}
                strokeDasharray="2 4"
                testID="day-separator"
              />
            ))}
            {waterLine && (
              <G>
                <DashedLine
                  y={ySoil(waterLine.value)}
                  left={left}
                  right={right}
                  color={colors.status.warn}
                  width={1.2}
                />
                {waterLine.label ? (
                  <Label
                    x={right - 8}
                    top={ySoil(waterLine.value) + 4}
                    anchor="end"
                    weight={500}
                    color={colors.status.warn}
                  >
                    {waterLine.label}
                  </Label>
                ) : null}
              </G>
            )}
            {splitSegments(soilPoints, maxGapMs).map((seg) =>
              seg.length === 1 ? (
                <Circle key={seg[0].t} cx={x(seg[0].t)} cy={ySoil(seg[0].v)} r={1.75} fill={colors.data.water} />
              ) : (
                <G key={seg[0].t} testID="soil-segment">
                  <Path d={soilArea(seg) ?? ''} fill={colors.data.water} fillOpacity={0.08} />
                  <Path
                    d={soilLine(seg) ?? ''}
                    stroke={colors.data.water}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </G>
              ),
            )}
            {splitSegments(tempPoints, maxGapMs).map((seg) =>
              seg.length === 1 ? (
                <Circle key={seg[0].t} cx={x(seg[0].t)} cy={yTemp(seg[0].v)} r={1.5} fill={colors.data.temp} />
              ) : (
                <Path
                  key={seg[0].t}
                  d={tempLine(seg) ?? ''}
                  stroke={colors.data.temp}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  testID="temp-segment"
                />
              ),
            )}
            {latest && <EndMarker x={x(latest.t)} y={ySoil(latest.v)} color={colors.data.water} />}
            {days.map((d) => {
              const isToday = d.date === today;
              return (
                <Label
                  key={d.date}
                  x={(x(d.start) + x(d.end)) / 2}
                  top={bottom + INSET.labelGap}
                  size={11}
                  anchor="middle"
                  weight={isToday ? 600 : 400}
                  color={isToday ? colors.text.primary : colors.text.tertiary}
                  testID={isToday ? 'day-today' : undefined}
                >
                  {d.label}
                </Label>
              );
            })}
          </G>
        );
      }}
    </ChartFrame>
  );
}

/** Temperature has no axis; padding keeps its curve in the middle band like the design. */
function paddedExtent(values: readonly number[]): [number, number] {
  if (!values.length) return [15, 30];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(1, (hi - lo) * 0.4);
  return [lo - pad, hi + pad];
}
