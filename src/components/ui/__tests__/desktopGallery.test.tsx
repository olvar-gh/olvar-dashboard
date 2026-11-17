import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { breakpointFor, useBreakpoint } from '@/theme';

import { DesktopGallery } from '../gallery/DesktopGallery';

jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme'), useBreakpoint: jest.fn() }));

const sized = (width: number) => jest.mocked(useBreakpoint).mockReturnValue(breakpointFor(width));

describe('desktop gallery profile and devices cards', () => {
  it('keeps each card at its content height when the columns stack at 390 px', async () => {
    sized(390);
    await render(<DesktopGallery onOpenModal={() => {}} />);
    for (const id of ['plant-profile', 'devices']) {
      const style = StyleSheet.flatten(screen.getByTestId(id).props.style);
      expect(style.flex).toBeUndefined();
      expect(style.flexBasis).toBeUndefined();
    }
    expect(screen.getByText('Species')).toBeTruthy();
  });

  it('shares the row equally between the two cards on desktop', async () => {
    sized(1512);
    await render(<DesktopGallery onOpenModal={() => {}} />);
    for (const id of ['plant-profile', 'devices']) {
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style)).toMatchObject({ flex: 1, minWidth: 0 });
    }
  });
});
