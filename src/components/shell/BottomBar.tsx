import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icons';
import { GlassSurface } from '@/components/ui';
import { colors, typography } from '@/theme';

import { shellTabs, type Section } from './navigation';
import { NavLink } from './NavLink';

/** Narrow web (< 768 px): the phone tab bar as a floating glass capsule. */
export function BottomBar({ active }: { active: Section }) {
  return (
    <View testID="bottom-bar" accessibilityRole="navigation" style={styles.dock}>
      <GlassSurface style={styles.bar}>
        {shellTabs.map((tab) => {
          const selected = tab.section === active;
          return (
            <NavLink
              key={tab.section}
              href={tab.href}
              label={tab.label}
              selected={selected}
              containerStyle={styles.slot}
              style={[styles.item, selected && styles.itemActive]}
            >
              <Icon name={tab.icon} size={22} color={selected ? colors.brand.olive : colors.text.primary} />
              <Text numberOfLines={1} style={[styles.label, selected && styles.labelActive]}>
                {tab.label}
              </Text>
            </NavLink>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'fixed' as ViewStyle['position'],
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 2,
    alignItems: 'center',
  },
  bar: { flexDirection: 'row', width: '100%', maxWidth: 402, padding: 4, borderRadius: 999 },
  slot: { flex: 1, minWidth: 0 },
  item: { alignItems: 'center', gap: 2, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 999 },
  itemActive: { backgroundColor: colors.border.subtle },
  label: { ...typography.iosTabLabel, color: colors.text.primary },
  labelActive: { color: colors.brand.olive },
});
