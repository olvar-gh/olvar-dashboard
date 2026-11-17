import type { IconName } from '@/components/icons';
import type { TimelineEventKind } from '@/domain/timeline-events';
import { colors, iosColors } from '@/theme';

import type { EventCategory } from './week';

export type EventStyle = {
  icon: IconName;
  /** Desktop: tinted circle and tag background. */
  tint: string;
  /** Desktop: icon and tag text colour. */
  ink: string;
  /** iPhone: solid icon tile behind a white glyph. */
  tile: string;
};

const STYLES: Record<TimelineEventKind, EventStyle> = {
  temperature_max: { icon: 'thermo', tint: colors.data.tempTint, ink: colors.data.temp, tile: iosColors.accentOrange },
  light_max: { icon: 'sun', tint: colors.data.lightTint, ink: colors.data.light, tile: iosColors.accentYellow },
  humidity_min: { icon: 'droplets', tint: colors.data.humidityTint, ink: colors.data.humidity, tile: iosColors.accentTeal },
  soil_driest: { icon: 'droplet', tint: colors.data.waterTint, ink: colors.data.water, tile: iosColors.accentBlue },
  calibration: { icon: 'sliders', tint: colors.data.waterTint, ink: colors.data.water, tile: colors.text.secondary },
  chat: { icon: 'chat', tint: colors.brand.sageTint, ink: colors.brand.olive, tile: colors.brand.sage },
  offline: { icon: 'wifiOff', tint: colors.bg.sidebar, ink: colors.text.secondary, tile: colors.text.tertiary },
  restart: { icon: 'refresh', tint: colors.bg.sidebar, ink: colors.text.secondary, tile: colors.text.tertiary },
  offline_ongoing: { icon: 'wifiOff', tint: colors.data.lightTint, ink: colors.status.warn, tile: colors.status.warn },
};

export function eventStyle(kind: TimelineEventKind): EventStyle {
  return STYLES[kind];
}

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  sensor: 'Sensor',
  device: 'Device',
  care: 'Care',
  sparks: 'Sparks',
};

/** Week-strip dot colours (iPhone), one per category present that day. */
export const CATEGORY_DOT: Record<EventCategory, string> = {
  care: iosColors.accentBlue,
  sparks: colors.brand.olive,
  sensor: iosColors.accentOrange,
  device: colors.status.warn,
};
