import type { Query } from '@tanstack/react-query';

export type DayPart = 'offline' | 'extrema' | 'chat';

export const keys = {
  session: ['session'] as const,
  plant: ['plant'] as const,
  // Plant-derived inputs are part of the keys so an edit starts a fetch with the new snapshot.
  thresholds: (plantId: string, inputs: string) => ['thresholds', plantId, inputs] as const,
  status: (plantId: string) => ['status', plantId] as const,
  device: (plantId: string) => ['device', plantId] as const,
  gateway: ['gateway'] as const,
  latest: (deviceId: string, limit: number) => ['latest', deviceId, limit] as const,
  readings24h: (deviceId: string) => ['readings', '24h', deviceId] as const,
  readingsDay: (deviceId: string, date: string, timeZone: string) => ['readings', 'day', deviceId, date, timeZone] as const,
  hourly: (deviceId: string, window: string) => ['hourly', deviceId, window] as const,
  daily: (deviceId: string, fromDate: string, toDate: string, timeZone: string) =>
    ['daily', deviceId, fromDate, toDate, timeZone] as const,
  day: (deviceId: string, date: string, part: DayPart, timeZone: string) =>
    ['day', deviceId, date, part, timeZone] as const,
  chat: (plantId: string) => ['chat', plantId] as const,
  chatLive: (plantId: string) => ['chat-live', plantId] as const,
};

/** One local day's activity queries (offline periods, extrema, first message) for a device. */
export function isDayQuery(deviceId: string, date: string) {
  return (q: Query) => q.queryKey[0] === 'day' && q.queryKey[1] === deviceId && q.queryKey[2] === date;
}
