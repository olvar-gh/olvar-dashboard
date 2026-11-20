import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { hrefs, PageScroll } from '@/components/shell';
import { ErrorState, IosListRow, ListSection, NavBar, OfflineBanner, SkeletonCard } from '@/components/ui';
import { colors, iosColors } from '@/theme';

import { useDeviceRows } from '../hooks';
import type { DeviceRowModel } from '../model';

const TINTS: Record<DeviceRowModel['key'], string> = {
  gateway: colors.text.secondary,
  node: colors.text.secondary,
  soil: iosColors.accentBlue,
  climate: iosColors.accentOrange,
};

/** iPhone Devices (Figma 155:3506): the gateway, then the sensor node and its probes with live status. */
export function DevicesScreen() {
  const router = useRouter();
  const d = useDeviceRows();
  const row = (r: DeviceRowModel, separator: boolean) => (
    <IosListRow
      key={r.key}
      label={r.short.title}
      // The climate part name wraps beside a long status ("Read failed 14:00") on a 375 pt screen.
      labelLines={r.key === 'climate' ? 2 : 1}
      subtitle={r.short.subtitle}
      icon={r.icon}
      iconTint={TINTS[r.key]}
      value={r.short.value}
      valueDot={r.status ? (r.status.live ? colors.status.live : colors.text.tertiary) : undefined}
      accessory={r.recalibrate ? 'chevron' : 'none'}
      onPress={r.recalibrate ? () => router.push(hrefs.calibrate) : undefined}
      separator={separator}
      testID={`device-${r.key}`}
    />
  );
  return (
    <PageScroll testID="devices-screen" contentContainerStyle={styles.page}>
      <NavBar title="Devices" />
      {d.isPending ? (
        <SkeletonCard lines={4} testID="devices-loading" />
      ) : d.error ? (
        <ErrorState title="Devices" onRetry={d.refetch} testID="devices-error" />
      ) : (
        <>
          {d.offline ? <OfflineBanner since={d.offlineSince} detail="It reports every 60 s over Wi-Fi." testID="devices-offline" /> : null}
          <ListSection header="Gateway">{row(d.rows[0], false)}</ListSection>
          <ListSection header="Sensor node" footer="Tap the soil moisture sensor to recalibrate it.">
            {d.rows.slice(1).map((r, i) => row(r, i > 0))}
          </ListSection>
        </>
      )}
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: 8 },
});
