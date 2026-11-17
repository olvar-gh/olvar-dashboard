import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { STATUS_POLL_MS, statusRefetchDelayMs } from '@/domain/status-freshness';
import { localDate, localDayBounds } from '@/domain/time';
import { useDataSource } from './context';
import { isDayQuery, keys } from './keys';
import { invalidateSoilDerived } from './queries/calibration';
import { addChatMessage } from './queries/chat';
import { useDevice } from './queries/device';
import { usePlant } from './queries/plant';
import { usePlantStatus } from './queries/status';
import type { Device, OfflinePeriodRow } from './types';

/** A gateway outbox flush arrives as a burst of INSERTs; they collapse into one re-read. */
export const SIGNAL_COALESCE_MS = 500;
/** Lets readings stamped just before local midnight arrive before the ended day is re-read. */
export const ROLLOVER_SLACK_MS = 30_000;

/**
 * Keeps cached data live (§5.5). Realtime: a `readings` INSERT is a signal to re-read the latest
 * row, the 24 h series, the status and today's activity; a `devices` UPDATE is applied and
 * refreshes status and today's activity; `chat_messages` INSERTs are merged into the
 * conversation; a reconnect invalidates everything. Because a silent Pi sends no events, the
 * status and today's activity are also refreshed at `latest_reading_at + 185 s` (re-armed after
 * every fetch) and every 60 s while the app is focused. The first refresh after local midnight
 * also re-reads the day that just ended, whose cache still holds a partial-day window.
 */
export function useLiveUpdates(): void {
  const source = useDataSource();
  const qc = useQueryClient();
  const plant = usePlant().data;
  const device = useDevice().data;
  const status = usePlantStatus();
  const plantId = plant?.id;
  const deviceId = device?.id;
  const timeZone = plant?.timezone;

  const lastDayRef = useRef<string | null>(null);
  useEffect(() => {
    if (timeZone) lastDayRef.current = localDate(timeZone, new Date());
  }, [timeZone]);
  const refreshLive = useCallback(() => {
    if (!plantId || !deviceId || !timeZone) return;
    const today = localDate(timeZone, new Date());
    const previous = lastDayRef.current;
    lastDayRef.current = today;
    void qc.invalidateQueries({ queryKey: keys.status(plantId) });
    void qc.invalidateQueries({ predicate: isDayQuery(deviceId, today) });
    if (previous && previous !== today) void qc.invalidateQueries({ predicate: isDayQuery(deviceId, previous) });
  }, [qc, plantId, deviceId, timeZone]);

  const refreshRef = useRef(refreshLive);
  useEffect(() => {
    refreshRef.current = refreshLive;
  }, [refreshLive]);

  useEffect(() => {
    if (!plantId || !deviceId) return;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const onSignal = () => {
      void qc.invalidateQueries({ queryKey: ['latest', deviceId] });
      void qc.invalidateQueries({ queryKey: keys.readings24h(deviceId) });
      refreshRef.current();
    };
    const unsubscribe = source.subscribe(
      { deviceId, plantId },
      {
        onReading: () => {
          pending ??= setTimeout(() => {
            pending = null;
            onSignal();
          }, SIGNAL_COALESCE_MS);
        },
        onDevice: (row) => {
          const before = qc.getQueryData<Device | null>(keys.device(plantId));
          qc.setQueryData(keys.device(plantId), row);
          if (before && (before.soil_dry_raw !== row.soil_dry_raw || before.soil_wet_raw !== row.soil_wet_raw)) {
            invalidateSoilDerived(qc);
          }
          refreshRef.current();
        },
        onChatMessage: (row) => {
          addChatMessage(qc, row);
          if (row.role === 'user') refreshRef.current();
        },
        onReconnect: () => void qc.invalidateQueries(),
      },
    );
    return () => {
      if (pending) clearTimeout(pending);
      unsubscribe();
    };
  }, [source, qc, plantId, deviceId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (focusManager.isFocused()) refreshRef.current();
    }, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timeZone) return;
    let id: ReturnType<typeof setTimeout>;
    const arm = () => {
      const end = localDayBounds(timeZone, localDate(timeZone, new Date())).end;
      id = setTimeout(() => {
        refreshRef.current();
        arm();
      }, end.getTime() - Date.now() + ROLLOVER_SLACK_MS);
    };
    arm();
    return () => clearTimeout(id);
  }, [timeZone]);

  const latestReadingAt = status.data?.latest_reading_at;
  const fetchedAt = status.dataUpdatedAt;

  // Past days are otherwise never refetched, so one cached while its outage was still running
  // would keep "Offline since …" after the device came back.
  useEffect(() => {
    if (!deviceId || !timeZone || !latestReadingAt) return;
    const today = localDate(timeZone, new Date());
    void qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'day' &&
        q.queryKey[1] === deviceId &&
        q.queryKey[2] !== today &&
        q.queryKey[3] === 'offline' &&
        hasOngoingBefore(q.state.data as OfflinePeriodRow[] | undefined, latestReadingAt),
    });
  }, [qc, deviceId, timeZone, latestReadingAt]);

  useEffect(() => {
    const delay = statusRefetchDelayMs(latestReadingAt, new Date());
    if (delay == null) return;
    const id = setTimeout(() => refreshRef.current(), delay);
    return () => clearTimeout(id);
  }, [latestReadingAt, fetchedAt]);
}

function hasOngoingBefore(rows: OfflinePeriodRow[] | undefined, readingAt: string): boolean {
  return !!rows?.some((r) => r.ongoing && Date.parse(r.started_at) < Date.parse(readingAt));
}
