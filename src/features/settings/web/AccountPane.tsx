import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Button, Card, confirmAlert, Field, Modal, Notice, SelectField, SkeletonCard } from '@/components/ui';
import { useSignOut } from '@/data';
import { colors, typography } from '@/theme';

import { useSaving } from '../drafts';
import { useAccountForm, usePasswordForm } from '../hooks';
import { filterZones, PASSWORD_MIN, timeZoneLabel, timeZones } from '../model';

/** Desktop Account pane: profile (name, email, time zone), password and sign out. */
export function AccountPane() {
  const a = useAccountForm({ keep: true });
  const [picking, setPicking] = useState(false);
  if (a.plantPending) {
    return (
      <>
        <SkeletonCard minHeight={200} lines={3} testID="account-loading" />
        <SkeletonCard minHeight={120} lines={2} />
      </>
    );
  }
  return (
    <>
      <Card
        title="Edit profile"
        subtitle="How you appear in chat and on this dashboard."
        testID="account-profile"
        actions={
          <>
            <Button variant="secondary" label="Cancel" onPress={a.reset} disabled={!a.dirty || a.saving} />
            <Button label="Save changes" onPress={() => void a.save()} disabled={!a.dirty} loading={a.saving} testID="account-save" />
          </>
        }
      >
        <View style={styles.content}>
          <View style={styles.photo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(a.name || a.email).slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.photoText}>
              <Text style={styles.photoTitle}>{a.name || 'Your name'}</Text>
              <Text style={styles.photoSub}>Signed in as the plant’s owner</Text>
            </View>
          </View>
          <View style={styles.fields}>
            <Field
              label="Name"
              value={a.name}
              onChangeText={a.setName}
              error={!!a.errors.name}
              hint={a.errors.name ?? undefined}
              style={styles.field}
              testID="account-name"
            />
            <Field label="Email" value={a.email} editable={false} style={styles.field} testID="account-email" />
          </View>
          <View style={styles.fields}>
            <SelectField
              label="Time zone"
              value={a.timeZone ? timeZoneLabel(a.timeZone) : undefined}
              placeholder="Choose a time zone"
              hint="Day boundaries on the Timeline and daily summaries follow this zone."
              onPress={() => setPicking(true)}
              style={styles.field}
              testID="account-timezone"
            />
            <View style={styles.field} />
          </View>
          {a.plantError ? (
            <Notice
              tone="warn"
              testID="account-plant-error"
              action={<Button variant="secondary" label="Retry" onPress={a.retryPlant} />}
            >
              {`Your plant couldn’t be loaded, so the time zone can’t be changed yet. ${a.plantError}`}
            </Notice>
          ) : null}
          {a.saveError ? (
            <Notice tone="warn" testID="account-save-error">
              {a.saveError}
            </Notice>
          ) : null}
        </View>
      </Card>
      <PasswordCard />
      <SignOutCard />
      <TimeZoneModal
        visible={picking}
        value={a.timeZone}
        onDismiss={() => setPicking(false)}
        onPick={(z) => {
          a.setTimeZone(z);
          setPicking(false);
        }}
      />
    </>
  );
}

function PasswordCard() {
  const f = usePasswordForm();
  return (
    <Card
      title="Password"
      subtitle={`Use at least ${PASSWORD_MIN} characters. You’ll stay signed in on this device.`}
      testID="account-password"
      actions={
        <Button variant="secondary" label="Update password" onPress={() => void f.submit()} loading={f.saving} disabled={f.signingOut} testID="password-submit" />
      }
    >
      <View style={styles.content}>
        <View style={styles.fields}>
          <Field
            label="Current password"
            value={f.current}
            onChangeText={f.setCurrent}
            secureTextEntry
            autoComplete="current-password"
            style={styles.field}
            testID="password-current"
          />
          <Field
            label="New password"
            value={f.next}
            onChangeText={f.setNext}
            secureTextEntry
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN} characters`}
            style={styles.field}
            testID="password-new"
          />
        </View>
        {f.error || f.saveError ? (
          <Notice tone="warn" testID="password-error">
            {f.error ?? f.saveError}
          </Notice>
        ) : null}
        {f.done ? <Notice icon="check">Password updated.</Notice> : null}
      </View>
    </Card>
  );
}

function SignOutCard() {
  const signOut = useSignOut();
  const [signingOut, track] = useSaving('signout');
  const [changingPassword] = useSaving('password');
  const onPress = async () => {
    const ok = await confirmAlert({ title: 'Sign out?', message: 'You can sign in again with your email and password.', confirmLabel: 'Sign out', destructive: true });
    if (ok) await track(() => signOut.mutateAsync()).catch(() => {});
  };
  return (
    <Card
      title="Sign out"
      subtitle="Sign out of the dashboard on this browser. Your plant keeps reporting to the gateway."
      testID="account-sign-out"
      actions={<Button variant="destructive" label="Sign out" onPress={() => void onPress()} loading={signingOut || signOut.isPending} disabled={changingPassword} testID="sign-out" />}
    />
  );
}

function TimeZoneModal({ visible, value, onDismiss, onPick }: { visible: boolean; value: string; onDismiss: () => void; onPick: (zone: string) => void }) {
  const [query, setQuery] = useState('');
  const zones = useMemo(() => timeZones(value), [value]);
  const shown = filterZones(zones, query);
  return (
    <Modal visible={visible} onDismiss={onDismiss} title="Time zone" subtitle="Where your plant lives." cancel={{ label: 'Cancel', onPress: onDismiss }} testID="timezone-modal">
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="e.g. Seoul" autoFocus testID="timezone-search" />
      <ScrollView style={styles.zoneList}>
        {shown.map((z) => (
          <Pressable
            key={z}
            accessibilityRole="button"
            accessibilityState={{ selected: z === value }}
            onPress={() => onPick(z)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.zone, (pressed || hovered) && styles.zoneHover]}
          >
            <Text style={styles.zoneText}>{timeZoneLabel(z)}</Text>
            {z === value ? <Icon name="check" size={16} color={colors.brand.olive} /> : null}
          </Pressable>
        ))}
        {shown.length === 0 ? <Text style={styles.zoneEmpty}>No time zone matches “{query}”.</Text> : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  photo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand.olive, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.cardTitle, fontSize: 22, color: colors.surface.card },
  photoText: { flex: 1, gap: 2 },
  photoTitle: { ...typography.sensorTitle, color: colors.text.primary },
  photoSub: { ...typography.meta, color: colors.text.tertiary },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  field: { flexGrow: 1, flexBasis: 240, alignSelf: 'auto' },
  zoneList: { maxHeight: 320, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: 10 },
  zone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9 },
  zoneHover: { backgroundColor: colors.bg.canvas },
  zoneText: { ...typography.pageSubtitle, color: colors.text.primary },
  zoneEmpty: { ...typography.body, color: colors.text.tertiary, padding: 12 },
});
