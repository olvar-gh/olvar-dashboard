import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PageScroll } from '@/components/shell';
import OlvarMark from '@/components/shell/assets/OlvarMark';
import { Button, ErrorState, Field, ListSection, NavBar, SkeletonCard } from '@/components/ui';
import { colors } from '@/theme';

import { usePlantForm } from '../hooks';
import { addedDate, LOCATION_MAX, NICKNAME_MAX, speciesName } from '../model';

/** iPhone plant profile: grouped name and location rows, read-only species and added date, Save. */
export function PlantProfileScreen() {
  const router = useRouter();
  const f = usePlantForm();
  const p = f.plant.data;

  const onSave = async () => {
    if (await f.save()) router.back();
  };

  return (
    <PageScroll testID="settings-plant-screen" keyboardDismissMode="interactive" contentContainerStyle={styles.page}>
      <NavBar title="Plant Profile" />
      {f.plant.isPending ? (
        <SkeletonCard lines={3} testID="plant-profile-loading" />
      ) : f.plant.error || !p ? (
        <ErrorState title="Plant profile" onRetry={() => void f.plant.refetch()} testID="plant-profile-error" />
      ) : (
        <>
          <View style={styles.avatar}>
            <OlvarMark width={44} height={55.5} />
          </View>
          <ListSection
            header="Plant"
            footer={f.errors.nickname ?? f.errors.location ?? `Sparks uses this name when it talks to you. Up to ${NICKNAME_MAX} characters.`}
          >
            <Field
              label="Name"
              value={f.nickname}
              onChangeText={f.setNickname}
              error={!!f.errors.nickname}
              returnKeyType="next"
              testID="plant-nickname"
            />
            <Field
              label="Location"
              value={f.location}
              onChangeText={f.setLocation}
              placeholder="Living room"
              maxLength={LOCATION_MAX + 10}
              error={!!f.errors.location}
              separator
              testID="plant-location"
            />
          </ListSection>
          <ListSection header="About" footer={f.saveError ?? undefined}>
            <Field label="Species" value={speciesName(p.profile)} editable={false} />
            <Field label="Added" value={addedDate(p.created_at, p.timezone)} editable={false} separator />
          </ListSection>
          <Button size="large" label="Save" onPress={() => void onSave()} disabled={!f.dirty} loading={f.saving} testID="plant-save" style={styles.save} />
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
    backgroundColor: colors.brand.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  save: { marginTop: 16 },
});
