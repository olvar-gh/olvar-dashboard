// Typed design tokens from the Figma variables. design/tokens.json is the
// source of truth; src/theme/__tests__/tokens.test.ts keeps the two in sync.

export const colors = {
  bg: { canvas: '#fafaf7', sidebar: '#f3f3ee' },
  surface: { card: '#ffffff' },
  border: { subtle: '#e6e6df' },
  text: { primary: '#1e2219', secondary: '#646a5c', tertiary: '#9a9f92' },
  brand: { olive: '#3b4630', sage: '#7d8a64', sageTint: '#eef1e7' },
  status: { good: '#4e9a44', warn: '#d99a2b', alert: '#d2544b', live: '#c7fd56' },
  data: {
    water: '#4a90c8',
    waterTint: '#eaf3fa',
    light: '#e2a82b',
    lightTint: '#fdf5e1',
    temp: '#e07a4f',
    tempTint: '#fcede5',
    humidity: '#5fa3a8',
    humidityTint: '#e6f2f2',
  },
} as const;

// iOS system colours used by the iPhone frames (Apple UI kit variables).
export const iosColors = {
  labelPrimary: '#000000',
  labelSecondary: '#3c3c4399',
  labelTertiary: '#3c3c434d',
  groupedBackgroundSecondary: '#ffffff',
  separatorNonOpaque: '#0000001f',
  fillTertiary: '#7676801f',
  fillVibrantTertiary: '#ededed',
  accentGreen: '#34c759',
  accentBlue: '#0088ff',
  accentYellow: '#ffcc00',
  accentOrange: '#ff8d28',
  accentTeal: '#00c3d0',
} as const;

export const liquidGlass = {
  opacity: 25,
  refraction: 70,
  frostRegular: 6,
  lightAngle: 0,
  splayRegular: 20,
  depthRegular: 30,
  dispersion: 20,
} as const;

export const radius = {
  card: 20,
  iconChip: 15,
  buttonSmall: 9,
  buttonLarge: 10,
  pill: 999,
} as const;

export const space = {
  cardPaddingX: 24,
  cardPaddingY: 20,
  cardHeaderGap: 16,
  cardTitleGap: 2,
  pageHeaderTitleGap: 6,
  pageHeaderControlsGap: 10,
  buttonPaddingX: 12,
  buttonSmallPaddingY: 7,
  buttonLargePaddingY: 11,
} as const;

export type FontFamilyName = 'Inter' | 'Fraunces';
export type FontWeight = 400 | 500 | 600 | 700;

export type TextStyleToken = {
  family: FontFamilyName;
  weight: FontWeight;
  size: number;
  lineHeight?: number;
  letterSpacing?: number;
  axes?: { SOFT: number; WONK: number };
};

const fraunces = { SOFT: 0, WONK: 1 } as const;

export const textStyles = {
  pageTitle: { family: 'Fraunces', weight: 600, size: 30, axes: fraunces },
  plantName: { family: 'Fraunces', weight: 600, size: 24, axes: fraunces },
  pageSubtitle: { family: 'Inter', weight: 400, size: 14 },
  cardTitle: { family: 'Inter', weight: 600, size: 16 },
  cardSubtitle: { family: 'Inter', weight: 400, size: 12 },
  sensorTitle: { family: 'Inter', weight: 600, size: 14 },
  value: { family: 'Inter', weight: 600, size: 34 },
  unit: { family: 'Inter', weight: 500, size: 14 },
  body: { family: 'Inter', weight: 400, size: 13 },
  label: { family: 'Inter', weight: 500, size: 13 },
  status: { family: 'Inter', weight: 500, size: 12 },
  meta: { family: 'Inter', weight: 400, size: 12 },
  chartLabel: { family: 'Inter', weight: 500, size: 10 },
  buttonSmall: { family: 'Inter', weight: 600, size: 12 },
  buttonLarge: { family: 'Inter', weight: 600, size: 14 },
  iosLargeTitle: { family: 'Inter', weight: 700, size: 34, lineHeight: 41, letterSpacing: 0.4 },
  iosTitle1: { family: 'Inter', weight: 700, size: 28, lineHeight: 34, letterSpacing: 0.38 },
  iosBody: { family: 'Inter', weight: 400, size: 17, lineHeight: 22, letterSpacing: -0.43 },
  iosSubheadline: { family: 'Inter', weight: 400, size: 15, lineHeight: 20, letterSpacing: -0.23 },
  iosSubheadlineEmphasized: { family: 'Inter', weight: 600, size: 15, lineHeight: 20, letterSpacing: -0.23 },
  iosFootnote: { family: 'Inter', weight: 400, size: 13, lineHeight: 18, letterSpacing: -0.08 },
  iosFootnoteEmphasized: { family: 'Inter', weight: 600, size: 13, lineHeight: 18, letterSpacing: -0.08 },
  iosCaption1: { family: 'Inter', weight: 400, size: 12, lineHeight: 16, letterSpacing: 0 },
  iosTabLabel: { family: 'Inter', weight: 600, size: 10, lineHeight: 12, letterSpacing: -0.1 },
} as const satisfies Record<string, TextStyleToken>;

export type TextStyleName = keyof typeof textStyles;
