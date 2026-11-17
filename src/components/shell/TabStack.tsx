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

/** The native stack inside a tab (or Settings) folder, so its screens get native large-title headers and push transitions. */
export function TabStack({ title, pushed = false }: TabStackProps) {
  return (
    <Stack screenOptions={nativeStackOptions}>
      <Stack.Screen
        name="index"
        options={{
          title,
          ...(pushed && {
            unstable_headerLeftItems: () => [
              {
                type: 'button',
                label: 'Back',
                icon: { type: 'sfSymbol', name: 'chevron.left' },
                onPress: () => router.back(),
              },
            ],
          }),
        }}
      />
    </Stack>
  );
}
