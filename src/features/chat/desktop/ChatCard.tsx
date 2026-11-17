import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Notice, OfflineBanner, Skeleton } from '@/components/ui';
import { overallStatusStyle } from '@/domain/status-style';
import { statusColor } from '@/components/ui/color';
import { colors, radius, typography } from '@/theme';

import { emptyText } from '../model';
import { PlantAvatar } from '../PlantAvatar';
import type { ChatModel } from '../useChat';
import { Composer } from './Composer';
import { Messages } from './Messages';

/** The conversation card: plant header, messages and the sticky composer. */
export function ChatCard({ chat, minHeight }: { chat: ChatModel; minHeight: number }) {
  const { history } = chat;
  const dot = statusColor(overallStatusStyle(chat.display?.overall).color);
  return (
    <View style={[styles.root, { minHeight }]} testID="chat-card">
      <View style={styles.header}>
        <PlantAvatar size={36} />
        <View style={styles.names}>
          <Text style={styles.name}>{chat.plantName}</Text>
          {chat.presence ? (
            <View style={styles.presence}>
              <View style={[styles.dot, { backgroundColor: dot }]} />
              <Text style={styles.presenceText}>{chat.presence}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {chat.display?.offline ? (
        <OfflineBanner
          device={chat.deviceId}
          since={chat.offlineSince}
          detail="Answers use the last reading until it reconnects."
          style={styles.banner}
        />
      ) : null}
      <View style={styles.body}>
        {history.isError && !chat.messages ? (
          <View style={styles.state}>
            <Notice
              tone="warn"
              testID="chat-load-error"
              action={<Button variant="secondary" label="Retry" loading={history.isFetching} onPress={() => void history.refetch()} />}
            >
              Couldn’t load the conversation. Check your connection and try again.
            </Notice>
          </View>
        ) : !chat.messages ? (
          <View style={styles.state} testID="chat-loading" accessibilityLabel="Loading" accessibilityRole="progressbar">
            <Skeleton width="40%" height={36} radius={18} style={styles.right} />
            <Skeleton width="60%" height={64} radius={16} />
            <Skeleton width="35%" height={36} radius={18} style={styles.right} />
            <Skeleton width="55%" height={48} radius={16} />
          </View>
        ) : chat.messages.length === 0 && !chat.pending && !chat.sending ? (
          <EmptyState title={`Say hello to ${chat.plantName}`} body={emptyText(chat.plantName)} testID="chat-empty" />
        ) : (
          <Messages chat={chat} />
        )}
      </View>
      <Composer chat={chat} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 65,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  names: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...typography.cardTitle, fontSize: 15, color: colors.text.primary },
  presence: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  presenceText: { ...typography.meta, color: colors.text.tertiary },
  banner: { marginHorizontal: 24, marginTop: 16 },
  body: { flexGrow: 1 },
  state: { padding: 24, gap: 18 },
  right: { alignSelf: 'flex-end' },
});
