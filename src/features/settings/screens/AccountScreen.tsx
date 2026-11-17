import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PageScroll } from '@/components/shell';
import { Button, Field, IosListRow, ListSection, NavBar, SelectField, SkeletonCard } from '@/components/ui';
import { colors, iosColors, typography } from '@/theme';

import { useAccountForm } from '../hooks';
import { timeZoneLabel } from '../model';

/** iPhone Edit Profile (Figma 147:1862): name, read-only email, time zone, Change Password, Save. */
export function AccountScreen() {
  const router = useRouter();
  const a = useAccountForm();
  const onSave = async () => {
    if (await a.save()) router.back();
  };
  return (
    <PageScroll testID="account-screen" keyboardDismissMode="interactive" contentContainerStyle={styles.page}>
      <NavBar title="Edit Profile" />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(a.name || a.email).slice(0, 1).toUpperCase()}</Text>
      </View>
      {a.plantPending ? (
        <SkeletonCard lines={3} testID="account-loading" />
      ) : (
        <>
          <ListSection header="Profile" footer={a.errors.name ?? a.saveError ?? undefined}>
            <Field label="Name" value={a.name} onChangeText={a.setName} error={!!a.errors.name} textContentType="name" testID="account-name" />
            <Field label="Email" value={a.email} editable={false} separator testID="account-email" />
            <SelectField
              label="Time Zone"
              value={a.timeZone ? timeZoneLabel(a.timeZone) : undefined}
              placeholder="Choose"
              onPress={() => router.push('/settings/timezone')}
              separator
              testID="account-timezone"
            />
          </ListSection>
          <ListSection header="Security" footer="Your name appears in chat with Sparks.">
            <IosListRow
              label="Change Password"
              icon="lock"
              iconTint={colors.text.secondary}
              accessory="chevron"
              onPress={() => router.push('/settings/password')}
              testID="account-password"
            />
          </ListSection>
          <Button size="large" label="Save" onPress={() => void onSave()} disabled={!a.dirty} loading={a.saving} style={styles.save} testID="account-save" />
        </>
      )}
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: 8 },
  avatar: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand.olive,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  avatarText: { ...typography.iosTitle1, color: iosColors.groupedBackgroundSecondary },
  save: { marginTop: 16 },
});
