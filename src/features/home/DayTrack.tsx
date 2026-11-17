import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { colors, iosColors, typography } from '@/theme';

import type { DayTrackModel } from './model';
import { toneColor, type Variant } from './palette';

const TICKS = ['0:00', '6:00', '12:00', '18:00', '24:00'];

const pct = (f: number): DimensionValue => `${f * 100}%`;

/** Today's 24 h track (Figma "24h track"): event markers, offline stretches, the now line and its time. */
export function DayTrack({ track, variant }: { track: DayTrackModel; variant: Variant }) {
  const s = variant === 'ios' ? ios : desktop;
  const nowAt = Math.min(0.96, Math.max(0.04, track.now));
  return (
    <View
      testID="day-track"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Today so far, now ${track.nowLabel}`}
      style={s.root}
    >
      <View style={s.track}>
        {track.segments.map((seg) => (
          <View
            key={seg.key}
            testID="day-track-offline"
            style={[s.segment, { left: pct(seg.from), width: pct(Math.max(0.004, seg.to - seg.from)) }]}
          />
        ))}
        {track.markers.map((m) => (
          <View
            key={m.key}
            style={[s.marker, { left: pct(m.at), marginLeft: -s.marker.width / 2, backgroundColor: toneColor(m.tone, variant) }]}
          />
        ))}
      </View>
      <View style={[s.nowLine, { left: pct(track.now) }]} />
      <View style={[styles.anchor, s.nowAnchor, { left: pct(nowAt) }]}>
        <View style={s.nowPill}>
          <Text style={s.nowText}>{track.nowLabel}</Text>
        </View>
      </View>
      {TICKS.map((label, i) => (
        <View
          key={label}
          style={[
            s.tickAnchor,
            i === 0
              ? styles.start
              : i === TICKS.length - 1
                ? styles.end
                : [styles.anchor, { left: pct(i / (TICKS.length - 1)) }],
          ]}
        >
          <Text style={s.tick}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// A fixed-width anchor centred on its x keeps a label centred without measuring it.
const ANCHOR = 64;
const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: ANCHOR, marginLeft: -ANCHOR / 2, alignItems: 'center' },
  start: { position: 'absolute', left: 0 },
  end: { position: 'absolute', right: 0 },
});

const desktop = StyleSheet.create({
  root: { height: 64, width: '100%' },
  track: { position: 'absolute', left: 0, right: 0, top: 29, height: 12, borderRadius: 6, backgroundColor: colors.bg.sidebar, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.border.subtle },
  marker: { position: 'absolute', top: 1, width: 12, height: 10, borderRadius: 3 },
  nowLine: { position: 'absolute', top: 22, width: 2, height: 26, marginLeft: -1, borderRadius: 1, backgroundColor: colors.brand.olive },
  nowAnchor: { top: 0 },
  nowPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.brand.olive },
  nowText: { ...typography.buttonSmall, fontSize: 11, color: colors.surface.card },
  tickAnchor: { top: 50 },
  tick: { ...typography.chartLabel, fontFamily: typography.meta.fontFamily, color: colors.text.tertiary },
});

const ios = StyleSheet.create({
  root: { height: 56, width: '100%' },
  track: { position: 'absolute', left: 0, right: 0, top: 22, height: 8, borderRadius: 4, backgroundColor: iosColors.fillTertiary, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0, backgroundColor: iosColors.labelTertiary },
  marker: { position: 'absolute', top: 0, width: 11, height: 8, borderRadius: 3 },
  nowLine: { position: 'absolute', top: 16, width: 2, height: 20, marginLeft: -1, borderRadius: 1, backgroundColor: iosColors.labelPrimary },
  nowAnchor: { top: -6 },
  nowPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: iosColors.labelPrimary },
  nowText: { ...typography.iosCaption1, fontFamily: typography.iosFootnoteEmphasized.fontFamily, color: colors.surface.card },
  tickAnchor: { top: 36 },
  tick: { ...typography.iosCaption1, color: iosColors.labelTertiary },
});
