import { Stack } from 'expo-router';

import { NoPlant } from './NoPlant';
import { nativeStackOptions } from './stackOptions';

export type AppShellProps = {
  /** The gateway setup has not created a plant row yet. */
  noPlant?: boolean;
};

/**
 * iOS shell: the native tabs (src/app/(app)/(tabs)) at the root of a stack, Settings pushed over
 * them (no tab bar, as in the Figma Settings frames) and Soil calibration as a form sheet.
 */
export function AppShell({ noPlant = false }: AppShellProps) {
  if (noPlant) return <NoPlant />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen
        name="calibrate"
        // A modal remounts its screen when header visibility changes, so the sheet declares its
        // header here instead of letting the screen's NavBar turn it on.
        options={{
          ...nativeStackOptions,
          headerShown: true,
          title: 'Soil Calibration',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1],
        }}
      />
    </Stack>
  );
}
