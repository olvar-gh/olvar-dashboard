import { DefaultTheme, ThemeProvider } from 'expo-router';
import { useContext, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { iosGroupedBackground } from '@/components/ui/color';
import { DataProvider } from '@/data';
import { DataSourceContext } from '@/data/context';
import { colors } from '@/theme';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand.olive,
    background: Platform.OS === 'web' ? colors.bg.canvas : iosGroupedBackground,
    card: Platform.OS === 'web' ? colors.surface.card : iosGroupedBackground,
    text: colors.text.primary,
    border: colors.border.subtle,
  },
};

/**
 * Data layer and navigation theme for the root layout. A test that wraps the router in its own
 * <DataProvider> (see renderApp) keeps its fixture source instead of the env one.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const outer = useContext(DataSourceContext);
  const themed = <ThemeProvider value={theme}>{children}</ThemeProvider>;
  return outer ? themed : <DataProvider>{themed}</DataProvider>;
}
