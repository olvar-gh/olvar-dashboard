import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Button, EmptyState, ErrorState, Modal, Notice, OfflineBanner, Skeleton } from '@/components/ui';
import { formatNumber } from '@/domain/format';
import { colors, typography } from '@/theme';

import { closeCalibration, useCalibrationWizard, type CalibrationWizard } from './useCalibrationWizard';
import { SENSOR_LABEL, ageLabel, calibrationSummary, stabilityLabel, type CaptureStep } from './wizard';

/** Desktop "Calibrate soil sensor" dialog (Figma Modal/Calibrate soil sensor), over the page below it. */
export function CalibrationScreen() {
  const w = useCalibrationWizard();
  const subtitle = w.device ? `${SENSOR_LABEL} · ${calibrationSummary(w.device, w.timeZone)}` : SENSOR_LABEL;
  const save = async () => {
    if ((await w.submit()) === 'saved') closeCalibration();
  };
  // Leaving mid-save would let the save's own close pop whatever page is under the dialog.
  const dismiss = () => {
    if (!w.saving) closeCalibration();
  };
  return (
    <Modal
      visible
      testID="calibration"
      onDismiss={dismiss}
      title="Calibrate soil sensor"
      subtitle={subtitle}
      cancel={{ label: 'Cancel', onPress: dismiss, disabled: w.saving }}
      confirm={w.load === 'ready' ? { label: 'Save calibration', onPress: save, disabled: !w.canSave, loading: w.saving } : undefined}
    >
      <Body w={w} />
    </Modal>
  );
}

function Body({ w }: { w: CalibrationWizard }) {
  if (w.load === 'loading') {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={styles.content}>
        <Skeleton height={76} radius={12} />
        <Skeleton height={54} />
        <Skeleton height={54} />
      </View>
    );
  }
  if (w.load === 'error') {
    return <ErrorState message="Couldn’t load the soil sensor. Check your connection and try again." onRetry={w.retry} retrying={w.retrying} />;
  }
  if (w.load === 'no-device') {
    return (
      <EmptyState
        icon="cpu"
        title="No soil sensor yet"
        body="Connect the ESP32 to Wi-Fi so it reaches the Raspberry Pi 3B gateway over MQTT, then calibrate here."
      />
    );
  }
  if (w.load === 'no-readings' || !w.live) {
    return (
      <EmptyState
        icon="droplet"
        title="No readings yet"
        body="The ESP32 sends a reading every minute over Wi-Fi · MQTT. Calibration starts with the first one."
      />
    );
  }
  const live = w.live;
  return (
    <View style={styles.content}>
      {live.offline ? (
        <OfflineBanner since={w.offlineSince} detail="Capture resumes when readings arrive again." testID="calibration-offline" />
      ) : null}
      <View testID="live-reading" style={styles.live}>
        <View style={styles.liveText}>
          <Text style={styles.liveLabel}>Live reading</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{live.raw == null ? '-' : formatNumber(live.raw)}</Text>
            <Text style={styles.unit}>raw ADC</Text>
          </View>
        </View>
        <View style={styles.statusColumn}>
          <View style={styles.status}>
            <View style={[styles.dot, live.stability === 'stable' ? styles.dotLive : styles.dotOff]} />
            <Text testID="live-status" style={styles.statusLabel}>
              {stabilityLabel(live, w.timeZone)}
            </Text>
          </View>
          <Text style={styles.age}>{ageLabel(live)}</Text>
        </View>
      </View>
      <View>
        <StepRow w={w} step="dry" />
        <StepRow w={w} step="wet" />
      </View>
      {w.check && !w.check.ok ? (
        <Notice tone="warn" testID="calibration-invalid">
          {w.check.message}
        </Notice>
      ) : null}
      {w.saveError ? (
        <Notice tone="warn" testID="calibration-save-error">
          {w.saveError}
        </Notice>
      ) : null}
      <Notice icon="info">
        Moisture is mapped from 0 % at the dry value to 100 % at the wet value. Higher raw means drier.
      </Notice>
    </View>
  );
}

const STEPS: Record<CaptureStep, { title: string; subtitle: string; icon: 'sun' | 'droplet' }> = {
  dry: { title: '1 · Dry reading', subtitle: 'Hold the probe in open air until the value settles', icon: 'sun' },
  wet: { title: '2 · Wet reading', subtitle: 'Stand the probe in a glass of water, up to the line', icon: 'droplet' },
};

/** Step row in the Desktop/List row look; the instructions wrap instead of truncating on narrow windows. */
function StepRow({ w, step }: { w: CalibrationWizard; step: CaptureStep }) {
  const s = STEPS[step];
  const captured = w.state[step];
  const current = w.step === step;
  const status = captured != null ? `Captured · ${formatNumber(captured)}` : current ? null : 'After the dry reading';
  return (
    <View testID={`step-${step}`} style={[styles.step, step === 'wet' && styles.stepDivider]}>
      <View style={styles.stepMain}>
        <View style={styles.iconChip}>
          <Icon name={s.icon} size={18} color={colors.text.secondary} />
        </View>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>{s.title}</Text>
          <Text style={styles.stepSubtitle}>{s.subtitle}</Text>
        </View>
      </View>
      <View style={styles.stepTrailing}>
        {status ? (
          <View style={styles.status}>
            <View style={[styles.dot, captured != null ? styles.dotLive : styles.dotOff]} />
            <Text style={styles.statusLabel}>{status}</Text>
          </View>
        ) : null}
        {captured != null ? (
          <Button
            variant="plain"
            label="Retake"
            accessibilityLabel={`Retake ${step} reading`}
            disabled={w.saving}
            onPress={() => w.retake(step)}
          />
        ) : current ? (
          <Button variant="secondary" label="Capture" accessibilityLabel={`Capture ${step} reading`} disabled={!w.canCapture} onPress={w.capture} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  step: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 8, paddingVertical: 9 },
  stepDivider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  stepMain: { flexDirection: 'row', alignItems: 'center', gap: 14, flexGrow: 1, flexShrink: 1, flexBasis: 240 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, minWidth: 0, gap: 2 },
  stepTitle: { ...typography.sensorTitle, color: colors.text.primary },
  stepSubtitle: { ...typography.meta, color: colors.text.tertiary },
  stepTrailing: { flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 'auto' },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.bg.canvas,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 12,
  },
  liveText: { gap: 2, flexShrink: 1 },
  liveLabel: { ...typography.status, color: colors.text.tertiary },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { ...typography.value, fontSize: 28, color: colors.text.primary },
  unit: { ...typography.meta, color: colors.text.tertiary },
  statusColumn: { alignItems: 'flex-end', gap: 4, flexShrink: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  age: { ...typography.meta, color: colors.text.tertiary, textAlign: 'right' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLive: { backgroundColor: colors.status.live, borderWidth: 2, borderColor: `${colors.status.live}66` },
  dotOff: { width: 8, height: 8, borderRadius: 4, margin: 1, backgroundColor: colors.text.tertiary },
  statusLabel: { ...typography.status, color: colors.text.secondary, flexShrink: 1 },
});
