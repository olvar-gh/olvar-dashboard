import { onlineManager, QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DataProvider, useSignOut } from '@/data';
import { SPATHIPHYLLUM_THRESHOLDS } from '@/data/fixtures/generate';
import { createFixtureSource, type FixtureSource } from '@/data/source/fixtures';

import { clearDrafts } from '../drafts';
import { useAccountForm, useCareTargets, useDeviceRows, usePlantForm } from '../hooks';
import { CareTargetsCard } from '../web/CareTargetsCard';

const cleanups: (() => void)[] = [];

function setup(prepare?: (source: FixtureSource) => void) {
  const source = createFixtureSource({ days: 2 });
  cleanups.push(() => source.stop());
  prepare?.(source);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  cleanups.push(() => queryClient.clear());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider source={source} queryClient={queryClient}>
      {children}
    </DataProvider>
  );
  return { source, queryClient, wrapper };
}

afterEach(() => {
  clearDrafts();
  onlineManager.setOnline(true);
  cleanups.splice(0).forEach((c) => c());
});

async function save(run: () => Promise<boolean>) {
  let saved: boolean | undefined;
  await act(async () => {
    saved = await run();
  });
  return saved;
}

describe('saving only what the owner changed', () => {
  it('patches only the nickname when the location was not touched', async () => {
    const { wrapper, source } = setup();
    const update = jest.spyOn(source, 'updatePlant');
    const { result } = await renderHook(() => usePlantForm(), { wrapper });
    await waitFor(() => expect(result.current.nickname).toBe('Sparks'));
    await act(() => result.current.setNickname('Leafy'));
    expect(await save(() => result.current.save())).toBe(true);
    expect(update).toHaveBeenCalledWith(source.world.plant.id, { nickname: 'Leafy' });
  });

  it('saves one edited metric while an untouched one has no range', async () => {
    const { wrapper, source } = setup((s) => {
      s.getEffectiveThresholds = async () => ({ ...SPATHIPHYLLUM_THRESHOLDS, lux: {} });
    });
    const update = jest.spyOn(source, 'updatePlant');
    const { result } = await renderHook(() => useCareTargets(), { wrapper });
    await waitFor(() => expect(result.current.thresholds.data).toBeTruthy());
    await act(() => result.current.startEditing());
    await act(() => result.current.setRange('soil_pct', 'low', '40'));
    expect(await save(() => result.current.save())).toBe(true);
    expect(result.current.rowErrors).toEqual({});
    expect(update).toHaveBeenCalledWith(source.world.plant.id, { threshold_overrides: { soil_pct: { ok_low: 40 } } });
  });

  it('accepts equal range endpoints', async () => {
    const { wrapper, source } = setup();
    const { result } = await renderHook(() => useCareTargets(), { wrapper });
    await waitFor(() => expect(result.current.thresholds.data).toBeTruthy());
    await act(() => result.current.startEditing());
    await act(() => result.current.setRange('soil_pct', 'low', '50'));
    await act(() => result.current.setRange('soil_pct', 'high', '50'));
    expect(await save(() => result.current.save())).toBe(true);
    expect(source.world.plant.threshold_overrides).toEqual({ soil_pct: { ok_low: 50, ok_high: 50 } });
  });

  it('rejects an edited range outside the warning bounds without saving', async () => {
    const { wrapper, source } = setup();
    const update = jest.spyOn(source, 'updatePlant');
    const { result } = await renderHook(() => useCareTargets(), { wrapper });
    await waitFor(() => expect(result.current.thresholds.data).toBeTruthy());
    await act(() => result.current.startEditing());
    await act(() => result.current.setRange('temperature_c', 'low', '12'));
    expect(await save(() => result.current.save())).toBe(false);
    expect(result.current.rowErrors.temperature_c).toMatch(/warning bounds, 16 and 30/);
    expect(update).not.toHaveBeenCalled();
  });

  it('saves only the time zone when the owner has no display name', async () => {
    const { wrapper, source } = setup((s) => {
      const real = s.auth.getSession.bind(s.auth);
      s.auth.getSession = async () => {
        const session = await real();
        return session && { ...session, name: null };
      };
    });
    const updateName = jest.spyOn(source.auth, 'updateName');
    const { result } = await renderHook(() => useAccountForm(), { wrapper });
    await waitFor(() => expect(result.current.plantPending).toBe(false));
    await act(() => result.current.setTimeZone('Europe/Berlin'));
    expect(await save(() => result.current.save())).toBe(true);
    expect(updateName).not.toHaveBeenCalled();
    expect(source.world.plant.timezone).toBe('Europe/Berlin');
  });
});

describe('devices', () => {
  it('shows a failed latest-reading request with Retry instead of "No reading yet"', async () => {
    const { wrapper, source } = setup();
    const real = source.getLatestReadings.bind(source);
    const latest = jest.spyOn(source, 'getLatestReadings').mockRejectedValue(new Error('network down'));
    const { result } = await renderHook(() => useDeviceRows(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    latest.mockImplementation(real);
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.rows.find((r) => r.key === 'climate')?.status?.label).toBe('Read OK');
  });

  it('shows a failed status request with Retry', async () => {
    const { wrapper, source } = setup();
    jest.spyOn(source, 'getStatus').mockRejectedValue(new Error('network down'));
    const { result } = await renderHook(() => useDeviceRows(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});

it('signs out of this device while offline', async () => {
  const { wrapper, source } = setup();
  const signOut = jest.spyOn(source.auth, 'signOut');
  onlineManager.setOnline(false);
  const { result } = await renderHook(() => useSignOut(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync();
  });
  expect(signOut).toHaveBeenCalled();
  expect(await source.auth.getSession()).toBeNull();
});

it('keeps Save and Cancel out of the card header, so the preset switch stays reachable', async () => {
  const { wrapper } = setup();
  await render(<CareTargetsCard />, { wrapper });
  const preset = await screen.findByTestId('care-preset');
  await fireEvent(preset, 'valueChange', false);
  const actions = await screen.findByTestId('care-edit-actions');
  expect(within(actions).getByTestId('care-save')).toBeTruthy();
  expect(within(actions).queryByTestId('care-preset')).toBeNull();
});
