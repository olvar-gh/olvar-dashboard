import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, typography } from '@/theme';

import type { ListRowProps } from './ListRow.types';

export type { ListRowProps, ListRowStatus } from './ListRow.types';
export { IosListRow, type IosListAccessory, type IosListRowProps } from './IosListRow';

/** Desktop list row for devices and settings (Figma Desktop/List row). */
export function ListRow({ title, subtitle, icon = 'leaf', status, action, divider = false, onPress, style, testID }: ListRowProps) {
  const content = (
    <>
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
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status ? `${title}, ${status.label}` : title}
        onPress={onPress}
        testID={testID}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.row,
          divider && styles.divider,
          (pressed || hovered) && styles.active,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.row, divider && styles.divider, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  active: { backgroundColor: colors.bg.canvas },
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
});
