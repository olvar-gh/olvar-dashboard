import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icons';
import { usePlant } from '@/data';
import { colors, toTextStyle, typography } from '@/theme';

import OlvarMark from './assets/OlvarMark';
import { GatewayStatus } from './GatewayStatus';
import { shellTabs, type Section } from './navigation';
import { NavLink } from './NavLink';

export type SidebarProps = {
  width: number;
  active: Section;
  /** Icon rail of the md tier (768–1279). */
  rail?: boolean;
};

/**
 * Desktop sidebar (Figma Desktop/Sidebar): Olvar mark and plant nickname, main nav, gateway status.
 * The plant switcher, search and the Chat "New" badge are deferred features and not rendered.
 */
export function Sidebar({ width, active, rail = false }: SidebarProps) {
  const plant = usePlant();
  const nickname = plant.data?.nickname;
  return (
    <View testID="sidebar" accessibilityRole="navigation" style={[styles.root, { width }, rail && styles.rootRail]}>
      <View style={styles.top}>
        <View style={[styles.brand, rail && styles.brandRail]}>
          <OlvarMark width={22.182} height={28} accessibilityLabel="Olvar" />
          {rail || !nickname ? null : (
            <View style={styles.plant}>
              <Text numberOfLines={1} style={styles.plantName}>
                {nickname}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.nav}>
          {shellTabs.map((tab) => {
            const selected = tab.section === active;
            return (
              <NavLink
                key={tab.section}
                href={tab.href}
                label={tab.label}
                selected={selected}
                testID={`nav-${tab.section}`}
                style={[styles.item, rail && styles.itemRail, selected && styles.itemActive]}
                hoverStyle={styles.itemHover}
              >
                <Icon name={tab.icon} size={18} color={selected ? colors.text.primary : colors.text.secondary} />
                {rail ? null : <Text style={selected ? styles.labelActive : styles.label}>{tab.label}</Text>}
              </NavLink>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <GatewayStatus compact={rail} />
      </View>
    </View>
  );
}

const fixed = 'fixed' as ViewStyle['position'];

const styles = StyleSheet.create({
  // Fixed beside the document so the page, not the sidebar, scrolls.
  root: {
    position: fixed,
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    backgroundColor: colors.bg.sidebar,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  rootRail: { paddingHorizontal: 12 },
  top: { gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8 },
  brandRail: { paddingLeft: 0, justifyContent: 'center' },
  plant: { flex: 1, minWidth: 0, paddingLeft: 10, paddingRight: 8, paddingVertical: 7, borderRadius: 8 },
  plantName: { ...typography.label, color: colors.text.primary },
  nav: { gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemRail: { justifyContent: 'center', paddingHorizontal: 0 },
  itemActive: { backgroundColor: colors.surface.card, borderColor: colors.border.subtle },
  itemHover: { backgroundColor: colors.border.subtle },
  label: { ...toTextStyle({ family: 'Inter', weight: 500, size: 14 }), color: colors.text.secondary },
  labelActive: { ...typography.buttonLarge, color: colors.text.primary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
