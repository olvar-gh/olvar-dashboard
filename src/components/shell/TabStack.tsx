import { router, Stack } from 'expo-router';

import { nativeStackOptions } from './stackOptions';

export type TabStackProps = {
  /** Large title of the stack's first screen until the screen sets its own header. */
  title: string;
  /**
   * The stack is itself pushed (Settings over the tabs): its first screen gets a back button,
   * which a nested native stack does not show on its own.
   */
  pushed?: boolean;
};

const backItems = () => [
  {
    type: 'button' as const,
    label: 'Back',
    icon: { type: 'sfSymbol' as const, name: 'chevron.left' as const },
    onPress: () => router.back(),
  },
];

type ScreenOptionsArgs = { route: { key?: string }; navigation: { getState: () => { routes: { key: string }[] } } };

/**
 * Header options for a pushed stack. The back item goes on whichever screen is first in the stack,
 * since a direct push (the account avatar opening /settings/account) starts the stack at that screen.
 */
export function pushedStackOptions({ route, navigation }: ScreenOptionsArgs) {
  const first = navigation.getState().routes[0]?.key === route.key;
  return first ? { ...nativeStackOptions, unstable_headerLeftItems: backItems } : nativeStackOptions;
}

/** The native stack inside a tab (or Settings) folder, so its screens get native large-title headers and push transitions. */
export function TabStack({ title, pushed = false }: TabStackProps) {
  return (
    <Stack screenOptions={pushed ? pushedStackOptions : nativeStackOptions}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
