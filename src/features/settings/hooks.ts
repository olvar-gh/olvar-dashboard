import { useMemo, useState } from 'react';

import { formatTime } from '@/domain/format';

import {
  useChangePassword,
  useDevice,
  useGateway,
  useLatest,
  usePlant,
  usePlantStatus,
  useSession,
  useThresholds,
  useUpdateName,
  useUpdatePlant,
} from '@/data';

import {
  buildOverrides,
  checkDraft,
  deviceRows,
  draftFrom,
  locationError,
  nameError,
  nicknameError,
  passwordError,
  saveErrorMessage,
  usesPreset,
  type RangeDraft,
} from './model';
import { isSaving, useDraft, useSaving } from './drafts';

/** `keep`: hold unsaved edits across the web Settings sections (see drafts.ts). */
export type FormOptions = { keep?: boolean };

/** Plant profile form: nickname and location are editable, the rest is read-only. */
export function usePlantForm({ keep = false }: FormOptions = {}) {
  const plant = usePlant();
  const update = useUpdatePlant();
  // null = untouched, so the field follows the stored value (a save, or a change from another device).
  const [nicknameDraft, setNickname, getNickname] = useDraft<string | null>('plant.nickname', keep, null);
  const [locationDraft, setLocation, getLocation] = useDraft<string | null>('plant.location', keep, null);
  const [busy, track] = useSaving('plant');
  const [submitted, setSubmitted] = useState(false);
  const p = plant.data;
  const nickname = nicknameDraft ?? p?.nickname ?? '';
  const location = locationDraft ?? p?.location ?? '';

  const reset = () => {
    setNickname(null);
    setLocation(null);
    setSubmitted(false);
    update.reset();
  };

  const errors = { nickname: nicknameError(nickname), location: locationError(location) };
  const dirty = !!p && (nickname !== p.nickname || location !== (p.location ?? ''));

  const save = async () => {
    setSubmitted(true);
    if (!p || errors.nickname || errors.location || isSaving('plant')) return false;
    try {
      await track(() => update.mutateAsync({ plantId: p.id, patch: { nickname: nickname.trim(), location: location.trim() || null } }));
      // Edits typed while the request was in flight stay as the next draft.
      if (getNickname() === nicknameDraft) setNickname(null);
      if (getLocation() === locationDraft) setLocation(null);
      setSubmitted(false);
      return true;
    } catch {
      return false;
    }
  };

  return {
    plant,
    nickname,
    setNickname,
    location,
    setLocation,
    errors: submitted ? errors : { nickname: null, location: null },
    dirty,
    save,
    reset,
    saving: busy || update.isPending,
    saveError: update.error ? saveErrorMessage(update.error, 'plant') : null,
  };
}

/**
 * Care targets: "Use preset" on means `threshold_overrides = {}`; off lets the owner edit each
 * metric's `ok_low`/`ok_high`. Turning the preset off only opens the editor; nothing is written
 * until Save.
 */
export function useCareTargets({ keep = false }: FormOptions = {}) {
  const plant = usePlant();
  const thresholds = useThresholds();
  const latest = useLatest();
  const update = useUpdatePlant();
  const p = plant.data;
  const preset = usesPreset(p?.threshold_overrides);
  const [editing, setEditing] = useDraft('care.editing', keep, false);
  // The editor's values; null until the owner types, so it shows the effective ranges.
  const [edits, setEdits, getEdits] = useDraft<RangeDraft | null>('care.edits', keep, null);
  const [busy, track] = useSaving('care');
  const [submitted, setSubmitted] = useState(false);
  const draft = useMemo(() => edits ?? draftFrom(thresholds.data), [edits, thresholds.data]);

  const check = useMemo(() => checkDraft(draft), [draft]);

  const startEditing = () => {
    update.reset();
    setEdits(null);
    setSubmitted(false);
    setEditing(true);
  };
  const cancel = () => {
    update.reset();
    setEdits(null);
    setEditing(false);
    setSubmitted(false);
  };
  const setRange = (metric: keyof RangeDraft, end: 'low' | 'high', value: string) =>
    setEdits({ ...draft, [metric]: { ...draft[metric], [end]: value } });

  const save = async () => {
    setSubmitted(true);
    if (!p || Object.keys(check.errors).length || isSaving('care')) return false;
    try {
      const overrides = buildOverrides(p.profile.thresholds, p.threshold_overrides, check.ranges);
      await track(() => update.mutateAsync({ plantId: p.id, patch: { threshold_overrides: overrides } }));
      if (getEdits() === edits) {
        setEdits(null);
        setEditing(false);
      }
      setSubmitted(false);
      return true;
    } catch {
      return false;
    }
  };

  /** Resolves null on success, else the message to show (the switch springs back on failure). */
  const applyPreset = async (): Promise<string | null> => {
    if (!p) return saveErrorMessage(plant.error);
    if (isSaving('care')) return 'Your last change is still saving. Try again in a moment.';
    try {
      await track(() => update.mutateAsync({ plantId: p.id, patch: { threshold_overrides: {} } }));
      setEdits(null);
      setEditing(false);
      return null;
    } catch (err) {
      return saveErrorMessage(err, 'ranges');
    }
  };

  return {
    plant,
    thresholds,
    latest: latest.data,
    /** The switch: on while there are no overrides and the editor is closed. */
    presetOn: preset && !editing,
    /** The range inputs are open. */
    open: editing,
    draft,
    setRange,
    rowErrors: submitted ? check.errors : {},
    startEditing,
    cancel,
    save,
    applyPreset,
    saving: busy || update.isPending,
    saveError: update.error ? saveErrorMessage(update.error, 'ranges') : null,
  };
}

