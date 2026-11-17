import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Modal } from '@/components/ui';
import { addDays, type LocalDate } from '@/domain/time';
import { colors, iosColors, typography } from '@/theme';

import { monthTitle, weekDates, weekStartOf } from './week';

export type JumpToDateProps = {
  visible: boolean;
  onDismiss: () => void;
  onPick: (date: LocalDate) => void;
  today: LocalDate;
  /** Oldest date inside the 90-day raw retention. */
  oldest: LocalDate;
  /** Week currently shown, highlighted in the grid. */
  weekStart: LocalDate;
};

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthOf(date: LocalDate) {
  const [y, m] = date.split('-').map(Number);
  return { y, m };
}

function firstOfMonth(y: number, m: number): LocalDate {
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function shiftMonth(y: number, m: number, by: number) {
  const i = y * 12 + (m - 1) + by;
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
}

/** Month grid limited to the 90-day history; picking a day shows its week. */
export function JumpToDate({ visible, onDismiss, onPick, today, oldest, weekStart }: JumpToDateProps) {
  const [month, setMonth] = useState(() => monthOf(weekStart));
  const first = firstOfMonth(month.y, month.m);
  const gridStart = weekStartOf(first);
  const next = shiftMonth(month.y, month.m, 1);
  const weeks: LocalDate[][] = [];
  for (let s = gridStart; s < firstOfMonth(next.y, next.m); s = addDays(s, 7)) weeks.push(weekDates(s));
  const canPrevMonth = first > oldest;
  const canNextMonth = firstOfMonth(next.y, next.m) <= today;
  const shownWeek = new Set(weekDates(weekStart));

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      title="Jump to date"
      subtitle="History covers the last 90 days."
      cancel={{ label: 'Cancel', onPress: onDismiss }}
      testID="jump-to-date"
    >
      <View style={styles.monthBar}>
        <MonthButton icon="chevLeft" label="Previous month" disabled={!canPrevMonth} onPress={() => setMonth(shiftMonth(month.y, month.m, -1))} />
        <Text accessibilityRole="header" style={styles.month}>
          {monthTitle(month.y, month.m)}
        </Text>
        <MonthButton icon="chevRight" label="Next month" disabled={!canNextMonth} onPress={() => setMonth(next)} />
      </View>
      <View style={styles.row}>
        {LETTERS.map((l, i) => (
          <Text key={i} style={[styles.cell, styles.letter]}>
            {l}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.row}>
          {week.map((date) => {
            const inMonth = monthOf(date).m === month.m;
            const enabled = inMonth && date >= oldest && date <= today;
            const shown = shownWeek.has(date) && inMonth;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={date}
                accessibilityState={{ disabled: !enabled, selected: shown }}
                disabled={!enabled}
                onPress={() => {
                  onPick(date);
                  onDismiss();
                }}
                style={({ pressed }) => [styles.cell, styles.day, shown && styles.shown, pressed && styles.pressed]}
                testID={`jump-${date}`}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && styles.hidden,
                    !enabled && styles.disabledText,
                    date === today && styles.todayText,
                  ]}
                >
                  {Number(date.slice(8))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Modal>
  );
}

function MonthButton({ icon, label, disabled, onPress }: { icon: 'chevLeft' | 'chevRight'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.monthButton, disabled && styles.disabled]}
    >
      <Icon name={icon} size={16} color={colors.text.secondary} />
    </Pressable>
  );
}

const ios = Platform.OS === 'ios';

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  month: ios ? { ...typography.iosSubheadlineEmphasized, color: iosColors.labelPrimary } : { ...typography.cardTitle, color: colors.text.primary },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: ios ? 0 : 1,
    borderColor: colors.border.subtle,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: 40 },
  letter: { ...typography.meta, lineHeight: 40, color: colors.text.tertiary },
  day: { borderRadius: 20 },
  shown: { backgroundColor: colors.brand.sageTint },
  pressed: { opacity: 0.6 },
  dayText: ios ? { ...typography.iosBody, color: iosColors.labelPrimary } : { ...typography.label, color: colors.text.primary },
  todayText: { color: colors.brand.olive, fontFamily: typography.buttonLarge.fontFamily },
  disabledText: { color: colors.text.tertiary, opacity: 0.5 },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.4 },
});
