// Width tiers and per-screen layout values (PLAN §5.4), read from
// design/layout.json, which holds the measurements of the Figma
// Desktop 1920 (xl) and Desktop 1512 (lg) frames.
import layoutJson from '../../design/layout.json';

export type Tier = 'compact' | 'md' | 'lg' | 'xl';

/** Narrowest to widest. */
export const tierOrder: readonly Tier[] = ['compact', 'md', 'lg', 'xl'];

export type TierLayout = {
  minWidth: number;
  sidebarWidth: number;
  paddingX: number;
  paddingTop: number;
  /** Cap on the content column; null means it fills the rest of the viewport. */
  contentMaxWidth: number | null;
};

export type ScreenLayout = {
  page: {
    headerHeight: number;
    headerToContent: number;
    headerToFilterBar: number;
    filterBarHeight: number;
    filterBarToContent: number;
  };
  home: {
    plantCardWidth: number;
    plantCardMinHeight: number;
    columnGap: number;
    sensorGridGap: number;
    sensorCardMinHeight: number;
    rowGap: number;
    bottomCardMinHeight: number;
  };
  sensors: { columnGap: number; rowGap: number; cardMinHeight: number; chartHeight: number };
  timeline: { sideColumnWidth: number; columnGap: number; rowGap: number };
  chat: {
    columns: 2 | 3;
    conversationsWidth: number | null;
    contextWidth: number | null;
    sideColumnWidth: number | null;
    columnGap: number;
    chatMinHeight: number;
  };
  settings: { navWidth: number; columnGap: number; paneMaxWidth: number | null; sectionGap: number };
  calibrationModal: { width: number };
  signIn: { brandPanelWidth: number; formWidth: number };
};

export const tiers: Record<Tier, TierLayout> = layoutJson.tiers;

/** The Figma frame sizes each desktop tier is built and visually tested against. */
export const frames: Record<'xl' | 'lg', { width: number; height: number }> = layoutJson.frames;

export const screens = layoutJson.screens as Record<'xl' | 'lg', ScreenLayout>;

export function tierForWidth(width: number): Tier {
  for (let i = tierOrder.length - 1; i > 0; i--) {
    const tier = tierOrder[i];
    if (width >= tiers[tier].minWidth) return tier;
  }
  return 'compact';
}

/**
 * Width of the content column next to the sidebar. Above 1920 the xl content
 * stays at 1552 and is left-aligned; lg and narrower tiers fill the rest.
 */
export function contentWidth(viewportWidth: number, tier: Tier = tierForWidth(viewportWidth)): number {
  const t = tiers[tier];
  const available = Math.max(0, viewportWidth - t.sidebarWidth - 2 * t.paddingX);
  return t.contentMaxWidth === null ? available : Math.min(available, t.contentMaxWidth);
}

/**
 * Fixed column sizes for a tier. Only xl and lg are measured from Figma; md
 * keeps the lg sizes for its fluid layouts, and compact uses phone layouts.
 */
export function screenLayout(tier: Tier): ScreenLayout {
  return tier === 'xl' ? screens.xl : screens.lg;
}
