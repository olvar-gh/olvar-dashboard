import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { showActionSheet } from '@/components/ui';
import { basedOnText, type ChatDay } from '@/domain/chat-days';
import { formatTime } from '@/domain/format';
import { colors, iosColors, typography } from '@/theme';

import { ERROR_ROW_TEXT, questionFor, type ChatRow } from '../model';
import { PlantAvatar } from '../PlantAvatar';
import type { ChatModel } from '../useChat';

type Props = {
  chat: ChatModel;
  onDayLayout: (date: string, y: number) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Fetches the older page with a fresh scroll anchor. */
  onLoadOlder: () => void;
};

/** Day-grouped bubbles; a failed send or a fallback answer offers a native action sheet. */
export function IosMessages({ chat, onDayLayout, onLayout, onLoadOlder }: Props) {
  const { days = [], messages = [], timeZone } = chat;
  return (
    <View style={styles.list} onLayout={onLayout}>
      {chat.history.hasNextPage ? (
        // Its space is kept while idle, so showing it does not move the conversation.
        <Text
          testID="chat-loading-older"
          accessibilityElementsHidden={!chat.history.isFetchingNextPage}
          style={[styles.divider, styles.older, !chat.history.isFetchingNextPage && styles.idle]}>
          Loading earlier messages…
        </Text>
      ) : null}
      {chat.history.isFetchNextPageError && !chat.history.isFetchingNextPage ? (
        <View style={styles.olderError} testID="chat-older-error">
          <Text style={[styles.note, styles.noteError]}>Couldn’t load earlier messages.</Text>
          <Pressable accessibilityRole="button" onPress={onLoadOlder} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {days.map((day) => (
        <Day key={day.date} day={day} chat={chat} all={messages} timeZone={timeZone} onDayLayout={onDayLayout} />
      ))}
      {chat.pending || chat.sending || chat.failed.length ? <Pending chat={chat} /> : null}
    </View>
  );
}

function Day({ day, chat, all, timeZone, onDayLayout }: { day: ChatDay<ChatRow>; chat: ChatModel; all: ChatRow[]; timeZone: string } & Pick<Props, 'onDayLayout'>) {
  return (
    <View style={styles.day} onLayout={(e) => onDayLayout(day.date, e.nativeEvent.layout.y)}>
      <Text style={styles.divider}>{`${day.label} ${formatTime(day.messages[0].created_at, timeZone)}`}</Text>
      {day.messages.map((m) =>
        m.role === 'user' ? (
          <View key={m.id} style={styles.question}>
            <UserBubble text={m.content} />
            {chat.unanswered?.id === m.id ? <Unanswered chat={chat} /> : null}
          </View>
        ) : (
          <PlantBubble key={m.id} message={m} timeZone={timeZone} onRetry={m.error ? retryFor(chat, all, m) : undefined} />
        ),
      )}
    </View>
  );
}

function retryFor(chat: ChatModel, all: ChatRow[], reply: ChatRow) {
  const question = questionFor(all, reply);
  return question ? () => chat.submit(question) : undefined;
}

/** Under the newest question when no answer to it was stored. */
function Unanswered({ chat }: { chat: ChatModel }) {
  return (
    <View style={styles.unanswered} testID="chat-unanswered">
      <Text style={[styles.note, styles.noteError]}>No answer arrived.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={() => void chat.retryUnanswered()} hitSlop={8}>
        <Text style={styles.retry}>Retry</Text>
      </Pressable>
    </View>
  );
}

function UserBubble({ text, note, faded, onPress }: { text: string; note?: string; faded?: boolean; onPress?: () => void }) {
  return (
    <View style={styles.user}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityHint={onPress ? 'Shows options for this message' : undefined}
        style={[styles.userBubble, faded && styles.faded]}
      >
        <Text style={styles.userText}>{text}</Text>
      </Pressable>
      {note ? <Text style={[styles.note, onPress && styles.noteError]}>{note}</Text> : null}
    </View>
  );
}

function PlantBubble({ message, timeZone, onRetry }: { message: ChatRow; timeZone: string; onRetry?: () => void }) {
  const footer = basedOnText(message.based_on_reading_at, timeZone);
  const ask = async () => {
    const i = await showActionSheet({ title: ERROR_ROW_TEXT, options: ['Ask Again'] });
    if (i === 0) onRetry?.();
  };
  return (
    <View style={styles.plant}>
      <PlantAvatar size={26} />
      <View style={styles.plantContent}>
        <Pressable
          disabled={!onRetry}
          onPress={ask}
          accessibilityRole={onRetry ? 'button' : undefined}
          style={styles.plantBubble}
        >
          <Text style={styles.plantText}>{message.content}</Text>
        </Pressable>
        {message.error ? (
          <Text style={[styles.note, styles.noteError]} testID="chat-error-row">
            {onRetry ? `${ERROR_ROW_TEXT} Tap to ask again.` : ERROR_ROW_TEXT}
          </Text>
        ) : footer ? (
          <Text style={styles.note}>{footer}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Pending({ chat }: { chat: ChatModel }) {
  const options = async (failure: ChatModel['failed'][number]) => {
    const choices = failure.retry ? ['Try Again', 'Delete'] : ['Delete'];
    const i = await showActionSheet({ title: failure.error, options: choices, destructiveIndex: choices.length - 1 });
    if (i == null) return;
    if (choices[i] === 'Try Again') chat.retryFailed(failure.id);
    else chat.dismissFailed(failure.id);
  };
  return (
    <View style={styles.day}>
      {chat.failed.map((f) => (
        <View key={f.id} testID="chat-send-error">
          <UserBubble text={f.text} note={`Not sent. ${f.error}`} onPress={() => void options(f)} />
        </View>
      ))}
      {chat.pending ? <UserBubble text={chat.pending.text} faded /> : null}
      {chat.sending ? (
        <View style={styles.plant} testID="chat-typing">
          <PlantAvatar size={26} />
          <View style={[styles.plantBubble, styles.typing]}>
            <Text style={styles.typingText}>{`${chat.plantName} is checking its sensors…`}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 16 },
  day: { gap: 14, paddingBottom: 14 },
  older: { paddingBottom: 14 },
  idle: { opacity: 0 },
  olderError: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 14 },
  retry: { ...typography.iosCaption1, color: colors.brand.olive, fontWeight: '600' },
  divider: { ...typography.iosCaption1, color: iosColors.labelTertiary, textAlign: 'center', paddingTop: 4 },
  question: { gap: 4 },
  unanswered: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
  user: { alignItems: 'flex-end', gap: 4, paddingLeft: 48 },
  userBubble: { backgroundColor: colors.brand.olive, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  faded: { opacity: 0.6 },
  userText: { ...typography.iosBody, color: '#ffffff' },
  plant: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingRight: 40 },
  plantContent: { flexShrink: 1, gap: 4 },
  plantBubble: { backgroundColor: iosColors.groupedBackgroundSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  plantText: { ...typography.iosBody, color: iosColors.labelPrimary },
  note: { ...typography.iosCaption1, color: iosColors.labelSecondary, paddingHorizontal: 6 },
  noteError: { color: colors.status.alert },
  typing: { alignSelf: 'flex-start' },
  typingText: { ...typography.iosBody, color: iosColors.labelSecondary },
});
