import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { iosColors, typography } from '@/theme';

import { GlassButton } from './GlassButton';

export type NavBarProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  /** Trailing glass buttons. */
  trailing?: ReactNode;
};

/** iPhone toolbar with a glass back button, then the large title (Figma iPhone/Nav bar). */
export function NavBar({ title, onBack, backLabel = 'Back', trailing }: NavBarProps) {
  const toolbar = onBack || trailing;
  return (
    <View style={styles.root}>
      {toolbar ? (
        <View style={styles.toolbar}>
          {onBack ? <GlassButton icon="chevLeft" accessibilityLabel={backLabel} onPress={onBack} /> : <View />}
          <View style={styles.trailing}>{trailing}</View>
        </View>
      ) : null}
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8, alignSelf: 'stretch' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.iosLargeTitle, color: iosColors.labelPrimary, paddingBottom: 8 },
});
