import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/theme';

import { Button } from '../Button.web';
import { Card } from '../Card.web';
import { Field, SelectField } from '../Field.web';
import { ListRow } from '../ListRow.web';
import { Modal } from '../Modal.web';
import { NavBar } from '../NavBar.web';
import { PageHeader } from '../PageHeader.web';
import { Segmented } from '../Segmented.web';

// jest-expo resolves the iOS files, so the desktop (web) variants are imported directly.
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('desktop Button', () => {
  it.each([
    ['primary', colors.brand.olive],
    ['destructive', colors.status.alert],
    ['secondary', colors.surface.card],
  ] as const)('%s uses the Figma fill', async (variant, fill) => {
    await render(<Button label="X" variant={variant} />);
    expect(flat(screen.getByRole('button').props.style).backgroundColor).toBe(fill);
  });
});

describe('desktop Card, Field and ListRow', () => {
  it('card has the 20 px radius and subtle border', async () => {
    await render(<Card title="Devices" testID="card" />);
    expect(flat(screen.getByTestId('card').props.style)).toMatchObject({ borderRadius: 20, borderWidth: 1 });
  });

  it('field is a labelled boxed input; select shows its value', async () => {
    const onChangeText = jest.fn();
    await render(
      <>
        <Field label="Nickname" value="Sparks" onChangeText={onChangeText} />
        <SelectField label="Time zone" value="Asia/Seoul" />
      </>,
    );
    await fireEvent.changeText(screen.getByLabelText('Nickname'), 'Fern');
    expect(onChangeText).toHaveBeenCalledWith('Fern');
    expect(screen.getByText('Asia/Seoul')).toBeTruthy();
  });

  it('list row draws the top divider only when asked', async () => {
    await render(<ListRow title="a" divider testID="row" status={{ label: 'Live', live: true }} />);
    expect(flat(screen.getByTestId('row').props.style).borderTopWidth).toBe(1);
    expect(screen.getByText('Live')).toBeTruthy();
  });
});

describe('desktop Modal', () => {
  it('dismisses on a backdrop press only and keeps the caller style', async () => {
    const onDismiss = jest.fn();
    await render(<Modal visible onDismiss={onDismiss} title="Dialog" testID="m" style={{ padding: 40 }} />);
    expect(flat(screen.getByTestId('m').props.style)).toMatchObject({ padding: 40, boxShadow: expect.any(String) });
    const backdrop = screen.getByTestId('m-backdrop');
    await fireEvent.press(backdrop, { target: 'card', currentTarget: 'backdrop' });
    expect(onDismiss).not.toHaveBeenCalled();
    await fireEvent.press(backdrop, { target: 'backdrop', currentTarget: 'backdrop' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('desktop PageHeader', () => {
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

describe('web NavBar', () => {
  it('draws glass back and action buttons above the large title', async () => {
    const onBack = jest.fn();
    const onBell = jest.fn();
    await render(<NavBar title="Settings" onBack={onBack} actions={[{ label: 'Alerts', sf: 'bell', icon: 'bell', onPress: onBell }]} />);
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Alerts' }));
    expect(onBack).toHaveBeenCalled();
    expect(onBell).toHaveBeenCalled();
  });
});

describe('desktop Segmented', () => {
  const options = [
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
  ] as const;

  it('moves selection with arrow keys and exposes the selected tab', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={options} value="24h" onChange={onChange} testID="range" />);
    const tablist = screen.getByTestId('range');
    await fireEvent(tablist, 'keyDown', { nativeEvent: { key: 'ArrowRight' } });
    expect(onChange).toHaveBeenLastCalledWith('7d');
    await fireEvent(tablist, 'keyDown', { nativeEvent: { key: 'ArrowLeft' } });
    expect(onChange).toHaveBeenLastCalledWith('7d');
    expect(screen.getByRole('tab', { name: '24 hours' })).toBeSelected();
  });
});
