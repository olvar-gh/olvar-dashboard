import type { Query } from '@tanstack/react-query';

export type DayPart = 'offline' | 'extrema' | 'chat';

export const keys = {
  session: ['session'] as const,
  plant: ['plant'] as const,
  thresholds: (plantId: string) => ['thresholds', plantId] as const,
  status: (plantId: string) => ['status', plantId] as const,
  device: (plantId: string) => ['device', plantId] as const,
  gateway: ['gateway'] as const,
  latest: (deviceId: string, limit: number) => ['latest', deviceId, limit] as const,
  readings24h: (deviceId: string) => ['readings', '24h', deviceId] as const,
  hourly: (deviceId: string, window: string) => ['hourly', deviceId, window] as const,
  daily: (deviceId: string, fromDate: string, toDate: string) => ['daily', deviceId, fromDate, toDate] as const,
  day: (deviceId: string, date: string, part: DayPart) => ['day', deviceId, date, part] as const,
  chat: (plantId: string) => ['chat', plantId] as const,
};

/** Today's activity queries (offline periods, extrema, first message) for a device. */
export function isTodayQuery(deviceId: string, today: string) {
  return (q: Query) => q.queryKey[0] === 'day' && q.queryKey[1] === deviceId && q.queryKey[2] === today;
}
