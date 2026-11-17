import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorState, Skeleton } from '@/components/ui';
import { colors, typography } from '@/theme';

import { DayTrack } from '../DayTrack';
import { toneColor } from '../palette';
import type { HomeData } from '../useHome';

const MAX_ROWS = 4;

/** Desktop "Today's timeline" card (Figma 226:7651) without the deferred Log care button. */
export function TodayCard({ today, plantName, minHeight }: { today: HomeData['today']; plantName: string; minHeight: number }) {
  const router = useRouter();
  if (today.error) {
    return (
      <ErrorState
        testID="today-error"
        title="Today's timeline"
        message="Couldn't load today's events. Check your connection and try again."
        onRetry={today.refetch}
        minHeight={minHeight}
        style={styles.flex}
      />
    );
  }
  return (
    <Card
      testID="today-card"
      title="Today's timeline"
      actions={<Button variant="secondary" label="Open timeline" onPress={() => router.push('/timeline')} />}
      minHeight={minHeight}
      style={styles.flex}
    >
      {today.track ? <DayTrack track={today.track} variant="desktop" /> : <Skeleton height={64} />}
      {today.rows === undefined ? (
        <View accessibilityLabel="Loading" style={styles.loading}>
          <Skeleton width="70%" />
          <Skeleton width="50%" />
          <Skeleton width="60%" />
        </View>
      ) : today.rows.length === 0 ? (
        <Text style={styles.empty}>
          Nothing to report yet today. {plantName}’s sensors send a reading every 60 s; peaks and lows show up here.
        </Text>
      ) : (
        <View>
          {today.rows.slice(0, MAX_ROWS).map((row, i) => (
            <View key={row.key} testID="today-event" style={[styles.row, i > 0 && styles.divider]}>
              <View style={[styles.dot, { backgroundColor: toneColor(row.tone, 'desktop') }]} />
              <View style={styles.text}>
                <Text numberOfLines={1} style={styles.title}>
                  {row.title}
                </Text>
                {row.time ? <Text style={styles.time}>{row.time}</Text> : null}
              </View>
              <Text style={[styles.tag, row.tone === 'muted' && styles.tagMuted]}>{row.tag}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  loading: { gap: 18, paddingTop: 14 },
  empty: { ...typography.body, color: colors.text.secondary, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.label, fontSize: 14, color: colors.text.primary },
  time: { ...typography.meta, color: colors.text.tertiary },
  tag: { ...typography.status, color: colors.text.secondary },
  tagMuted: { color: colors.text.tertiary },
});
