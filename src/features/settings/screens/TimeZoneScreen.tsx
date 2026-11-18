import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { PageScroll } from '@/components/shell';
import { ErrorState, IosListRow, ListSection, NavBar, SkeletonCard } from '@/components/ui';
import { usePlant, useUpdatePlant } from '@/data';

import { isSaving, useSaving } from '../drafts';
import { filterZones, saveErrorMessage, timeZoneLabel, timeZones } from '../model';
import { useBackIfFocused } from './useBackIfFocused';

/** iPhone time zone picker: native header search, a checkmark on the plant's zone, saved on tap. */
export function TimeZoneScreen() {
  const router = useRouter();
  const back = useBackIfFocused();
  const plant = usePlant();
  const update = useUpdatePlant();
  const [saving, track] = useSaving('timezone');
  const [query, setQuery] = useState('');
  const current = plant.data?.timezone ?? '';
  const zones = useMemo(() => timeZones(current), [current]);
  const shown = filterZones(zones, query);

  const pick = async (zone: string) => {
    if (isSaving('timezone')) return;
    if (!plant.data || zone === current) return router.back();
    const plantId = plant.data.id;
    try {
      await track(() => update.mutateAsync({ plantId, patch: { timezone: zone } }));
      back();
    } catch (err) {
      Alert.alert('Couldn’t change the time zone', saveErrorMessage(err, 'timezone'));
    }
  };

  return (
    <PageScroll testID="timezone-screen" keyboardDismissMode="on-drag" contentContainerStyle={styles.page}>
      <NavBar title="Time Zone" />
      <Stack.Screen
        options={{
          headerSearchBarOptions: { placeholder: 'Search', hideWhenScrolling: false, onChangeText: (e) => setQuery(e.nativeEvent.text) },
        }}
      />
      {plant.isPending ? (
        <SkeletonCard lines={4} testID="timezone-loading" />
      ) : plant.error || !plant.data ? (
        <ErrorState title="Time zone" onRetry={() => void plant.refetch()} testID="timezone-error" />
      ) : (
        <ListSection footer="Day boundaries on the Timeline and daily summaries follow this zone.">
          {shown.map((z, i) => (
            <IosListRow
              key={z}
              label={timeZoneLabel(z)}
              accessory={z === current ? 'check' : 'none'}
              onPress={() => void pick(z)}
              disabled={saving || update.isPending}
              separator={i > 0}
              testID={`zone-${z}`}
            />
          ))}
          {shown.length === 0 ? <IosListRow label={`No results for “${query}”`} /> : null}
        </ListSection>
      )}
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: 8 },
});
