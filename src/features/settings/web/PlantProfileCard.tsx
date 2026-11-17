import { StyleSheet, View } from 'react-native';

import OlvarMark from '@/components/shell/assets/OlvarMark';
import { Button, Card, ErrorState, Field, Notice, SkeletonCard } from '@/components/ui';
import { colors } from '@/theme';

import { usePlantForm } from '../hooks';
import { addedDate, LOCATION_MAX, NICKNAME_MAX, speciesName } from '../model';

/** Desktop "Plant profile" card: nickname and location editable, species and added date read-only. */
export function PlantProfileCard() {
  const f = usePlantForm();
  const p = f.plant.data;
  if (f.plant.isPending) return <SkeletonCard minHeight={168} lines={2} testID="plant-profile-loading" />;
  if (f.plant.error || !p) {
    return <ErrorState title="Plant profile" onRetry={() => void f.plant.refetch()} retrying={f.plant.isFetching} testID="plant-profile-error" />;
  }
  return (
    <Card
      title="Plant profile"
      subtitle="Who your plant is. Sparks uses the name when it talks to you."
      testID="plant-profile"
      actions={
        <>
          <Button variant="secondary" label="Cancel" onPress={f.reset} disabled={!f.dirty || f.saving} />
          <Button label="Save changes" onPress={() => void f.save()} disabled={!f.dirty} loading={f.saving} testID="plant-save" />
        </>
      }
    >
      <View style={styles.body}>
        <View style={styles.avatar}>
          <OlvarMark width={34.857} height={44} />
        </View>
        <View style={styles.fields}>
          <Field
            label="Name"
            value={f.nickname}
            onChangeText={f.setNickname}
            maxLength={NICKNAME_MAX + 10}
            error={!!f.errors.nickname}
            hint={f.errors.nickname ?? undefined}
            style={styles.field}
            testID="plant-nickname"
          />
          <Field label="Species" value={speciesName(p.profile)} editable={false} style={styles.field} />
          <Field
            label="Location"
            value={f.location}
            onChangeText={f.setLocation}
            placeholder="e.g. Living room"
            maxLength={LOCATION_MAX + 10}
            error={!!f.errors.location}
            hint={f.errors.location ?? undefined}
            style={styles.field}
            testID="plant-location"
          />
          <Field label="Added" value={addedDate(p.created_at, p.timezone)} editable={false} style={styles.field} />
        </View>
      </View>
      {f.saveError ? <Notice tone="warn">{f.saveError}</Notice> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: { flexGrow: 1, flexBasis: 240, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  field: { width: 176, maxWidth: '100%', alignSelf: 'auto' },
});
