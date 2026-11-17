import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { iosColors, typography } from '@/theme';

import { METRIC_ICON } from '../desktop/ContextCard';
import { chipValue } from '../model';
import type { ChatModel } from '../useChat';

/** The four live readings the answers are based on, as white capsules (Figma 33:86). */
export function ReadingChips({ chat }: { chat: ChatModel }) {
  return (
    <View style={styles.row} testID="chat-reading-chips">
      {chat.rows.map((row) => {
        const m = METRIC_ICON[row.metric];
        const value = chat.readingLoading ? '…' : chipValue(row, chat.reading);
        return (
          <View
            key={row.metric}
            accessible
            accessibilityLabel={`${row.name} ${row.failed ? 'read failed' : row.value}`}
            style={styles.chip}
          >
            <Icon name={m.icon} size={15} color={row.failed ? iosColors.labelTertiary : m.color} />
            <Text numberOfLines={1} style={[styles.value, row.failed && styles.failed]}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 19,
    backgroundColor: iosColors.groupedBackgroundSecondary,
  },
  value: { ...typography.iosFootnoteEmphasized, color: iosColors.labelPrimary, flexShrink: 1 },
  failed: { color: iosColors.labelSecondary },
});
