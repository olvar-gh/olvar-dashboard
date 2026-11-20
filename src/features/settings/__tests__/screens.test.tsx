import { configure } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { renderApp } from '@/components/shell/testing/render-app';
import { DataError } from '@/data';

import { isSaving } from '../drafts';

// Each test renders the whole route tree; the first render of a file can take over a second.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);


/** Answers every native alert with its non-cancel button. */
function acceptAlerts() {
  return jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons?: AlertButton[]) => {
    (buttons?.find((b) => b.style !== 'cancel') ?? buttons?.[0])?.onPress?.();
  });
}

afterEach(() => jest.restoreAllMocks());

/**
 * renderApp at `url`. expo-router keeps the URL a previous test navigated to (router.back() after
 * a save) as the next initial URL, so navigate there explicitly when it differs.
 */
async function open(url: string, options?: Parameters<typeof renderApp>[1]) {
  const app = await renderApp(url, options);
  const [pathname, query] = url.split('?');
  if (app.getPathname() !== pathname) {
    const params = Object.fromEntries(new URLSearchParams(query ?? ''));
    await act(() => router.replace({ pathname: pathname as never, params }));
  }
  return app;
}

describe('Settings (iPhone)', () => {
  it('lists the plant, preset ranges, devices and the account', async () => {
    await open('/settings');
    expect(await screen.findByText('Sparks')).toBeTruthy();
    expect(screen.getByText('Spathiphyllum · Living room window')).toBeTruthy();
    expect(screen.getByText('35–85%')).toBeTruthy();
    expect(screen.getByText('800–5,400 lux')).toBeTruthy();
    expect(screen.getByText('18–29 °C')).toBeTruthy();
    expect(await screen.findByText('Online')).toBeTruthy();
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(screen.getByText('dev@olvar.local')).toBeTruthy();
    expect(screen.getByLabelText('Use preset').props.value).toBe(true);
  });

  it('signs out after the native confirmation', async () => {
    const alert = acceptAlerts();
    const app = await open('/settings');
    await fireEvent.press(await screen.findByTestId('sign-out'));
    expect(alert).toHaveBeenCalledWith('Sign out?', expect.any(String), expect.any(Array), expect.any(Object));
    await waitFor(() => expect(app.getPathname()).toBe('/sign-in'));
  });

  it('shows the error state with Retry when the plant cannot load', async () => {
    const app = await open('/settings');
    app.source.getPlant = jest.fn().mockRejectedValue(new Error('network down'));
    await app.queryClient.resetQueries({ queryKey: ['plant'] });
    expect(await screen.findByTestId('settings-error')).toBeTruthy();
    expect(screen.getAllByText('Retry').length).toBeGreaterThan(0);
    expect(screen.getByTestId('settings-devices-error')).toBeTruthy();
  });

  it('explains a failed preset restoration from the Settings switch', async () => {
    const alert = acceptAlerts();
    const app = await open('/settings');
    await app.source.updatePlant('p', { threshold_overrides: { soil_pct: { ok_low: 30 } } });
    await app.queryClient.invalidateQueries({ queryKey: ['plant'] });
    await waitFor(() => expect(screen.getByLabelText('Use preset').props.value).toBe(false));
    app.source.updatePlant = jest.fn().mockRejectedValue(new Error('offline'));
    await fireEvent(screen.getByLabelText('Use preset'), 'valueChange', true);
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Couldn’t use the preset', expect.stringMatching(/connection/)));
    expect(screen.getByLabelText('Use preset').props.value).toBe(false);
  });

  it('shows the node offline with its time', async () => {
    await open('/settings/devices', { scenario: 'offline' });
    expect(await screen.findByTestId('devices-offline')).toBeTruthy();
    expect(screen.getAllByText(/^Offline since \d\d:\d\d$/).length).toBeGreaterThan(0);
  });

  it('lists the hardware with real facts and opens calibration from the soil probe', async () => {
    const app = await open('/settings/devices');
    expect(await screen.findByText('Raspberry Pi 3B · Wi-Fi · MQTT')).toBeTruthy();
    expect(screen.getByText('olvar-a1b2c3 · every 60 s')).toBeTruthy();
    expect(screen.getByText('SHT31 + GY-302')).toBeTruthy();
    expect(screen.getByText('Temp, humidity, light · I²C')).toBeTruthy();
    expect(screen.getByText('Read OK')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('device-soil'));
    await waitFor(() => expect(app.getPathname()).toBe('/calibrate'));
  });

  it.each([
    ['dht11', 'DHT11 + GY-302', 'Temp, humidity, light · GPIO4, I²C'],
    [null, 'Climate + GY-302', 'Temp, humidity, light'],
  ] as const)('labels the climate sensor row for %s', async (climate_sensor, title, subtitle) => {
    const app = await open('/settings/devices');
    await screen.findByText('SHT31 + GY-302');
    app.source.updateDevice({ climate_sensor });
    await app.queryClient.invalidateQueries({ queryKey: ['device'] });
    expect((await screen.findByText(title)).props.numberOfLines).toBe(2);
    expect(screen.getByText(subtitle)).toBeTruthy();
  });

  it('shows "Read failed" when the latest climate reading is null', async () => {
    await open('/settings/devices', { scenario: 'null-reads' });
    expect(await screen.findByText(/^Read failed \d\d:\d\d$/)).toBeTruthy();
  });

  it('shows "Not calibrated" for an uncalibrated probe', async () => {
    await open('/settings/devices', { scenario: 'uncalibrated' });
    expect(await screen.findByText('Not calibrated')).toBeTruthy();
  });
});

