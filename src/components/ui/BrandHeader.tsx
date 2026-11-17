import { StyleSheet, Text, View } from 'react-native';

import { iosColors, typography } from '@/theme';

import OlvarAvatar from './assets/OlvarAvatar';

export type BrandHeaderProps = { title?: string; subtitle?: string };

/** Olvar mark, title and tagline for the sign-in screen (Figma iPhone/Brand header). */
export function BrandHeader({ title = 'Olvar', subtitle = 'Your plants, in their own words.' }: BrandHeaderProps) {
  return (
    <View style={styles.root}>
      <View aria-hidden>
        <OlvarAvatar width={96} height={96} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 6 },
  title: { ...typography.iosLargeTitle, color: iosColors.labelPrimary, marginTop: 16 },
  subtitle: { ...typography.iosSubheadline, color: iosColors.labelSecondary, textAlign: 'center' },
});
