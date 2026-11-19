import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';

import { PageScroll } from '@/components/shell';
import { Button, confirmAlert, ErrorState, Field, IosListRow, ListSection, NavBar, RangeCard, SkeletonCard } from '@/components/ui';
import { colors } from '@/theme';

import { useCareTargets } from '../hooks';
import { formatNow, formatRange, METRICS, okRange, saveFitsWithField, scaleFor, speciesName, usesPreset, type MetricConfig } from '../model';

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

  const { setScroll, onViewportLayout, onMetricLayout, onFieldsLayout, onFieldFocus, onActionsLayout } = useRevealSave();

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
    // The scroll view insets itself above the keyboard so Save Ranges stays reachable, and a tap on
    // Save while typing presses it instead of only closing the keyboard.
    <PageScroll
      ref={setScroll}
      onLayout={onViewportLayout}
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
              <View key={cfg.metric} style={styles.metric} testID={`target-${cfg.metric}`} onLayout={onMetricLayout(cfg)}>
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
                  <View onLayout={onFieldsLayout(cfg)} testID={`target-${cfg.metric}-fields`}>
                    <ListSection footer={error}>
                      <Field
                        label="Low"
                        value={draft.low}
                        onChangeText={(v) => c.setRange(cfg.metric, 'low', v)}
                        keyboardType="decimal-pad"
                        editable={!c.saving}
                        error={!!error}
                        returnKeyType="done"
                        onFocus={() => onFieldFocus(cfg)}
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
                        onFocus={() => onFieldFocus(cfg)}
                        testID={`target-${cfg.metric}-high`}
                      />
                    </ListSection>
                  </View>
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
            <View style={styles.actions} onLayout={onActionsLayout} testID="care-actions">
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

/**
 * Brings Save Ranges above the keyboard when a lower field is focused. The keyboard inset alone
 * only scrolls the focused field into view, which leaves Save under the keyboard; scrolling to the
 * end is skipped when it would push the focused field off the top.
 */
function useRevealSave() {
  const [reveal] = useState(createRevealSave);
  useEffect(() => reveal.subscribe(), [reveal]);
  return reveal;
}

/** The layout bookkeeping behind useRevealSave (exported for tests). */
export function createRevealSave() {
  let scroll: ScrollViewInstance | null = null;
  let viewport = 0;
  let actionsBottom = 0;
  const metricTop: Partial<Record<string, number>> = {};
  const fieldsOffset: Partial<Record<string, number>> = {};
  let focused: string | null = null;

  const reveal = (keyboard: number) => {
    if (!focused || !keyboard || !actionsBottom) return;
    const fieldTop = (metricTop[focused] ?? 0) + (fieldsOffset[focused] ?? 0);
    if (saveFitsWithField(fieldTop, actionsBottom, viewport, keyboard)) scroll?.scrollToEnd({ animated: true });
  };

  return {
    setScroll: (node: ScrollViewInstance | null) => {
      scroll = node;
    },
    subscribe: () => {
      const shown = Keyboard.addListener('keyboardDidShow', (e) => reveal(e.endCoordinates.height));
      const hidden = Keyboard.addListener('keyboardDidHide', () => {
        focused = null;
      });
      return () => {
        shown.remove();
        hidden.remove();
      };
    },
    onViewportLayout: (e: LayoutChangeEvent) => {
      viewport = e.nativeEvent.layout.height;
    },
    onActionsLayout: (e: LayoutChangeEvent) => {
      actionsBottom = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
    },
    onMetricLayout: (cfg: MetricConfig) => (e: LayoutChangeEvent) => {
      metricTop[cfg.metric] = e.nativeEvent.layout.y;
    },
    onFieldsLayout: (cfg: MetricConfig) => (e: LayoutChangeEvent) => {
      fieldsOffset[cfg.metric] = e.nativeEvent.layout.y;
    },
    // Moving between fields with the keyboard already up does not always fire keyboardDidShow.
    onFieldFocus: (cfg: MetricConfig) => {
      focused = cfg.metric;
      if (Keyboard.isVisible()) reveal(Keyboard.metrics()?.height ?? 0);
    },
  };
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  metric: { gap: 4 },
  actions: { gap: 4, marginTop: 8 },
});
