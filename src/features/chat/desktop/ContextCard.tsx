import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import type { Metric } from '@/domain/format';
import { colors, radius, typography } from '@/theme';

import { PlantAvatar } from '../PlantAvatar';
import type { ChatModel } from '../useChat';

export const CONTEXT_CARD_HEIGHT = 371;

export const METRIC_ICON: Record<Metric, { icon: IconName; color: string; tint: string }> = {
  soil: { icon: 'droplet', color: colors.data.water, tint: colors.data.waterTint },
  light: { icon: 'sun', color: colors.data.light, tint: colors.data.lightTint },
  temperature: { icon: 'thermo', color: colors.data.temp, tint: colors.data.tempTint },
  humidity: { icon: 'droplets', color: colors.data.humidity, tint: colors.data.humidityTint },
};

/** "What Sparks sees right now": the latest reading the answers are based on. */
export function ContextCard({ chat }: { chat: ChatModel }) {
  const { plant } = chat;
  const subtitle = [plant?.profile.common_name, plant?.location].filter(Boolean).join(' · ');
  return (
    <View style={styles.root} testID="chat-context">
      <View style={styles.top}>
        <PlantAvatar size={64} />
        <View style={styles.names}>
          <Text style={styles.name}>{chat.plantName}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Text style={styles.label}>{`What ${chat.plantName} sees right now`.toUpperCase()}</Text>
      <View>
        {chat.rows.map((row, i) => {
          const m = METRIC_ICON[row.metric];
          return (
            <View key={row.metric} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={[styles.icon, { backgroundColor: m.tint }]}>
                <Icon name={m.icon} size={15} color={m.color} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.metric}>{row.name}</Text>
                {row.note ? <Text style={[styles.note, row.failed && styles.failed]}>{row.note}</Text> : null}
              </View>
              {chat.readingLoading ? (
                <Skeleton width={56} height={14} />
              ) : (
                <Text style={styles.value}>{row.value}</Text>
              )}
            </View>
          );
        })}
      </View>
      <Text style={styles.updated}>{chat.updatedText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.card,
    padding: 20,
    gap: 14,
    backgroundColor: colors.surface.card,
    backgroundImage: `linear-gradient(180deg, ${colors.brand.sageTint} 0%, ${colors.surface.card} 45%)`,
  } as object,
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  names: { flex: 1, minWidth: 0, gap: 4 },
  name: { ...typography.plantName, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary },
  label: { ...typography.buttonSmall, fontSize: 11, letterSpacing: 0.5, color: colors.text.tertiary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, minHeight: 48 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  metric: { ...typography.pageSubtitle, color: colors.text.primary },
  note: { ...typography.meta, fontSize: 11, color: colors.text.tertiary },
  failed: { color: colors.status.warn },
  value: { ...typography.sensorTitle, color: colors.text.primary },
  updated: { ...typography.meta, color: colors.text.tertiary },
});
