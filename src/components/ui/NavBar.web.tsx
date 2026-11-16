import { StyleSheet, Text, View } from 'react-native';

import { iosColors, typography } from '@/theme';

import { GlassButton } from './GlassButton';
import type { NavBarProps } from './NavBar.types';

export type { NavBarAction, NavBarProps } from './NavBar.types';

/** Narrow-web version of the iPhone nav bar: glass back button, trailing glass buttons, large title. */
export function NavBar({ title, onBack, backLabel = 'Back', actions }: NavBarProps) {
  return (
    <View style={styles.root}>
      {onBack || actions?.length ? (
        <View style={styles.toolbar}>
          {onBack ? <GlassButton icon="chevLeft" accessibilityLabel={backLabel} onPress={onBack} /> : <View />}
          <View style={styles.trailing}>
            {actions?.map((a) => (
              <GlassButton key={a.label} icon={a.icon} accessibilityLabel={a.label} onPress={a.onPress} disabled={a.disabled} />
            ))}
          </View>
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
