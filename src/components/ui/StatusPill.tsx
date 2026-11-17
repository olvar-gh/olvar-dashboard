import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { metricStatusStyle, overallStatusStyle } from '@/domain/status-style';
import { typography } from '@/theme';

import { statusColor, withAlpha } from './color';

export type StatusPillProps = {
  /** Server label (`overall_label` or `<metric>_label`); shown as is. */
  label: string;
  /** Status key; only picks the colour. */
  status: string | null | undefined;
  kind?: 'overall' | 'metric';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Tinted pill with a dot, as in the sensor card header. */
export function StatusPill({ label, status, kind = 'overall', style, testID }: StatusPillProps) {
  const s = kind === 'overall' ? overallStatusStyle(status) : metricStatusStyle(status);
  const color = statusColor(s.color);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      testID={testID}
      style={[styles.root, { backgroundColor: withAlpha(color, 0.12) }, style]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...typography.buttonSmall },
});
