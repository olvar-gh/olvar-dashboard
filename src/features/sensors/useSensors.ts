import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useDevice, useGateway, useHourly, useLatest, usePlant, usePlantStatus, useReadings24h, useThresholds } from '@/data';
import { isCalibrated } from '@/domain/calibration';

import { fromHourly, fromReadings, type RangeData } from './model';

export type RangeQuery = {
  data: RangeData | undefined;
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
};

/** Raw readings_v through fetchAll (≈1,440 rows). */
export function useRange24h(calibrated: boolean): RangeQuery {
  const q = useReadings24h();
  const data = useMemo(
    () => (q.data ? fromReadings(q.data.rows, q.data.from, q.data.to, calibrated) : undefined),
    [q.data, calibrated],
  );
  return { data, isPending: q.isPending, error: q.error, refetch: () => void q.refetch() };
}

/** readings_hourly_v (≤ 720 rows). */
export function useRangeHourly(days: 7 | 30, calibrated: boolean): RangeQuery {
  const q = useHourly(days);
  const data = useMemo(
    () => (q.data ? fromHourly(q.data.rows, days === 7 ? '7d' : '30d', q.data.from, q.data.to, calibrated) : undefined),
    [q.data, days, calibrated],
  );
  return { data, isPending: q.isPending, error: q.error, refetch: () => void q.refetch() };
}

export function useSensorsScreen() {
  const plant = usePlant();
  const device = useDevice();
  const latest = useLatest();
  const status = usePlantStatus();
  const thresholds = useThresholds();
  const gateway = useGateway();
  const queryClient = useQueryClient();

  const calibrated = isCalibrated(device.data);
  const timeZone = plant.data?.timezone ?? 'UTC';
  const pending = plant.isPending || device.isPending || latest.isPending || status.isPending;
  const error = plant.error ?? device.error ?? latest.error ?? status.error ?? null;

  const refresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);

  return {
    plant: plant.data ?? null,
    device: device.data ?? null,
    latest: latest.data ?? null,
    status: status.data ?? null,
    display: status.display,
    thresholds: thresholds.data ?? null,
    gateway,
    calibrated,
    timeZone,
    pending,
    error,
    refresh,
  };
}

export type SensorsScreenState = ReturnType<typeof useSensorsScreen>;
