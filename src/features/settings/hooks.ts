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

/** Plant profile form: nickname and location are editable, the rest is read-only. */
export function usePlantForm() {
  const plant = usePlant();
  const update = useUpdatePlant();
  // null = untouched, so the field follows the stored value (a save, or a change from another device).
  const [nicknameDraft, setNickname] = useState<string | null>(null);
  const [locationDraft, setLocation] = useState<string | null>(null);
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
    if (!p || errors.nickname || errors.location) return false;
    try {
      await update.mutateAsync({ plantId: p.id, patch: { nickname: nickname.trim(), location: location.trim() || null } });
      setNickname(null);
      setLocation(null);
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
    saving: update.isPending,
    saveError: update.error ? saveErrorMessage(update.error, 'plant') : null,
  };
}

/**
 * Care targets: "Use preset" on means `threshold_overrides = {}`; off lets the owner edit each
 * metric's `ok_low`/`ok_high`. Turning the preset off only opens the editor; nothing is written
 * until Save.
 */
export function useCareTargets() {
  const plant = usePlant();
  const thresholds = useThresholds();
  const latest = useLatest();
  const update = useUpdatePlant();
  const p = plant.data;
  const preset = usesPreset(p?.threshold_overrides);
  const [editing, setEditing] = useState(false);
  // The editor's values; null until the owner types, so it shows the effective ranges.
  const [edits, setEdits] = useState<RangeDraft | null>(null);
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
    setEditing(false);
    setSubmitted(false);
  };
  const setRange = (metric: keyof RangeDraft, end: 'low' | 'high', value: string) =>
    setEdits({ ...draft, [metric]: { ...draft[metric], [end]: value } });

  const save = async () => {
    setSubmitted(true);
    if (!p || Object.keys(check.errors).length) return false;
    try {
      const overrides = buildOverrides(p.profile.thresholds, p.threshold_overrides, check.ranges);
      await update.mutateAsync({ plantId: p.id, patch: { threshold_overrides: overrides } });
      setEditing(false);
      setSubmitted(false);
      return true;
    } catch {
      return false;
    }
  };

  const applyPreset = async () => {
    if (!p) return false;
    try {
      await update.mutateAsync({ plantId: p.id, patch: { threshold_overrides: {} } });
      setEditing(false);
      return true;
    } catch {
      return false;
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
    saving: update.isPending,
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
    nodeOfflineSince: status.display?.offlineSince ?? null,
    latest: latest.data,
    timeZone,
  });
  const isPending = plant.isPending || device.isPending || gateway.isPending;
  const error = device.error ?? gateway.error ?? null;
  const refetch = () => {
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
export function useAccountForm() {
  const { session } = useSession();
  const plant = usePlant();
  const updateName = useUpdateName();
  const updatePlant = useUpdatePlant();
  const [nameDraft, setName] = useState<string | null>(null);
  const [zoneDraft, setTimeZone] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const storedName = session?.name ?? '';
  const storedZone = plant.data?.timezone ?? '';
  const name = nameDraft ?? storedName;
  const timeZone = zoneDraft ?? storedZone;

  const reset = () => {
    setName(null);
    setTimeZone(null);
    setSubmitted(false);
    updateName.reset();
    updatePlant.reset();
  };

  const errors = { name: nameError(name) };
  const dirty = name !== storedName || timeZone !== storedZone;

  const save = async () => {
    setSubmitted(true);
    if (errors.name) return false;
    try {
      if (name.trim() !== storedName) await updateName.mutateAsync(name.trim());
      if (plant.data && timeZone !== storedZone) {
        await updatePlant.mutateAsync({ plantId: plant.data.id, patch: { timezone: timeZone } });
      }
      setName(null);
      setTimeZone(null);
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
    saving: updateName.isPending || updatePlant.isPending,
    saveError: failure ? saveErrorMessage(failure, updatePlant.error ? 'timezone' : 'account') : null,
    plantPending: plant.isPending,
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

  const error = passwordError({ current, next, confirm: withConfirm ? confirm : undefined });

  const submit = async () => {
    setSubmitted(true);
    setDone(false);
    if (error) return false;
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
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
    saving: change.isPending,
    saveError: change.error ? saveErrorMessage(change.error, 'account') : null,
    done,
  };
}
