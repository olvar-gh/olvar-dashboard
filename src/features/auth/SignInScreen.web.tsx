import { useRef } from 'react';
import { StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import OlvarMark from '@/components/shell/assets/OlvarMark';
import { Button, Field } from '@/components/ui';
import { colors, typography, useBreakpoint } from '@/theme';

import { BrandPanel } from './BrandPanel';
import { useSignInForm } from './useSignInForm';

/**
 * Desktop sign in (Figma 227:10075 / 227:10095): brand panel, then the 360 px form centred in the
 * rest of the window. "Create an account" and "Forgot password?" are deferred and not rendered.
 */
export function SignInScreen() {
  const bp = useBreakpoint();
  const form = useSignInForm();
  const passwordRef = useRef<TextInputInstance>(null);
  const { brandPanelWidth, formWidth } = bp.screens.signIn;
  return (
    <View testID="sign-in" style={styles.root}>
      {bp.isDesktop ? <BrandPanel width={brandPanelWidth} /> : null}
      <View style={styles.formArea}>
        <View style={styles.formSlot}>
          <View accessibilityRole="form" style={[styles.form, { width: formWidth }]}>
            <OlvarMark width={34.857} height={44} accessibilityLabel="Olvar" />
            <View style={styles.heading}>
              <Text accessibilityRole="header" aria-level={1} style={styles.title}>
                Welcome back
              </Text>
              <Text style={styles.subtitle}>Sign in to see how your plant is doing.</Text>
            </View>
            <Field
              label="Email"
              placeholder="you@example.com"
              value={form.email}
              onChangeText={form.setEmail}
              error={!!form.errors.email}
              hint={form.errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              inputMode="email"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="sign-in-email"
            />
            <Field
              ref={passwordRef}
              label="Password"
              value={form.password}
              onChangeText={form.setPassword}
              error={!!form.errors.password}
              hint={form.errors.password}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={form.submit}
              testID="sign-in-password"
            />
            {form.errors.form ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {form.errors.form}
              </Text>
            ) : null}
            <Button
              label="Sign in"
              size="large"
              onPress={form.submit}
              loading={form.pending}
              style={styles.submit}
              testID="sign-in-submit"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, flexDirection: 'row', backgroundColor: colors.bg.canvas },
  formArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 48 },
  // Room for the deferred links row (16 px + 20 px gap), so the form sits where the Figma frames centre it.
  formSlot: { paddingBottom: 36, maxWidth: '100%' },
  form: { maxWidth: '100%', gap: 20 },
  heading: { gap: 6 },
  title: { ...typography.pageTitle, color: colors.text.primary },
  subtitle: { ...typography.pageSubtitle, color: colors.text.secondary },
  error: { ...typography.body, color: colors.status.alert },
  submit: { alignSelf: 'stretch' },
});
