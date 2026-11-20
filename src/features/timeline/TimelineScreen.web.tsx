import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { Icon, type IconName } from '@/components/icons';
import { PageScroll, useAccountButton } from '@/components/shell';
import { Button, Card, EmptyState, ErrorState, Notice, OfflineBanner, PageHeader, Skeleton } from '@/components/ui';
import { useDevice } from '@/data';
import { oldestSelectableDate, type LocalDate } from '@/domain/time';
import { colors, typography, useBreakpoint } from '@/theme';

import { CATEGORY_LABEL, eventStyle } from './eventStyle';
import { JumpToDate } from './JumpToDate';
import { RevealOnScroll } from './RevealOnScroll';
import {
  useDayActivity,
  useLazyDays,
  useOfflineState,
  usePlantTimeZone,
  useWeekChart,
  useWeekSelection,
  useWeekSummary,
} from './useTimeline';
import { dayHeading, weekLabel, type EventRow, type SummaryMetric } from './week';

const SUBTITLE = 'Everything that happened to your plant this week, from sensor peaks to device status.';

export function TimelineScreen() {
  const { plant, timeZone, query, failed } = usePlantTimeZone();
  const account = useAccountButton();
  if (failed) {
    return (
      <PageScroll testID="timeline">
        <PageHeader title="Timeline" subtitle={SUBTITLE} {...account} />
        <ErrorState
          title="Timeline"
          message="Couldn’t load your plant. Check your connection and try again."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </PageScroll>
    );
  }
  if (!plant || !timeZone) {
    return (
      <PageScroll testID="timeline">
        <PageHeader title="Timeline" subtitle={SUBTITLE} {...account} />
        <SkeletonLayout />
      </PageScroll>
    );
  }
  return <Timeline timeZone={timeZone} plantName={plant.nickname} />;
}