/** Holds `updatePlant` until the returned release is called. */
function holdUpdates(app: Awaited<ReturnType<typeof renderApp>>) {
  const real = app.source.updatePlant.bind(app.source);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  app.source.updatePlant = jest.fn(async (...args: Parameters<typeof real>) => {
    await gate;
    return real(...args);
  });
  return () => release();
}

describe('Plant profile', () => {
  it('locks the fields while the save is in flight', async () => {
    const app = await open('/settings/plant');
    const release = holdUpdates(app);
    await fireEvent.changeText(await screen.findByTestId('plant-nickname'), 'Leafy');
    await fireEvent.press(screen.getByTestId('plant-save'));
    await waitFor(() => expect(screen.getByTestId('plant-nickname').props.editable).toBe(false));
    expect(screen.getByTestId('plant-location').props.editable).toBe(false);
    await act(async () => release());
    await waitFor(() => expect(app.source.world.plant.nickname).toBe('Leafy'));
  });

  it('rejects an empty nickname and saves a valid one with the location', async () => {
    const app = await open('/settings/plant');
    const name = await screen.findByTestId('plant-nickname');
    await fireEvent.changeText(name, '  ');
    await fireEvent.press(screen.getByTestId('plant-save'));
    expect(await screen.findByText('Give your plant a name.')).toBeTruthy();

    await fireEvent.changeText(name, 'Leafy');
    await fireEvent.changeText(screen.getByTestId('plant-location'), 'Office desk');
    await fireEvent.press(screen.getByTestId('plant-save'));
    await waitFor(() => expect(app.source.world.plant).toMatchObject({ nickname: 'Leafy', location: 'Office desk' }));
  });

  it('caps the location at 60 characters', async () => {
    await open('/settings/plant');
    await fireEvent.changeText(await screen.findByTestId('plant-location'), 'x'.repeat(61));
    await fireEvent.press(screen.getByTestId('plant-save'));
    expect(await screen.findByText('Use at most 60 characters.')).toBeTruthy();
  });
});

