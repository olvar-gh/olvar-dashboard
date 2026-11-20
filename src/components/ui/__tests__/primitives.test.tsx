import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionSheetIOS, Alert, Text } from 'react-native';

import { colors, iosColors } from '@/theme';

import {
  BrandHeader,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  IosListRow,
  ListRow,
  ListSection,
  Modal,
  ModalCard,
  Notice,
  OfflineBanner,
  RangeCard,
  SearchField,
  Segmented,
  SelectField,
  SkeletonCard,
  StatusPill,
  appTabs,
  confirmAlert,
  offlineText,
  rangeLabel,
  showActionSheet,
} from '..';
import { withAlpha } from '../color';

const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('Button (iPhone)', () => {
  it('fires onPress and exposes its label', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled or loading', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Button label="A" disabled onPress={onPress} />
        <Button label="B" loading onPress={onPress} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'A' }));
    await fireEvent.press(screen.getByRole('button', { name: 'B' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'B' }).props.accessibilityState).toMatchObject({ busy: true });
  });

  it('large primary is the full-width olive capsule; destructive is the white grouped row', async () => {
    await render(
      <>
        <Button size="large" label="Sign In" />
        <Button size="large" variant="destructive" label="Sign Out" />
      </>,
    );
    expect(flat(screen.getByRole('button', { name: 'Sign In' }).props.style)).toMatchObject({
      backgroundColor: colors.brand.olive,
      height: 50,
      alignSelf: 'stretch',
    });
    expect(flat(screen.getByRole('button', { name: 'Sign Out' }).props.style)).toMatchObject({
      backgroundColor: iosColors.groupedBackgroundSecondary,
      borderRadius: 26,
    });
  });

  it('small secondary is a tinted capsule', async () => {
    await render(<Button label="Recalibrate" variant="secondary" />);
    expect(flat(screen.getByRole('button').props.style)).toMatchObject({ backgroundColor: iosColors.fillTertiary, borderRadius: 1000 });
  });
});

