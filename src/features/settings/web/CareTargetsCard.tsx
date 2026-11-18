import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Button, Card, confirmAlert, ErrorState, Notice, SkeletonCard } from '@/components/ui';
import { colors, typography } from '@/theme';

import { useCareTargets } from '../hooks';
import { formatNow, formatRange, METRICS, okRange, speciesName, usesPreset, type MetricConfig } from '../model';
import { RangeTrack } from '../RangeTrack';

/** Desktop "Care targets" card: the preset switch, then one row per metric with its ideal range. */
export function CareTargetsCard() {
  const c = useCareTargets({ keep: true });
  const p = c.plant.data;
  if (c.plant.isPending || (p && c.thresholds.isPending)) return <SkeletonCard minHeight={360} lines={4} testID="care-targets-loading" />;
  if (c.plant.error || c.thresholds.error || !p) {
    const retry = () => void (c.plant.error ? c.plant.refetch() : c.thresholds.refetch());
    return <ErrorState title="Care targets" onRetry={retry} testID="care-targets-error" />;
  }
  const species = speciesName(p.profile);

  const onToggle = async (on: boolean) => {
    if (!on) return c.startEditing();
    if (usesPreset(p.threshold_overrides)) return c.cancel();
    const ok = await confirmAlert({
      title: `Use the ${species} preset?`,
      message: 'Your own ranges will be replaced by the preset ranges.',
      confirmLabel: 'Use preset',
    });
    if (ok) await c.applyPreset();
  };

  const actions = (
    <>
      {c.open ? (
        <>
          <Button variant="secondary" label="Cancel" onPress={c.cancel} disabled={c.saving} />
          <Button label="Save ranges" onPress={() => void c.save()} loading={c.saving} testID="care-save" />
        </>
      ) : !c.presetOn ? (
        <Button variant="secondary" label="Edit ranges" onPress={c.startEditing} testID="care-edit" />
      ) : null}
      <View style={styles.preset}>
        <Text style={styles.presetLabel}>Use preset</Text>
        <Switch
          accessibilityLabel="Use preset"
          value={c.presetOn}
          onValueChange={(v) => void onToggle(v)}
          disabled={c.saving}
          trackColor={{ true: colors.brand.olive, false: colors.border.subtle }}
          thumbColor={colors.surface.card}
          // react-native-web paints the "on" thumb teal unless activeThumbColor is set; RN's types omit the prop.
          {...({ activeThumbColor: colors.surface.card } as object)}
          testID="care-preset"
        />
      </View>
    </>
  );

  return (
    <Card title="Care targets" subtitle="Ideal ranges used for the charts and your plant’s mood" actions={actions} testID="care-targets">
      <View style={styles.content}>
        <Notice icon={c.presetOn ? 'lock' : 'sliders'}>
          {c.presetOn
            ? `Ranges follow the ${species} preset. Turn the preset off to adjust them.`
            : c.open
              ? 'Set the low and high end of each range, then save.'
              : `Your own ranges. Turn the preset on to go back to the ${species} ranges.`}
        </Notice>
        <View>
          {METRICS.map((cfg, i) => (
            <TargetRow
              key={cfg.metric}
              cfg={cfg}
              first={i === 0}
              range={okRange(c.thresholds.data, cfg.metric)}
              now={formatNow(cfg, c.latest)}
              current={c.latest?.[cfg.reading]}
              locked={c.presetOn}
              editing={c.open}
              draft={c.draft[cfg.metric]}
              onChange={(end, v) => c.setRange(cfg.metric, end, v)}
              error={c.rowErrors[cfg.metric]}
            />
          ))}
        </View>
        {c.saveError ? (
          <Notice tone="warn" testID="care-save-error">
            {c.saveError}
          </Notice>
        ) : null}
        <Text style={styles.footer}>Ranges set the target bands on the Sensors and Timeline charts. Readings arrive every 60 s.</Text>
      </View>
    </Card>
  );
}

type TargetRowProps = {
  cfg: MetricConfig;
  first: boolean;
  range: ReturnType<typeof okRange>;
  now: string;
  current: number | null | undefined;
  locked: boolean;
  editing: boolean;
  draft: { low: string; high: string };
  onChange: (end: 'low' | 'high', value: string) => void;
  error?: string;
};

function TargetRow({ cfg, first, range, now, current, locked, editing, draft, onChange, error }: TargetRowProps) {
  return (
    <View style={[styles.row, !first && styles.divider]} testID={`target-${cfg.metric}`}>
      <View style={styles.main}>
        <View style={[styles.chip, { backgroundColor: cfg.tint }]}>
          <Icon name={cfg.icon} size={16} color={cfg.color} />
        </View>
        <View style={styles.label}>
          <Text style={styles.title}>{cfg.label}</Text>
          <Text style={styles.now}>{now}</Text>
        </View>
        <RangeTrack cfg={cfg} range={range} current={current} style={styles.track} testID={`target-${cfg.metric}-track`} />
        {editing ? (
          <View style={styles.inputs}>
            <RangeInput label={`${cfg.label} low`} value={draft.low} onChangeText={(v) => onChange('low', v)} error={!!error} />
            <Text style={styles.dash}>–</Text>
            <RangeInput label={`${cfg.label} high`} value={draft.high} onChangeText={(v) => onChange('high', v)} error={!!error} />
            <Text style={styles.unit}>{cfg.unit}</Text>
          </View>
        ) : (
          <>
            {locked ? <Icon name="lock" size={13} color={colors.text.tertiary} /> : null}
            <Text style={styles.range}>{formatRange(cfg, range)}</Text>
          </>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function RangeInput({ label, value, onChangeText, error }: { label: string; value: string; onChangeText: (v: string) => void; error: boolean }) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      inputMode="decimal"
      selectTextOnFocus
      style={[styles.input, error && styles.inputError]}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  presetLabel: { ...typography.label, color: colors.text.secondary },
  row: { paddingVertical: 7, gap: 4 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  main: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6, minHeight: 34 },
  chip: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { width: 157, flexGrow: 1, maxWidth: 157, gap: 2 },
  title: { ...typography.label, fontSize: 14, color: colors.text.primary },
  now: { ...typography.meta, color: colors.text.tertiary },
  track: { flexGrow: 1, flexBasis: 200, maxWidth: 420 },
  range: { ...typography.label, color: colors.text.secondary, width: 104, textAlign: 'right' },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    ...typography.label,
    width: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.canvas,
    color: colors.text.primary,
    textAlign: 'right',
  },
  inputError: { borderColor: colors.status.alert },
  dash: { ...typography.label, color: colors.text.tertiary },
  unit: { ...typography.label, color: colors.text.secondary, minWidth: 28 },
  footer: { ...typography.meta, color: colors.text.tertiary },
  error: { ...typography.meta, color: colors.status.alert, marginLeft: 48 },
});
