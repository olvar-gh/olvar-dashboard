import { useRef, type ComponentRef } from 'react';
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

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Range switch from the Sensors filter bar (24 hours · 7 days · 30 days). */
export function Segmented<V extends string>({ options, value, onChange, accessibilityLabel, style, testID }: SegmentedProps<V>) {
  const refs = useRef<(ComponentRef<typeof View> | null)[]>([]);
  const current = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const key = e.nativeEvent.key;
    let next: number | null = null;
    if (key in STEP) next = (Math.max(current, 0) + STEP[key] + options.length) % options.length;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = options.length - 1;
    if (next === null) return;
    e.preventDefault?.();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.track, style]}
      {...({ onKeyDown } as object)}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            tabIndex={selected || current < 0 ? 0 : -1}
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
