import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import Gallery from '@/app/(dev)/gallery';

const renderGallery = () => renderRouter({ _layout: () => <Stack />, gallery: Gallery }, { initialUrl: '/gallery' });

describe('gallery (iOS)', () => {
  it('shows the iPhone components first, then the states', async () => {
    await renderGallery();
    const sections = screen.getAllByRole('header').map((h) => h.props.children);
    const at = (name: string) => sections.indexOf(name);
    for (const name of ['Brand header', 'Search field', 'Form rows and buttons', 'List section and rows', 'Range card', 'Glass buttons', 'Tab bar']) {
      expect(at(name)).toBeGreaterThanOrEqual(0);
      expect(at(name)).toBeLessThan(at('Status and banners'));
    }
    for (const text of ['Insights are coming soon', 'olvar-node offline since 14:02', 'Needs attention', 'Use preset']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeTruthy();
  });

  it('opens the native sheet', async () => {
    await renderGallery();
    expect(screen.queryByTestId('modal')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Sheet' }));
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('matches the snapshot', async () => {
    await renderGallery();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
