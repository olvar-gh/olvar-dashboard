import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { STATUS_POLL_MS, statusRefetchDelayMs } from '@/domain/status-freshness';
import { localDate } from '@/domain/time';
import { useDataSource } from './context';
import { isTodayQuery, keys } from './keys';
import { addChatMessage } from './queries/chat';
import { useDevice } from './queries/device';
import { usePlant } from './queries/plant';
import { usePlantStatus } from './queries/status';

/** A gateway outbox flush arrives as a burst of INSERTs; they collapse into one re-read. */
export const SIGNAL_COALESCE_MS = 500;

/**
 * Keeps cached data live (§5.5). Realtime: a `readings` INSERT is a signal to re-read the latest
 * row, the 24 h series, the status and today's activity; a `devices` UPDATE is applied and
 * refreshes status and today's activity; `chat_messages` INSERTs are merged into the
 * conversation; a reconnect invalidates everything. Because a silent Pi sends no events, the
 * status and today's activity are also refreshed at `latest_reading_at + 185 s` (re-armed after
 * every fetch) and every 60 s while the app is focused.
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

  const refreshLive = useCallback(() => {
    if (!plantId || !deviceId || !timeZone) return;
    void qc.invalidateQueries({ queryKey: keys.status(plantId) });
    void qc.invalidateQueries({ predicate: isTodayQuery(deviceId, localDate(timeZone, new Date())) });
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
          qc.setQueryData(keys.device(plantId), row);
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

  const latestReadingAt = status.data?.latest_reading_at;
  const fetchedAt = status.dataUpdatedAt;
  useEffect(() => {
    const delay = statusRefetchDelayMs(latestReadingAt, new Date());
    if (delay == null) return;
    const id = setTimeout(() => refreshRef.current(), delay);
    return () => clearTimeout(id);
  }, [latestReadingAt, fetchedAt]);
}
