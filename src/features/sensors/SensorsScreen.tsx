import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { PageScroll, useAccountButton } from '@/components/shell';
import { EmptyState, ErrorState, IosListRow, ListSection, PageHeader, Segmented, SkeletonCard } from '@/components/ui';
import { targetBand, useNow } from '@/data';
import { formatAge, formatMetric, formatSoilRaw, secondsSince, type Metric } from '@/domain/format';
import { iosColors } from '@/theme';

import { SensorCard } from './SensorCard';
import { METRICS, formatWhen, latestValue, metricStatus, silentFor, type Range } from './model';
import { useRange24h, useRangeHourly, useSensorsScreen, type RangeQuery, type SensorsScreenState } from './useSensors';
import { useRangeParam } from './useRangeParam';

const RANGE_OPTIONS = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

/** iPhone Sensors tab (Figma 35:128 / 35:495; offline 148:2056): large title, segmented range, sensor cards. */
export function SensorsScreen() {
  const state = useSensorsScreen();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await state.refresh();
    setRefreshing(false);
  };

  return (
    <PageScroll
      testID="sensors-screen"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Header state={state} />
      <Body state={state} />
    </PageScroll>
  );
}

/** Ticks every second for "updated N s ago" without redrawing the charts. */
function Header({ state }: { state: SensorsScreenState }) {
  const account = useAccountButton();
  const now = useNow(1000);
  return <PageHeader title="Sensors" subtitle={subtitle(state, now)} {...account} />;
}

function subtitle(state: SensorsScreenState, now: Date): string | undefined {
  if (!state.latest) return undefined;
  if (state.display?.offline) {
    return `${state.plant?.nickname ?? 'Plant'} · last reading ${formatWhen(state.latest.recorded_at, state.timeZone)}`;
  }
  return `Live · updated ${formatAge(secondsSince(state.latest.recorded_at, now))}`;
}

function Body({ state }: { state: SensorsScreenState }) {
  const now = useNow(15_000);
  if (state.error) {
    return <ErrorState message="Couldn’t load the sensor readings. Pull down or tap Retry." onRetry={() => void state.refresh()} />;
  }
  if (state.pending) return <Loading />;
  if (state.display?.offline) return <Offline state={state} now={now} />;
  if (!state.latest || state.display?.overall === 'no_data') {
    return (
      <View style={styles.empty} testID="sensors-empty">
        <EmptyState
          icon="activity"
          title="Waiting for the First Reading"
          body="The ESP32 sensor node sends a reading every 60 s over Wi-Fi (MQTT) to the Raspberry Pi 3B gateway."
        />
      </View>
    );
  }
  return <Live state={state} />;
}

function Live({ state }: { state: SensorsScreenState }) {
  const [range, setRange] = useRangeParam();
  return (
    <>
      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} accessibilityLabel="Time range" testID="range" />
      {range === '24h' ? (
        <Range24h state={state} />
      ) : (
        <RangeHourly key={range} days={range === '7d' ? 7 : 30} state={state} />
      )}
    </>
  );
}

function Range24h({ state }: { state: SensorsScreenState }) {
  return <Cards query={useRange24h(state.calibrated)} range="24h" state={state} />;
}

function RangeHourly({ days, state }: { days: 7 | 30; state: SensorsScreenState }) {
  return <Cards query={useRangeHourly(days, state.calibrated)} range={days === 7 ? '7d' : '30d'} state={state} />;
}

function Cards({ query, range, state }: { query: RangeQuery; range: Range; state: SensorsScreenState }) {
  if (query.error) return <ErrorState message="Couldn’t load the chart data." onRetry={query.refetch} />;
  if (!query.data) return <Loading />;
  const data = query.data;
  return (
    <>
      {METRICS.map((spec) => (
        <SensorCard
          key={spec.key}
          spec={spec}
          range={range}
          domain={[data.from, data.to]}
          data={data.metrics[spec.key]}
          value={latestValue(state.latest, spec, state.calibrated)}
          latest={state.latest}
          status={metricStatus(state.status, spec)}
          band={spec.key === 'light' || (spec.key === 'soil' && !state.calibrated) ? null : targetBand(state.thresholds, spec.threshold)}
          calibrated={state.calibrated}
          timeZone={state.timeZone}
        />
      ))}
    </>
  );
}

function Loading() {
  return (
    <>
      {METRICS.map((m) => (
        <SkeletonCard key={m.key} minHeight={200} lines={3} testID="sensor-skeleton" />
      ))}
    </>
  );
}

const METRIC_FORMAT: Record<string, Metric> = { soil: 'soil', light: 'light', temperature: 'temperature', humidity: 'humidity' };

function Offline({ state, now }: { state: SensorsScreenState; now: Date }) {
  const { device, latest, display, gateway, calibrated } = state;
  const since = display?.offlineSince ?? (latest ? new Date(latest.recorded_at) : null);
  const silent = since ? silentFor((now.getTime() - since.getTime()) / 1000) : null;
  const gatewayOnline = gateway.data != null && !gateway.stale;
  const nodeId = device?.id ?? 'olvar-node';

  return (
    <View testID="sensors-offline">
      <ListSection>
        <IosListRow
          icon="wifiOff"
          iconTint={iosColors.accentOrange}
          label="Sensor Offline"
          subtitle={silent ? `ESP32 · ${nodeId} hasn’t reported for ${silent}` : `ESP32 · ${nodeId} hasn’t reported yet`}
        />
      </ListSection>
      <ListSection header="Try This">
        <IosListRow
          icon="wifi"
          label={gatewayOnline ? 'Gateway Is Online' : 'Gateway Is Offline'}
          value={gatewayOnline ? 'Online' : 'Offline'}
          accessory={gatewayOnline ? 'check' : 'none'}
        />
        <IosListRow
          separator
          icon="cpu"
          label="Check Power & Wi-Fi"
          accessory="chevron"
          onPress={() =>
            Alert.alert(
              'Check Power & Wi-Fi',
              'Most dropouts are a loose USB power cable or the ESP32 losing the Wi-Fi network. Move it closer to the router if the signal is weak.',
            )
          }
        />
        <IosListRow
          separator
          icon="refresh"
          label="Restart Sensor Node"
          accessory="chevron"
          onPress={() =>
            Alert.alert(
              'Restart Sensor Node',
              'Unplug the node for 10 seconds. It rejoins Wi-Fi and MQTT on its own and sends a reading every 60 s. Readings from while it was off are not recovered.',
            )
          }
        />
      </ListSection>
      {latest ? (
        <View testID="last-known">
        <ListSection header="Last Known Readings">
          {METRICS.map((spec, i) => {
            const v = latestValue(latest, spec, calibrated);
            const text =
              v == null ? 'Read failed' : spec.key === 'soil' && !calibrated ? formatSoilRaw(v) : formatMetric(METRIC_FORMAT[spec.key], v);
            return (
              <IosListRow
                key={spec.key}
                separator={i > 0}
                icon={spec.icon}
                iconTint={spec.iosColor}
                label={spec.title.replace(/\b\w/g, (c) => c.toUpperCase())}
                value={text}
              />
            );
          })}
        </ListSection>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { minHeight: 280, backgroundColor: iosColors.groupedBackgroundSecondary, borderRadius: 26 },
});
