import { G, Path } from 'react-native-svg';

import { formatTime } from '@/domain/format';
import { colors } from '@/theme';

import { ChartFrame } from './ChartFrame';
import { Label, XLabels, YGrid, textWidth } from './parts';
import { clamp, linear, normalizeSeries, timeTicks, toMs, valueDomain, type SeriesPoint } from './scales';

const HOUR_MS = 3_600_000;

export type HourBarsProps = {
  /** One point per bucket, `t` = bucket start (for example `readings_hourly_v.bucket`). */
  data: readonly SeriesPoint[];
  domain: readonly [Date | string | number, Date | string | number];
  timeZone: string;
  color?: string;
  bucketMs?: number;
  /** The current instant: its bucket is highlighted and later buckets are drawn as empty slots. */
  now?: Date | string | number;
  variant?: 'full' | 'mini';
  height?: number;
  width?: number;
  accessibilityLabel?: string;
  testID?: string;
};

export type Bucket = { start: number; end: number; v: number | null; current: boolean; future: boolean };

/** Buckets covering `domain`, aligned to `bucketMs`, each with its value (null when missing). */
export function toBuckets(
  data: readonly SeriesPoint[],
  domain: readonly [number, number],
  bucketMs: number,
  now: number,
): Bucket[] {
  const first = Math.floor(domain[0] / bucketMs) * bucketMs;
  const byStart = new Map<number, number | null>();
  for (const p of normalizeSeries(data)) byStart.set(Math.floor(p.t / bucketMs) * bucketMs, p.v);
  const out: Bucket[] = [];
  for (let start = first; start < domain[1]; start += bucketMs) {
    out.push({
      start,
      end: start + bucketMs,
      v: byStart.get(start) ?? null,
      current: now >= start && now < start + bucketMs,
      future: start > now,
    });
  }
  return out;
}

/** A bar with rounded top corners (and bottom ones when `roundBottom`). */
export function barPath(x: number, y: number, w: number, h: number, r: number, roundBottom = false): string {
  const rt = Math.max(0, Math.min(r, w / 2, roundBottom ? h / 2 : h));
  const rb = roundBottom ? rt : 0;
  return [
    `M${x},${y + rt}`,
    `Q${x},${y} ${x + rt},${y}`,
    `H${x + w - rt}`,
    `Q${x + w},${y} ${x + w},${y + rt}`,
    `V${y + h - rb}`,
    `Q${x + w},${y + h} ${x + w - rb},${y + h}`,
    `H${x + rb}`,
    `Q${x},${y + h} ${x},${y + h - rb}`,
    'Z',
  ].join('');
}

// Sensors light chart (Figma 227:7928) and Home light card (226:7588).
const FULL = { left: 45, right: 6, top: 6, bottom: 23.5, labelGap: 8.4, barRatio: 0.847, radius: 4, zeroHeight: 2 };
const MINI = { plot: 64, labelGap: 2, barRatio: 0.615, radius: 6, stubWidth: 16, stubHeight: 6 };

export function HourBars({
  data,
  domain,
  timeZone,
  color = colors.data.light,
  bucketMs = HOUR_MS,
  now,
  variant = 'full',
  height = variant === 'mini' ? 78 : 216,
  width,
  accessibilityLabel,
  testID = 'hour-bars',
}: HourBarsProps) {
  const timeDomain = [toMs(domain[0]), toMs(domain[1])] as const;
  const nowMs = now === undefined ? timeDomain[1] : toMs(now);
  const buckets = toBuckets(data, timeDomain, bucketMs, nowMs);
  const values = buckets.flatMap((b) => (b.v == null ? [] : [b.v]));
  const mini = variant === 'mini';

  return (
    <ChartFrame height={height} width={width} accessibilityLabel={accessibilityLabel} testID={testID}>
      {(w) => {
        if (mini) {
          const plot = Math.min(MINI.plot, height - 14);
          const slot = w / Math.max(1, buckets.length);
          const y = linear([0, Math.max(1, ...values)], [plot, 0]);
          const labelled = new Set([0, buckets.length - 1, buckets.findIndex((b) => b.current)]);
          return (
            <G>
              {buckets.map((b, i) => {
                const cx = slot * i + slot / 2;
                const stub = b.v == null || b.v <= 0 || y(b.v) > plot - MINI.stubHeight;
                const bw = stub ? Math.min(MINI.stubWidth, slot) : slot * MINI.barRatio;
                const top = stub ? plot - MINI.stubHeight : y(b.v as number);
                const fill = b.future ? colors.border.subtle : color;
                const opacity = b.future || b.current ? 1 : 0.5;
                return (
                  <Path
                    key={b.start}
                    d={barPath(cx - bw / 2, top, bw, plot - top, stub ? MINI.stubHeight / 2 : MINI.radius, true)}
                    fill={fill}
                    fillOpacity={opacity}
                    testID={b.current ? 'bar-current' : b.future ? 'bar-future' : 'bar'}
                  />
                );
              })}
              {[...labelled]
                .filter((i) => i >= 0)
                .map((i) => {
                  const text = formatTime(new Date(buckets[i].start), timeZone);
                  const half = textWidth(text) / 2;
                  return (
                    <Label
                      key={i}
                      x={clamp(slot * i + slot / 2, half, w - half)}
                      top={plot + MINI.labelGap}
                      anchor="middle"
                      weight={buckets[i].current ? 600 : 400}
                      color={buckets[i].current ? colors.text.secondary : colors.text.tertiary}
                    >
                      {text}
                    </Label>
                  );
                })}
            </G>
          );
        }

        const left = FULL.left;
        const right = w - FULL.right;
        const bottom = height - FULL.bottom;
        const { domain: yDomain, ticks } = valueDomain(values, { floor: 0, fallback: [0, 100] });
        const x = linear(timeDomain, [left, right]);
        const y = linear(yDomain, [bottom, FULL.top]);
        return (
          <G>
            <YGrid ticks={ticks} y={y} left={left} right={right} />
            {buckets.map((b) => {
              if (b.v == null || b.future) return null;
              const x0 = clamp(x(b.start), left, right);
              const x1 = clamp(x(b.end), left, right);
              const bw = (x1 - x0) * FULL.barRatio;
              if (bw <= 0) return null;
              const top = Math.min(y(b.v), bottom - FULL.zeroHeight);
              return (
                <Path
                  key={b.start}
                  d={barPath(x0 + (x1 - x0 - bw) / 2, top, bw, bottom - top, FULL.radius)}
                  fill={color}
                  fillOpacity={b.current ? 1 : 0.5}
                  testID={b.current ? 'bar-current' : 'bar'}
                />
              );
            })}
            <XLabels
              ticks={timeTicks(timeDomain, timeZone, right - left)}
              x={x}
              left={left}
              right={w}
              top={bottom + FULL.labelGap}
              now
            />
          </G>
        );
      }}
    </ChartFrame>
  );
}
