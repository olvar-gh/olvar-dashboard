import { colors } from '@/theme';
import type { StatusColorToken } from '@/domain/status-style';

const STATUS_COLORS: Record<StatusColorToken, string> = {
  'status/good': colors.status.good,
  'brand/sage': colors.brand.sage,
  'status/warn': colors.status.warn,
  'data/temp': colors.data.temp,
  'text/tertiary': colors.text.tertiary,
};

export function statusColor(token: StatusColorToken): string {
  return STATUS_COLORS[token];
}

/** `#rrggbb` plus an alpha in 0..1 as `#rrggbbaa`. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex.slice(0, 7)}${a.toString(16).padStart(2, '0')}`;
}

export const scrim = withAlpha(colors.text.primary, 0.4);

/** Page background of the Figma iPhone frames (iOS grouped background). */
export const iosGroupedBackground = '#f2f2f7';

/** Corner radius of grouped sections, cards and capsule buttons in the iPhone frames. */
export const IOS_GROUP_RADIUS = 26;
