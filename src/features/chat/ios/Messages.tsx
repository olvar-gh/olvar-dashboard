import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { showActionSheet } from '@/components/ui';
import { basedOnText, type ChatDay } from '@/domain/chat-days';
import { formatTime } from '@/domain/format';
import { colors, iosColors, typography } from '@/theme';

import { ERROR_ROW_TEXT, questionFor, type ChatRow } from '../model';
import { PlantAvatar } from '../PlantAvatar';
import type { ChatModel } from '../useChat';

type Props = { chat: ChatModel; onDayLayout: (date: string, y: number) => void; onLayout?: (e: LayoutChangeEvent) => void };

/** Day-grouped bubbles; a failed send or a fallback answer offers a native action sheet. */
export function IosMessages({ chat, onDayLayout, onLayout }: Props) {
  const { days = [], messages = [], timeZone } = chat;
  return (
    <View style={styles.list} onLayout={onLayout}>
      {chat.history.isFetchingNextPage ? <Text style={[styles.divider, styles.older]}>Loading earlier messages…</Text> : null}
      {days.map((day) => (
        <Day key={day.date} day={day} chat={chat} all={messages} timeZone={timeZone} onDayLayout={onDayLayout} />
      ))}
      {chat.pending || chat.sending || chat.sendError ? <Pending chat={chat} /> : null}
    </View>
  );
}

function Day({ day, chat, all, timeZone, onDayLayout }: { day: ChatDay<ChatRow>; chat: ChatModel; all: ChatRow[]; timeZone: string } & Pick<Props, 'onDayLayout'>) {
  return (
    <View style={styles.day} onLayout={(e) => onDayLayout(day.date, e.nativeEvent.layout.y)}>
      <Text style={styles.divider}>{`${day.label} ${formatTime(day.messages[0].created_at, timeZone)}`}</Text>
      {day.messages.map((m) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} text={m.content} />
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
  const { pending, sendError } = chat;
  const options = async () => {
    if (!sendError) return;
    const choices = sendError.retry ? ['Try Again', 'Delete'] : ['Delete'];
    const i = await showActionSheet({ title: sendError.text, options: choices, destructiveIndex: choices.length - 1 });
    if (i == null) return;
    if (choices[i] === 'Try Again') chat.retrySend();
    else chat.dismissSendError();
  };
  return (
    <View style={styles.day} testID={sendError ? 'chat-send-error' : undefined}>
      {pending ? (
        sendError ? (
          <UserBubble text={pending.text} note={`Not sent. ${sendError.text}`} onPress={options} />
        ) : (
          <UserBubble text={pending.text} faded />
        )
      ) : sendError ? (
        <Pressable accessibilityRole="button" onPress={options} style={styles.user}>
          <Text style={[styles.note, styles.noteError]}>{`${sendError.text} Tap for options.`}</Text>
        </Pressable>
      ) : null}
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
  divider: { ...typography.iosCaption1, color: iosColors.labelTertiary, textAlign: 'center', paddingTop: 4 },
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
