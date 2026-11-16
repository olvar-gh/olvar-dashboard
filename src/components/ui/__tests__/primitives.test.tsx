import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { colors } from '@/theme';

import {
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
  NavBar,
  Notice,
  OfflineBanner,
  PageHeader,
  Segmented,
  SelectField,
  SkeletonCard,
  StatusPill,
  offlineText,
} from '..';
import { withAlpha } from '../color';

const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('Button', () => {
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

  it.each([
    ['primary', colors.brand.olive],
    ['destructive', colors.status.alert],
    ['secondary', colors.surface.card],
  ] as const)('%s uses the Figma fill', async (variant, fill) => {
    await render(<Button label="X" variant={variant} />);
    expect(flat(screen.getByRole('button').props.style).backgroundColor).toBe(fill);
  });
});

describe('Field', () => {
  it('edits text and labels the input', async () => {
    const onChangeText = jest.fn();
    await render(<Field label="Nickname" value="Sparks" onChangeText={onChangeText} hint="Up to 60 characters" />);
    await fireEvent.changeText(screen.getByLabelText('Nickname'), 'Fern');
    expect(onChangeText).toHaveBeenCalledWith('Fern');
    expect(screen.getByText('Up to 60 characters')).toBeTruthy();
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

describe('Card', () => {
  it('renders title, subtitle, actions and content', async () => {
    await render(
      <Card title="Devices" subtitle="Paired" actions={<Button label="Add" />} minHeight={232} testID="card">
        <Text>Body</Text>
      </Card>,
    );
    expect(screen.getByRole('header', { name: 'Devices' })).toBeTruthy();
    expect(screen.getByText('Paired')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
    expect(flat(screen.getByTestId('card').props.style)).toMatchObject({ minHeight: 232, borderRadius: 20 });
  });
});

describe('ListRow', () => {
  it('shows title, subtitle, status and action', async () => {
    await render(
      <ListRow title="olvar-node" subtitle="ESP32" status={{ label: 'Offline', live: false }} action={<Button label="Recalibrate" />} />,
    );
    expect(screen.getByText('olvar-node')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recalibrate' })).toBeTruthy();
  });

  it('draws the top divider only when asked', async () => {
    await render(<ListRow title="a" divider testID="row" />);
    expect(flat(screen.getByTestId('row').props.style).borderTopWidth).toBe(1);
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

describe('Modal', () => {
  it('ModalCard wires cancel and confirm', async () => {
    const cancel = jest.fn();
    const confirm = jest.fn();
    await render(
      <ModalCard title="Recalibrate" subtitle="Every minute" cancel={{ label: 'Cancel', onPress: cancel }} confirm={{ label: 'Save', onPress: confirm }} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(cancel).toHaveBeenCalled();
    expect(confirm).toHaveBeenCalled();
  });

  it('Modal renders only when visible and dismisses on scrim press', async () => {
    const onDismiss = jest.fn();
    const { rerender } = await render(<Modal visible={false} onDismiss={onDismiss} title="Dialog" />);
    expect(screen.queryByText('Dialog')).toBeNull();
    await rerender(<Modal visible onDismiss={onDismiss} title="Dialog" />);
    expect(screen.getByText('Dialog')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('PageHeader', () => {
  it('renders title and date navigation with disabled state', async () => {
    const onPrev = jest.fn();
    await render(<PageHeader title="Timeline" subtitle="Week" avatar="dongmin" dateNav={{ label: 'Nov 6', onPrev, nextDisabled: true }} />);
    expect(screen.getByRole('header', { name: 'Timeline' })).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous' }));
    expect(onPrev).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('NavBar', () => {
  it('shows the large title and a glass back button', async () => {
    const onBack = jest.fn();
    await render(<NavBar title="Settings" onBack={onBack} />);
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('omits the toolbar without back or trailing', async () => {
    await render(<NavBar title="Home" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Segmented', () => {
  const options = [
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
  ] as const;

  it('marks the selected tab and reports changes', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={options} value="24h" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: '24 hours' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: '24 hours' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('tab', { name: '7 days' }));
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

describe('SkeletonCard', () => {
  it('is a busy progressbar with the requested lines', async () => {
    await render(<SkeletonCard minHeight={232} testID="sk" />);
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeTruthy();
    expect(flat(screen.getByTestId('sk').props.style).minHeight).toBe(232);
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
