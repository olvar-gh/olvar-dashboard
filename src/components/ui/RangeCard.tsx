import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, iosColors, typography } from '@/theme';

import { IOS_GROUP_RADIUS } from './color';

export type RangeCardProps = {
  caption: string;
  value: string;
  /** Unit or status text after the value. */
  status?: string;
  /** Unit appended to the spoken thresholds, e.g. "%" or " lux". */
  unit?: string;
  /** Scale ends and their labels. */
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  /** Ideal range from the effective thresholds; drawn, never judged. */
  low: number;
  high: number;
  /** Current reading; null hides the marker (read failed). */
  current?: number | null;
  /** Metric colour for the ideal range (Figma: Accents/Blue soil, Yellow light, Orange temperature, Teal humidity). */
  color: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TRACK_H = 4.83;
const HANDLE = 10.06;

/** Current reading with its ideal-range slider (Figma iPhone/Range card). */
export function RangeCard({ caption, value, status, unit = '', min, max, minLabel, maxLabel, low, high, current, color, style, testID }: RangeCardProps) {
  const at = (v: number) => clamp((v - min) / (max - min || 1)) * 100;
  const pct = (v: number) => `${at(v)}%` as const;
  return (
    <View testID={testID} style={[styles.root, style]}>
      <Text style={styles.caption}>{caption}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={rangeLabel({ low, high, current, unit })}
        testID={testID && `${testID}-slider`}
        style={styles.slider}
      >
        <View style={styles.track} />
        <View testID={testID && `${testID}-range`} style={[styles.range, { left: pct(low), width: `${Math.max(0, at(high) - at(low))}%`, backgroundColor: color }]} />
        <View style={[styles.handle, { left: pct(low) }]} />
        <View style={[styles.handle, { left: pct(high) }]} />
        {current != null ? <View testID={testID && `${testID}-now`} style={[styles.now, { left: pct(current) }]} /> : null}
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleLabel}>{minLabel ?? String(min)}</Text>
        <Text style={styles.scaleLabel}>{maxLabel ?? String(max)}</Text>
      </View>
    </View>
  );
}

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** Spoken description of the slider: the ideal thresholds and the current reading, never the axis ends. */
export function rangeLabel({ low, high, current, unit = '' }: { low: number; high: number; current?: number | null; unit?: string }): string {
  const fmt = (v: number) => `${number.format(v)}${unit}`;
  const now = current == null ? 'no current reading' : `now ${fmt(current)}`;
  return `Ideal range ${fmt(low)} to ${fmt(high)}, ${now}`;
}

function clamp(t: number) {
  return Math.min(1, Math.max(0, t));
}

const styles = StyleSheet.create({
  root: { backgroundColor: iosColors.groupedBackgroundSecondary, borderRadius: IOS_GROUP_RADIUS, borderCurve: 'continuous', padding: 16, gap: 6 },
  caption: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { ...typography.iosTitle1, color: iosColors.labelPrimary },
  status: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
  slider: { height: 16, marginTop: 6, justifyContent: 'center' },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: colors.border.subtle },
  range: { position: 'absolute', height: TRACK_H, opacity: 0.6 },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    marginLeft: -HANDLE / 2,
    borderRadius: HANDLE / 2,
    backgroundColor: colors.bg.sidebar,
    borderWidth: 1.2,
    borderColor: colors.border.subtle,
  },
  now: { position: 'absolute', width: 1.6, height: 11.27, marginLeft: -0.8, borderRadius: 0.8, backgroundColor: colors.text.primary },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { ...typography.iosCaption1, color: iosColors.labelSecondary },
});
