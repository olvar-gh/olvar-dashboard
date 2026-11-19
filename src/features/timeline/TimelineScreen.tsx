import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { Icon } from '@/components/icons';
import { hrefs, PageScroll } from '@/components/shell';
import {
  Card,
  ErrorState,
  IosListRow,
  ListSection,
  NavBar,
  OfflineBanner,
  Skeleton,
  SkeletonCard,
} from '@/components/ui';
import { useDevice, useLatest } from '@/data';
import { formatNumber } from '@/domain/format';
import type { TimelineEventKind } from '@/domain/timeline-events';
import { oldestSelectableDate, type LocalDate } from '@/domain/time';
import { colors, iosColors, typography } from '@/theme';

import { CATEGORY_DOT, eventStyle } from './eventStyle';
import { JumpToDate } from './JumpToDate';
import {
  useDayActivity,
  useLazyDays,
  useOfflineState,
  usePlantTimeZone,
  useWeekChart,
  useWeekSelection,
  useWeekSummary,
} from './useTimeline';
import { useTimelineScroll } from './useTimelineScroll';
import { daySectionTitle, stripDay, weekDates, weekLabel, type EventCategory, type EventRow } from './week';

const CHART_HEIGHT = 132;
/** Start loading a day this far before it scrolls into view. */
const REVEAL_MARGIN = 400;

const ROW_LINKS: Partial<Record<TimelineEventKind, Href>> = {
  temperature_max: '/sensors',
  light_max: '/sensors',
  humidity_min: '/sensors',
  soil_driest: '/sensors',
  chat: '/chat',
  calibration: hrefs.devices,
};

export function TimelineScreen() {
  const { plant, timeZone, query, failed } = usePlantTimeZone();
  if (failed) {
    return (
      <PageScroll testID="timeline">
        <NavBar title="Timeline" />
        <ErrorState message="Couldn’t load your plant." onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </PageScroll>
    );
  }
  if (!plant || !timeZone) {
    return (
      <PageScroll testID="timeline">
        <NavBar title="Timeline" />
        <SkeletonCard minHeight={96} lines={1} />
        <SkeletonCard minHeight={200} />
      </PageScroll>
    );
  }
  return <Timeline timeZone={timeZone} plantName={plant.nickname} />;
}

