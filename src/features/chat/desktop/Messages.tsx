import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
import { basedOnText, type ChatDay } from '@/domain/chat-days';
import { formatTime } from '@/domain/format';
import { colors, typography } from '@/theme';

import { ERROR_ROW_TEXT, questionFor, type ChatRow } from '../model';
import { PlantAvatar } from '../PlantAvatar';
import type { ChatModel } from '../useChat';

const BUBBLE_MAX = 480;

export function dayAnchorId(date: string) {
  return `chat-day-${date}`;
}

/** The conversation, grouped by local day, with the optimistic bubble and send errors at the end. */
export function Messages({ chat }: { chat: ChatModel }) {
  const { days = [], messages = [], timeZone, history } = chat;
  return (
    <View style={styles.root} testID="chat-messages">
      {history.hasNextPage ? (
        <View style={styles.older}>
          <Button
            variant="secondary"
            label="Load earlier messages"
            loading={history.isFetchingNextPage}
            onPress={() => void history.fetchNextPage()}
          />
        </View>
      ) : null}
      {history.isFetchNextPageError ? (
        <Text style={styles.olderError}>Couldn’t load earlier messages. Try again.</Text>
      ) : null}
      {days.map((day) => (
        <Day key={day.date} day={day} chat={chat} all={messages} timeZone={timeZone} />
      ))}
      {chat.pending || chat.sending || chat.failed.length ? <Pending chat={chat} /> : null}
    </View>
  );
}

function Day({ day, chat, all, timeZone }: { day: ChatDay<ChatRow>; chat: ChatModel; all: ChatRow[]; timeZone: string }) {
  return (
    <View nativeID={dayAnchorId(day.date)} style={styles.day}>
      <View style={styles.divider}>
        <Text style={styles.dividerPill}>{`${day.label}, ${formatTime(day.messages[0].created_at, timeZone)}`}</Text>
      </View>
      {day.messages.map((m) =>
        m.role === 'user' ? (
          <View key={m.id} style={styles.day}>
            <UserMessage text={m.content} meta={formatTime(m.created_at, timeZone)} />
            {chat.unanswered?.id === m.id ? (
              <View style={styles.sendError} testID="chat-unanswered">
                <Icon name="alert" size={14} color={colors.status.warn} />
                <Text style={styles.sendErrorText}>{chat.unanswered.error ?? 'No answer arrived for this question.'}</Text>
                <Button variant="secondary" label="Retry" onPress={() => void chat.retryUnanswered()} />
              </View>
            ) : null}
          </View>
        ) : (
          <PlantMessage
            key={m.id}
            message={m}
            timeZone={timeZone}
            onRetry={m.error ? retryFor(chat, all, m) : undefined}
          />
        ),
      )}
    </View>
  );
}

function retryFor(chat: ChatModel, all: ChatRow[], reply: ChatRow) {
  const question = questionFor(all, reply);
  return question ? () => chat.submit(question) : undefined;
}

function UserMessage({ text, meta, faded }: { text: string; meta: string; faded?: boolean }) {
  return (
    <View style={styles.user}>
      <View style={[styles.userBubble, faded && styles.faded]}>
        <Text style={styles.userText}>{text}</Text>
      </View>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

function PlantMessage({ message, timeZone, onRetry }: { message: ChatRow; timeZone: string; onRetry?: () => void }) {
  const footer = basedOnText(message.based_on_reading_at, timeZone) ?? formatTime(message.created_at, timeZone);
  return (
    <View style={styles.plant}>
      <PlantAvatar size={30} />
      <View style={styles.plantContent}>
        <View style={styles.plantBubble}>
          <Text style={styles.plantText}>{message.content}</Text>
        </View>
        {message.error ? (
          <View style={styles.errorRow} testID="chat-error-row">
            <Icon name="alert" size={12} color={colors.status.warn} />
            <Text style={styles.metaStrong}>{ERROR_ROW_TEXT}</Text>
            {onRetry ? (
              <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={6}>
                <Text style={styles.link}>Ask again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.footer}>{footer}</Text>
      </View>
    </View>
  );
}

function Pending({ chat }: { chat: ChatModel }) {
  return (
    <View style={styles.day}>
      {chat.failed.map((f) => (
        <View key={f.id} style={styles.day}>
          <UserMessage text={f.text} meta="Not sent" />
          <View style={styles.sendError} testID="chat-send-error">
            <Icon name="alert" size={14} color={colors.status.warn} />
            <Text accessibilityRole="alert" style={styles.sendErrorText}>
              {f.error}
            </Text>
            {f.retry ? <Button variant="secondary" label="Retry" onPress={() => chat.retryFailed(f.id)} /> : null}
            <Button variant="plain" label="Dismiss" onPress={() => chat.dismissFailed(f.id)} />
          </View>
        </View>
      ))}
      {chat.pending ? <UserMessage text={chat.pending.text} meta="Sending…" faded /> : null}
      {chat.sending ? (
        <View style={styles.plant} testID="chat-typing">
          <PlantAvatar size={30} />
          <View style={[styles.plantBubble, styles.typing]}>
            <Text style={styles.typingText}>{`${chat.plantName} is checking its sensors…`}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const bubbleText = { ...typography.pageSubtitle, lineHeight: 20 };

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 18 },
  older: { alignItems: 'center' },
  olderError: { ...typography.meta, color: colors.text.secondary, textAlign: 'center' },
  day: { gap: 18 },
  divider: { alignItems: 'center' },
  dividerPill: {
    ...typography.chartLabel,
    fontSize: 11,
    color: colors.text.tertiary,
    backgroundColor: colors.bg.sidebar,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  user: { alignItems: 'flex-end', gap: 4 },
  userBubble: {
    maxWidth: BUBBLE_MAX,
    backgroundColor: colors.brand.olive,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  faded: { opacity: 0.6 },
  userText: { ...bubbleText, color: colors.surface.card },
  meta: { ...typography.meta, fontSize: 11, color: colors.text.tertiary },
  plant: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  plantContent: { flexShrink: 1, maxWidth: BUBBLE_MAX, gap: 8 },
  plantBubble: { backgroundColor: colors.bg.sidebar, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  plantText: { ...bubbleText, color: colors.text.primary },
  footer: { ...typography.meta, fontSize: 11, color: colors.text.tertiary, paddingLeft: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingLeft: 4 },
  metaStrong: { ...typography.meta, color: colors.text.secondary },
  link: { ...typography.buttonSmall, color: colors.brand.olive, textDecorationLine: 'underline' },
  typing: { alignSelf: 'flex-start' },
  typingText: { ...bubbleText, color: colors.text.secondary },
  sendError: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    alignSelf: 'flex-end',
    gap: 8,
    backgroundColor: colors.data.lightTint,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendErrorText: { ...typography.label, color: colors.text.primary, flexShrink: 1 },
});
