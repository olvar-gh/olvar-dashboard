import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors, iosColors, typography } from '@/theme';

export type ListRowStatus = { label: string; live: boolean };

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  status?: ListRowStatus;
  /** Trailing control, usually a small secondary Button. */
  action?: ReactNode;
  /** Top hairline; on for every row after the first. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Desktop list row for devices and settings (Figma Desktop/List row). */
export function ListRow({ title, subtitle, icon = 'leaf', status, action, divider = false, style, testID }: ListRowProps) {
  return (
    <View testID={testID} style={[styles.row, divider && styles.divider, style]}>
      <View style={styles.iconChip}>
        <Icon name={icon} size={18} color={colors.text.secondary} />
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {status ? (
        <View style={styles.status}>
          <View style={[styles.dot, status.live ? styles.dotLive : styles.dotOff]} />
          <Text style={styles.statusLabel}>{status.label}</Text>
        </View>
      ) : null}
      {action}
    </View>
  );
}

export type IosListAccessory = 'chevron' | 'toggle' | 'check' | 'none';

export type IosListRowProps = {
  label: string;
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
  separator?: boolean;
  disabled?: boolean;
  testID?: string;
};

/** Inset grouped row, Body 17 (Figma iPhone/List row). */
export function IosListRow({
  label,
  subtitle,
  value,
  icon,
  iconTint = colors.text.secondary,
  accessory = 'none',
  on = false,
  onToggle,
  onPress,
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
          <Text numberOfLines={1} style={styles.iosLabel}>
            {label}
          </Text>
          {subtitle ? <Text style={styles.iosSubtitle}>{subtitle}</Text> : null}
        </View>
        {value ? (
          <Text numberOfLines={1} style={styles.iosValue}>
            {value}
          </Text>
        ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.sensorTitle, color: colors.text.primary },
  subtitle: { ...typography.meta, color: colors.text.tertiary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLive: {
    backgroundColor: colors.status.live,
    borderWidth: 2,
    borderColor: `${colors.status.live}66`,
  },
  dotOff: { width: 8, height: 8, borderRadius: 4, margin: 1, backgroundColor: colors.text.tertiary },
  statusLabel: { ...typography.status, color: colors.text.secondary },

  iosRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  iosPressed: { backgroundColor: iosColors.fillTertiary },
  iosIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iosContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  iosSeparator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: iosColors.separatorNonOpaque },
  iosText: { flex: 1, minWidth: 0, gap: 1 },
  iosLabel: { ...typography.iosBody, color: iosColors.labelPrimary },
  iosSubtitle: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  iosValue: { ...typography.iosBody, color: iosColors.labelTertiary, flexShrink: 1 },
});
