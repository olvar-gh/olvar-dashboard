import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import OlvarAvatar from '@/components/ui/assets/OlvarAvatar';
import { statusColor, withAlpha } from '@/components/ui/color';
import { overallStatusStyle } from '@/domain/status-style';
import { colors, iosColors, typography } from '@/theme';

import type { HomeData } from '../useHome';

type Props = Pick<HomeData, 'plant' | 'status' | 'message' | 'lastReading'>;

/** iPhone plant card (Figma 20:55 "Plant card"): avatar, status pill, latest reply and the server summary. */
export function PlantCard({ plant, status, message, lastReading }: Props) {
  const router = useRouter();
  const color = statusColor(overallStatusStyle(status.key).color);
  return (
    <Pressable
      testID="plant-card"
      accessibilityRole="button"
      accessibilityLabel={message ? `${plant.name} says: ${message.text}` : `Ask ${plant.name} how it's doing`}
      accessibilityHint="Opens Chat"
      onPress={() => router.push('/chat')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <OlvarAvatar width={84} height={84} />
        <View style={styles.says}>
          <View testID="plant-mood" style={[styles.mood, { backgroundColor: withAlpha(color, 0.14) }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text numberOfLines={1} style={styles.moodText}>
              {status.label}
            </Text>
          </View>
          <Text numberOfLines={4} style={[styles.message, !message && styles.ask]}>
            {message ? message.text : `Ask ${plant.name} how it's doing →`}
          </Text>
          {message ? <Text style={styles.footnote}>{`${plant.name} · ${message.time}`}</Text> : null}
        </View>
      </View>
      <View style={styles.separator} />
      <View style={styles.bottom}>
        <View style={styles.summary}>
          <Text style={styles.footnote}>Today</Text>
          <Text testID="plant-summary" style={styles.summaryText}>
            {status.summary ?? 'Waiting for the first reading'}
          </Text>
        </View>
        <View style={styles.reading}>
          <Text style={styles.footnote}>Last reading</Text>
          <Text style={styles.readingTime}>{lastReading?.time ?? '—'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: iosColors.groupedBackgroundSecondary, borderRadius: 26, borderCurve: 'continuous', padding: 16, gap: 16 },
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  says: { flex: 1, minWidth: 0, gap: 6, alignItems: 'flex-start' },
  mood: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8, paddingRight: 10, paddingVertical: 3, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  moodText: { ...typography.iosCaption1, fontFamily: typography.iosFootnoteEmphasized.fontFamily, color: colors.brand.olive },
  message: { ...typography.iosBody, color: iosColors.labelPrimary },
  ask: { color: colors.brand.olive },
  footnote: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: iosColors.separatorNonOpaque },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  summary: { flex: 1, minWidth: 0 },
  summaryText: { ...typography.iosSubheadlineEmphasized, color: iosColors.labelPrimary },
  reading: { alignItems: 'flex-end' },
  readingTime: { ...typography.iosTitle1, color: iosColors.labelPrimary },
});
