import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, useBreakpoint } from '@/theme';

import type { AppShellProps } from './AppShell';
import { BottomBar } from './BottomBar';
import { sectionFor } from './navigation';
import { NoPlant } from './NoPlant';
import { Sidebar } from './Sidebar';
import { WebStack } from './WebStack';

export type { AppShellProps } from './AppShell';

/**
 * Desktop web shell: the fixed sidebar (272 / 248 / 72 px icon rail by tier) beside the page,
 * which the browser scrolls. Below 768 px the sidebar becomes the phone bottom bar.
 */
export function AppShell({ noPlant = false }: AppShellProps) {
  const bp = useBreakpoint();
  const active = sectionFor(usePathname());
  const compact = bp.tier === 'compact';
  return (
    <View style={styles.root}>
      {compact ? null : <Sidebar width={bp.shell.sidebarWidth} active={active} rail={bp.tier === 'md'} />}
      <View testID="page" style={[styles.page, { marginLeft: bp.shell.sidebarWidth }]}>
        {noPlant ? <NoPlant /> : <WebStack overlays={['calibrate']} />}
      </View>
      {compact ? <BottomBar active={active} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: colors.bg.canvas },
  page: { flexGrow: 1 },
});
