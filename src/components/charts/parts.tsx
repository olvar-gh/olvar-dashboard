import { Circle, G, Line, Rect, Text } from 'react-native-svg';

import { colors, interFamily, type FontWeight } from '@/theme';

import { clamp, formatTick, type Tick } from './scales';

// Inter's ascender is 0.97 em; SVG text is placed by its baseline, Figma by the line box top.
const ASCENT = 0.97;

export type LabelProps = {
  x: number;
  /** Top of the text line box, as Figma measures it. */
  top: number;
  children: string;
  size?: number;
  weight?: FontWeight;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  testID?: string;
};

export function Label({
  x,
  top,
  children,
  size = 10,
  weight = 400,
  color = colors.text.tertiary,
  anchor = 'start',
  testID,
}: LabelProps) {
  return (
    <Text
      x={x}
      y={top + size * ASCENT}
      fill={color}
      fontFamily={interFamily[weight]}
      fontSize={size}
      textAnchor={anchor}
      testID={testID}
    >
      {children}
    </Text>
  );
}

/** Rough Inter width, enough to keep axis labels from colliding. */
export function textWidth(text: string, size = 10): number {
  return text.length * size * 0.56;
}

export type YGridProps = {
  ticks: readonly number[];
  y: (v: number) => number;
  left: number;
  right: number;
  format?: (v: number) => string;
};

/** Horizontal gridlines with their values at the left edge. */
export function YGrid({ ticks, y, left, right, format = formatTick }: YGridProps) {
  return (
    <G testID="y-grid">
      {ticks.map((v) => (
        <G key={v}>
          <Line x1={left} x2={right} y1={y(v)} y2={y(v)} stroke={colors.border.subtle} strokeWidth={1} />
          <Label x={0} top={y(v) - 7}>
            {format(v)}
          </Label>
        </G>
      ))}
    </G>
  );
}

export type XLabelsProps = {
  ticks: readonly Tick[];
  x: (t: number) => number;
  left: number;
  right: number;
  top: number;
  /** Where the current instant falls; draws a bold "Now" there and drops ticks it would cover. */
  nowX?: number;
};

export function XLabels({ ticks, x, left, right, top, nowX }: XLabelsProps) {
  const nowWidth = textWidth('Now');
  const atEdge = nowX !== undefined && nowX + nowWidth / 2 >= right - 8;
  const nowCx = nowX === undefined ? 0 : atEdge ? right - nowWidth / 2 : Math.max(nowX, left + nowWidth / 2);
  const shown = ticks
    .map((tick) => {
      const w = textWidth(tick.label);
      return { ...tick, w, cx: clamp(x(tick.t), left + w / 2, right - w / 2) };
    })
    .filter((tick) => nowX === undefined || Math.abs(tick.cx - nowCx) >= (tick.w + nowWidth) / 2 + 8);

  return (
    <G testID="x-labels">
      {shown.map((tick) => (
        <Label key={tick.t} x={tick.cx} top={top} anchor="middle">
          {tick.label}
        </Label>
      ))}
      {nowX !== undefined && (
        <Label
          x={atEdge ? right : nowCx}
          top={top}
          anchor={atEdge ? 'end' : 'middle'}
          weight={600}
          color={colors.text.primary}
          testID="now-label"
        >
          Now
        </Label>
      )}
    </G>
  );
}

export function EndMarker({ x, y, color, r = 5 }: { x: number; y: number; color: string; r?: number }) {
  return <Circle cx={x} cy={y} r={r} fill={colors.surface.card} stroke={color} strokeWidth={2.5} testID="end-marker" />;
}

export type TargetBandProps = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  label?: string;
};

/** The target range, drawn from the effective threshold numbers; it never judges values. */
export function TargetBand({ top, bottom, left, right, label }: TargetBandProps) {
  return (
    <G testID="target-band">
      <Rect x={left} y={top} width={right - left} height={bottom - top} fill={colors.status.good} fillOpacity={0.08} />
      {label ? (
        <Label x={right - 10} top={top + 4} anchor="end" weight={500} color={colors.status.good}>
          {label}
        </Label>
      ) : null}
    </G>
  );
}

export function DashedLine({
  y,
  left,
  right,
  color,
  width = 1,
  dash = '4 4',
}: {
  y: number;
  left: number;
  right: number;
  color: string;
  width?: number;
  dash?: string;
}) {
  return (
    <Line
      x1={left}
      x2={right}
      y1={y}
      y2={y}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
      testID="threshold-line"
    />
  );
}
