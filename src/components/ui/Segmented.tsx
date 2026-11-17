import { Pressable, StyleSheet, Text, View } from 'react-native';

import { iosColors, typography } from '@/theme';

import type { SegmentedProps } from './Segmented.types';

export type { SegmentedOption, SegmentedProps } from './Segmented.types';

/** Full-width capsule segmented control from the iPhone Sensors frame (24H · 7D · 30D). */
export function Segmented<V extends string>({ options, value, onChange, accessibilityLabel, style, testID }: SegmentedProps<V>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} testID={testID} style={[styles.track, style]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => !selected && onChange(o.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    padding: 4,
    borderRadius: 1000,
    backgroundColor: iosColors.fillTertiary,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 36, borderRadius: 1000 },
  selected: { backgroundColor: iosColors.groupedBackgroundSecondary, boxShadow: '0px 2px 6px 0px rgba(0, 0, 0, 0.08)' },
  label: { ...typography.iosSubheadline, color: iosColors.labelPrimary },
  labelSelected: typography.iosSubheadlineEmphasized,
});
