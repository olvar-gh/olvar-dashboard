import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icons';
import { iosColors, typography } from '@/theme';

import { GlassSurface } from './GlassSurface';

export type SearchFieldProps = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Liquid Glass search capsule, 50 px high (Figma iPhone/Search field). */
export function SearchField({ placeholder = 'Search', style, testID, ...input }: SearchFieldProps) {
  return (
    <GlassSurface interactive style={[styles.root, style]}>
      <Icon name="search" size={18} color={iosColors.labelSecondary} />
      <TextInput
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={iosColors.labelTertiary}
        clearButtonMode="while-editing"
        returnKeyType="search"
        testID={testID}
        style={styles.input}
        {...input}
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 18, borderRadius: 1000 },
  input: { ...typography.iosBody, flex: 1, minWidth: 0, color: iosColors.labelPrimary, paddingVertical: 0 },
});
