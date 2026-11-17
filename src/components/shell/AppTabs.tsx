import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

import { shellTabs } from './navigation';

/** The system tab bar (Liquid Glass on iOS 26+) with SF Symbols: Home · Sensors · Timeline · Chat. */
export function AppTabs() {
  return (
    <NativeTabs tintColor={colors.brand.olive} minimizeBehavior="onScrollDown">
      {shellTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.route} name={tab.route}>
          <NativeTabs.Trigger.Icon sf={tab.sf} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
