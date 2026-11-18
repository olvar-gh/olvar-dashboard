import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, ButtonRow, Card, ListRow } from '@/components/ui';
import { formatAge, formatMetric, formatSoilRaw, type Metric } from '@/domain/format';

import { METRICS, formatWhen, gatewayState, latestValue, silentFor } from './model';
import type { SensorsScreenState } from './useSensors';

const METRIC_FORMAT: Record<string, Metric> = { soil: 'soil', light: 'light', temperature: 'temperature', humidity: 'humidity' };

/** Desktop sensor-offline state (Figma 145:1322): what to try, then the last known readings. */
export function OfflineSensors({ state, now }: { state: SensorsScreenState; now: Date }) {
  const router = useRouter();
  const { plant, device, latest, gateway, calibrated, timeZone, refresh } = state;
  const name = plant?.nickname ?? 'Your plant';
  const nodeId = device?.id ?? 'olvar-node';
  const readingAgeS = latest ? (now.getTime() - Date.parse(latest.recorded_at)) / 1000 : null;
  const gatewayName = gateway.data?.id ?? 'olvar-gateway';
  const gatewayNow = gatewayState(gateway);

  return (
    <View style={styles.root} testID="sensors-offline">
      <Card
        title={`${name}’s sensor node is offline`}
        subtitle={
          latest
            ? `ESP32 · ${nodeId} hasn’t reported since ${formatWhen(latest.recorded_at, timeZone)} (${silentFor(readingAgeS ?? 0)} ago).`
            : `ESP32 · ${nodeId} hasn’t reported yet.`
        }
        actions={
          <ButtonRow>
            <Button variant="secondary" label="View timeline" onPress={() => router.push('/timeline')} />
            <Button variant="primary" label="Retry connection" onPress={() => void refresh()} />
          </ButtonRow>
        }
      >
        <View>
          {gatewayNow === 'checking' ? (
            <ListRow
              icon="wifi"
              title="Checking the gateway…"
              subtitle={`Asking for ${gatewayName}’s last heartbeat.`}
              testID="gateway-row"
            />
          ) : gatewayNow === 'unavailable' ? (
            <ListRow
              icon="wifi"
              title="Gateway status unavailable"
              subtitle={`Couldn’t check ${gatewayName} right now. Retry in a moment.`}
              testID="gateway-row"
            />
          ) : gatewayNow === 'online' ? (
            <ListRow
              icon="wifi"
              title="Gateway is online"
              subtitle={`${gatewayName} answered ${formatAge(gateway.ageS ?? 0)}, so the problem is between the gateway and the node.`}
              status={{ label: 'Online', live: true }}
              testID="gateway-row"
            />
          ) : (
            <ListRow
              testID="gateway-row"
              icon="wifiOff"
              title="Gateway is offline too"
              subtitle={
                gateway.ageS != null
                  ? `${gatewayName} last answered ${formatAge(gateway.ageS)}. Check that the Raspberry Pi 3B is powered and on the network.`
                  : `${gatewayName} hasn’t answered yet. Check that the Raspberry Pi 3B is powered and on the network.`
              }
              status={{ label: 'Offline', live: false }}
            />
          )}
          <ListRow
            divider
            icon="cpu"
            title="Check the node’s power and Wi-Fi"
            subtitle="Most dropouts are a loose USB power cable or the ESP32 losing the Wi-Fi network."
            status={{ label: 'No signal', live: false }}
          />
          <ListRow
            divider
            icon="refresh"
            title="Restart the sensor node"
            subtitle="Unplug it for 10 seconds. It rejoins Wi-Fi and MQTT on its own and sends a reading every 60 s; readings from while it was off are not recovered."
          />
        </View>
      </Card>

      {latest ? (
        <Card
          title="Last known readings"
          subtitle={`Sent ${formatWhen(latest.recorded_at, timeZone)}. Live charts resume when the node reconnects.`}
        >
          <View testID="last-known">
            {METRICS.map((spec, i) => {
              const v = latestValue(latest, spec, calibrated);
              const text =
                spec.key === 'soil' && !calibrated
                  ? v == null
                    ? 'Read failed'
                    : `${formatSoilRaw(v)} · not calibrated`
                  : v == null
                    ? 'Read failed'
                    : formatMetric(METRIC_FORMAT[spec.key], v);
              return (
                <ListRow
                  key={spec.key}
                  divider={i > 0}
                  icon={spec.icon}
                  title={spec.title}
                  subtitle={text}
                  status={{ label: `${silentFor(readingAgeS ?? 0)} old`, live: false }}
                />
              );
            })}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 24 },
});
