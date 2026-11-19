import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import AvatarCircle from '@/components/shell/assets/AvatarCircle';
import { statusColor } from '@/components/ui/color';
import { formatAge } from '@/domain/format';
import { overallStatusStyle } from '@/domain/status-style';
import { colors, radius, typography } from '@/theme';

import type { HomeData } from '../useHome';
import { Gradient } from './Gradient';

type Props = Pick<HomeData, 'plant' | 'status' | 'message' | 'lastReading'> & { width?: number; minHeight: number };

/** Desktop plant card (Figma 226:7523): name, avatar with the status pill, the latest reply and the last reading. */
export function PlantCard({ plant, status, message, lastReading, width, minHeight }: Props) {
  const router = useRouter();
  const mood = statusColor(overallStatusStyle(status.key).color);
  return (
    <View testID="plant-card" style={[styles.card, width ? { width } : styles.fill, { minHeight }]}>
      <Gradient tint="#e9eedf" to={0.65} />
      <View style={styles.titleRow}>
        <View style={styles.names}>
          <Text accessibilityRole="header" aria-level={2} style={styles.name}>
            {plant.name}
          </Text>
          {plant.subtitle ? <Text style={styles.subtitle}>{plant.subtitle}</Text> : null}
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel="Plant profile" onPress={() => router.push('/settings/plant')} hitSlop={8}>
          <Icon name="arrow" size={18} color={colors.text.tertiary} />
        </Pressable>
      </View>

      <View style={styles.character}>
        <View style={styles.avatar}>
          <AvatarCircle width={196} height={196} style={styles.avatarSvg} />
          <View testID="plant-mood" accessibilityLabel={status.label} style={styles.mood}>
            <View style={[styles.moodDot, { backgroundColor: mood }]} />
            <Text numberOfLines={1} style={styles.moodText}>
              {status.label}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={message ? `${plant.name} says: ${message.text}. Open chat` : `Ask ${plant.name} how it's doing`}
        onPress={() => router.push('/chat')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.says, (pressed || hovered) && styles.saysHover]}
        testID="plant-says"
      >
        <View style={styles.saysLabel}>
          <Icon name="chat" size={14} color={colors.brand.sage} />
          <Text style={styles.saysLabelText}>{message ? `${plant.name} says · ${message.time}` : `Chat with ${plant.name}`}</Text>
        </View>
        <Text numberOfLines={3} style={[styles.saysText, !message && styles.askText]}>
          {message ? message.text : `Ask ${plant.name} how it's doing →`}
        </Text>
      </Pressable>

      <View style={styles.reading}>
        <View style={styles.readingRow}>
          <View style={styles.readingText}>
            <Text style={styles.readingLabel}>Last reading</Text>
            <View style={styles.readingValue}>
              <Text style={styles.readingTime}>{lastReading?.time ?? '-'}</Text>
              {lastReading ? <Text style={styles.readingAge}>{formatAge(lastReading.ageS)}</Text> : null}
            </View>
          </View>
        </View>
        <Text style={styles.hardware}>Wi-Fi · MQTT → Raspberry Pi 3B · every 60 s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.card,
    backgroundColor: colors.surface.card,
    padding: 20,
    gap: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  fill: { alignSelf: 'stretch' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  names: { flex: 1, minWidth: 0, gap: 4 },
  name: { ...typography.plantName, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary },
  character: { height: 176, alignItems: 'center' },
  avatar: { width: 176, height: 176 },
  avatarSvg: { position: 'absolute', left: -10, top: -8 },
  mood: {
    position: 'absolute',
    left: 140,
    top: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    boxShadow: '0px 2px 10px rgba(31, 36, 26, 0.06)',
    maxWidth: 200,
  },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  moodText: { ...typography.buttonSmall, color: colors.text.primary },
  says: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 14,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  saysHover: { borderColor: colors.brand.sage },
  saysLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saysLabelText: { ...typography.buttonSmall, fontSize: 11, color: colors.brand.sage },
  saysText: { ...typography.pageSubtitle, lineHeight: 19.6, color: colors.text.primary },
  askText: { color: colors.brand.olive },
  reading: { gap: 10 },
  readingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  readingText: { gap: 2 },
  readingLabel: { ...typography.status, color: colors.text.secondary },
  readingValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  readingTime: { ...typography.value, fontSize: 32, color: colors.text.primary },
  readingAge: { ...typography.body, color: colors.text.tertiary },
  hardware: { ...typography.meta, color: colors.text.tertiary },
});
