import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, iosColors, typography } from '@/theme';

import type { FieldProps, SelectFieldProps } from './Field.types';

export type { FieldProps, SelectFieldProps } from './Field.types';

/** Grouped-list form row: label left, value typed on the right (Figma iPhone sign-in and settings rows). Put it in a ListSection. */
export function Field({ label, hint, error = false, separator = false, style, testID, editable = true, ...input }: FieldProps) {
  return (
    <View style={style}>
      <View style={styles.row}>
        <View style={[styles.content, separator && styles.separator]}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            editable={editable}
            clearButtonMode={editable ? 'while-editing' : 'never'}
            placeholderTextColor={iosColors.labelTertiary}
            testID={testID}
            style={[styles.input, !editable && styles.readOnly, error && styles.error]}
            {...input}
          />
        </View>
      </View>
      {hint ? <Text style={[styles.hint, error && styles.error]}>{hint}</Text> : null}
    </View>
  );
}

/** Grouped-list row that opens a picker: label, current value, chevron. */
export function SelectField({ label, value, placeholder, hint, error = false, separator = false, onPress, style, testID }: SelectFieldProps) {
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? '' }}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={[styles.content, separator && styles.separator]}>
          <Text style={styles.label}>{label}</Text>
          <Text numberOfLines={1} style={[styles.value, error && styles.error]}>
            {value || placeholder}
          </Text>
          <Icon name="chevRight" size={14} color={iosColors.labelTertiary} />
        </View>
      </Pressable>
      {hint ? <Text style={[styles.hint, error && styles.error]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16 },
  pressed: { backgroundColor: iosColors.fillTertiary },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: iosColors.separatorNonOpaque },
  label: { ...typography.iosBody, color: iosColors.labelPrimary },
  input: { ...typography.iosBody, flex: 1, minWidth: 0, textAlign: 'right', color: iosColors.labelPrimary, paddingVertical: 12 },
  readOnly: { color: iosColors.labelTertiary },
  value: { ...typography.iosBody, flex: 1, minWidth: 0, textAlign: 'right', color: iosColors.labelTertiary },
  hint: { ...typography.iosFootnote, color: iosColors.labelSecondary, paddingHorizontal: 16, paddingBottom: 8 },
  error: { color: colors.status.alert },
});