/** The four hardware rows with live status. */
export function useDeviceRows() {
  const plant = usePlant();
  const device = useDevice();
  const gateway = useGateway();
  const status = usePlantStatus();
  const latest = useLatest();
  const timeZone = plant.data?.timezone ?? 'UTC';
  const rows = deviceRows({
    gateway: gateway.data,
    gatewayAgeS: gateway.ageS,
    gatewayStale: gateway.stale,
    device: device.data,
    nodeOffline: status.display?.offline ?? device.data?.status === 'offline',
    nodeUnknown: device.data?.status === 'unknown',
    nodeOfflineSince: status.display?.offlineSince ?? null,
    latest: latest.data,
    timeZone,
  });
  // The device query stays disabled (and pending) until the plant has loaded.
  const isPending = plant.isPending || (!!plant.data && device.isPending) || gateway.isPending;
  const error = plant.error ?? device.error ?? gateway.error ?? null;
  const refetch = () => {
    if (plant.error || !plant.data) {
      void plant.refetch();
      void gateway.refetch();
      return;
    }
    void device.refetch();
    void gateway.refetch();
    void latest.refetch();
    void status.refetch();
  };
  const since = status.display?.offlineSince;
  return {
    rows,
    isPending,
    error,
    refetch,
    offline: status.display?.offline ?? false,
    offlineSince: since ? formatTime(since, timeZone) : null,
  };
}

/** Account form: display name (Auth metadata) and the plant time zone. */
export function useAccountForm({ keep = false }: FormOptions = {}) {
  const { session } = useSession();
  const plant = usePlant();
  const updateName = useUpdateName();
  const updatePlant = useUpdatePlant();
  const [nameDraft, setName, getName] = useDraft<string | null>('account.name', keep, null);
  const [zoneDraft, setTimeZone, getZone] = useDraft<string | null>('account.timezone', keep, null);
  const [busy, track] = useSaving('account');
  const [submitted, setSubmitted] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const storedName = session?.name ?? '';
  const storedZone = plant.data?.timezone ?? '';
  const name = nameDraft ?? storedName;
  const timeZone = zoneDraft ?? storedZone;

  const reset = () => {
    setName(null);
    setTimeZone(null);
    setSubmitted(false);
    setBlocked(null);
    updateName.reset();
    updatePlant.reset();
  };

  const errors = { name: nameError(name) };
  const zoneDirty = zoneDraft !== null && zoneDraft !== storedZone;
  const dirty = name !== storedName || zoneDirty;

  const save = async () => {
    setSubmitted(true);
    setBlocked(null);
    if (errors.name || isSaving('account')) return false;
    // The time zone lives on the plant row; without it there is nothing to save it to.
    if (zoneDirty && !plant.data) {
      setBlocked('Your plant couldn’t be loaded, so the time zone wasn’t saved. Retry, then save again.');
      return false;
    }
    const plantId = plant.data?.id;
    try {
      await track(async () => {
        if (name.trim() !== storedName) {
          await updateName.mutateAsync(name.trim());
        }
        if (getName() === nameDraft) setName(null);
        if (plantId && zoneDirty) {
          await updatePlant.mutateAsync({ plantId, patch: { timezone: timeZone } });
        }
        if (getZone() === zoneDraft) setTimeZone(null);
      });
      setSubmitted(false);
      return true;
    } catch {
      return false;
    }
  };

  const failure = updatePlant.error ?? updateName.error;
  return {
    email: session?.email ?? '',
    name,
    setName,
    timeZone,
    setTimeZone,
    errors: submitted ? errors : { name: null },
    dirty,
    save,
    reset,
    saving: busy || updateName.isPending || updatePlant.isPending,
    saveError: blocked ?? (failure ? saveErrorMessage(failure, updatePlant.error ? 'timezone' : 'account') : null),
    plantPending: plant.isPending,
    plantError: plant.error ? saveErrorMessage(plant.error) : null,
    retryPlant: () => void plant.refetch(),
  };
}

/** Password change: re-authenticates with the current password, then sets the new one. */
export function usePasswordForm({ confirm: withConfirm = false } = {}) {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, track] = useSaving('password');
  const [signingOut] = useSaving('signout');

  const error = passwordError({ current, next, confirm: withConfirm ? confirm : undefined });

  const submit = async () => {
    setSubmitted(true);
    setDone(false);
    if (error || isSaving('password') || isSaving('signout')) return false;
    try {
      await track(() => change.mutateAsync({ currentPassword: current, newPassword: next }));
      setCurrent('');
      setNext('');
      setConfirm('');
      setSubmitted(false);
      setDone(true);
      return true;
    } catch {
      return false;
    }
  };

  return {
    current,
    setCurrent,
    next,
    setNext,
    confirm,
    setConfirm,
    error: submitted ? error : null,
    submit,
    saving: busy || change.isPending,
    /** Sign-out and a password change never run together (see the Supabase source). */
    signingOut,
    saveError: change.error ? saveErrorMessage(change.error, 'account') : null,
    done,
  };
}