function Timeline({ timeZone, plantName }: { timeZone: string; plantName: string }) {
  const account = useAccountButton();
  const bp = useBreakpoint();
  const week = useWeekSelection(timeZone);
  const { nav, today } = week;
  const [jumpOpen, setJumpOpen] = useState(false);
  const wide = bp.isDesktop;
  const layout = bp.screens.timeline;
  const page = bp.screens.page;

  const row = [styles.row, wide ? { flexDirection: 'row' as const, gap: layout.columnGap } : { gap: layout.rowGap }];
  const side = wide ? { width: layout.sideColumnWidth } : null;

  return (
    <PageScroll testID="timeline">
      <PageHeader
        title="Timeline"
        subtitle={SUBTITLE}
        dateNav={{
          label: weekLabel(nav.weekStart),
          onPrev: week.prev,
          onNext: week.next,
          prevDisabled: !nav.canPrev,
          nextDisabled: !nav.canNext,
          prevLabel: 'Previous week',
          nextLabel: 'Next week',
        }}
        {...account}
      />
      <View style={{ marginTop: page.headerToFilterBar - page.headerToContent, gap: page.filterBarToContent }}>
        <FilterBar timeZone={timeZone} isCurrent={nav.isCurrent} onThisWeek={week.thisWeek} height={page.filterBarHeight} />
        <View style={[row, { marginBottom: layout.rowGap - page.filterBarToContent }]}>
          <WeekChartCard weekStart={nav.weekStart} timeZone={timeZone} today={today} style={styles.main} />
          <WeekSummaryCard weekStart={nav.weekStart} style={side ?? undefined} />
        </View>
        <View style={row}>
          <ActivityCard
            days={nav.days}
            today={today}
            timeZone={timeZone}
            onJump={() => setJumpOpen(true)}
            style={styles.main}
          />
          <Card
            title="Upcoming care"
            subtitle={`Based on ${plantName}’s readings`}
            minHeight={bp.tier === 'xl' ? 504 : 496}
            style={[side, wide && styles.sideTop]}
            testID="upcoming-care"
          >
            <View style={styles.placeholder}>
              <EmptyState
                comingSoon
                title="Care reminders"
                body={`Watering and care reminders are coming soon: ${plantName} will suggest what to do next here.`}
              />
            </View>
          </Card>
        </View>
      </View>
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

function FilterBar({ timeZone, isCurrent, onThisWeek, height }: { timeZone: string; isCurrent: boolean; onThisWeek: () => void; height: number }) {
  const offline = useOfflineState(timeZone);
  const device = useDevice().data;
  return (
    <View style={[styles.filterBar, { minHeight: height }]} testID="timeline-filter-bar">
      {offline.offline ? (
        <OfflineBanner device={device?.id} since={offline.since} detail="Today’s activity updates when readings resume." style={styles.banner} testID="timeline-offline" />
      ) : (
        <View style={styles.note}>
          <Icon name="clock" size={14} color={colors.text.tertiary} />
          <Text style={styles.noteText}>Weeks run Sunday to Saturday in {timeZone} time · new readings every 60 s</Text>
        </View>
      )}
      <Button variant="secondary" label="This week" onPress={onThisWeek} disabled={isCurrent} testID="this-week" />
    </View>
  );
}

function WeekChartCard({ weekStart, timeZone, today, style }: { weekStart: LocalDate; timeZone: string; today: LocalDate; style?: object }) {
  const bp = useBreakpoint();
  const { query, series, soilLow } = useWeekChart(weekStart, timeZone);
  const chartHeight = bp.tier === 'xl' ? 228 : 196;
  const empty = series && !series.soil.some((p) => p.v != null) && !series.temperature.some((p) => p.v != null);
  return (
    <Card
      title="This week"
      subtitle="Soil moisture and temperature, hourly averages"
      actions={
        <View style={styles.legend}>
          <Legend color={colors.data.water} label="Soil moisture" />
          <Legend color={colors.data.temp} label="Temperature" />
        </View>
      }
      minHeight={bp.tier === 'xl' ? 320 : 288}
      style={style}
      testID="week-chart-card"
    >
      {query.error && !series ? (
        <Notice tone="warn" action={<Button variant="secondary" label="Retry" onPress={() => void query.refetch()} />}>
          Couldn’t load this week’s readings.
        </Notice>
      ) : !series ? (
        <Skeleton height={chartHeight} radius={12} />
      ) : empty ? (
        <View style={{ minHeight: chartHeight }}>
          <EmptyState icon="activity" title="No readings this week" body="The ESP32 sends a reading every 60 s over Wi-Fi/MQTT; hourly averages appear here." />
        </View>
      ) : (
        <WeekChart
          weekStart={weekStart}
          timeZone={timeZone}
          soil={series.soil}
          temperature={series.temperature}
          waterLine={soilLow != null ? { value: soilLow, label: `${soilLow}% water line` } : null}
          today={today}
          height={chartHeight}
          maxGapMs={2 * 3_600_000}
          accessibilityLabel="Soil moisture and temperature this week"
        />
      )}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const SUMMARY_ICON: Record<SummaryMetric, { icon: IconName; tint: string; ink: string }> = {
  soil: { icon: 'droplet', tint: colors.data.waterTint, ink: colors.data.water },
  temperature: { icon: 'thermo', tint: colors.data.tempTint, ink: colors.data.temp },
  humidity: { icon: 'droplets', tint: colors.data.humidityTint, ink: colors.data.humidity },
  light: { icon: 'sun', tint: colors.data.lightTint, ink: colors.data.light },
};

function WeekSummaryCard({ weekStart, style }: { weekStart: LocalDate; style?: object }) {
  const bp = useBreakpoint();
  const { query, stats } = useWeekSummary(weekStart);
  return (
    <Card
      title="Week summary"
      subtitle="Compared with last week · updated hourly"
      minHeight={bp.tier === 'xl' ? 320 : 288}
      style={style}
      testID="week-summary"
    >
      {query.error && !stats ? (
        <Notice tone="warn" action={<Button variant="secondary" label="Retry" onPress={() => void query.refetch()} />}>
          Couldn’t load the week summary.
        </Notice>
      ) : !stats ? (
        <View style={styles.statSkeleton}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={32} radius={16} />
          ))}
        </View>
      ) : (
        <View>
          {stats.map((s, i) => {
            const look = SUMMARY_ICON[s.metric];
            return (
              <View key={s.metric} style={[styles.stat, i > 0 && styles.divider]} testID={`summary-${s.metric}`}>
                <View style={[styles.statIcon, { backgroundColor: look.tint }]}>
                  <Icon name={look.icon} size={16} color={look.ink} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statDelta}>{s.delta ?? (s.average == null ? 'no data' : '')}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function ActivityCard({
  days,
  today,
  timeZone,
  onJump,
  style,
}: {
  days: LocalDate[];
  today: LocalDate;
  timeZone: string;
  onJump: () => void;
  style?: object;
}) {
  const bp = useBreakpoint();
  const [counts, setCounts] = useState<Record<LocalDate, number>>({});
  const onCount = useCallback((date: LocalDate, n: number) => setCounts((c) => (c[date] === n ? c : { ...c, [date]: n })), []);
  const ordered = [...days].reverse();
  const lazy = useLazyDays(ordered);
  const known = ordered.every((d) => counts[d] !== undefined);
  const total = ordered.reduce((sum, d) => sum + (counts[d] ?? 0), 0);
  const events = `${total} ${total === 1 ? 'event' : 'events'}`;
  const subtitle = known
    ? `${events} this week`
    : ordered.some((d) => counts[d] !== undefined)
      ? `${events} so far · scroll for earlier days`
      : 'Loading this week…';
  return (
    <Card
      title="Activity"
      subtitle={subtitle}
      actions={
        <Pressable accessibilityRole="button" onPress={onJump} style={styles.jump} testID="jump-to-date-button">
          <Icon name="calendar" size={14} color={colors.text.secondary} />
          <Text style={styles.jumpText}>Jump to date</Text>
        </Pressable>
      }
      minHeight={bp.tier === 'xl' ? 504 : 496}
      style={[style, styles.activity]}
      testID="activity"
    >
      <View style={styles.days}>
        {ordered.map((date) =>
          lazy.isActive(date) ? (
            <DayGroup key={date} date={date} today={today} timeZone={timeZone} onCount={onCount} />
          ) : (
            <RevealOnScroll key={date} onReveal={() => lazy.reveal(date)}>
              <DayHeading date={date} today={today} />
              <DaySkeleton />
            </RevealOnScroll>
          ),
        )}
      </View>
    </Card>
  );
}

function DayGroup({
  date,
  today,
  timeZone,
  onCount,
}: {
  date: LocalDate;
  today: LocalDate;
  timeZone: string;
  onCount: (date: LocalDate, n: number) => void;
}) {
  const day = useDayActivity(date, timeZone);
  const n = day.rows?.length;
  useEffect(() => {
    if (n !== undefined) onCount(date, n);
  }, [date, n, onCount]);
  return (
    <View testID={`day-${date}`}>
      <DayHeading date={date} today={today} />
      {day.rows ? (
        day.rows.length ? (
          day.rows.map((r) => <EventLine key={r.key} row={r} />)
        ) : (
          <Text style={styles.quiet}>{date === today ? 'Nothing yet today.' : 'No activity recorded.'}</Text>
        )
      ) : day.error ? (
        <Notice tone="warn" action={<Button variant="secondary" label="Retry" onPress={day.refetch} />} style={styles.dayError}>
          Couldn’t load this day.
        </Notice>
      ) : (
        <DaySkeleton />
      )}
    </View>
  );
}

function DayHeading({ date, today }: { date: LocalDate; today: LocalDate }) {
  return (
    <Text accessibilityRole="header" aria-level={3} style={styles.dayHeading}>
      {dayHeading(date, today)}
    </Text>
  );
}

function DaySkeleton() {
  return (
    <View style={styles.eventSkeleton} accessibilityLabel="Loading">
      <Skeleton width={40} height={12} />
      <Skeleton width={32} height={32} radius={16} />
      <Skeleton width="50%" height={14} />
    </View>
  );
}

function EventLine({ row }: { row: EventRow }) {
  const look = eventStyle(row.kind);
  return (
    <View style={styles.event} testID={`event-${row.kind}`}>
      <Text style={styles.time}>{row.time ?? '-'}</Text>
      <View style={[styles.eventIcon, { backgroundColor: look.tint }]}>
        <Icon name={look.icon} size={16} color={look.ink} />
      </View>
      <View style={styles.eventText}>
        <Text numberOfLines={1} style={styles.eventTitle}>
          {row.title}
        </Text>
        <Text numberOfLines={1} style={styles.eventDetail}>
          {row.detail}
        </Text>
      </View>
      <View style={[styles.tag, { backgroundColor: look.tint }]}>
        <Text style={[styles.tagText, { color: look.ink }]}>{CATEGORY_LABEL[row.category]}</Text>
      </View>
    </View>
  );
}

function SkeletonLayout() {
  return (
    <View style={styles.skeletonLayout} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Skeleton height={288} radius={20} />
      <Skeleton height={496} radius={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'stretch' },
  main: { flex: 1, minWidth: 0 },
  filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  banner: { flexShrink: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  noteText: { ...typography.meta, color: colors.text.secondary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  legendText: { ...typography.status, color: colors.text.secondary },
  statSkeleton: { gap: 18 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statLabel: { ...typography.buttonLarge, fontFamily: typography.label.fontFamily, flex: 1, color: colors.text.primary },
  statDelta: { ...typography.meta, color: colors.text.tertiary },
  statValue: { ...typography.buttonLarge, fontSize: 15, color: colors.text.primary },
  activity: { gap: 4 },
  jump: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jumpText: { ...typography.buttonSmall, color: colors.text.secondary },
  days: { gap: 4 },
  dayHeading: {
    ...typography.chartLabel,
    fontFamily: typography.buttonSmall.fontFamily,
    fontSize: 11,
    letterSpacing: 0.55,
    color: colors.text.tertiary,
    paddingTop: 10,
    paddingBottom: 2,
  },
  event: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 5 },
  time: { ...typography.status, width: 40, textAlign: 'right', color: colors.text.tertiary },
  eventIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eventText: { flex: 1, minWidth: 0, gap: 1 },
  eventTitle: { ...typography.label, fontSize: 14, color: colors.text.primary },
  eventDetail: { ...typography.meta, color: colors.text.tertiary },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { ...typography.buttonSmall, fontSize: 11 },
  quiet: { ...typography.meta, color: colors.text.tertiary, paddingVertical: 8, paddingLeft: 54 },
  dayError: { marginVertical: 4 },
  eventSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 5 },
  placeholder: { minHeight: 360 },
  sideTop: { alignSelf: 'flex-start' },
  skeletonLayout: { gap: 24 },
});
