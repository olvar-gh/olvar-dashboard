import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Band } from '@/components/charts';
import { Icon } from '@/components/icons';
import { Button, Card, StatusPill } from '@/components/ui';
import { hrefs } from '@/components/shell';
import { colors, interFamily, radius, typography } from '@/theme';

import { Chart } from './SensorChart';
import {
  statText,
  unitText,
  valueText,
  type MetricSeries,
  type MetricSpec,
  type MetricStatus,
  type Range,
} from './model';

export type SensorCardProps = {
  spec: MetricSpec;
  range: Range;
  domain: readonly [Date, Date];
  data: MetricSeries;
  value: number | null;
  status: MetricStatus;
  band: Band | null;
  calibrated: boolean;
  hardware: string;
  timeZone: string;
  chartHeight: number;
  minHeight: number;
};

/** Desktop sensor card (Figma 227:8164): header, value with min/avg/max, 24 h / 7 d / 30 d chart, hardware line. */
export function SensorCard({
  spec,
  range,
  domain,
  data,
  value,
  status,
  band,
  calibrated,
  hardware,
  timeZone,
  chartHeight,
  minHeight,
}: SensorCardProps) {
  const router = useRouter();
  const uncalibratedSoil = spec.key === 'soil' && !calibrated;
  const label = `${spec.title} over ${range === '24h' ? 'the last 24 hours' : range === '7d' ? 'the last 7 days' : 'the last 30 days'}`;
  const stats = data.stats;

  return (
    <Card minHeight={minHeight} style={styles.card} testID={`sensor-card-${spec.key}`}>
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: spec.tint }]}>
          <Icon name={spec.icon} size={17} color={spec.color} />
        </View>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {spec.title}
        </Text>
        {status.label ? <StatusPill kind="metric" status={status.key} label={status.label} style={styles.pill} /> : null}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${spec.title} in Timeline`}
          onPress={() => router.push('/timeline')}
          hitSlop={8}
          style={styles.arrow}
        >
          <Icon name="arrow" size={16} color={colors.text.tertiary} />
        </Pressable>
      </View>

      <View style={styles.valueRow}>
        <View style={styles.value}>
          <Text style={styles.number} testID={`sensor-value-${spec.key}`}>
            {valueText(spec, value, calibrated)}
          </Text>
          {value != null ? <Text style={styles.unit}>{unitText(spec, calibrated)}</Text> : null}
        </View>
        {stats ? (
          <View style={styles.stats}>
            <Stat label="Min" value={statText(spec, stats.min, calibrated)} />
            <Stat label="Avg" value={statText(spec, stats.avg, calibrated)} />
            <Stat label={spec.key === 'light' ? 'Peak' : 'Max'} value={statText(spec, stats.max, calibrated)} />
          </View>
        ) : null}
      </View>

      {uncalibratedSoil ? (
        <View style={styles.notice} testID="soil-not-calibrated">
          <Text style={styles.noticeText}>
            Not calibrated. Showing the raw probe value; higher means drier.
          </Text>
          <Button variant="secondary" label="Calibrate" onPress={() => router.push(hrefs.calibrate)} />
        </View>
      ) : null}

      <View style={styles.chart}>
        <Chart spec={spec} range={range} domain={domain} data={data} band={band} calibrated={calibrated} timeZone={timeZone} height={chartHeight} label={label} />
      </View>

      <View style={styles.hardware}>
        <Icon name="cpu" size={13} color={colors.text.tertiary} />
        <Text numberOfLines={1} style={styles.hardwareText} testID={`sensor-hardware-${spec.key}`}>
          {hardware}
        </Text>
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, paddingTop: 18, paddingBottom: 14, paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconChip: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.cardTitle, color: colors.text.primary, flex: 1, minWidth: 0 },
  pill: { alignSelf: 'center' },
  arrow: { width: 16, height: 16 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  number: { fontFamily: interFamily[600], fontSize: 40, color: colors.text.primary },
  unit: { fontFamily: interFamily[500], fontSize: 16, color: colors.text.secondary },
  stats: { flexDirection: 'row', gap: 22 },
  stat: { gap: 2 },
  statLabel: { fontFamily: interFamily[500], fontSize: 11, color: colors.text.tertiary },
  statValue: { fontFamily: interFamily[600], fontSize: 14, color: colors.text.primary },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.buttonLarge,
    backgroundColor: colors.data.waterTint,
  },
  noticeText: { ...typography.body, color: colors.text.secondary, flex: 1, minWidth: 0 },
  chart: { flexGrow: 1, justifyContent: 'flex-end' },
  hardware: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  hardwareText: { ...typography.meta, color: colors.text.tertiary, flexShrink: 1 },
});
