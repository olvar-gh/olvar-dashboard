import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { hrefs, PageScroll } from '@/components/shell';
import OlvarMark from '@/components/shell/assets/OlvarMark';
import { Button, confirmAlert, ErrorState, IosListRow, ListSection, NavBar, OfflineBanner, SkeletonCard } from '@/components/ui';
import { IOS_GROUP_RADIUS } from '@/components/ui/color';
import { useSession, useSignOut } from '@/data';
import { colors, iosColors, typography } from '@/theme';

import { useCareTargets, useDeviceRows } from '../hooks';
import { formatRange, METRICS, okRange, speciesName } from '../model';

/** iPhone Settings (Figma 45:193): plant card, care targets, devices, account and Sign Out. */
export function SettingsHome() {
  const router = useRouter();
  const c = useCareTargets();
  const d = useDeviceRows();
  const { session } = useSession();
  const signOut = useSignOut();
  const p = c.plant.data;

  const onPreset = async (on: boolean) => {
    if (!on) {
      router.push({ pathname: '/settings/care-targets', params: { edit: '1' } });
      return;
    }
    const ok = await confirmAlert({
      title: `Use the ${p ? speciesName(p.profile) : ''} preset?`,
      message: 'Your own ranges will be replaced by the preset ranges.',
      confirmLabel: 'Use Preset',
    });
    if (!ok) return;
    const error = await c.applyPreset();
    if (error) Alert.alert('Couldn’t use the preset', error);
  };

  const onSignOut = async () => {
    const ok = await confirmAlert({
      title: 'Sign out?',
      message: 'You can sign in again with your email and password.',
      confirmLabel: 'Sign Out',
      destructive: true,
    });
    if (ok) signOut.mutate();
  };

  const gateway = d.rows.find((r) => r.key === 'gateway');
  const node = d.rows.find((r) => r.key === 'node');
  const soil = d.rows.find((r) => r.key === 'soil');

  return (
    <PageScroll testID="settings-home" contentContainerStyle={styles.page}>
      <NavBar title="Settings" />
      {c.plant.isPending ? (
        <SkeletonCard lines={1} testID="settings-loading" />
      ) : c.plant.error || !p ? (
        <ErrorState title="Settings" onRetry={() => void c.plant.refetch()} retrying={c.plant.isFetching} testID="settings-error" />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${p.nickname}, plant profile`}
            onPress={() => router.push('/settings/plant')}
            style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
            testID="settings-plant"
          >
            <View style={styles.plantAvatar}>
              <OlvarMark width={23.8} height={30} />
            </View>
            <View style={styles.profileText}>
              <Text numberOfLines={1} style={styles.profileName}>
                {p.nickname}
              </Text>
              <Text numberOfLines={1} style={styles.profileSub}>
                {[speciesName(p.profile), p.location].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Icon name="chevRight" size={14} color={iosColors.labelTertiary} />
          </Pressable>

          <ListSection
            header="Care targets"
            footer={
              c.presetOn
                ? `Ranges follow the ${speciesName(p.profile)} preset. Turn it off to set your own.`
                : 'You set these ranges. Turn the preset on to go back to the preset ranges.'
            }
          >
            <IosListRow
              label="Use preset"
              icon="leaf"
              iconTint={colors.brand.sage}
              accessory="toggle"
              on={c.presetOn}
              onToggle={(on) => void onPreset(on)}
              disabled={c.saving}
              testID="settings-preset"
            />
            {METRICS.map((cfg) => (
              <IosListRow
                key={cfg.metric}
                label={cfg.label}
                icon={cfg.icon}
                iconTint={cfg.iosTint}
                value={c.thresholds.isPending ? '…' : formatRange(cfg, okRange(c.thresholds.data, cfg.metric), true)}
                accessory="chevron"
                separator
                onPress={() => router.push('/settings/care-targets')}
                testID={`settings-target-${cfg.metric}`}
              />
            ))}
          </ListSection>
        </>
      )}

      <ListSection header="Devices" footer={d.offline ? undefined : 'The ESP32 reports every 60 s over Wi-Fi and MQTT to the Raspberry Pi 3B gateway.'}>
        {d.isPending ? (
          <IosListRow label="Loading devices…" />
        ) : d.error ? (
          <IosListRow label="Couldn’t load devices" value="Retry" accessory="chevron" onPress={d.refetch} testID="settings-devices-error" />
        ) : (
          <>
            {[gateway, node].map((row, i) =>
              row ? (
                <IosListRow
                  key={row.key}
                  label={row.short.title}
                  icon={row.icon}
                  iconTint={colors.text.secondary}
                  value={row.short.value}
                  valueDot={row.status ? (row.status.live ? colors.status.live : colors.text.tertiary) : undefined}
                  accessory="chevron"
                  separator={i > 0}
                  onPress={() => router.push(hrefs.devices)}
                  testID={`settings-device-${row.key}`}
                />
              ) : null,
            )}
            <IosListRow
              label="Soil calibration"
              icon="sliders"
              iconTint={colors.text.secondary}
              value={soil?.short.value}
              accessory="chevron"
              separator
              onPress={() => router.push(hrefs.calibrate)}
              testID="settings-calibrate"
            />
          </>
        )}
      </ListSection>
      {d.offline ? <OfflineBanner since={d.offlineSince} testID="settings-offline" /> : null}

      <ListSection header="Account">
        <IosListRow
          label={session?.name || 'Account'}
          icon="user"
          iconTint={colors.text.secondary}
          value={session?.email}
          accessory="chevron"
          onPress={() => router.push(hrefs.account)}
          testID="settings-account"
        />
      </ListSection>

      <Button variant="destructive" size="large" label="Sign Out" onPress={() => void onSignOut()} loading={signOut.isPending} testID="sign-out" />
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: 8 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: IOS_GROUP_RADIUS,
    borderCurve: 'continuous',
    backgroundColor: iosColors.groupedBackgroundSecondary,
  },
  pressed: { backgroundColor: iosColors.fillVibrantTertiary },
  plantAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brand.sageTint, alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  profileName: { ...typography.iosSubheadlineEmphasized, fontSize: 20, lineHeight: 25, letterSpacing: -0.45, color: iosColors.labelPrimary },
  profileSub: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
});
