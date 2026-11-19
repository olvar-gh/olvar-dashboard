import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DataProvider } from '@/data';
import { createFixtureSource, type FixtureSource } from '@/data/source/fixtures';

import { clearDrafts, isSettingsPath, useDraftScope, useSaving } from '../drafts';
import { useAccountForm, useCareTargets, useDeviceRows, usePasswordForm, usePlantForm } from '../hooks';

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

describe('edits typed while a save is in flight', () => {
  function holdUpdates(source: FixtureSource) {
    const real = source.updatePlant.bind(source);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    source.updatePlant = jest.fn(async (...args: Parameters<typeof real>) => {
      await gate;
      return real(...args);
    });
    return () => release();
  }

  it('keeps a nickname typed after Save was pressed', async () => {
    const { wrapper, source } = setup();
    const release = holdUpdates(source);
    const { result } = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    await waitFor(() => expect(result.current.nickname).toBe('Sparks'));
    await act(() => result.current.setNickname('Leafy'));
    let saving!: Promise<boolean>;
    await act(async () => {
      saving = result.current.save();
    });
    await act(() => result.current.setNickname('Fern'));
    await act(async () => {
      release();
      await saving;
    });
    expect(source.world.plant.nickname).toBe('Leafy');
    await waitFor(() => expect(result.current.nickname).toBe('Fern'));
    expect(result.current.dirty).toBe(true);
  });

  it('keeps range edits and the open editor when they changed during the save', async () => {
    const { wrapper, source } = setup();
    const release = holdUpdates(source);
    const { result } = await renderHook(() => useCareTargets(), { wrapper });
    await waitFor(() => expect(result.current.thresholds.data).toBeTruthy());
    await act(() => result.current.startEditing());
    await act(() => result.current.setRange('soil_pct', 'low', '40'));
    let saving!: Promise<boolean>;
    await act(async () => {
      saving = result.current.save();
    });
    await act(() => result.current.setRange('soil_pct', 'low', '42'));
    await act(async () => {
      release();
      await saving;
    });
    expect(source.world.plant.threshold_overrides).toEqual({ soil_pct: { ok_low: 40 } });
    expect(result.current.open).toBe(true);
    expect(result.current.draft.soil_pct.low).toBe('42');
  });

  it('keeps a name typed while the previous one was saving', async () => {
    const { wrapper, source } = setup();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const realName = source.auth.updateName.bind(source.auth);
    source.auth.updateName = jest.fn(async (n: string) => {
      await gate;
      return realName(n);
    });
    const { result } = await renderHook(() => useAccountForm(), { wrapper });
    await waitFor(() => expect(result.current.timeZone).toBe('Asia/Seoul'));
    await act(() => result.current.setName('Min'));
    let saving!: Promise<boolean>;
    await act(async () => {
      saving = result.current.save();
    });
    await act(() => result.current.setName('Min L'));
    await act(async () => {
      release();
      await saving;
    });
    expect(result.current.name).toBe('Min L');
    expect(result.current.dirty).toBe(true);
  });
});

describe('one save per form at a time', () => {
  it('still reports the save after the card remounts, and refuses a second one', async () => {
    const { wrapper, source } = setup();
    const real = source.updatePlant.bind(source);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    source.updatePlant = jest.fn(async (...args: Parameters<typeof real>) => {
      await gate;
      return real(...args);
    });
    const first = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    await waitFor(() => expect(first.result.current.nickname).toBe('Sparks'));
    await act(() => first.result.current.setNickname('Leafy'));
    let saving!: Promise<boolean>;
    await act(async () => {
      saving = first.result.current.save();
    });
    await first.unmount();

    const second = await renderHook(() => usePlantForm({ keep: true }), { wrapper });
    expect(second.result.current.saving).toBe(true);
    await act(() => second.result.current.setNickname('Fern'));
    let again: boolean | undefined;
    await act(async () => {
      again = await second.result.current.save();
    });
    expect(again).toBe(false);
    expect(source.updatePlant).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await saving;
    });
    await waitFor(() => expect(second.result.current.saving).toBe(false));
    expect(source.world.plant.nickname).toBe('Leafy');
    expect(second.result.current.nickname).toBe('Fern');
  });
});

it('does not start a password change while signing out', async () => {
  const { wrapper, source } = setup();
  const change = jest.spyOn(source.auth, 'changePassword');
  const { result } = await renderHook(() => ({ out: useSaving('signout'), form: usePasswordForm() }), { wrapper });
  let finish!: () => void;
  let signingOut!: Promise<void>;
  await act(async () => {
    signingOut = result.current.out[1](() => new Promise<void>((r) => (finish = r)));
  });
  expect(result.current.form.signingOut).toBe(true);
  await act(() => result.current.form.setCurrent('olvar-dev-password'));
  await act(() => result.current.form.setNext('new-password-1'));
  let ok: boolean | undefined;
  await act(async () => {
    ok = await result.current.form.submit();
  });
  expect(ok).toBe(false);
  expect(change).not.toHaveBeenCalled();
  await act(async () => {
    finish();
    await signingOut;
  });
});
