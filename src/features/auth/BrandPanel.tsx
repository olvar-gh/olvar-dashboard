import { StyleSheet, Text, View } from 'react-native';

import AvatarCircle from '@/components/shell/assets/AvatarCircle';
import { colors, typography } from '@/theme';

/** Figma Desktop/Auth brand panel: avatar circle, headline and tagline on the sidebar tone. */
export function BrandPanel({ width }: { width: number }) {
  return (
    <View testID="brand-panel" style={[styles.root, { width }]}>
      <View aria-hidden style={styles.avatar}>
        <AvatarCircle width={196} height={196} style={styles.avatarArt} />
      </View>
      <View style={styles.spacer} />
      <Text style={styles.headline}>Your plants, in their own words.</Text>
      <Text style={styles.body}>Live soil, light, temperature and humidity, and a plant that tells you how it feels.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: colors.bg.sidebar,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
  },
  // The exported circle carries its drop shadow in a 196 px canvas around the 176 px circle.
  avatar: { width: 176, height: 176 },
  avatarArt: { position: 'absolute', top: -8, left: -10 },
  spacer: { height: 12 },
  headline: { ...typography.pageTitle, color: colors.text.primary, textAlign: 'center' },
  body: { ...typography.pageSubtitle, color: colors.text.secondary, textAlign: 'center', width: 380, maxWidth: '100%' },
});
