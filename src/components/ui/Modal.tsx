import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, typography } from '@/theme';

import { Button } from './Button';
import { scrim } from './color';

export const MODAL_WIDTH = 560;

export type ModalAction = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };

export type ModalCardProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  cancel?: ModalAction;
  confirm?: ModalAction & { destructive?: boolean };
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Dialog surface (Figma Desktop/Modal) without the overlay. */
export function ModalCard({ title, subtitle, children, cancel, confirm, style, testID }: ModalCardProps) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
      {cancel || confirm ? (
        <View style={styles.footer}>
          {cancel ? <Button variant="secondary" {...cancel} /> : null}
          {confirm ? <Button variant={confirm.destructive ? 'destructive' : 'primary'} {...confirm} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export type ModalProps = ModalCardProps & {
  visible: boolean;
  /** Back button, Escape and scrim tap. */
  onDismiss: () => void;
};

/** Centred dialog over a 40 % text/primary scrim. */
export function Modal({ visible, onDismiss, ...card }: ModalProps) {
  return (
    <RNModal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <ScrollView contentContainerStyle={styles.scroll} style={styles.scrollView}>
          <ModalCard {...card} style={styles.floating} />
        </ScrollView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: MODAL_WIDTH,
    alignSelf: 'center',
    gap: 20,
    padding: 24,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.card,
  },
  floating: { boxShadow: '0px 24px 60px 0px rgba(30, 34, 25, 0.18)' },
  titles: { gap: 2 },
  title: { ...typography.cardTitle, color: colors.text.primary },
  subtitle: { ...typography.cardSubtitle, color: colors.text.tertiary },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  overlay: { flex: 1, backgroundColor: scrim },
  scrollView: { flexGrow: 0, maxHeight: '100%', marginVertical: 'auto' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
});
