import { useWindowDimensions } from 'react-native';

import { contentWidth, screenLayout, tierForWidth, tiers, type ScreenLayout, type Tier, type TierLayout } from './layout';

export type Breakpoint = {
  tier: Tier;
  width: number;
  /** Sidebar, padding and content cap for the tier. */
  shell: TierLayout;
  contentWidth: number;
  screens: ScreenLayout;
  isDesktop: boolean;
};

export function breakpointFor(width: number): Breakpoint {
  const tier = tierForWidth(width);
  return {
    tier,
    width,
    shell: tiers[tier],
    contentWidth: contentWidth(width, tier),
    screens: screenLayout(tier),
    isDesktop: tier === 'lg' || tier === 'xl',
  };
}

/** Current width tier and layout values; updates when the window resizes. */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return breakpointFor(width);
}