function Timeline({ timeZone, plantName }: { timeZone: string; plantName: string }) {
  const week = useWeekSelection(timeZone);
  const { nav, today } = week;
  const offline = useOfflineState(timeZone);
  const device = useDevice().data;
  const qc = useQueryClient();
  const [jumpOpen, setJumpOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Record<LocalDate, EventCategory[]>>({});
  const scroll = useTimelineScroll(nav.weekStart);
  const { reach } = scroll;
  const [sectionY, setSectionY] = useState<Record<LocalDate, number>>({});
  const ordered = [...nav.days].reverse();
  const lazy = useLazyDays(ordered);
  const { reveal } = lazy;

  useEffect(() => {
    for (const [date, y] of Object.entries(sectionY)) if (y < reach + REVEAL_MARGIN) reveal(date);
  }, [sectionY, reach, reveal]);

  const onCategories = useCallback(
    (date: LocalDate, cats: EventCategory[]) =>
      setCategories((c) => (c[date]?.join() === cats.join() ? c : { ...c, [date]: cats })),
    [],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'day' && q.queryKey[2] === today }),
        qc.invalidateQueries({ queryKey: ['hourly'] }),
        qc.invalidateQueries({ queryKey: ['daily'] }),
        qc.invalidateQueries({ queryKey: ['status'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const scrollTo = (date: LocalDate) => {
    reveal(date);
    const y = sectionY[date];
    if (y !== undefined) scroll.scrollToContent(y);
  };

  return (
    <PageScroll
      key={scroll.key}
      testID="timeline"
      {...({ ref: scroll.ref } as object)}
      {...scroll.props}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <NavBar
        title="Timeline"
        actions={[
          { label: 'Previous week', sf: 'chevron.left', icon: 'chevLeft', onPress: week.prev, disabled: !nav.canPrev },
          { label: 'Next week', sf: 'chevron.right', icon: 'chevRight', onPress: week.next, disabled: !nav.canNext },
          { label: 'Jump to date', sf: 'calendar', icon: 'calendar', onPress: () => setJumpOpen(true) },
        ]}
      />
      <Text style={styles.subtitle} testID="week-label">
        {weekLabel(nav.weekStart, true)}
      </Text>
      {offline.offline ? (
        <OfflineBanner device={device?.id} since={offline.since} detail="Updates resume with the next 60 s reading." testID="timeline-offline" />
      ) : null}
      <WeekStrip
        weekStart={nav.weekStart}
        selectable={nav.days}
        today={today}
        categories={categories}
        onPick={scrollTo}
      />
      <SoilChartCard weekStart={nav.weekStart} timeZone={timeZone} today={today} isCurrent={nav.isCurrent} />
      {ordered.map((date) => (
        <View
          key={date}
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setSectionY((all) => (all[date] === y ? all : { ...all, [date]: y }));
          }}
        >
          {lazy.isActive(date) ? (
            <DaySection date={date} today={today} timeZone={timeZone} onCategories={onCategories} />
          ) : (
            <DayPlaceholder date={date} today={today} />
          )}
        </View>
      ))}
      <WeekSummarySection weekStart={nav.weekStart} />
      <ListSection header="Upcoming care" footer={`Care reminders are coming soon — ${plantName} will suggest what to do next here.`}>
        <IosListRow icon="sparkle" iconTint={colors.brand.sage} label="Coming soon" subtitle="Watering and care reminders" testID="upcoming-care" />
      </ListSection>
      <JumpToDate
        key={nav.weekStart}
        visible={jumpOpen}
        onDismiss={() => setJumpOpen(false)}
        onPick={week.jumpTo}
        today={today}
        oldest={oldestSelectableDate(timeZone, week.now)}
        weekStart={nav.weekStart}
      />
    </PageScroll>
  );
}

function WeekStrip({
  weekStart,
  selectable,
  today,
  categories,
  onPick,
}: {
  weekStart: LocalDate;
  selectable: LocalDate[];
  today: LocalDate;
  categories: Record<LocalDate, EventCategory[]>;
  onPick: (date: LocalDate) => void;
}) {
  const enabled = new Set(selectable);
  return (
    <View style={styles.strip} testID="week-strip">
      {weekDates(weekStart).map((date) => {
        const { letter, day } = stripDay(date);
        const isToday = date === today;
        const on = enabled.has(date);
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={date}
            accessibilityState={{ disabled: !on, selected: isToday }}
            disabled={!on}
            onPress={() => onPick(date)}
            style={styles.stripDay}
            testID={`strip-${date}`}
          >
            <Text style={styles.stripLetter}>{letter}</Text>
            <View style={[styles.stripDate, isToday && styles.stripToday]}>
              <Text style={[isToday ? styles.stripTodayText : styles.stripDateText, !on && styles.stripDisabled]}>{day}</Text>
            </View>
            <View style={styles.dots}>
              {(categories[date] ?? []).map((c) => (
                <View key={c} style={[styles.dot, { backgroundColor: CATEGORY_DOT[c] }]} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function SoilChartCard({ weekStart, timeZone, today, isCurrent }: { weekStart: LocalDate; timeZone: string; today: LocalDate; isCurrent: boolean }) {
  const { query, series, soilLow } = useWeekChart(weekStart, timeZone);
  const latest = useLatest().data;
  const summary = useWeekSummary(weekStart).stats?.find((s) => s.metric === 'soil');
  const now = isCurrent ? latest?.soil_pct : null;
  const value = now != null ? formatNumber(now) : summary?.average != null ? formatNumber(summary.average) : '—';
  const unit = now != null ? '% now' : '% avg';
  if (query.error && !series) {
    return <ErrorState title="Soil moisture" message="Couldn’t load this week’s readings." onRetry={() => void query.refetch()} />;
  }
  const empty = series && !series.soil.some((p) => p.v != null);
  return (
    <Card testID="week-chart-card">
      <View style={styles.chartHeader}>
        <Icon name="droplet" size={16} color={iosColors.accentBlue} />
        <Text style={styles.chartTitle}>Soil moisture</Text>
        <View style={styles.spacer} />
        <Text style={styles.chartMeta}>Hourly averages</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.valueUnit}>{unit}</Text>
      </View>
      {!series ? (
        <Skeleton height={CHART_HEIGHT} radius={12} />
      ) : empty ? (
        <Text style={styles.chartEmpty}>No soil readings this week. Calibrate the soil probe, or wait for the next 60 s reading.</Text>
      ) : (
        <WeekChart
          weekStart={weekStart}
          timeZone={timeZone}
          soil={series.soil}
          temperature={[]}
          waterLine={soilLow != null ? { value: soilLow, label: '' } : null}
          today={today}
          height={CHART_HEIGHT}
          maxGapMs={2 * 3_600_000}
          accessibilityLabel="Soil moisture this week"
        />
      )}
    </Card>
  );
}

function DayPlaceholder({ date, today }: { date: LocalDate; today: LocalDate }) {
  return (
    <View style={styles.section} testID={`day-${date}`}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {daySectionTitle(date, today)}
      </Text>
      <SkeletonCard lines={2} />
    </View>
  );
}

function DaySection({
  date,
  today,
  timeZone,
  onCategories,
}: {
  date: LocalDate;
  today: LocalDate;
  timeZone: string;
  onCategories: (date: LocalDate, cats: EventCategory[]) => void;
}) {
  const day = useDayActivity(date, timeZone);
  const router = useRouter();
  const key = day.rows ? [...new Set(day.rows.map((r) => r.category))].join(',') : null;
  useEffect(() => {
    if (key !== null) onCategories(date, key ? (key.split(',') as EventCategory[]) : []);
  }, [date, key, onCategories]);

  return (
    <View style={styles.section} testID={`day-${date}`}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {daySectionTitle(date, today)}
      </Text>
      {day.rows ? (
        <ListSection>
          {day.rows.length ? (
            day.rows.map((r: EventRow, i) => {
              const link = ROW_LINKS[r.kind];
              return (
                <IosListRow
                  key={r.key}
                  icon={eventStyle(r.kind).icon}
                  iconTint={eventStyle(r.kind).tile}
                  label={r.title}
                  subtitle={r.time ? `${r.time} · ${r.detail}` : r.detail}
                  accessory={link ? 'chevron' : 'none'}
                  onPress={link ? () => router.navigate(link) : undefined}
                  separator={i > 0}
                  testID={`event-${r.kind}`}
                />
              );
            })
          ) : (
            <IosListRow label={date === today ? 'Nothing yet today' : 'No activity recorded'} />
          )}
        </ListSection>
      ) : day.error ? (
        <ErrorState message="Couldn’t load this day." onRetry={day.refetch} />
      ) : (
        <SkeletonCard lines={2} />
      )}
    </View>
  );
}

function WeekSummarySection({ weekStart }: { weekStart: LocalDate }) {
  const { query, stats } = useWeekSummary(weekStart);
  if (query.error && !stats) {
    return <ErrorState title="Week summary" message="Couldn’t load the week summary." onRetry={() => void query.refetch()} />;
  }
  if (!stats) return <SkeletonCard lines={4} />;
  const tint = { soil: iosColors.accentBlue, temperature: iosColors.accentOrange, humidity: iosColors.accentTeal, light: iosColors.accentYellow };
  const icon = { soil: 'droplet', temperature: 'thermo', humidity: 'droplets', light: 'sun' } as const;
  return (
    <ListSection header="Week summary" footer="Compared with last week · updated hourly">
      {stats.map((s, i) => (
        <IosListRow
          key={s.metric}
          icon={icon[s.metric]}
          iconTint={tint[s.metric]}
          label={s.label}
          subtitle={s.delta ? `${s.delta} vs last week` : undefined}
          value={s.value}
          separator={i > 0}
          testID={`summary-${s.metric}`}
        />
      ))}
    </ListSection>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.iosSubheadline, color: iosColors.labelSecondary, marginTop: -12 },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: iosColors.groupedBackgroundSecondary,
    borderRadius: 26,
    borderCurve: 'continuous',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  stripDay: { alignItems: 'center', gap: 6 },
  stripLetter: { ...typography.iosCaption1, fontFamily: typography.iosFootnoteEmphasized.fontFamily, color: iosColors.labelTertiary },
  stripDate: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stripToday: { backgroundColor: colors.brand.olive },
  stripDateText: { ...typography.iosBody, color: iosColors.labelPrimary },
  stripTodayText: { ...typography.iosSubheadlineEmphasized, color: colors.surface.card },
  stripDisabled: { color: iosColors.labelTertiary },
  dots: { flexDirection: 'row', gap: 3, height: 6, minWidth: 20, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartTitle: { ...typography.iosSubheadlineEmphasized, color: iosColors.accentBlue },
  spacer: { flex: 1 },
  chartMeta: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: -2 },
  value: { ...typography.iosTitle1, color: iosColors.labelPrimary },
  valueUnit: { ...typography.iosSubheadlineEmphasized, color: iosColors.labelSecondary },
  chartEmpty: { ...typography.iosFootnote, color: iosColors.labelSecondary, paddingVertical: 24, textAlign: 'center' },
  section: { gap: 0 },
  sectionTitle: { ...typography.iosTitle1, fontSize: 20, lineHeight: 25, letterSpacing: -0.45, fontFamily: typography.iosSubheadlineEmphasized.fontFamily, color: iosColors.labelPrimary, paddingTop: 6, paddingHorizontal: 4 },
});
