import { useFonts } from 'expo-font';

import type { FontWeight } from './tokens';

// Inter ships as one static file per weight, registered under its own family
// name so every platform picks the exact face without weight matching.
export const interFamily: Record<FontWeight, string> = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

// Fraunces is the variable TTF (opsz, wght, SOFT, WONK axes); the face is
// chosen with fontVariationSettings (RN 0.88+, and CSS on web).
export const frauncesFamily = 'Fraunces';

export const fontFiles = {
  [interFamily[400]]: require('../../assets/fonts/Inter-Regular.ttf'),
  [interFamily[500]]: require('../../assets/fonts/Inter-Medium.ttf'),
  [interFamily[600]]: require('../../assets/fonts/Inter-SemiBold.ttf'),
  [interFamily[700]]: require('../../assets/fonts/Inter-Bold.ttf'),
  [frauncesFamily]: require('../../assets/fonts/Fraunces-Variable.ttf'),
};

/** Loads Inter and Fraunces; call once in the root layout before rendering text. */
export function useAppFonts() {
  return useFonts(fontFiles);
}
