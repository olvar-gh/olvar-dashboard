import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { PageScroll, useAccountButton } from '@/components/shell';
import { NavLink } from '@/components/shell/NavLink';
import { PageHeader } from '@/components/ui';
import { colors, typography, useBreakpoint } from '@/theme';

export type SettingsSection = 'plant' | 'care' | 'devices' | 'account';

const NAV: { key: SettingsSection; label: string; icon: IconName; href: Href }[] = [
  { key: 'plant', label: 'Plant profile', icon: 'leaf', href: '/settings' },
  { key: 'care', label: 'Care targets', icon: 'target', href: '/settings/care-targets' },
  { key: 'devices', label: 'Devices & calibration', icon: 'cpu', href: '/settings/devices' },
  { key: 'account', label: 'Account', icon: 'user', href: '/settings/account' },
];

/** Desktop Settings page: page header, the Settings nav (208) and the pane, capped at 1040 on xl. */
export function SettingsFrame({ active, children }: { active: SettingsSection; children: ReactNode }) {
  const bp = useBreakpoint();
  const account = useAccountButton();
  const s = bp.screens.settings;
  const stacked = bp.tier === 'compact';
  return (
    <PageScroll testID={`settings-${active}`}>
      <PageHeader title="Settings" subtitle="Plant profile, care targets, devices and account." {...account} />
      <View style={[styles.body, stacked ? styles.stacked : { gap: s.columnGap }]}>
        <View accessibilityRole="navigation" style={stacked ? styles.navRow : [styles.nav, { width: s.navWidth }]}>
          {NAV.map((item) => {
            const selected = item.key === active;
            return (
              <NavLink
                key={item.key}
                href={item.href}
                label={item.label}
                selected={selected}
                testID={`settings-nav-${item.key}`}
                style={[styles.item, selected && styles.itemActive]}
                hoverStyle={styles.itemHover}
              >
                <Icon name={item.icon} size={17} color={selected ? colors.text.primary : colors.text.secondary} />
                <Text numberOfLines={1} style={[styles.label, selected && styles.labelActive]}>
                  {item.label}
                </Text>
              </NavLink>
            );
          })}
        </View>
        <View style={[styles.pane, { gap: s.sectionGap }, s.paneMaxWidth !== null && { maxWidth: s.paneMaxWidth }]}>{children}</View>
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'flex-start' },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: 16 },
  nav: { gap: 2 },
  navRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: { backgroundColor: colors.surface.card, borderColor: colors.border.subtle },
  itemHover: { backgroundColor: colors.bg.sidebar },
  label: { ...typography.label, fontSize: 14, color: colors.text.secondary },
  labelActive: { ...typography.sensorTitle, color: colors.text.primary },
  pane: { flex: 1, minWidth: 0 },
});
