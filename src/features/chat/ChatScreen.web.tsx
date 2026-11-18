import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BOTTOM_BAR_CLEARANCE, PageScroll, useAccountButton } from '@/components/shell';
import { PageHeader } from '@/components/ui';
import { useBreakpoint } from '@/theme';

import { CHAT_END_ID, ChatCard } from './desktop/ChatCard';
import { CONTEXT_CARD_HEIGHT, ContextCard } from './desktop/ContextCard';
import { Conversations } from './desktop/Conversations';
import { dayAnchorId } from './desktop/Messages';
import { anchorPage, useFollowLatest } from './desktop/useFollowLatest';
import { useChat } from './useChat';

const STICKY_TOP = 24;
/** Desktop Chat (Figma Chat / Desktop 1920 and 1512): conversations, chat and what the plant sees. */
export function ChatScreen() {
  const chat = useChat();
  const bp = useBreakpoint();
  const account = useAccountButton();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const layout = bp.screens.chat;

  const last = chat.messages?.at(-1);
  const page = useMemo(() => anchorPage(CHAT_END_ID, bp.tier === 'compact' ? BOTTOM_BAR_CLEARANCE : 0), [bp.tier]);
  useFollowLatest(chat.messages ? `${last?.id ?? 'none'}:${chat.pending?.text ?? ''}:${chat.sending}` : null, page);

  const select = (date: string) => {
    setActiveDay(date);
    document.getElementById(dayAnchorId(date))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const header = (
    <PageHeader
      title="Chat"
      subtitle={`Chat with ${chat.plantName}. Every answer is based on its live sensor readings.`}
      {...account}
    />
  );
  const card = <ChatCard chat={chat} minHeight={layout.chatMinHeight} />;
  const context = <ContextCard chat={chat} />;

  if (bp.tier === 'xl') {
    return (
      <PageScroll testID="chat-screen">
        {header}
        <View style={[styles.row, { gap: layout.columnGap }]}>
          <View style={[styles.sticky, { width: layout.conversationsWidth ?? 360 }]}>
            <Conversations chat={chat} active={activeDay} onSelect={select} minHeight={layout.chatMinHeight} />
          </View>
          <View style={styles.main}>{card}</View>
          <View style={[styles.sticky, { width: layout.contextWidth ?? 360 }]}>{context}</View>
        </View>
      </PageScroll>
    );
  }

  if (bp.tier === 'lg') {
    return (
      <PageScroll testID="chat-screen">
        {header}
        <View style={[styles.row, { gap: layout.columnGap }]}>
          <View style={styles.main}>{card}</View>
          <View style={[styles.sticky, styles.side, { width: layout.sideColumnWidth ?? 376, gap: layout.columnGap }]}>
            {context}
            <Conversations
              chat={chat}
              active={activeDay}
              onSelect={select}
              minHeight={layout.chatMinHeight - CONTEXT_CARD_HEIGHT - layout.columnGap}
            />
          </View>
        </View>
      </PageScroll>
    );
  }

  return (
    <PageScroll testID="chat-screen">
      {header}
      <View style={styles.column}>
        {context}
        {card}
        <Conversations chat={chat} active={activeDay} onSelect={select} />
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  sticky: { position: 'sticky' as 'relative', top: STICKY_TOP },
  side: {},
  column: { gap: 24 },
});
