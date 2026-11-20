import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors, iosColors, typography } from '@/theme';

export type IosListAccessory = 'chevron' | 'toggle' | 'check' | 'none';

export type IosListRowProps = {
  label: string;
  /** Lines the label may wrap to before it is truncated. */
  labelLines?: number;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  /** Icon tile fill; Figma recolours it per meaning. */
  iconTint?: string;
  accessory?: IosListAccessory;
  /** For `toggle`. */
  on?: boolean;
  onToggle?: (on: boolean) => void;
  onPress?: () => void;
  /** Coloured dot before the value (live / offline). */
  valueDot?: string;
  /** Extra control before the accessory, e.g. a small Button. */
  trailing?: ReactNode;
  separator?: boolean;
  disabled?: boolean;
  testID?: string;
};

/** Inset grouped row, Body 17 (Figma iPhone/List row). */
export function IosListRow({
  label,
  labelLines = 1,
  subtitle,
  value,
  icon,
  iconTint = colors.text.secondary,
  accessory = 'none',
  on = false,
  onToggle,
  onPress,
  valueDot,
  trailing,
  separator = false,
  disabled = false,
  testID,
}: IosListRowProps) {
  const body = (
    <>
      {icon ? (
        <View style={[styles.iosIcon, { backgroundColor: iconTint }]}>
          <Icon name={icon} size={17} color={colors.surface.card} />
        </View>
      ) : null}
      <View style={[styles.iosContent, separator && styles.iosSeparator]}>
        <View style={styles.iosText}>
          <Text numberOfLines={labelLines} style={styles.iosLabel}>
            {label}
          </Text>
          {subtitle ? <Text style={styles.iosSubtitle}>{subtitle}</Text> : null}
        </View>
        {valueDot ? <View style={[styles.dot, { backgroundColor: valueDot }]} /> : null}
        {value ? (
          <Text numberOfLines={1} style={[styles.iosValue, valueDot ? styles.iosValueStatus : null]}>
            {value}
          </Text>
        ) : null}
        {trailing}
        {accessory === 'chevron' ? <Icon name="chevRight" size={14} color={iosColors.labelTertiary} /> : null}
        {accessory === 'check' ? <Icon name="check" size={16} color={colors.brand.olive} /> : null}
        {accessory === 'toggle' ? (
          <Switch
            accessibilityLabel={label}
            value={on}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{ true: iosColors.accentGreen, false: iosColors.fillTertiary }}
            thumbColor={colors.surface.card}
            // react-native-web paints the "on" thumb teal unless activeThumbColor is set; RN's types omit the prop.
            {...({ activeThumbColor: colors.surface.card } as object)}
          />
        ) : null}
      </View>
    </>
  );

  if (onPress && accessory !== 'toggle') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: accessory === 'check' }}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.iosRow, pressed && styles.iosPressed]}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={styles.iosRow}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  iosRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  iosPressed: { backgroundColor: iosColors.fillTertiary },
  iosIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iosContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, minHeight: 46 },
  iosSeparator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: iosColors.separatorNonOpaque },
  iosText: { flex: 1, minWidth: 0, gap: 1 },
  iosLabel: { ...typography.iosBody, color: iosColors.labelPrimary },
  iosSubtitle: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  iosValue: { ...typography.iosBody, color: iosColors.labelTertiary, flexShrink: 1 },
  iosValueStatus: { color: iosColors.labelSecondary },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
