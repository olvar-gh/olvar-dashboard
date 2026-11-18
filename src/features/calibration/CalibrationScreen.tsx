import { Alert, StyleSheet, Text, View } from 'react-native';

import { PageScroll } from '@/components/shell';
import {
  Button,
  EmptyState,
  ErrorState,
  IosListRow,
  ListSection,
  NavBar,
  Notice,
  OfflineBanner,
  Skeleton,
  confirmAlert,
} from '@/components/ui';
import { formatNumber, formatShortDate } from '@/domain/format';
import { iosColors, typography } from '@/theme';

import { useCalibrationWizard, type CalibrationWizard } from './useCalibrationWizard';
import { useDismissGuard } from './useDismissGuard';
import { SENSOR_LABEL, ageLabel, stabilityLabel, type CaptureStep } from './wizard';

const ACTION_LABEL = { dry: 'Capture Dry Reading', wet: 'Capture Wet Reading', review: 'Save Calibration' } as const;

/** iPhone "Soil Calibration" form sheet (Figma 134:2509), presented by the shell's native stack. */
export function CalibrationScreen() {
  const w = useCalibrationWizard();
  const guard = useDismissGuard({ dirty: w.dirty, saving: w.saving });
  return <CalibrationSheet w={w} onClose={guard.close} onSaved={guard.leave} />;
}

export type CalibrationSheetProps = {
  w: CalibrationWizard;
  /** Shows the native header with a Close button; needs the router's stack. */
  onClose?: () => void;
  onSaved: () => void;
};

export function CalibrationSheet({ w, onClose, onSaved }: CalibrationSheetProps) {
  const primary = async () => {
    if (w.step !== 'review') return w.capture();
    const result = await w.submit();
    if (result === 'saved') onSaved();
    else if (result !== 'gone') Alert.alert('Calibration Not Saved', result);
  };

  return (
    <>
      {onClose ? <NavBar title="Soil Calibration" onBack={onClose} backLabel="Close" /> : null}
      <PageScroll testID="calibration" contentContainerStyle={styles.content}>
        <Body w={w} />
        {w.load === 'ready' ? (
          <Button
            size="large"
            testID="calibration-primary"
            label={ACTION_LABEL[w.step]}
            disabled={w.step === 'review' ? !w.canSave : !w.canCapture}
            loading={w.saving}
            onPress={primary}
            style={styles.primary}
          />
        ) : null}
      </PageScroll>
    </>
  );
}

function Body({ w }: { w: CalibrationWizard }) {
  if (w.load === 'loading') {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={styles.loading}>
        <Skeleton height={92} radius={26} />
        <Skeleton height={92} radius={26} />
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
        title="No Soil Sensor Yet"
        body="Connect the ESP32 to Wi-Fi so it reaches the Raspberry Pi 3B gateway over MQTT, then calibrate here."
      />
    );
  }
  if (w.load === 'no-readings' || !w.live) {
    return (
      <EmptyState
        icon="droplet"
        title="No Readings Yet"
        body="The ESP32 sends a reading every minute over Wi-Fi · MQTT. Calibration starts with the first one."
      />
    );
  }
  const live = w.live;
  const device = w.device!;
  return (
    <>
      {live.offline ? <OfflineBanner since={w.offlineSince} detail="Capture resumes when readings arrive again." testID="calibration-offline" /> : null}
      <View testID="live-reading" style={styles.liveCard}>
        <Text style={styles.liveLabel}>Live reading</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{live.raw == null ? '—' : formatNumber(live.raw)}</Text>
          <Text style={styles.unit}>raw ADC</Text>
        </View>
        <Text testID="live-status" style={[styles.status, live.stability === 'stable' && styles.statusStable]}>
          {stabilityLabel(live, w.timeZone)}
        </Text>
        <Text style={styles.age}>{ageLabel(live)}</Text>
      </View>
      <ListSection
        header="Readings"
        footer="Hold the probe in open air for the dry reading, then stand it in a glass of water up to the line for the wet reading. Higher raw means drier."
      >
        <StepRow w={w} step="dry" />
        <StepRow w={w} step="wet" />
      </ListSection>
      {w.check && !w.check.ok ? (
        <Notice tone="warn" testID="calibration-invalid">
          {w.check.message}
        </Notice>
      ) : null}
      <ListSection footer="Moisture is mapped from 0 % at the dry value to 100 % at the wet value.">
        <IosListRow
          label="Last calibrated"
          value={w.calibrated ? (device.soil_calibrated_at ? formatShortDate(device.soil_calibrated_at, w.timeZone) : 'Yes') : 'Not calibrated'}
        />
        {w.calibrated ? (
          <IosListRow separator label="Saved values" value={`${formatNumber(device.soil_dry_raw!)} / ${formatNumber(device.soil_wet_raw!)}`} />
        ) : null}
        <IosListRow separator label="Sensor" value={SENSOR_LABEL} />
      </ListSection>
    </>
  );
}

const STEPS: Record<CaptureStep, { label: string; icon: 'sun' | 'droplet'; tint: string }> = {
  dry: { label: 'Dry reading', icon: 'sun', tint: iosColors.accentYellow },
  wet: { label: 'Wet reading', icon: 'droplet', tint: iosColors.accentBlue },
};

function StepRow({ w, step }: { w: CalibrationWizard; step: CaptureStep }) {
  const s = STEPS[step];
  const captured = w.state[step];
  const retake = async () => {
    if (await confirmAlert({ title: `Retake ${s.label.toLowerCase()}?`, message: 'The captured value is cleared and new readings are collected.', confirmLabel: 'Retake' })) {
      w.retake(step);
    }
  };
  return (
    <IosListRow
      testID={`step-${step}`}
      label={s.label}
      icon={s.icon}
      iconTint={s.tint}
      separator={step === 'wet'}
      value={captured != null ? formatNumber(captured) : w.step === step ? 'Measuring…' : '—'}
      accessory={captured != null ? 'chevron' : 'none'}
      onPress={captured != null && !w.saving ? retake : undefined}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  loading: { gap: 16 },
  liveCard: { gap: 6, padding: 16, borderRadius: 26, borderCurve: 'continuous', backgroundColor: iosColors.groupedBackgroundSecondary },
  liveLabel: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { ...typography.iosTitle1, color: iosColors.labelPrimary },
  unit: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
  status: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
  statusStable: { color: iosColors.accentGreen },
  age: { ...typography.iosFootnote, color: iosColors.labelTertiary },
  primary: { marginTop: 16 },
});
