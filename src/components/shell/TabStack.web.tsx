import { Slot } from 'expo-router';

import type { TabStackProps } from './TabStack';

export type { TabStackProps } from './TabStack';

/** On web the shell's WebStack already owns history; a tab folder only renders its focused page. */
export function TabStack(_props: TabStackProps) {
  return <Slot />;
}
