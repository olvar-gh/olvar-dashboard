import { useRouter } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';

import { PageScroll } from '@/components/shell';
import { Button, Field, ListSection, NavBar } from '@/components/ui';

import { usePasswordForm } from '../hooks';
import { PASSWORD_MIN } from '../model';

/** iPhone Change Password: current, new and confirm rows; re-authenticates before the change. */
export function PasswordScreen() {
  const router = useRouter();
  const f = usePasswordForm({ confirm: true });
  const onSave = async () => {
    if (await f.submit()) {
      Alert.alert('Password updated', 'You’ll stay signed in on this iPhone.', [{ text: 'OK', onPress: () => router.back() }]);
    }
  };
  return (
    <PageScroll testID="password-screen" keyboardDismissMode="interactive" contentContainerStyle={styles.page}>
      <NavBar title="Change Password" />
      <ListSection footer={f.error ?? f.saveError ?? `Use at least ${PASSWORD_MIN} characters.`}>
        <Field label="Current" value={f.current} onChangeText={f.setCurrent} secureTextEntry textContentType="password" placeholder="Required" testID="password-current" />
        <Field label="New" value={f.next} onChangeText={f.setNext} secureTextEntry textContentType="newPassword" placeholder={`${PASSWORD_MIN}+ characters`} separator testID="password-new" />
        <Field label="Confirm" value={f.confirm} onChangeText={f.setConfirm} secureTextEntry textContentType="newPassword" placeholder="Repeat" separator testID="password-confirm" />
      </ListSection>
      <Button size="large" label="Update Password" onPress={() => void onSave()} loading={f.saving} style={styles.save} testID="password-submit" />
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: 8 },
  save: { marginTop: 16 },
});
