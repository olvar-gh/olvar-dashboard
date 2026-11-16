import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors, typography } from '@/theme';

import { Button } from './Button';

export type EmptyStateProps = {
  title: string;
  body?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  /** Placeholder for a deferred feature: sparkle icon and a "Coming soon" tag. */
  comingSoon?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Centred empty body, used inside a Card. */
export function EmptyState({ title, body, icon, action, comingSoon = false, style, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={[styles.root, style]}>
      <View style={styles.iconChip}>
        <Icon name={icon ?? (comingSoon ? 'sparkle' : 'sprout')} size={18} color={colors.brand.sage} />
      </View>
      {comingSoon ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>Coming soon</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? <Button variant="secondary" label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.brand.sageTint },
  tagText: { ...typography.chartLabel, color: colors.brand.olive, textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { ...typography.sensorTitle, color: colors.text.primary, textAlign: 'center' },
  body: { ...typography.body, color: colors.text.secondary, textAlign: 'center', maxWidth: 320 },
  action: { marginTop: 6 },
});
