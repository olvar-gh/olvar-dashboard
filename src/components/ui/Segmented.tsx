import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, typography } from '@/theme';

export type SegmentedOption<V extends string> = { value: V; label: string };

export type SegmentedProps<V extends string> = {
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Range switch from the Sensors filter bar (24 hours · 7 days · 30 days). */
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
            <Text style={[styles.label, selected && styles.labelSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 2,
    padding: 3,
    backgroundColor: colors.bg.sidebar,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 10,
  },
  segment: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  selected: {
    backgroundColor: colors.surface.card,
    boxShadow: '0px 1px 3px 0px rgba(26, 31, 20, 0.08)',
  },
  label: { ...typography.label, color: colors.text.secondary },
  labelSelected: { ...typography.buttonSmall, fontSize: 13, color: colors.text.primary },
});
