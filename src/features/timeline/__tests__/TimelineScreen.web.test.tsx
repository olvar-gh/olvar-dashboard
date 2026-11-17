import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';

import { TimelineScreen as DesktopTimeline } from '../TimelineScreen.web';

// Jest resolves the iOS files, so the desktop primitives are swapped in by hand and the screen
// renders outside the router with the account button's navigation stubbed.
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  Button: jest.requireActual('@/components/ui/Button.web').Button,
  Card: jest.requireActual('@/components/ui/Card.web').Card,
  Modal: jest.requireActual('@/components/ui/Modal.web').Modal,
  PageHeader: jest.requireActual('@/components/ui/PageHeader.web').PageHeader,
}));
jest.mock('@/components/shell', () => ({
  ...jest.requireActual('@/components/shell'),
  useAccountButton: () => ({ avatar: 'D', onAvatarPress: () => {} }),
}));

const NOW = new Date('2026-11-17T05:30:00Z');

jest.setTimeout(30_000);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('Timeline (desktop)', () => {
  it('renders the week cards, activity groups and the coming-soon care card', async () => {
    await renderWithFixtures(<DesktopTimeline />, { now: NOW });
    expect(await screen.findByText('Nov 15 – Nov 21, 2026')).toBeTruthy();
    expect(await screen.findByText('TODAY · TUE, NOV 17')).toBeTruthy();
    expect(screen.getByText('YESTERDAY · MON, NOV 16')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/^\d+ events this week$/)).toBeTruthy());
    expect(screen.getByText('Coming soon')).toBeTruthy();
    expect(screen.getByTestId('this-week').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('pages back a week and disables weeks past the 90-day history', async () => {
    await renderWithFixtures(<DesktopTimeline />, { now: NOW });
    await screen.findByText('Nov 15 – Nov 21, 2026');
    await fireEvent.press(screen.getByLabelText('Previous week'));
    expect(await screen.findByText('Nov 8 – Nov 14, 2026')).toBeTruthy();
    expect(await screen.findByText('SAT, NOV 14')).toBeTruthy();
    expect(screen.getByTestId('this-week').props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(screen.getByTestId('this-week'));
    expect(await screen.findByText('Nov 15 – Nov 21, 2026')).toBeTruthy();
  });

  it('jumps to a date and refuses dates older than 90 days', async () => {
    await renderWithFixtures(<DesktopTimeline />, { now: NOW });
    await screen.findByText('Nov 15 – Nov 21, 2026');
    await fireEvent.press(screen.getByTestId('jump-to-date-button'));
    expect(screen.getByTestId('jump-2026-11-18').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('jump-2026-11-03'));
    expect(await screen.findByText('Nov 1 – Nov 7, 2026')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('jump-to-date-button'));
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByTestId('jump-2026-08-18').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('jump-2026-08-19').props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.getByLabelText('Previous month').props.accessibilityState).toMatchObject({ disabled: true });
  });
});
