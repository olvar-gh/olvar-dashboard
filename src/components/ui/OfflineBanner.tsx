import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, typography } from '@/theme';

export type OfflineBannerProps = {
  device?: string;
  /** Already formatted local time (HH:mm) of `latest_reading_at` or `status_changed_at`. */
  since?: string | null;
  detail?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function offlineText(device: string, since?: string | null): string {
  return since ? `${device} offline since ${since}` : `${device} offline`;
}

/** "olvar-node offline since HH:mm" strip shown above offline sensor content. */
export function OfflineBanner({ device = 'olvar-node', since, detail, style, testID }: OfflineBannerProps) {
  return (
    <View testID={testID} style={[styles.root, style]}>
      <Icon name="wifiOff" size={16} color={colors.text.secondary} />
      <Text accessibilityRole="alert" style={styles.text}>
        {offlineText(device, since)}
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bg.sidebar,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  text: { ...typography.label, color: colors.text.primary },
  detail: { ...typography.meta, color: colors.text.tertiary },
});
