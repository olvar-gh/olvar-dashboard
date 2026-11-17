import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { BrandHeader, Button, Field, ListSection } from '@/components/ui';
import { iosGroupedBackground } from '@/components/ui/color';
import { colors, typography } from '@/theme';

import { useSignInForm } from './useSignInForm';

/**
 * iPhone sign in (Figma 134:3297): brand header, grouped Email / Password rows, olive capsule.
 * Create Account and Forgot Password are deferred (signups are disabled on the server).
 */
export function SignInScreen() {
  const form = useSignInForm();
  const passwordRef = useRef<TextInputInstance>(null);
  const message = form.errors.form ?? form.errors.email ?? form.errors.password;
  return (
    <ScrollView
      testID="sign-in"
      style={styles.page}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <BrandHeader />
      <View style={styles.form}>
        <ListSection>
          <Field
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={form.setEmail}
            error={!!form.errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="sign-in-email"
          />
          <Field
            ref={passwordRef}
            separator
            label="Password"
            placeholder="Required"
            value={form.password}
            onChangeText={form.setPassword}
            error={!!form.errors.password}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={form.submit}
            testID="sign-in-password"
          />
        </ListSection>
        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}
        <Button label="Sign In" size="large" onPress={form.submit} loading={form.pending} testID="sign-in-submit" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: iosGroupedBackground },
  content: { paddingHorizontal: 16, paddingTop: 96, paddingBottom: 32, gap: 37 },
  form: { gap: 25 },
  error: { ...typography.iosFootnote, color: colors.status.alert, textAlign: 'center', marginTop: -12, marginBottom: -12 },
});
