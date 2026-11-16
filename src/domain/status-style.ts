// Status key → colour and icon. Text always comes from the server labels
// (`overall_label`, `<metric>_label`, `summary`); nothing here judges values.

/** `plant_status_v.overall` values. */
export type OverallStatus = 'great' | 'okay' | 'needs_attention' | 'in_trouble' | 'offline' | 'no_data';

/** `plant_status_v.<metric>_status` values. */
export type MetricStatus = 'critical_low' | 'low' | 'ok' | 'high' | 'critical_high' | 'unknown';

export type StatusTone = 'good' | 'fair' | 'warn' | 'critical' | 'muted';

/** Figma variable names (see `design/tokens.json`); the theme resolves them to colours. */
export type StatusColorToken = 'status/good' | 'brand/sage' | 'status/warn' | 'data/temp' | 'text/tertiary';

export type StatusIcon = 'check-circle' | 'leaf' | 'alert-triangle' | 'alert-octagon' | 'wifi-off' | 'clock' | 'arrow-down' | 'arrow-up' | 'minus';

export type StatusStyle = { tone: StatusTone; color: StatusColorToken; icon: StatusIcon };

const TONE_COLOR: Record<StatusTone, StatusColorToken> = {
  good: 'status/good',
  fair: 'brand/sage',
  warn: 'status/warn',
  critical: 'data/temp',
  muted: 'text/tertiary',
};

function style(tone: StatusTone, icon: StatusIcon): StatusStyle {
  return { tone, color: TONE_COLOR[tone], icon };
}

const OVERALL: Record<OverallStatus, StatusStyle> = {
  great: style('good', 'check-circle'),
  okay: style('fair', 'leaf'),
  needs_attention: style('warn', 'alert-triangle'),
  in_trouble: style('critical', 'alert-octagon'),
  offline: style('muted', 'wifi-off'),
  no_data: style('muted', 'clock'),
};

const METRIC: Record<MetricStatus, StatusStyle> = {
  critical_low: style('critical', 'arrow-down'),
  low: style('warn', 'arrow-down'),
  ok: style('good', 'check-circle'),
  high: style('warn', 'arrow-up'),
  critical_high: style('critical', 'arrow-up'),
  unknown: style('muted', 'minus'),
};

const FALLBACK = style('muted', 'minus');

function lookup(table: Record<string, StatusStyle>, key: string | null | undefined): StatusStyle {
  return key != null && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : FALLBACK;
}

/** Style for an overall status key; unknown or missing keys get a neutral style. */
export function overallStatusStyle(key: string | null | undefined): StatusStyle {
  return lookup(OVERALL, key);
}

/** Style for a per-metric status key; unknown or missing keys get a neutral style. */
export function metricStatusStyle(key: string | null | undefined): StatusStyle {
  return lookup(METRIC, key);
}
