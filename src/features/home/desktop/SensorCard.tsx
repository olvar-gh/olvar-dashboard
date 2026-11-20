import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hrefs } from '@/components/shell';
import { Icon } from '@/components/icons';
import { Button, Notice } from '@/components/ui';
import { statusColor } from '@/components/ui/color';
import { metricStatusStyle } from '@/domain/status-style';
import { colors, radius, typography } from '@/theme';

import type { SensorCardModel } from '../model';
import { METRIC_LOOK } from '../palette';
import { SensorChart } from '../SensorChart';
import type { SensorCharts } from '../useHome';
import { Gradient } from './Gradient';

type Props = { card: SensorCardModel; charts: SensorCharts; minHeight: number };

/** Desktop sensor card (Figma Card/Soil moisture, Light, Temperature, Humidity; 544 × 232 at 1920). */
export function SensorCard({ card, charts, minHeight }: Props) {
  const router = useRouter();
  const look = METRIC_LOOK[card.metric];
  const dot = statusColor(metricStatusStyle(card.statusKey).color);
  const side = card.metric === 'humidity';
  const chart = card.notCalibrated ? (
    <Notice
      tone="warn"
      icon="target"
      action={<Button variant="secondary" label="Calibrate" onPress={() => router.push(hrefs.calibrate)} />}
    >
      Not calibrated. Calibrate in dry air and in water to see moisture in %.
    </Notice>
  ) : (
    <SensorChart metric={card.metric} charts={charts} variant="desktop" />
  );

  return (
    <View testID={`sensor-${card.metric}`} style={[styles.card, { minHeight }]}>
      <Gradient tint={look.tint} diagonal />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${look.desktopTitle} details`}
        onPress={() => router.push('/sensors')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.header, (pressed || hovered) && styles.hovered]}
      >
        <View style={styles.chip}>
          <Icon name={look.icon} size={16} color={look.color} />
        </View>
        <Text style={styles.title}>{look.desktopTitle}</Text>
        <Icon name="arrow" size={16} color={colors.text.tertiary} />
      </Pressable>
      <View style={side ? styles.sideBody : styles.body}>
        <View style={styles.valueRow}>
          <Text testID={`sensor-${card.metric}-value`} style={styles.value}>
            {card.value}
          </Text>
          {card.value !== '-' ? <Text style={styles.unit}>{card.unit}</Text> : null}
        </View>
        <View style={side ? styles.gauge : styles.chart}>{chart}</View>
      </View>
      <View style={styles.footer}>
        <View style={styles.status}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text numberOfLines={1} style={styles.statusText}>
            {card.range ? `${card.statusLabel} · ${card.range}` : card.statusLabel}
          </Text>
        </View>
        {card.meta ? (
          <Text numberOfLines={1} style={[styles.meta, card.readFailed && styles.metaWarn]}>
            {card.meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.card,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 10 },
  hovered: { opacity: 0.8 },
  chip: {
    width: 30,
    height: 30,
    borderRadius: radius.iconChip,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.sensorTitle, color: colors.text.primary, flex: 1 },
  body: { flex: 1, gap: 12, marginTop: 10 },
  sideBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  value: { ...typography.value, color: colors.text.primary },
  unit: { ...typography.unit, color: colors.text.secondary },
  chart: { flex: 1, justifyContent: 'flex-end', minHeight: 64 },
  gauge: { marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { ...typography.status, color: colors.text.secondary, flexShrink: 1 },
  meta: { ...typography.meta, color: colors.text.tertiary, marginLeft: 'auto', textAlign: 'right', flexShrink: 1 },
  metaWarn: { color: colors.status.warn },
});
