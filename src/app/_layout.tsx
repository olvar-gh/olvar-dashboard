import { Stack } from 'expo-router';

// Root layout placeholder; T6 adds fonts, QueryClient, Auth and SafeArea.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
