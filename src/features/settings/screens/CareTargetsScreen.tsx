import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PageScroll } from '@/components/shell';
import { Button, confirmAlert, ErrorState, Field, IosListRow, ListSection, NavBar, RangeCard, SkeletonCard } from '@/components/ui';
import { colors } from '@/theme';

import { useCareTargets } from '../hooks';
import { formatNow, formatRange, METRICS, okRange, scaleFor, speciesName, usesPreset } from '../model';

/** iPhone care targets: the preset switch, each metric's ideal range, and Low/High rows while editing. */
export function CareTargetsScreen() {
  const c = useCareTargets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const p = c.plant.data;
  const ready = !!p && !c.thresholds.isPending;
  // `edit=1` (the Settings switch turned off) opens the editor once; a save changes the thresholds
  // query, and the editor must not reopen when it settles.
  const editConsumed = useRef(false);

  useEffect(() => {
    if (edit !== '1' || !ready || editConsumed.current) return;
    editConsumed.current = true;
    if (!c.open) c.startEditing();
  }, [edit, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPreset = async (on: boolean) => {
    if (!on) return c.startEditing();
    if (p && usesPreset(p.threshold_overrides)) return c.cancel();
    const ok = await confirmAlert({
      title: `Use the ${p ? speciesName(p.profile) : ''} preset?`,
      message: 'Your own ranges will be replaced by the preset ranges.',
      confirmLabel: 'Use Preset',
    });
    if (!ok) return;
    const error = await c.applyPreset();
    if (error) Alert.alert('Couldn’t use the preset', error);
  };

  return (
    // The scroll view keeps the focused field above the keyboard and insets its content by the
    // keyboard height, so Save Ranges can be scrolled above it; each decimal pad's Done closes it.
    // A tap on Save while typing presses it instead of only closing the keyboard.
    <PageScroll
      testID="care-targets-screen"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.page}
    >
      <NavBar title="Care Targets" />
      {c.plant.isPending || (p && c.thresholds.isPending) ? (
        <SkeletonCard lines={4} testID="care-targets-loading" />
      ) : c.plant.error || c.thresholds.error || !p ? (
        <ErrorState title="Care targets" onRetry={() => void (c.plant.error ? c.plant.refetch() : c.thresholds.refetch())} testID="care-targets-error" />
      ) : (
        <>
          <ListSection
            footer={
              c.presetOn
                ? `Ranges follow the ${speciesName(p.profile)} preset. Turn it off to set your own.`
                : 'Ranges set the target bands on the charts. Readings arrive every 60 s.'
            }
          >
            <IosListRow
              label="Use preset"
              icon="leaf"
              iconTint={colors.brand.sage}
              accessory="toggle"
              on={c.presetOn}
              onToggle={(on) => void onPreset(on)}
              disabled={c.saving}
              testID="care-preset"
            />
          </ListSection>
          {METRICS.map((cfg) => {
            const range = okRange(c.thresholds.data, cfg.metric);
            const draft = c.draft[cfg.metric];
            const error = c.rowErrors[cfg.metric];
            return (
              <View key={cfg.metric} style={styles.metric} testID={`target-${cfg.metric}`}>
                {range ? (
                  <RangeCard
                    caption={cfg.label}
                    value={formatRange(cfg, range, true)}
                    status={formatNow(cfg, c.latest)}
                    unit={cfg.unit === '%' ? '%' : ` ${cfg.unit}`}
                    min={scaleFor(cfg, range).min}
                    max={scaleFor(cfg, range).max}
                    low={range.low}
                    high={range.high}
                    current={c.latest?.[cfg.reading]}
                    color={cfg.iosTint}
                  />
                ) : null}
                {c.open ? (
                  <ListSection footer={error}>
                    <Field
                      label="Low"
                      value={draft.low}
                      onChangeText={(v) => c.setRange(cfg.metric, 'low', v)}
                      keyboardType="decimal-pad"
                      editable={!c.saving}
                      error={!!error}
                      returnKeyType="done"
                      testID={`target-${cfg.metric}-low`}
                    />
                    <Field
                      label="High"
                      value={draft.high}
                      onChangeText={(v) => c.setRange(cfg.metric, 'high', v)}
                      keyboardType="decimal-pad"
                      editable={!c.saving}
                      error={!!error}
                      separator
                      returnKeyType="done"
                      testID={`target-${cfg.metric}-high`}
                    />
                  </ListSection>
                ) : null}
              </View>
            );
          })}
          {c.saveError ? (
            <ListSection footer={c.saveError}>
              <IosListRow label="Couldn’t save the ranges" icon="alert" iconTint={colors.status.alert} testID="care-save-error" />
            </ListSection>
          ) : null}
          {c.open ? (
            <View style={styles.actions}>
              <Button size="large" label="Save Ranges" onPress={() => void c.save()} loading={c.saving} testID="care-save" />
              <Button size="large" variant="plain" label="Cancel" onPress={c.cancel} disabled={c.saving} />
            </View>
          ) : !c.presetOn ? (
            <Button size="large" variant="plain" label="Edit Ranges" onPress={c.startEditing} testID="care-edit" />
          ) : null}
        </>
      )}
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  metric: { gap: 4 },
  actions: { gap: 4, marginTop: 8 },
});
