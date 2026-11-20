import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { hrefs } from '@/components/shell';
import { Button, Card, ErrorState, ListRow, OfflineBanner, SkeletonCard } from '@/components/ui';
import { useBreakpoint } from '@/theme';

import { useDeviceRows } from '../hooks';

/** Desktop "Devices & calibration" card: gateway, sensor node, soil probe (Recalibrate), climate sensor + GY-302. */
export function DevicesCard() {
  const d = useDeviceRows();
  const router = useRouter();
  const compact = useBreakpoint().tier === 'compact';
  if (d.isPending) return <SkeletonCard minHeight={260} lines={4} testID="devices-loading" />;
  if (d.error) return <ErrorState title="Devices & calibration" onRetry={d.refetch} testID="devices-error" />;
  return (
    <Card title="Devices & calibration" subtitle="Hardware that reads your plant’s sensors" testID="devices">
      {d.offline ? <OfflineBanner since={d.offlineSince} detail="The ESP32 reports every 60 s over Wi-Fi." testID="devices-offline" /> : null}
      <View>
        {d.rows.map((row, i) => (
          <ListRow
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            icon={row.icon}
            // On a phone-width page the Recalibrate button leaves no room for the status as well.
            status={row.recalibrate && compact ? undefined : (row.status ?? undefined)}
            divider={i > 0}
            testID={`device-${row.key}`}
            action={
              row.recalibrate ? (
                <Button variant="secondary" label="Recalibrate" onPress={() => router.push(hrefs.calibrate)} testID="recalibrate" />
              ) : undefined
            }
          />
        ))}
      </View>
    </Card>
  );
}
