import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageScroll, useAccountButton } from '@/components/shell';
import { Card, EmptyState, ErrorState, PageHeader, Segmented, SkeletonCard } from '@/components/ui';
import { targetBand, useNow } from '@/data';
import { formatAge, secondsSince } from '@/domain/format';
import { colors, interFamily, useBreakpoint, type Breakpoint } from '@/theme';

import { OfflineSensors } from './OfflineSensors.web';
import { SensorCard } from './SensorCard.web';
import { METRICS, hardwareText, latestValue, metricStatus, type Range } from './model';
import { useRange24h, useRangeHourly, useSensorsScreen, type RangeQuery, type SensorsScreenState } from './useSensors';
import { useRangeParam } from './useRangeParam';

const RANGE_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
] as const;

/** Desktop Sensors page (Figma 227:7830 / 227:8145). */
export function SensorsScreen() {
  const state = useSensorsScreen();
  const account = useAccountButton();
  const bp = useBreakpoint();
  const name = state.plant?.nickname ?? 'your plant';

  return (
    <PageScroll testID="sensors-screen">
      <PageHeader
        title="Sensors"
        subtitle={`Live readings from ${name}’s four sensors, updated every minute.`}
        {...account}
      />
      <View style={[styles.body, { marginTop: bp.screens.page.headerToFilterBar - bp.screens.page.headerToContent }]}>
        <Body state={state} bp={bp} />
      </View>
    </PageScroll>
  );
}

function Body({ state, bp }: { state: SensorsScreenState; bp: Breakpoint }) {
  const now = useNow(15_000);
  if (state.error) return <ErrorState title="Sensors" message="Couldn’t load the sensor readings. Check your connection and try again." onRetry={() => void state.refresh()} />;
  if (state.pending) return <LoadingGrid bp={bp} />;
  if (state.display?.offline) return <OfflineSensors state={state} now={now} />;
  if (!state.latest || state.display?.overall === 'no_data') return <NoReadings />;
  return <LiveSensors state={state} bp={bp} />;
}

function LiveSensors({ state, bp }: { state: SensorsScreenState; bp: Breakpoint }) {
  const [range, setRange] = useRangeParam();
  return (
    <View style={{ gap: bp.screens.page.filterBarToContent }}>
      <View style={styles.filterBar}>
        <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} accessibilityLabel="Time range" testID="range" />
        <LiveChip recordedAt={state.latest!.recorded_at} />
      </View>
      {range === '24h' ? (
        <Range24h state={state} bp={bp} />
      ) : (
        <RangeHourly key={range} days={range === '7d' ? 7 : 30} state={state} bp={bp} />
      )}
    </View>
  );
}

function Range24h({ state, bp }: { state: SensorsScreenState; bp: Breakpoint }) {
  return <Cards query={useRange24h(state.calibrated)} range="24h" state={state} bp={bp} />;
}

function RangeHourly({ days, state, bp }: { days: 7 | 30; state: SensorsScreenState; bp: Breakpoint }) {
  return <Cards query={useRangeHourly(days, state.calibrated)} range={days === 7 ? '7d' : '30d'} state={state} bp={bp} />;
}

function Cards({ query, range, state, bp }: { query: RangeQuery; range: Range; state: SensorsScreenState; bp: Breakpoint }) {
  const { cardMinHeight, chartHeight } = bp.screens.sensors;
  if (query.error) return <ErrorState title="Charts" message="Couldn’t load the chart data. Check your connection and try again." onRetry={query.refetch} />;
  if (!query.data) return <LoadingGrid bp={bp} />;
  const data = query.data;
  const cards = METRICS.map((spec) => (
    <SensorCard
      key={spec.key}
      spec={spec}
      range={range}
      domain={[data.from, data.to]}
      data={data.metrics[spec.key]}
      value={latestValue(state.latest, spec, state.calibrated)}
      status={metricStatus(state.status, spec)}
      band={spec.key === 'light' || (spec.key === 'soil' && !state.calibrated) ? null : targetBand(state.thresholds, spec.threshold)}
      calibrated={state.calibrated}
      hardware={hardwareText(spec, state.latest, state.device, state.calibrated, state.timeZone)}
      timeZone={state.timeZone}
      chartHeight={chartHeight}
      minHeight={cardMinHeight}
    />
  ));
  return <Grid bp={bp}>{cards}</Grid>;
}

function Grid({ bp, children }: { bp: Breakpoint; children: ReactElement[] }) {
  const { columnGap, rowGap } = bp.screens.sensors;
  if (bp.tier === 'compact') return <View style={{ gap: rowGap }}>{children}</View>;
  const rows: ReactElement[][] = [];
  for (let i = 0; i < children.length; i += 2) rows.push(children.slice(i, i + 2));
  return (
    <View style={{ gap: rowGap }} testID="sensor-grid">
      {rows.map((row, i) => (
        <View key={i} style={[styles.row, { gap: columnGap }]}>
          {row.map((card) => (
            <View key={card.key} style={styles.cell}>
              {card}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function LoadingGrid({ bp }: { bp: Breakpoint }) {
  return (
    <Grid bp={bp}>
      {METRICS.map((m) => (
        <SkeletonCard key={m.key} minHeight={bp.screens.sensors.cardMinHeight} lines={4} testID="sensor-skeleton" />
      ))}
    </Grid>
  );
}

function NoReadings() {
  return (
    <Card minHeight={280} testID="sensors-empty">
      <EmptyState
        icon="activity"
        title="Waiting for the first reading"
        body="The ESP32 sensor node sends a reading every 60 s over Wi-Fi (MQTT) to the Raspberry Pi 3B gateway. Charts appear here once the first one arrives."
      />
    </Card>
  );
}

/** "Live · updated 12 s ago"; ticks on its own so the charts don't redraw every second. */
function LiveChip({ recordedAt }: { recordedAt: string }) {
  const now = useNow(1000);
  return (
    <View style={styles.live} testID="live-chip">
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>Live · updated {formatAge(secondsSince(recordedAt, now))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20 },
  filterBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, minHeight: 36 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0 },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.brand.sageTint,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.status.good },
  liveText: { fontFamily: interFamily[600], fontSize: 12, color: colors.brand.olive },
});
