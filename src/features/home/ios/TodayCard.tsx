import { StyleSheet, Text, View } from 'react-native';

import { Button, Skeleton } from '@/components/ui';
import { iosColors, typography } from '@/theme';

import { DayTrack } from '../DayTrack';
import { toneColor } from '../palette';
import type { HomeData } from '../useHome';

const MAX_ROWS = 4;

/** iPhone "Today" card (Figma 20:55 "Today card"): the 24 h track and today's events. */
export function TodayCard({ today, plantName }: { today: HomeData['today']; plantName: string }) {
  if (today.error) {
    return (
      <View testID="today-error" style={styles.card}>
        <Text style={styles.message}>Couldn’t load today’s events.</Text>
        <Button variant="secondary" size="small" label="Retry" onPress={today.refetch} style={styles.retry} />
      </View>
    );
  }
  return (
    <View testID="today-card" style={styles.card}>
      {today.track ? <DayTrack track={today.track} variant="ios" /> : <Skeleton height={56} />}
      {today.rows === undefined ? (
        <View accessibilityLabel="Loading" style={styles.loading}>
          <Skeleton width="70%" />
          <Skeleton width="50%" />
        </View>
      ) : today.rows.length === 0 ? (
        <Text style={styles.message}>Nothing to report yet today. {plantName}’s sensors send a reading every 60 s.</Text>
      ) : (
        <View>
          {today.rows.slice(0, MAX_ROWS).map((row, i) => (
            <View key={row.key} testID="today-event" style={[styles.row, i > 0 && styles.divider]}>
              <View style={[styles.dot, { backgroundColor: toneColor(row.tone, 'ios') }]} />
              <View style={styles.text}>
                <Text numberOfLines={2} style={styles.title}>
                  {row.title}
                </Text>
                {row.time ? <Text style={styles.time}>{row.time}</Text> : null}
              </View>
              <Text style={styles.tag}>{row.tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: iosColors.groupedBackgroundSecondary,
    borderRadius: 26,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 12,
  },
  loading: { gap: 14, paddingBottom: 12 },
  message: { ...typography.iosFootnote, color: iosColors.labelSecondary, paddingBottom: 10 },
  retry: { alignSelf: 'flex-start', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: iosColors.separatorNonOpaque },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  title: { ...typography.iosBody, color: iosColors.labelPrimary },
  time: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  tag: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
});
