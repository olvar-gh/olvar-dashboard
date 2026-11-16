import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, typography } from '@/theme';

import { Gauge } from './Gauge';
import { HourBars } from './HourBars';
import { LineArea } from './LineArea';
import { RangeBar } from './RangeBar';
import { StepLine } from './StepLine';
import { WeekChart } from './WeekChart';
import {
  SAMPLE_DAY,
  SAMPLE_NOW,
  SAMPLE_TZ,
  sampleHumidity24h,
  sampleLightHourly,
  sampleSoil24h,
  sampleTemperature24h,
  sampleWeek,
} from './samples';

const HOUR = 3_600_000;

function Panel({ title, width, children }: { title: string; width: number; children: ReactNode }) {
  return (
    <View style={[styles.panel, { maxWidth: width }]} testID="gallery-panel">
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

/** Chart section of the dev gallery: every chart in its Figma states, from fixed sample data. */
export function ChartsGallery() {
  const week = sampleWeek();
  const homeLight: readonly [number, number] = [Date.parse('2026-11-06T05:00:00Z'), Date.parse('2026-11-06T18:00:00Z')];
  const allNull = sampleSoil24h().map((p) => ({ ...p, v: null }));

  return (
    <View style={styles.root} testID="charts-gallery">
      <Text style={styles.heading}>Charts</Text>
      <View style={styles.grid}>
        <Panel title="StepLine · soil 24 h" width={764}>
          <StepLine
            data={sampleSoil24h()}
            domain={SAMPLE_DAY}
            timeZone={SAMPLE_TZ}
            color={colors.data.water}
            band={{ min: 35, max: 60 }}
            floor={0}
            ceil={100}
          />
        </Panel>
        <Panel title="HourBars · light 24 h" width={764}>
          <HourBars data={sampleLightHourly()} domain={SAMPLE_DAY} timeZone={SAMPLE_TZ} now={SAMPLE_NOW} />
        </Panel>
        <Panel title="LineArea · temperature 24 h (read-failed gap)" width={764}>
          <LineArea
            data={sampleTemperature24h()}
            domain={SAMPLE_DAY}
            timeZone={SAMPLE_TZ}
            color={colors.data.temp}
            band={{ min: 18, max: 27 }}
          />
        </Panel>
        <Panel title="LineArea · humidity 24 h" width={764}>
          <LineArea
            data={sampleHumidity24h()}
            domain={SAMPLE_DAY}
            timeZone={SAMPLE_TZ}
            color={colors.data.humidity}
            band={{ min: 40, max: 70 }}
            floor={0}
            ceil={100}
          />
        </Panel>
        <Panel title="LineArea mini · soil 7 d" width={544}>
          <LineArea
            variant="mini"
            curve="linear"
            data={sampleWeek().soil}
            domain={[SAMPLE_NOW - 7 * 24 * HOUR, SAMPLE_NOW]}
            timeZone={SAMPLE_TZ}
            color={colors.data.water}
            threshold={{ value: 35, label: '35% water line' }}
          />
        </Panel>
        <Panel title="HourBars mini · light today" width={544}>
          <HourBars
            variant="mini"
            data={sampleLightHourly(homeLight[0], homeLight[1])}
            domain={homeLight}
            timeZone={SAMPLE_TZ}
            now={SAMPLE_NOW}
          />
        </Panel>
        <Panel title="RangeBar · temperature today" width={544}>
          <RangeBar min={10} max={35} band={{ min: 18, max: 27 }} low={19.8} high={24.6} value={23.4} />
        </Panel>
        <Panel title="Gauge · humidity" width={544}>
          <View style={styles.row} testID="gauge-row">
            <Gauge value={58} band={{ min: 40, max: 70 }} />
            <Gauge value={null} band={{ min: 40, max: 70 }} />
          </View>
        </Panel>
        <Panel title="WeekChart · this week" width={1104}>
          <WeekChart
            weekStart="2026-11-01"
            timeZone={SAMPLE_TZ}
            soil={week.soil}
            temperature={week.temperature}
            waterLine={{ value: 35, label: '35% water line' }}
            today="2026-11-06"
          />
        </Panel>
        <Panel title="Empty and all-null series" width={764}>
          <LineArea
            data={[]}
            domain={SAMPLE_DAY}
            timeZone={SAMPLE_TZ}
            color={colors.data.water}
            band={{ min: 35, max: 60 }}
            height={160}
          />
          <LineArea data={allNull} domain={SAMPLE_DAY} timeZone={SAMPLE_TZ} color={colors.data.temp} height={160} />
        </Panel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', gap: 16, padding: 16 },
  heading: { ...typography.cardTitle, color: colors.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  panel: {
    flexBasis: 360,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: space.cardHeaderGap,
    paddingHorizontal: space.cardPaddingX,
    paddingVertical: space.cardPaddingY,
    backgroundColor: colors.surface.card,
    borderColor: colors.border.subtle,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  title: { ...typography.sensorTitle, color: colors.text.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
});
