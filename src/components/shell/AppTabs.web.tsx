import { Slot } from 'expo-router';

/** On web the sidebar (or the narrow-web bottom bar) is the tab bar, so the tabs group only renders the page. */
export function AppTabs() {
  return <Slot />;
}
