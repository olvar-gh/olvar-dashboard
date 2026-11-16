import type { SFSymbol } from 'sf-symbols-typescript';

import type { IconName } from '@/components/icons';

export type AppTab = { name: string; label: string; sf: SFSymbol; icon: IconName };

/**
 * The four tabs of the Figma iPhone/Tab bar. The bar itself is the system Liquid Glass tab bar
 * (expo-router/native-tabs in the app shell); this is its content: SF Symbols on iOS, Olvar icons on web.
 */
export const appTabs: readonly AppTab[] = [
  { name: 'index', label: 'Home', sf: 'house', icon: 'home' },
  { name: 'sensors', label: 'Sensors', sf: 'waveform.path.ecg', icon: 'activity' },
  { name: 'timeline', label: 'Timeline', sf: 'clock', icon: 'clock' },
  { name: 'chat', label: 'Chat', sf: 'bubble.left', icon: 'chat' },
];
