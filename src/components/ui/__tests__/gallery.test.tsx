import { fireEvent, render, screen } from '@testing-library/react-native';

import GalleryScreen from '@/app/(dev)/gallery';

describe('gallery', () => {
  it('renders every primitive', async () => {
    await render(<GalleryScreen />);
    expect(screen.getByRole('header', { name: 'Gallery' })).toBeTruthy();
    for (const text of ['Insights are coming soon', 'olvar-node offline since 14:02', 'Needs attention', 'Use preset']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeTruthy();
  });

  it('opens the modal', async () => {
    await render(<GalleryScreen />);
    expect(screen.queryByTestId('modal')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Open modal' }));
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('matches the snapshot', async () => {
    await render(<GalleryScreen />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