describe('Field (iPhone row)', () => {
  it('edits text and labels the input', async () => {
    const onChangeText = jest.fn();
    await render(<Field label="Email" placeholder="you@example.com" onChangeText={onChangeText} hint="We never share it" />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
    expect(onChangeText).toHaveBeenCalledWith('a@b.c');
    expect(screen.getByText('We never share it')).toBeTruthy();
    expect(flat(screen.getByLabelText('Email').props.style).textAlign).toBe('right');
  });

  it('SelectField shows the placeholder when empty and is pressable', async () => {
    const onPress = jest.fn();
    await render(<SelectField label="Time zone" placeholder="Choose" onPress={onPress} />);
    expect(screen.getByText('Choose')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Time zone' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Notice', () => {
  it('renders info text without the alert role', async () => {
    await render(<Notice>Preset applied</Notice>);
    expect(screen.getByText('Preset applied')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('warn tone is an alert with an action', async () => {
    await render(<Notice tone="warn" action={<Button label="Fix" />}>Broken</Notice>);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fix' })).toBeTruthy();
  });
});

describe('Card (iPhone)', () => {
  it('renders title, subtitle, actions and content on the inset card surface', async () => {
    await render(
      <Card title="Devices" subtitle="Paired" actions={<Button label="Add" />} minHeight={232} testID="card">
        <Text>Body</Text>
      </Card>,
    );
    expect(screen.getByRole('header', { name: 'Devices' })).toBeTruthy();
    expect(screen.getByText('Paired')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
    expect(flat(screen.getByTestId('card').props.style)).toMatchObject({ minHeight: 232, borderRadius: 26 });
    expect(flat(screen.getByTestId('card').props.style).borderWidth).toBeUndefined();
  });
});

describe('ListRow (iPhone)', () => {
  it('becomes a grouped row with the status as its value', async () => {
    const onPress = jest.fn();
    await render(
      <ListRow divider title="olvar-node" subtitle="ESP32" status={{ label: 'Offline', live: false }} action={<Button label="Recalibrate" />} onPress={onPress} />,
    );
    expect(screen.getByText('olvar-node')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recalibrate' })).toBeTruthy();
    await fireEvent.press(screen.getByText('olvar-node'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('IosListRow and ListSection', () => {
  it('toggles and presses rows', async () => {
    const onToggle = jest.fn();
    const onPress = jest.fn();
    await render(
      <ListSection header="Care targets" footer="Help text">
        <IosListRow label="Use preset" accessory="toggle" on={false} onToggle={onToggle} />
        <IosListRow separator label="Soil" value="40–70 %" accessory="chevron" onPress={onPress} />
      </ListSection>,
    );
    expect(screen.getByRole('header', { name: 'Care targets' })).toBeTruthy();
    expect(screen.getByText('Help text')).toBeTruthy();
    await fireEvent(screen.getByRole('switch', { name: 'Use preset' }), 'valueChange', true);
    expect(onToggle).toHaveBeenCalledWith(true);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Modal (iPhone sheet)', () => {
  it('ModalCard wires cancel and confirm in the sheet bar', async () => {
    const cancel = jest.fn();
    const confirm = jest.fn();
    await render(
      <ModalCard title="Recalibrate" subtitle="Every minute" cancel={{ label: 'Cancel', onPress: cancel }} confirm={{ label: 'Save', onPress: confirm }} />,
    );
    expect(screen.getByRole('header', { name: 'Recalibrate' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(cancel).toHaveBeenCalled();
    expect(confirm).toHaveBeenCalled();
  });

  it('enables the swipe-down gesture and routes it to onDismiss', async () => {
    const onDismiss = jest.fn();
    await render(<Modal visible onDismiss={onDismiss} title="Dialog" />);
    const sheet = screen.toJSON() as unknown as { type: string; props: { onRequestClose: () => void } };
    expect(sheet.type).toBe('Modal');
    expect(sheet.props).toMatchObject({ presentationStyle: 'pageSheet', allowSwipeDismissal: true });
    sheet.props.onRequestClose();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('is a native page sheet that dismisses from its default Cancel', async () => {
    const onDismiss = jest.fn();
    const { rerender } = await render(<Modal visible={false} onDismiss={onDismiss} title="Dialog" />);
    expect(screen.queryByText('Dialog')).toBeNull();
    await rerender(<Modal visible onDismiss={onDismiss} title="Dialog" testID="m" />);
    expect(screen.getByText('Dialog')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('Segmented (iPhone)', () => {
  const options = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
  ] as const;

  it('marks the selected tab and reports changes', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={options} value="24h" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: '24H' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: '24H' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('tab', { name: '7D' }));
    expect(onChange).toHaveBeenCalledWith('7d');
  });
});

describe('StatusPill', () => {
  it('shows the server label verbatim and colours by key', async () => {
    await render(<StatusPill status="needs_attention" label="Soil is getting dry" testID="pill" />);
    expect(screen.getByText('Soil is getting dry')).toBeTruthy();
    expect(flat(screen.getByTestId('pill').props.style).backgroundColor).toBe(withAlpha(colors.status.warn, 0.12));
  });

  it('uses the metric table and falls back to muted for unknown keys', async () => {
    await render(
      <>
        <StatusPill kind="metric" status="ok" label="Just right" testID="ok" />
        <StatusPill status="bogus" label="?" testID="bogus" />
      </>,
    );
    expect(flat(screen.getByTestId('ok').props.style).backgroundColor).toBe(withAlpha(colors.status.good, 0.12));
    expect(flat(screen.getByTestId('bogus').props.style).backgroundColor).toBe(withAlpha(colors.text.tertiary, 0.12));
  });
});

describe('RangeCard', () => {
  it('places the ideal range and the now marker on the scale', async () => {
    await render(<RangeCard testID="rc" caption="Soil moisture" value="42" status="%" min={0} max={100} low={35} high={60} current={42} color="#0088ff" />);
    expect(screen.getByText('Soil moisture')).toBeTruthy();
    expect(flat(screen.getByTestId('rc-range').props.style)).toMatchObject({ left: '35%', width: '25%', backgroundColor: '#0088ff' });
    expect(flat(screen.getByTestId('rc-now').props.style).left).toBe('42%');
  });

  it('announces the ideal thresholds and the reading, not the axis ends', async () => {
    await render(
      <RangeCard testID="rc" caption="Soil moisture" value="42" unit="%" min={0} max={100} minLabel="0%" maxLabel="100%" low={35} high={60} current={42} color="#0088ff" />,
    );
    expect(screen.getByTestId('rc-slider').props.accessibilityLabel).toBe('Ideal range 35% to 60%, now 42%');
    expect(rangeLabel({ low: 500, high: 1500, current: null, unit: ' lux' })).toBe('Ideal range 500 lux to 1,500 lux, no current reading');
    expect(rangeLabel({ low: 18, high: 27.25, current: 23.44, unit: ' °C' })).toBe('Ideal range 18 °C to 27.3 °C, now 23.4 °C');
  });

  it('clamps out-of-scale values and hides the marker for a failed read', async () => {
    await render(<RangeCard testID="rc" caption="Light" value="-" min={0} max={100} low={-10} high={150} current={null} color="#ffcc00" />);
    expect(flat(screen.getByTestId('rc-range').props.style)).toMatchObject({ left: '0%', width: '100%' });
    expect(screen.queryByTestId('rc-now')).toBeNull();
  });
});

describe('SearchField and BrandHeader', () => {
  it('search field is a labelled search input', async () => {
    const onChangeText = jest.fn();
    await render(<SearchField placeholder="Search plants" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByRole('search', { name: 'Search plants' }), 'fern');
    expect(onChangeText).toHaveBeenCalledWith('fern');
  });

  it('brand header shows the title and tagline', async () => {
    await render(<BrandHeader />);
    expect(screen.getByRole('header', { name: 'Olvar' })).toBeTruthy();
    expect(screen.getByText('Your plants, in their own words.')).toBeTruthy();
  });
});

describe('native alert and action sheet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('confirmAlert uses Alert.alert with a destructive action', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    await expect(confirmAlert({ title: 'Remove?', confirmLabel: 'Remove', destructive: true })).resolves.toBe(true);
    expect(spy.mock.calls[0][2]).toEqual([
      expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      expect.objectContaining({ text: 'Remove', style: 'destructive' }),
    ]);
  });

  it('showActionSheet uses ActionSheetIOS and maps Cancel to null', async () => {
    const spy = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions');
    spy.mockImplementationOnce((_o, cb) => cb(1));
    await expect(showActionSheet({ options: ['A', 'B'], destructiveIndex: 1 })).resolves.toBe(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ options: ['A', 'B', 'Cancel'], cancelButtonIndex: 2, destructiveButtonIndex: 1 });
    spy.mockImplementationOnce((_o, cb) => cb(2));
    await expect(showActionSheet({ options: ['A', 'B'] })).resolves.toBeNull();
  });
});

describe('tab bar items', () => {
  it('matches the Figma iPhone/Tab bar order with SF Symbols', () => {
    expect(appTabs.map((t) => t.label)).toEqual(['Home', 'Sensors', 'Timeline', 'Chat']);
    expect(appTabs.every((t) => t.sf.length > 0)).toBe(true);
  });
});

describe('SkeletonCard', () => {
  it('is a busy progressbar with the requested lines', async () => {
    await render(<SkeletonCard minHeight={232} testID="sk" />);
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeTruthy();
    expect(flat(screen.getByTestId('sk').props.style)).toMatchObject({ minHeight: 232, borderRadius: 26 });
  });
});

describe('EmptyState', () => {
  it('coming-soon variant shows the tag', async () => {
    await render(<EmptyState comingSoon title="Insights are coming soon" body="Sparks will point out trends here." />);
    expect(screen.getByText('Coming soon')).toBeTruthy();
    expect(screen.getByText('Sparks will point out trends here.')).toBeTruthy();
  });

  it('runs its action', async () => {
    const onPress = jest.fn();
    await render(<EmptyState title="No messages" action={{ label: 'Open chat', onPress }} />);
    expect(screen.queryByText('Coming soon')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Open chat' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ErrorState', () => {
  it('is a card with a warn notice and Retry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState title="Soil moisture" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('OfflineBanner', () => {
  it('formats the offline line', async () => {
    expect(offlineText('olvar-node', null)).toBe('olvar-node offline');
    await render(<OfflineBanner since="14:02" />);
    expect(screen.getByText('olvar-node offline since 14:02')).toBeTruthy();
  });
});
