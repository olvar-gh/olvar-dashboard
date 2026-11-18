import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { rangeLabel } from '@/components/ui';
import { colors } from '@/theme';

import { scaleFor, type MetricConfig, type Range } from './model';

export type RangeTrackProps = {
  cfg: MetricConfig;
  range: Range | null;
  current?: number | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TRACK_H = 4;
const HANDLE = 12;

/** Read-only care-target slider (Figma Range slider): scale, ideal range, handles and the current reading. */
export function RangeTrack({ cfg, range, current, style, testID }: RangeTrackProps) {
  const { min, max } = scaleFor(cfg, range);
  const at = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min))) * 100;
  const unit = cfg.unit === '%' ? '%' : ` ${cfg.unit}`;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={range ? rangeLabel({ low: range.low, high: range.high, current, unit }) : 'No ideal range'}
      testID={testID}
      style={[styles.root, style]}
    >
      <View style={styles.track} />
      {range ? (
        <>
          <View
            style={[styles.range, { left: `${at(range.low)}%`, width: `${Math.max(0, at(range.high) - at(range.low))}%`, backgroundColor: cfg.color }]}
          />
          <View style={[styles.handle, { left: `${at(range.low)}%` }]} />
          <View style={[styles.handle, { left: `${at(range.high)}%` }]} />
        </>
      ) : null}
      {current != null ? <View testID={testID && `${testID}-now`} style={[styles.now, { left: `${at(current)}%` }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 20, justifyContent: 'center' },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: colors.border.subtle },
  range: { position: 'absolute', height: TRACK_H, opacity: 0.55 },
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
  now: { position: 'absolute', width: 2, height: 14, marginLeft: -1, borderRadius: 1, backgroundColor: colors.text.primary },
});
