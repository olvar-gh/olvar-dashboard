import { StyleSheet, Text, View } from 'react-native';

import { iosColors, typography } from '@/theme';

import { NavBar, type NavBarAction } from './NavBar';
import type { PageHeaderProps } from './PageHeader.types';

export type { PageHeaderDateNav, PageHeaderProps } from './PageHeader.types';

/**
 * On iOS the page header is the native large-title header (see NavBar): date navigation and the
 * account button become toolbar buttons; the subtitle, date and page actions sit under the title.
 */
export function PageHeader({ title, subtitle, actions, dateNav, avatar, onAvatarPress }: PageHeaderProps) {
  const toolbar: NavBarAction[] = [];
  if (dateNav) {
    toolbar.push(
      { label: dateNav.prevLabel ?? 'Previous', sf: 'chevron.left', icon: 'chevLeft', onPress: dateNav.onPrev, disabled: dateNav.prevDisabled },
      { label: dateNav.nextLabel ?? 'Next', sf: 'chevron.right', icon: 'chevRight', onPress: dateNav.onNext, disabled: dateNav.nextDisabled },
    );
  }
  if (avatar) toolbar.push({ label: 'Account', sf: 'person.crop.circle', icon: 'user', onPress: onAvatarPress });

  const meta = [subtitle, dateNav?.label].filter(Boolean).join(' · ');
  return (
    <>
      <NavBar title={title} actions={toolbar} />
      {meta || actions ? (
        <View style={styles.under}>
          {meta ? <Text style={styles.subtitle}>{meta}</Text> : null}
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  under: { gap: 10 },
  subtitle: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
