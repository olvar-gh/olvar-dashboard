import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { hrefs } from '@/components/shell';
import { Button } from '@/components/ui';
import { colors, iosColors, typography } from '@/theme';

import type { SensorCardModel } from '../model';
import { METRIC_LOOK } from '../palette';
import { SensorChart } from '../SensorChart';
import type { SensorCharts } from '../useHome';

/** iPhone 2×2 sensor card (Figma 20:55 "Sensor/Moisture" etc.). */
export function SensorCard({ card, charts }: { card: SensorCardModel; charts: SensorCharts }) {
  const router = useRouter();
  const look = METRIC_LOOK[card.metric];
  const caption = card.readFailed || card.meta?.startsWith('Last reading') ? card.meta : card.notCalibrated ? 'Not calibrated' : card.statusLabel;
  return (
    <Pressable
      testID={`sensor-${card.metric}`}
      accessibilityRole="button"
      accessibilityLabel={`${look.desktopTitle}, ${card.value === '-' ? 'no value' : `${card.value} ${card.unit}`}, ${card.statusLabel}`}
      onPress={() => router.push('/sensors')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Icon name={look.icon} size={16} color={look.iosColor} />
        <Text numberOfLines={1} style={[styles.title, { color: look.iosColor }]}>
          {look.iosTitle}
        </Text>
        <Icon name="chevRight" size={14} color={iosColors.labelTertiary} />
      </View>
      <View style={styles.valueRow}>
        <Text testID={`sensor-${card.metric}-value`} style={styles.value}>
          {card.value}
        </Text>
        {card.value !== '-' ? <Text style={styles.unit}>{card.unit}</Text> : null}
      </View>
      <View style={[styles.chart, card.metric === 'humidity' && styles.center]}>
        {card.notCalibrated ? (
          <Button variant="secondary" size="small" label="Calibrate" onPress={() => router.push(hrefs.calibrate)} />
        ) : (
          <SensorChart metric={card.metric} charts={charts} variant="ios" />
        )}
      </View>
      <Text numberOfLines={2} style={[styles.caption, card.readFailed && styles.warn]}>
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: iosColors.groupedBackgroundSecondary,
    borderRadius: 22,
    borderCurve: 'continuous',
    padding: 14,
    gap: 8,
  },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { ...typography.iosSubheadlineEmphasized, flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  value: { ...typography.iosTitle1, color: iosColors.labelPrimary },
  unit: { ...typography.iosSubheadlineEmphasized, color: iosColors.labelSecondary },
  chart: { minHeight: 56, justifyContent: 'center', alignItems: 'stretch' },
  center: { alignItems: 'center' },
  caption: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  warn: { color: colors.status.warn },
});
