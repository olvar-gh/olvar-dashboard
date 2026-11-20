import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import type { FixtureSource } from '@/data';

import { CalibrationSheet as Sheet } from '../CalibrationScreen';
import { useCalibrationWizard } from '../useCalibrationWizard';

const onSaved = jest.fn();

// The route adds the native header and the dismiss guard (useDismissGuard.test.tsx).
function CalibrationSheet() {
  return <Sheet w={useCalibrationWizard()} onSaved={onSaved} />;
}

const WAIT = { timeout: 4000 };
// Each capture waits for the 500 ms reading-signal coalesce, as in the app.
jest.setTimeout(20_000);

// The fixture only serves readings recorded up to the current time.
async function addReadings(source: FixtureSource, raws: (number | null)[]) {
  await act(async () => {
    for (const soil_raw of raws) source.addReading({ soil_raw, recorded_at: new Date().toISOString() });
  });
}

const primary = () => screen.getByTestId('calibration-primary');

describe('iOS calibration sheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('captures dry and wet from fresh stable readings and saves them', async () => {
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    expect(await screen.findByText(/Waiting for fresh readings · 0 of 3/)).toBeTruthy();
    expect(primary()).toBeDisabled();

    await addReadings(source, [2905, 2900, 2910]);
    expect(await screen.findByText('Stable · last 3 readings agree', {}, WAIT)).toBeTruthy();
    await fireEvent.press(primary());
    expect(await screen.findByText('2,905')).toBeTruthy();
    expect(screen.getByText(/Waiting for fresh readings · 0 of 3/)).toBeTruthy();

    await addReadings(source, [1310, 1300, 1305]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    expect(screen.getByText('Save Calibration')).toBeTruthy();

    const save = jest.spyOn(source, 'updateCalibration');
    await fireEvent.press(primary());
    await waitFor(() => expect(save).toHaveBeenCalledWith(source.world.device.id, 2905, 1305));
    expect(source.world.device).toMatchObject({ soil_dry_raw: 2905, soil_wet_raw: 1305 });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('only counts readings that arrive after the step starts', async () => {
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    await screen.findByText(/0 of 3/);
    await addReadings(source, [2900]);
    expect(await screen.findByText(/1 of 3 · about 2 min/, {}, WAIT)).toBeTruthy();
  });

  it('blocks saving a pair the server would reject', async () => {
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    await screen.findByText(/0 of 3/);
    await addReadings(source, [1400, 1400, 1400]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    await addReadings(source, [1350, 1350, 1350]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    expect(await screen.findByTestId('calibration-invalid')).toBeTruthy();
    expect(primary()).toBeDisabled();
  });

  it('shows a native alert when the save fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    source.updateCalibration = async () => {
      throw new Error('fetch failed');
    };
    await screen.findByText(/0 of 3/);
    await addReadings(source, [2900, 2900, 2900]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    await addReadings(source, [1300, 1300, 1300]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    await fireEvent.press(primary());
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Calibration Not Saved', expect.stringMatching(/connection/)));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows a failed read without treating the sensor as uncalibrated', async () => {
    await renderWithFixtures(<CalibrationSheet />, { scenario: 'null-reads' });
    expect(await screen.findByText(/^Read failed at \d\d:\d\d$/)).toBeTruthy();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.queryByText('Not calibrated')).toBeNull();
  });

  it('shows not calibrated from the device row', async () => {
    await renderWithFixtures(<CalibrationSheet />, { scenario: 'uncalibrated' });
    expect(await screen.findByText('Not calibrated')).toBeTruthy();
    expect(screen.queryByText(/Read failed/)).toBeNull();
  });

  it('shows the offline banner and keeps capture off', async () => {
    await renderWithFixtures(<CalibrationSheet />, { scenario: 'offline' });
    expect(await screen.findByTestId('calibration-offline')).toBeTruthy();
    expect(screen.getByText('No new readings')).toBeTruthy();
    expect(primary()).toBeDisabled();
  });

  it('shows an error with retry when loading fails', async () => {
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    await screen.findByText(/0 of 3/);
    source.getLatestReadings = async () => {
      throw new Error('network');
    };
    await addReadings(source, [2900]);
    expect(await screen.findByText(/Couldn’t load the soil sensor/, {}, WAIT)).toBeTruthy();
  });

  it('shows the empty state before the first reading', async () => {
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    await screen.findByText(/0 of 3/);
    source.getLatestReadings = async () => [];
    await addReadings(source, [2900]);
    expect(await screen.findByText('No Readings Yet', {}, WAIT)).toBeTruthy();
  });

  it('asks before retaking a captured value', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    const { source } = await renderWithFixtures(<CalibrationSheet />);
    await screen.findByText(/0 of 3/);
    await addReadings(source, [2900, 2900, 2900]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    await fireEvent.press(await screen.findByTestId('step-dry'));
    expect(alert).toHaveBeenCalledWith('Retake dry reading?', expect.any(String), expect.any(Array), expect.any(Object));
    expect(await screen.findByText('Measuring…')).toBeTruthy();
    expect(screen.getByText('Capture Dry Reading')).toBeTruthy();
  });
});