describe('Care targets', () => {
  it('turning the preset off opens the editor; Save writes only the changed ends', async () => {
    const app = await open('/settings/care-targets');
    await fireEvent(await screen.findByLabelText('Use preset'), 'valueChange', false);
    const low = await screen.findByTestId('target-soil_pct-low');
    await fireEvent.changeText(low, '38');
    await fireEvent.press(screen.getByTestId('care-save'));
    await waitFor(() => expect(app.source.world.plant.threshold_overrides).toEqual({ soil_pct: { ok_low: 38 } }));
    expect(await screen.findByText('38–85%')).toBeTruthy();
  });

  it('gives every number field the Done key', async () => {
    await open('/settings/care-targets?edit=1');
    await screen.findByTestId('target-soil_pct-low');
    const page = screen.getByTestId('care-targets-screen');
    expect(page.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(page.props.keyboardShouldPersistTaps).toBe('handled');
    const fields = ['soil_pct', 'lux', 'temperature_c', 'humidity_pct'].flatMap((m) => [`target-${m}-low`, `target-${m}-high`]);
    for (const id of fields) {
      // returnKeyType without an accessory ID makes iOS add its own Done toolbar to each decimal pad.
      expect(screen.getByTestId(id).props).toMatchObject({ returnKeyType: 'done', keyboardType: 'decimal-pad' });
      expect(screen.getByTestId(id).props.inputAccessoryViewID).toBeUndefined();
    }
  });

  it('opened from the Settings switch, leaves edit mode after a save', async () => {
    const app = await open('/settings/care-targets?edit=1');
    await fireEvent.changeText(await screen.findByTestId('target-soil_pct-low'), '40');
    await fireEvent.press(screen.getByTestId('care-save'));
    await waitFor(() => expect(app.source.world.plant.threshold_overrides).toEqual({ soil_pct: { ok_low: 40 } }));
    expect(await screen.findByText('40–85%')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('care-save')).toBeNull());
    expect(screen.queryByTestId('target-soil_pct-low')).toBeNull();
    expect(screen.getByTestId('care-edit')).toBeTruthy();
  });

  it('shows a failed preset restoration with the editor closed', async () => {
    acceptAlerts();
    const app = await open('/settings/care-targets');
    await app.source.updatePlant('p', { threshold_overrides: { soil_pct: { ok_low: 30 } } });
    await app.queryClient.invalidateQueries({ queryKey: ['plant'] });
    await waitFor(() => expect(screen.getByLabelText('Use preset').props.value).toBe(false));
    app.source.updatePlant = jest.fn().mockRejectedValue(new Error('offline'));
    await fireEvent(screen.getByLabelText('Use preset'), 'valueChange', true);
    expect(await screen.findByTestId('care-save-error')).toBeTruthy();
    expect(screen.queryByTestId('care-save')).toBeNull();
  });

  it('mirrors the order check before saving', async () => {
    const app = await open('/settings/care-targets?edit=1');
    const update = jest.spyOn(app.source, 'updatePlant');
    await fireEvent.changeText(await screen.findByTestId('target-humidity_pct-low'), '80');
    await fireEvent.press(screen.getByTestId('care-save'));
    expect(await screen.findByText('The low end can’t be above the high end.')).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('shows the server error when the constraint rejects the ranges', async () => {
    const app = await open('/settings/care-targets?edit=1');
    app.source.updatePlant = jest.fn().mockRejectedValue(new DataError('violates check constraint "plants_threshold_overrides_check"', '23514'));
    await fireEvent.changeText(await screen.findByTestId('target-lux-high'), '6000');
    await fireEvent.press(screen.getByTestId('care-save'));
    expect(await screen.findByText(/The server rejected these ranges: violates check constraint/)).toBeTruthy();
  });

  it('turning the preset back on clears the overrides after confirmation', async () => {
    acceptAlerts();
    const app = await open('/settings');
    await app.source.updatePlant('p', { threshold_overrides: { soil_pct: { ok_low: 30 } } });
    await app.queryClient.invalidateQueries({ queryKey: ['plant'] });
    await waitFor(() => expect(screen.getByLabelText('Use preset').props.value).toBe(false));
    await fireEvent(screen.getByLabelText('Use preset'), 'valueChange', true);
    await waitFor(() => expect(app.source.world.plant.threshold_overrides).toEqual({}));
  });
});

describe('Account', () => {
  it('saves the name and keeps the email read-only', async () => {
    const app = await open('/settings/account');
    expect((await screen.findByTestId('account-email')).props.editable).toBe(false);
    await fireEvent.changeText(screen.getByTestId('account-name'), 'Mina Park');
    await fireEvent.press(screen.getByTestId('account-save'));
    // A successful save leaves the screen.
    await waitFor(() => expect(app.getPathname()).not.toBe('/settings/account'));
    expect(await app.source.auth.getSession()).toMatchObject({ name: 'Mina Park' });
  });

  it('changes the plant time zone from the picker', async () => {
    const app = await open('/settings/timezone');
    await fireEvent.press(await screen.findByTestId('zone-Europe/Berlin'));
    await waitFor(() => expect(app.source.world.plant.timezone).toBe('Europe/Berlin'));
  });

  it('does not go back a second time when the pick finishes after the owner left', async () => {
    const app = await open('/settings/account');
    await fireEvent.press(await screen.findByTestId('account-timezone'));
    await waitFor(() => expect(app.getPathname()).toBe('/settings/timezone'));
    const release = holdUpdates(app);
    await fireEvent.press(await screen.findByTestId('zone-Europe/Berlin'));
    await act(() => router.back());
    await waitFor(() => expect(app.getPathname()).toBe('/settings/account'));
    await act(async () => release());
    await waitFor(() => expect(app.source.world.plant.timezone).toBe('Europe/Berlin'));
    await waitFor(() => expect(isSaving('timezone')).toBe(false));
    await act(async () => {});
    expect(app.getPathname()).toBe('/settings/account');
  });

  it('reports an unknown time zone (22023)', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const app = await open('/settings/timezone');
    app.source.updatePlant = jest.fn().mockRejectedValue(new DataError('invalid time zone', '22023'));
    await fireEvent.press(await screen.findByTestId('zone-Europe/Berlin'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Couldn’t change the time zone', 'Unknown timezone'));
  });

  it('needs a new password of 8+ characters and the right current password', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await open('/settings/password');
    await fireEvent.changeText(await screen.findByTestId('password-current'), 'wrong');
    await fireEvent.changeText(screen.getByTestId('password-new'), 'short');
    await fireEvent.changeText(screen.getByTestId('password-confirm'), 'short');
    await fireEvent.press(screen.getByTestId('password-submit'));
    expect(await screen.findByText('The new password needs at least 8 characters.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('password-new'), 'new-password-1');
    await fireEvent.changeText(screen.getByTestId('password-confirm'), 'new-password-1');
    await fireEvent.press(screen.getByTestId('password-submit'));
    expect(await screen.findByText('Current password is incorrect')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('password-current'), 'olvar-dev-password');
    await fireEvent.press(screen.getByTestId('password-submit'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Password updated', expect.any(String), expect.any(Array)));
  });
});
