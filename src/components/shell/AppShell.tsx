import { Stack } from 'expo-router';

import { NoPlant } from './NoPlant';

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
        options={{
          title: 'Soil calibration',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1],
        }}
      />
    </Stack>
  );
}
