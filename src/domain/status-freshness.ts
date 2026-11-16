// Ages the cached `plant_status_v` row between refetches using the gateway's
// own 180 s offline rule (§5.5). It never computes a health status.

import type { OverallStatus } from './status-style';

/** Device offline rule (gateway): no reading for more than 180 s. */
export const DEVICE_OFFLINE_S = 180;
/** Slack after the reading expiry before the deadline refetch fires. */
export const REFETCH_SLACK_S = 5;
/** Fallback status refetch interval while visible. */
export const STATUS_POLL_MS = 60_000;
/** Gateway shown offline when its heartbeat (every 300 s) is older than 300 + 120 s. */
export const GATEWAY_STALE_S = 420;
/** Gateway row polling interval. */
export const GATEWAY_POLL_MS = 60_000;

/** Text shown in place of the cached labels once the row has aged out. */
export const OFFLINE_LABEL = 'Offline';

type Instant = Date | string | null | undefined;

function ms(t: Date | string): number {
  return new Date(t).getTime();
}

/** When the latest reading stops counting as fresh, or null with no reading. */
export function readingExpiresAt(latestReadingAt: Instant): Date | null {
  return latestReadingAt == null ? null : new Date(ms(latestReadingAt) + DEVICE_OFFLINE_S * 1000);
}

/** Fresh while `now − latest_reading_at ≤ 180 s`; 181 s is expired. No reading is never fresh. */
export function isReadingFresh(latestReadingAt: Instant, now: Date): boolean {
  const expires = readingExpiresAt(latestReadingAt);
  return expires != null && now.getTime() <= expires.getTime();
}

/**
 * Delay for the status deadline timer, re-armed after every fetch:
 * `latest_reading_at + 180 s + 5 s − now`. Null when there is no reading or
 * the deadline has passed (the 60 s interval covers those cases).
 */
export function statusRefetchDelayMs(latestReadingAt: Instant, now: Date): number | null {
  const expires = readingExpiresAt(latestReadingAt);
  if (expires == null) return null;
  const delay = expires.getTime() + REFETCH_SLACK_S * 1000 - now.getTime();
  return delay > 0 ? delay : null;
}

export type CachedStatus = {
  overall: OverallStatus | string;
  overall_label: string;
  summary: string | null;
  latest_reading_at: string | null;
  device_status?: string | null;
};

export type DeviceState = {
  status?: string | null;
  status_changed_at?: string | null;
};

export type DisplayStatus = {
  overall: OverallStatus | string;
  overallLabel: string;
  summary: string | null;
  /** Whether the UI shows the offline state. */
  offline: boolean;
  /** The cached row expired locally; the caller should refetch. */
  aged: boolean;
  /** When the device went offline, for "olvar-node offline since HH:mm". */
  offlineSince: Date | null;
};

/** When the device went offline: the LWT time if it fired, else the latest reading. */
export function offlineSince(status: CachedStatus, device?: DeviceState | null): Date | null {
  if (device?.status === 'offline' && device.status_changed_at) return new Date(device.status_changed_at);
  return status.latest_reading_at ? new Date(status.latest_reading_at) : null;
}

/**
 * The status to display now. Offline when the server says so, when the device
 * row is offline, or when the cached row has aged past the 180 s rule.
 * A row with no reading yet (`no_data`) is shown as is.
 */
export function displayStatus(status: CachedStatus, now: Date, device?: DeviceState | null): DisplayStatus {
  const aged = status.latest_reading_at != null && !isReadingFresh(status.latest_reading_at, now);
  const offline =
    status.overall === 'offline' || status.device_status === 'offline' || device?.status === 'offline' || aged;
  if (!offline) {
    return {
      overall: status.overall,
      overallLabel: status.overall_label,
      summary: status.summary,
      offline: false,
      aged: false,
      offlineSince: null,
    };
  }
  const serverOffline = status.overall === 'offline';
  return {
    overall: 'offline',
    overallLabel: serverOffline ? status.overall_label : OFFLINE_LABEL,
    summary: serverOffline ? status.summary : OFFLINE_LABEL,
    offline: true,
    aged,
    offlineSince: offlineSince(status, device),
  };
}

/** Age of the gateway heartbeat in seconds, or null if it never reported. */
export function gatewayAgeS(lastSeenAt: Instant, now: Date): number | null {
  return lastSeenAt == null ? null : Math.max(0, (now.getTime() - ms(lastSeenAt)) / 1000);
}

/** Gateway is stale when its heartbeat is older than 420 s (or missing). */
export function isGatewayStale(lastSeenAt: Instant, now: Date): boolean {
  const age = gatewayAgeS(lastSeenAt, now);
  return age == null || age > GATEWAY_STALE_S;
}
