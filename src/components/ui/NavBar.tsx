import { Stack } from 'expo-router';

import { iosColors, typography } from '@/theme';

import type { NavBarProps } from './NavBar.types';

export type { NavBarAction, NavBarProps } from './NavBar.types';

/**
 * iPhone nav bar (Figma iPhone/Nav bar) as the native stack header: large title, and
 * Liquid Glass toolbar buttons with SF Symbols. Renders nothing in the page itself; the
 * screen's ScrollView needs contentInsetAdjustmentBehavior="automatic".
 */
export function NavBar({ title, onBack, backLabel = 'Back', actions }: NavBarProps) {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerLargeTitle: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLargeTitleStyle: { fontFamily: typography.iosLargeTitle.fontFamily, color: iosColors.labelPrimary },
          headerTitleStyle: { fontFamily: typography.iosSubheadlineEmphasized.fontFamily, color: iosColors.labelPrimary },

          headerBackVisible: !onBack,
        }}
      />
      {onBack ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="chevron.left" accessibilityLabel={backLabel} onPress={onBack} />
        </Stack.Toolbar>
      ) : null}
      {actions?.length ? (
        <Stack.Toolbar placement="right">
          {actions.map((a) => (
            <Stack.Toolbar.Button key={a.label} icon={a.sf} accessibilityLabel={a.label} disabled={a.disabled} onPress={a.onPress} />
          ))}
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
