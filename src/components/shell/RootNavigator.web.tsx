import { Slot } from 'expo-router';

/** Expo Router's web Stack pins screens to the viewport; the root only switches between sign-in and the app. */
export function RootNavigator() {
  return <Slot />;
}
