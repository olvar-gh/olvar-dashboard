import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors, space, typography } from '@/theme';

export type PageHeaderDateNav = {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel?: string;
  nextLabel?: string;
};

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Page actions slot. */
  actions?: ReactNode;
  dateNav?: PageHeaderDateNav;
  /** Initial shown in the olive avatar circle. */
  avatar?: string;
  onAvatarPress?: () => void;
};

/** Desktop page header: Fraunces title, subtitle, controls (Figma Desktop/Page header). */
export function PageHeader({ title, subtitle, actions, dateNav, avatar, onAvatarPress }: PageHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.greeting}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.controls}>
        {actions}
        {dateNav ? (
          <>
            <Text style={styles.date}>{dateNav.label}</Text>
            <RoundButton icon="chevLeft" label={dateNav.prevLabel ?? 'Previous'} onPress={dateNav.onPrev} disabled={dateNav.prevDisabled} />
            <RoundButton icon="chevRight" label={dateNav.nextLabel ?? 'Next'} onPress={dateNav.onNext} disabled={dateNav.nextDisabled} />
          </>
        ) : null}
        {avatar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            disabled={!onAvatarPress}
            onPress={onAvatarPress}
            style={[styles.avatar, dateNav && styles.avatarAfterDate]}
          >
            <Text style={styles.avatarText}>{avatar.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.round, disabled && styles.disabled]}
    >
      <Icon name={icon} size={16} color={colors.text.secondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', minHeight: 60, gap: 16 },
  greeting: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, gap: space.pageHeaderTitleGap },
  title: { ...typography.pageTitle, color: colors.text.primary },
  subtitle: { ...typography.pageSubtitle, color: colors.text.secondary },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.pageHeaderControlsGap },
  date: { ...typography.label, color: colors.text.secondary },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAfterDate: { marginLeft: 8 },
  avatarText: { ...typography.buttonLarge, fontSize: 15, color: colors.surface.card },
});
