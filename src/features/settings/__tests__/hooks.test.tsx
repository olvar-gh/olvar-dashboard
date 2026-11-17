import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DataProvider } from '@/data';
import { createFixtureSource, type FixtureSource } from '@/data/source/fixtures';

import { clearDrafts, isSettingsPath, useDraftScope } from '../drafts';
import { useAccountForm, useCareTargets, useDeviceRows, usePlantForm } from '../hooks';

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

const failPlant = (source: FixtureSource) => {
  source.getPlant = jest.fn().mockRejectedValue(new Error('network down'));
};

afterEach(() => {
  clearDrafts();
  cleanups.splice(0).forEach((c) => c());
});

describe('web drafts across Settings sections', () => {
  it('keeps an unsaved nickname when the card remounts on another section', async () => {
    const { wrapper } = setup();
    const scope = await renderHook(() => useDraftScope(), { wrapper });
    const first = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    await waitFor(() => expect(first.result.current.nickname).toBe('Sparks'));
    await act(() => first.result.current.setNickname('Leafy'));
    await first.unmount();

    const second = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    await waitFor(() => expect(second.result.current.nickname).toBe('Leafy'));
    expect(second.result.current.dirty).toBe(true);
    await second.unmount();
    await scope.unmount();
  });

  it('keeps open range edits when the care card remounts', async () => {
    const { wrapper } = setup();
    const first = await renderHook(() => useCareTargets({ keep: true }), { wrapper });
    await waitFor(() => expect(first.result.current.thresholds.data).toBeTruthy());
    await act(() => first.result.current.startEditing());
    await act(() => first.result.current.setRange('soil_pct', 'low', '30'));
    await first.unmount();

    const second = await renderHook(() => useCareTargets({ keep: true }), { wrapper });
    await waitFor(() => expect(second.result.current.open).toBe(true));
    expect(second.result.current.draft.soil_pct.low).toBe('30');
  });

  it('drops drafts once no Settings page is open', async () => {
    const { wrapper } = setup();
    const scope = await renderHook(() => useDraftScope(), { wrapper });
    const form = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    await waitFor(() => expect(form.result.current.nickname).toBe('Sparks'));
    await act(() => form.result.current.setNickname('Leafy'));
    await form.unmount();
    await scope.unmount();
    await act(() => new Promise((r) => setTimeout(r, 5)));

    const again = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    await waitFor(() => expect(again.result.current.nickname).toBe('Sparks'));
  });

  it('does not share drafts on iOS, where going back discards the edit', async () => {
    const { wrapper } = setup();
    const first = await renderHook(() => usePlantForm(), { wrapper });
    await waitFor(() => expect(first.result.current.nickname).toBe('Sparks'));
    await act(() => first.result.current.setNickname('Leafy'));
    await first.unmount();
    const second = await renderHook(() => usePlantForm(), { wrapper });
    await waitFor(() => expect(second.result.current.nickname).toBe('Sparks'));
  });
});

it('treats the Settings sections and calibration as staying in Settings', () => {
  expect(['/settings', '/settings/care-targets', '/settings/account', '/calibrate'].every(isSettingsPath)).toBe(true);
  expect(['/', '/sensors', '/settingsx', '/chat'].some(isSettingsPath)).toBe(false);
});

describe('plant load failures', () => {
  it('turns the device rows into an error, and Retry re-reads the plant', async () => {
    let calls = 0;
    const { wrapper, source } = setup((s) => {
      const real = s.getPlant.bind(s);
      s.getPlant = jest.fn(async () => {
        calls++;
        if (calls === 1) throw new Error('network down');
        return real();
      });
    });
    const { result } = await renderHook(() => useDeviceRows(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isPending).toBe(false);
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(source.getPlant).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('refuses to save a time zone without a loaded plant and keeps the choice', async () => {
    const { wrapper, source } = setup(failPlant);
    const update = jest.spyOn(source, 'updatePlant');
    const { result } = await renderHook(() => useAccountForm(), { wrapper });
    await waitFor(() => expect(result.current.plantError).toBeTruthy());
    await act(() => result.current.setTimeZone('Europe/Berlin'));
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(result.current.timeZone).toBe('Europe/Berlin');
    expect(result.current.saveError).toMatch(/time zone wasn’t saved/);
  });
});

it('reports a failed preset restoration to the caller', async () => {
  const { wrapper, source } = setup();
  await source.updatePlant('p', { threshold_overrides: { soil_pct: { ok_low: 30 } } });
  source.updatePlant = jest.fn().mockRejectedValue(new Error('offline'));
  const { result } = await renderHook(() => useCareTargets(), { wrapper });
  await waitFor(() => expect(result.current.plant.data).toBeTruthy());
  let error: string | null = null;
  await act(async () => {
    error = await result.current.applyPreset();
  });
  expect(error).toMatch(/connection/);
  expect(result.current.presetOn).toBe(false);
});
