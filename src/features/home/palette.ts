import type { IconName } from '@/components/icons';
import { colors, iosColors } from '@/theme';

import type { EventTone, MetricKey } from './model';

export type Variant = 'desktop' | 'ios';

type MetricLook = { icon: IconName; desktopTitle: string; iosTitle: string; color: string; iosColor: string; tint: string };

/** Desktop colours are the Olvar data tokens; the iPhone frames use the iOS accent colours. */
export const METRIC_LOOK: Record<MetricKey, MetricLook> = {
  soil: { icon: 'droplet', desktopTitle: 'Soil moisture', iosTitle: 'Moisture', color: colors.data.water, iosColor: iosColors.accentBlue, tint: colors.data.waterTint },
  light: { icon: 'sun', desktopTitle: 'Light', iosTitle: 'Light', color: colors.data.light, iosColor: iosColors.accentYellow, tint: colors.data.lightTint },
  temperature: { icon: 'thermo', desktopTitle: 'Temperature', iosTitle: 'Temp', color: colors.data.temp, iosColor: iosColors.accentOrange, tint: colors.data.tempTint },
  humidity: { icon: 'droplets', desktopTitle: 'Humidity', iosTitle: 'Humidity', color: colors.data.humidity, iosColor: iosColors.accentTeal, tint: colors.data.humidityTint },
};

export function metricColor(metric: MetricKey, variant: Variant): string {
  return variant === 'ios' ? METRIC_LOOK[metric].iosColor : METRIC_LOOK[metric].color;
}

const TONES: Record<Variant, Record<EventTone, string>> = {
  desktop: {
    muted: colors.text.tertiary,
    water: colors.data.water,
    light: colors.data.light,
    temp: colors.data.temp,
    humidity: colors.data.humidity,
    brand: colors.brand.sage,
    chat: colors.brand.olive,
  },
  ios: {
    muted: iosColors.labelTertiary,
    water: iosColors.accentBlue,
    light: iosColors.accentYellow,
    temp: iosColors.accentOrange,
    humidity: iosColors.accentTeal,
    brand: colors.brand.sage,
    chat: colors.brand.olive,
  },
};

export function toneColor(tone: EventTone, variant: Variant): string {
  return TONES[variant][tone];
}
