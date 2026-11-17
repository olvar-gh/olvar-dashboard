import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { useGateway } from '@/data';
import { formatAge } from '@/domain/format';
import { colors, typography } from '@/theme';

import LiveDot from './assets/LiveDot';
import { hrefs } from './navigation';
import { NavLink } from './NavLink';

/** Gateway heartbeat line for the sidebar footer: "olvar-gateway · 12 s ago", offline after 420 s. */
export function gatewayStatusText(ageS: number | null, stale: boolean): string {
  if (ageS === null) return 'not seen yet';
  return stale ? `offline · ${formatAge(ageS)}` : formatAge(ageS);
}

export function GatewayStatus({ compact = false }: { compact?: boolean }) {
  const { data, ageS, stale } = useGateway();
  const online = data != null && !stale;
  const detail = data === undefined ? '' : gatewayStatusText(ageS, stale);
  const label = `olvar-gateway${detail ? `, ${detail}` : ''}`;
  return (
    <View testID="gateway-status" style={[styles.root, compact && styles.rootCompact]}>
      <View accessibilityLabel={label} accessibilityRole="text" style={styles.dotBox}>
        {online ? (
          <View style={styles.dotGlow}>
            <LiveDot width={18} height={18} />
          </View>
        ) : (
          <View testID="gateway-dot-offline" style={styles.dotOffline} />
        )}
      </View>
      {compact ? null : (
        <Text numberOfLines={1} style={styles.text}>
          <Text style={styles.name}>olvar-gateway</Text>
          {detail ? <Text style={[styles.age, stale && styles.ageStale]}>{` · ${detail}`}</Text> : null}
        </Text>
      )}
      <NavLink href={hrefs.devices} label="Gateway settings" style={styles.gear} hoverStyle={styles.gearHover}>
        <Icon name="settings" size={15} color={colors.text.secondary} />
      </NavLink>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 22,
    paddingRight: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  rootCompact: { flexDirection: 'column', paddingHorizontal: 0, gap: 12 },
  dotBox: { width: 10, height: 10 },
  // The Figma live dot draws its halo 4 px outside its 10 px box.
  dotGlow: { position: 'absolute', top: -4, left: -4 },
  dotOffline: { width: 8, height: 8, margin: 1, borderRadius: 4, backgroundColor: colors.text.tertiary },
  text: { flex: 1, minWidth: 0 },
  name: { ...typography.buttonSmall, color: colors.text.primary },
  age: { ...typography.meta, color: colors.text.tertiary },
  ageStale: { color: colors.status.alert },
  gear: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  gearHover: { backgroundColor: colors.border.subtle },
});
