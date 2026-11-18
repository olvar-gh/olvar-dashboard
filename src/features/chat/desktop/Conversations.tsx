import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Card, Skeleton } from '@/components/ui';
import { colors, typography } from '@/theme';

import type { ChatModel } from '../useChat';

export type ConversationsProps = {
  chat: ChatModel;
  active: string | null;
  onSelect: (date: string) => void;
  minHeight?: number;
};

/** "Past conversations": the single conversation grouped by local day, newest first. */
export function Conversations({ chat, active, onSelect, minHeight }: ConversationsProps) {
  const days = chat.days ? [...chat.days].reverse() : undefined;
  return (
    <Card title="Past conversations" minHeight={minHeight} testID="chat-conversations">
      {!days ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={40} />
          ))}
        </View>
      ) : days.length === 0 ? (
        <Text style={styles.empty}>{`Your conversations with ${chat.plantName} will be listed here by day.`}</Text>
      ) : (
        <View style={styles.list}>
          {days.map((d) => {
            const selected = d.date === (active ?? days[0].date);
            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(d.date)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.row, (selected || pressed || hovered) && styles.selected]}
              >
                <Icon name="chat" size={16} color={colors.text.secondary} />
                <View style={styles.text}>
                  <Text numberOfLines={1} style={styles.title}>
                    {d.preview}
                  </Text>
                  <Text style={styles.date}>{d.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 10, borderRadius: 10 },
  selected: { backgroundColor: colors.bg.sidebar },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.unit, color: colors.text.primary },
  date: { ...typography.meta, color: colors.text.tertiary },
  empty: { ...typography.body, color: colors.text.secondary },
});
