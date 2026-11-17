import { StyleSheet, Text, View } from 'react-native';

import { PageScroll, useAccountButton } from '@/components/shell';
import { ErrorState, OfflineBanner, PageHeader, SkeletonCard } from '@/components/ui';
import { colors, typography, useBreakpoint, type Breakpoint } from '@/theme';

import { InsightsCard } from './desktop/InsightsCard';
import { PlantCard } from './desktop/PlantCard';
import { SensorCard } from './desktop/SensorCard';
import { TodayCard } from './desktop/TodayCard';
import { useHome, type HomeData } from './useHome';

const OFFLINE_DETAIL = 'No reading for over 3 min. Check the ESP32’s power and Wi-Fi, and that the Raspberry Pi 3B gateway is running.';

/** Desktop Home (Figma 226:7520 at 1920, 226:7892 at 1512); md and narrow web stack the same cards. */
export function HomeScreen() {
  const home = useHome();
  const account = useAccountButton();
  const bp = useBreakpoint();
  const l = bp.screens.home;

  if (home.kind === 'loading') {
    return (
      <PageScroll testID="home-loading">
        <PageHeader title="Home" {...account} />
        <View style={[styles.rows, { gap: l.rowGap }]}>
          <View style={[styles.top, wide(bp) && styles.row, { gap: l.columnGap }]}>
            <SkeletonCard minHeight={l.plantCardMinHeight} lines={5} style={wide(bp) ? { width: l.plantCardWidth } : undefined} />
            <View style={[styles.grid, { gap: l.sensorGridGap }]}>
              {[0, 1].map((r) => (
                <View key={r} style={[styles.gridRow, { gap: l.sensorGridGap }]}>
                  <SkeletonCard minHeight={l.sensorCardMinHeight} style={styles.flex} />
                  <SkeletonCard minHeight={l.sensorCardMinHeight} style={styles.flex} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </PageScroll>
    );
  }

  if (home.kind === 'error') {
    return (
      <PageScroll testID="home-error">
        <PageHeader title="Home" {...account} />
        <ErrorState
          title="Couldn't load your plant"
          message="The latest readings didn't load. Check your connection and try again."
          onRetry={home.retry}
          retrying={home.retrying}
          minHeight={l.sensorCardMinHeight}
        />
      </PageScroll>
    );
  }

  const d = home.data;
  return (
    <PageScroll testID="home-screen">
      <PageHeader
        title={d.greeting}
        subtitle={d.status.summary ?? `${d.plant.name}'s sensors report every 60 s.`}
        actions={<Text style={styles.date}>{d.dateLabel}</Text>}
        {...account}
      />
      <View style={[styles.rows, { gap: l.rowGap }]}>
        {d.status.offline ? <OfflineBanner testID="home-offline" since={d.status.offlineSince} detail={OFFLINE_DETAIL} /> : null}
        <View style={[styles.top, wide(bp) && styles.row, { gap: l.columnGap }]}>
          <PlantCard
            plant={d.plant}
            status={d.status}
            message={d.message}
            lastReading={d.lastReading}
            width={wide(bp) ? l.plantCardWidth : undefined}
            minHeight={l.plantCardMinHeight}
          />
          <SensorGrid data={d} bp={bp} />
        </View>
        <View style={[bp.tier !== 'compact' && styles.row, { gap: l.columnGap }]}>
          <TodayCard today={d.today} plantName={d.plant.name} minHeight={l.bottomCardMinHeight} />
          <InsightsCard plantName={d.plant.name} minHeight={bp.tier === 'compact' ? 200 : l.bottomCardMinHeight} />
        </View>
      </View>
    </PageScroll>
  );
}

function SensorGrid({ data, bp }: { data: HomeData; bp: Breakpoint }) {
  const l = bp.screens.home;
  const perRow = bp.width < 600 ? 1 : 2;
  const rows: HomeData['sensors'][] = [];
  for (let i = 0; i < data.sensors.length; i += perRow) rows.push(data.sensors.slice(i, i + perRow));
  return (
    <View style={[styles.grid, { gap: l.sensorGridGap }]}>
      {rows.map((cards) => (
        <View key={cards[0].metric} style={[styles.gridRow, { gap: l.sensorGridGap }]}>
          {cards.map((card) => (
            <SensorCard key={card.metric} card={card} charts={data.charts} minHeight={l.sensorCardMinHeight} />
          ))}
        </View>
      ))}
    </View>
  );
}

function wide(bp: Breakpoint) {
  return bp.isDesktop;
}

const styles = StyleSheet.create({
  rows: { width: '100%' },
  top: {},
  row: { flexDirection: 'row', alignItems: 'stretch' },
  grid: { flex: 1, minWidth: 0 },
  gridRow: { flexDirection: 'row', flex: 1 },
  flex: { flex: 1 },
  date: { ...typography.label, color: colors.text.secondary },
});
