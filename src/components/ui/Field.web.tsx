import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, typography } from '@/theme';

import type { FieldProps, SelectFieldProps } from './Field.types';

export type { FieldProps, SelectFieldProps } from './Field.types';

/** Labelled free-text input (Figma Desktop/Field with Show chevron off). */
export function Field({ label, hint, error = false, separator: _separator, style, testID, editable = true, ...input }: FieldProps) {
  return (
    <View style={[styles.root, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, error && styles.boxError, !editable && styles.readOnly]}>
        <TextInput
          accessibilityLabel={label}
          editable={editable}
          placeholderTextColor={colors.text.tertiary}
          testID={testID}
          style={styles.input}
          {...input}
        />
      </View>
      {hint ? <Text style={[styles.hint, error && styles.hintError]}>{hint}</Text> : null}
    </View>
  );
}

/** Labelled picker trigger with the chevron (Figma Desktop/Field default). */
export function SelectField({ label, value, placeholder, hint, error = false, onPress, style, testID }: SelectFieldProps) {
  const empty = !value;
  return (
    <View style={[styles.root, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? '' }}
        onPress={onPress}
        testID={testID}
        style={[styles.box, error && styles.boxError]}
      >
        <Text numberOfLines={1} style={[styles.input, empty && styles.placeholder]}>
          {empty ? placeholder : value}
        </Text>
        <Icon name="chevDown" size={15} color={colors.text.tertiary} />
      </Pressable>
      {hint ? <Text style={[styles.hint, error && styles.hintError]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, alignSelf: 'stretch' },
  label: { ...typography.status, color: colors.text.tertiary },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg.canvas,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 10,
    minHeight: 39,
  },
  boxError: { borderColor: colors.status.alert },
  readOnly: { backgroundColor: colors.bg.sidebar },
  input: {
    ...typography.pageSubtitle,
    flex: 1,
    minWidth: 0,
    color: colors.text.primary,
    paddingVertical: 10,
  },
  placeholder: { color: colors.text.tertiary },
  hint: { ...typography.meta, color: colors.text.tertiary },
  hintError: { color: colors.status.alert },
});
