import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Band } from '@/components/charts';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
import { IOS_GROUP_RADIUS, statusColor } from '@/components/ui/color';
import { hrefs } from '@/components/shell';
import { metricStatusStyle } from '@/domain/status-style';
import { formatTime } from '@/domain/format';
import type { Reading } from '@/data';
import { iosColors, typography } from '@/theme';

import { Chart } from './SensorChart';
import { rangeSummary, unitText, valueText, type MetricSeries, type MetricSpec, type MetricStatus, type Range } from './model';

const CHART_HEIGHT = 104;

export type SensorCardProps = {
  spec: MetricSpec;
  range: Range;
  domain: readonly [Date, Date];
  data: MetricSeries;
  value: number | null;
  latest: Reading | null;
  status: MetricStatus;
  band: Band | null;
  calibrated: boolean;
  timeZone: string;
};

/** iPhone sensor card (Figma 35:523): tinted title, value with the range span, compact chart. Opens Timeline. */
export function SensorCard({ spec, range, domain, data, value, latest, status, band, calibrated, timeZone }: SensorCardProps) {
  const router = useRouter();
  const uncalibratedSoil = spec.key === 'soil' && !calibrated;
  const failedAt = value == null && latest ? `Read failed at ${formatTime(latest.recorded_at, timeZone)}` : null;
  const openTimeline = () => router.push('/timeline');

  return (
    // VoiceOver hides elements nested in an accessible element, so the card itself is not one;
    // the header and value carry the Timeline action and Calibrate stays reachable beside them.
    <Pressable
      accessible={false}
      onPress={openTimeline}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={`sensor-card-${spec.key}`}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityHint="Opens Timeline"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && openTimeline()}
        style={styles.summaryGroup}
        testID={`sensor-summary-${spec.key}`}
      >
        <View style={styles.header}>
          <Icon name={spec.icon} size={16} color={spec.iosColor} />
          <Text numberOfLines={1} style={[styles.title, { color: spec.iosColor }]}>
            {spec.title}
          </Text>
          {status.label ? (
            <Text numberOfLines={1} style={[styles.status, { color: statusColor(metricStatusStyle(status.key).color) }]}>
              {status.label}
            </Text>
          ) : null}
          <Icon name="chevRight" size={14} color={iosColors.labelTertiary} />
        </View>

        <View style={styles.valueRow}>
          <Text style={styles.value} testID={`sensor-value-${spec.key}`}>
            {valueText(spec, value, calibrated)}
          </Text>
          {value != null ? <Text style={styles.unit}>{unitText(spec, calibrated)}</Text> : null}
          <View style={styles.spacer} />
          <Text numberOfLines={1} style={[styles.summary, failedAt && styles.failed]}>
            {failedAt ?? rangeSummary(spec, data.stats, range, calibrated)}
          </Text>
        </View>
      </View>

      {uncalibratedSoil ? (
        <View style={styles.notice} testID="soil-not-calibrated">
          <Text style={styles.noticeText}>Not calibrated · raw value, higher is drier</Text>
          <Button variant="plain" size="small" label="Calibrate" onPress={() => router.push(hrefs.calibrate)} />
        </View>
      ) : null}

      <Chart
        spec={spec}
        range={range}
        domain={domain}
        data={data}
        band={band}
        calibrated={calibrated}
        timeZone={timeZone}
        height={CHART_HEIGHT}
        yTicks={3}
        label={`${spec.title}, last ${range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '30 days'}`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: iosColors.groupedBackgroundSecondary,
    borderRadius: IOS_GROUP_RADIUS,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.7 },
  summaryGroup: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...typography.iosSubheadlineEmphasized, flex: 1, minWidth: 0 },
  status: { ...typography.iosFootnoteEmphasized, flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { ...typography.iosTitle1, color: iosColors.labelPrimary },
  unit: { ...typography.iosSubheadlineEmphasized, color: iosColors.labelSecondary },
  spacer: { flex: 1 },
  summary: { ...typography.iosFootnote, color: iosColors.labelSecondary, flexShrink: 1 },
  failed: { color: iosColors.accentOrange },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeText: { ...typography.iosFootnote, color: iosColors.labelSecondary, flex: 1 },
});
