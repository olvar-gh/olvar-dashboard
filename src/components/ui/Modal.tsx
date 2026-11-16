import { ActivityIndicator, Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, iosColors, typography } from '@/theme';

import { IOS_GROUP_RADIUS, iosGroupedBackground } from './color';
import type { ModalAction, ModalCardProps, ModalProps } from './Modal.types';

export { MODAL_WIDTH } from './Modal.types';
export type { ModalAction, ModalCardProps, ModalProps } from './Modal.types';

/** Sheet header and body, shown inline (gallery) or inside the native page sheet. */
export function ModalCard({ title, subtitle, children, cancel, confirm, style, testID }: ModalCardProps) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      <SheetBar title={title} cancel={cancel} confirm={confirm} />
      <View style={styles.body}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** Native iOS page sheet (swipe down to dismiss) with Cancel · title · Confirm. */
export function Modal({ visible, onDismiss, title, subtitle, children, cancel, confirm, style, testID }: ModalProps) {
  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View testID={testID} style={[styles.sheet, style]}>
        <SheetBar title={title} cancel={cancel ?? { label: 'Cancel', onPress: onDismiss }} confirm={confirm} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
      </View>
    </RNModal>
  );
}

function SheetBar({ title, cancel, confirm }: Pick<ModalCardProps, 'title' | 'cancel' | 'confirm'>) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>{cancel ? <BarButton action={cancel} /> : null}</View>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideRight]}>
        {confirm ? <BarButton action={confirm} emphasized destructive={confirm.destructive} /> : null}
      </View>
    </View>
  );
}

function BarButton({ action, emphasized, destructive }: { action: ModalAction; emphasized?: boolean; destructive?: boolean }) {
  const inactive = action.disabled || action.loading;
  const color = destructive ? colors.status.alert : colors.brand.olive;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(action.loading) }}
      disabled={inactive}
      onPress={action.onPress}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed, inactive && styles.disabled]}
    >
      {action.loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[emphasized ? styles.barEmphasized : styles.barLabel, { color }]}>{action.label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: iosGroupedBackground, borderRadius: IOS_GROUP_RADIUS, borderCurve: 'continuous', overflow: 'hidden' },
  sheet: { flex: 1, backgroundColor: iosGroupedBackground },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16 },
  side: { flex: 1, flexDirection: 'row' },
  sideRight: { justifyContent: 'flex-end' },
  title: { ...typography.iosBody, fontFamily: typography.iosSubheadlineEmphasized.fontFamily, color: iosColors.labelPrimary, flexShrink: 1 },
  barLabel: typography.iosBody,
  barEmphasized: { ...typography.iosBody, fontFamily: typography.iosSubheadlineEmphasized.fontFamily },
  body: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  subtitle: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.4 },
});
