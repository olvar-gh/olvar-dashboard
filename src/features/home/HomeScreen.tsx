import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, NavBar, OfflineBanner, SkeletonCard, type NavBarAction } from '@/components/ui';
import { hrefs, PageScroll, useAccountButton } from '@/components/shell';
import { colors, iosColors, typography } from '@/theme';

import { PlantCard } from './ios/PlantCard';
import { RefreshError } from './RefreshError';
import { SensorCard } from './ios/SensorCard';
import { TodayCard } from './ios/TodayCard';
import { useHome } from './useHome';

/** iPhone Home (Figma 18:154, full scroll 20:55): native large title, plant card, 2×2 sensors, today, insights. */
export function HomeScreen() {
  const home = useHome();
  const router = useRouter();
  const account = useAccountButton();
  const [refreshing, setRefreshing] = useState(false);

  const actions: NavBarAction[] = [
    { label: 'Settings', sf: 'gearshape', icon: 'settings', onPress: () => router.push(hrefs.settings) },
    { label: 'Account', sf: 'person.crop.circle', icon: 'user', onPress: account.onAvatarPress },
  ];
  const header = <NavBar title="Home" actions={actions} />;

  if (home.kind === 'loading') {
    return (
      <PageScroll testID="home-loading">
        {header}
        <SkeletonCard minHeight={180} lines={3} />
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <SkeletonCard minHeight={170} style={styles.flex} />
            <SkeletonCard minHeight={170} style={styles.flex} />
          </View>
          <View style={styles.gridRow}>
            <SkeletonCard minHeight={170} style={styles.flex} />
            <SkeletonCard minHeight={170} style={styles.flex} />
          </View>
        </View>
      </PageScroll>
    );
  }

  if (home.kind === 'error') {
    return (
      <PageScroll testID="home-error">
        {header}
        <ErrorState
          message="Couldn't load your plant. Check your connection and try again."
          onRetry={home.retry}
          retrying={home.retrying}
        />
      </PageScroll>
    );
  }

  const d = home.data;
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await home.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PageScroll testID="home-screen" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {header}
      {d.plant.subtitle ? <Text style={styles.subtitle}>{d.plant.subtitle}</Text> : null}
      {d.refreshError ? <RefreshError onRetry={home.retry} retrying={home.retrying} /> : null}
      {d.status.offline ? (
        <OfflineBanner testID="home-offline" since={d.status.offlineSince} detail="No reading for over 3 min. Check the sensor's power and Wi-Fi." />
      ) : null}
      <PlantCard plant={d.plant} status={d.status} message={d.message} lastReading={d.lastReading} />

      <Section title="Sensors" action="See all" onAction={() => router.push('/sensors')} />
      <View style={styles.grid}>
        {[d.sensors.slice(0, 2), d.sensors.slice(2, 4)].map((row) => (
          <View key={row[0].metric} style={styles.gridRow}>
            {row.map((card) => (
              <SensorCard key={card.metric} card={card} charts={d.charts} />
            ))}
          </View>
        ))}
      </View>

      <Section title="Today" action="See all" onAction={() => router.push('/timeline')} />
      <TodayCard today={d.today} plantName={d.plant.name} />

      <Section title="Insights" />
      <View testID="insights-card" style={styles.insights}>
        <EmptyState
          comingSoon
          icon="sparkle"
          title="Insights are coming soon"
          body={`${d.plant.name} will point out trends from your plant's sensor history here.`}
        />
      </View>
    </PageScroll>
  );
}

function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${action}: ${title}`} onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.iosSubheadline, color: iosColors.labelSecondary, marginTop: -12, marginLeft: 0 },
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 4, paddingHorizontal: 4 },
  sectionTitle: { ...typography.iosSubheadlineEmphasized, fontSize: 20, lineHeight: 25, letterSpacing: -0.45, color: iosColors.labelPrimary },
  sectionAction: { ...typography.iosSubheadline, color: colors.brand.olive },
  insights: { backgroundColor: iosColors.groupedBackgroundSecondary, borderRadius: 26, borderCurve: 'continuous', padding: 16, minHeight: 180 },
});
