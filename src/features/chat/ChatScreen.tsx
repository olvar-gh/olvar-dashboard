import { Stack } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { useAccountButton } from '@/components/shell';
import { EmptyState, NavBar, OfflineBanner, showActionSheet, Skeleton } from '@/components/ui';
import { iosGroupedBackground } from '@/components/ui/color';
import { iosColors, typography } from '@/theme';

import { IosComposer, Suggestions } from './ios/Composer';
import { IosMessages } from './ios/Messages';
import { ReadingChips } from './ios/ReadingChips';
import { useComposerInsets } from './ios/useComposerInsets';
import { emptyText, RATE_LIMIT_RULE } from './model';
import { useChat } from './useChat';

const LOAD_OLDER_WITHIN = 160;
const FOLLOW_WITHIN = 240;
const SETTLE_MS = 1500;

/**
 * iPhone Chat (Figma 33:86): large title, live reading chips, bubbles and a glass composer docked
 * above the tab bar. The header is opaque and keeps its large title, as in the frame: a docked
 * composer needs a wrapper around the scroll view, and the native header only collapses the large
 * title for a scroll view that is the screen root.
 */
export function ChatScreen() {
  const chat = useChat();
  const account = useAccountButton();
  const insets = useComposerInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const dayOffsets = useRef(new Map<string, number>());
  const atEnd = useRef(true);
  const follow = useRef<'none' | 'jump' | 'animate'>('none');
  const jumpUntil = useRef(0);
  const seenFirst = useRef(false);
  const dragged = useRef(false);
  const listY = useRef(0);
  const olderFrom = useRef<{ offset: number; height: number } | null>(null);

  const lastKey = chat.messages ? `${chat.messages.at(-1)?.id ?? 'none'}:${chat.pending?.text ?? ''}:${chat.sending}` : null;
  useEffect(() => {
    if (lastKey == null) return;
    if (!seenFirst.current) {
      seenFirst.current = true;
      follow.current = 'jump';
      jumpUntil.current = Date.now() + SETTLE_MS;
    } else if (atEnd.current) {
      follow.current = 'animate';
    }
  }, [lastKey]);

  const onContentSizeChange = (_w: number, height: number) => {
    const older = olderFrom.current;
    if (older && height > older.height) {
      // Older messages went in above: keep the message that was on screen where it was.
      olderFrom.current = null;
      scroll.current?.scrollTo({ y: older.offset + height - older.height, animated: false });
      return;
    }
    if (follow.current === 'none') return;
    const animated = follow.current === 'animate';
    // The first jump repeats while the history and fonts settle, so it lands on the newest message.
    if (animated || Date.now() > jumpUntil.current) follow.current = 'none';
    scroll.current?.scrollToEnd({ animated });
  };

  const limited = !!chat.rateLimit;
  useEffect(() => {
    if (limited) Alert.alert(`${chat.plantName} needs a breather`, RATE_LIMIT_RULE);
  }, [limited, chat.plantName]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    atEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - FOLLOW_WITHIN;
    if (dragged.current && contentOffset.y < LOAD_OLDER_WITHIN && chat.history.hasNextPage && !chat.history.isFetchingNextPage) {
      olderFrom.current = { offset: contentOffset.y, height: contentSize.height };
      void chat.history.fetchNextPage();
    }
  };

  const pickDay = async () => {
    const days = [...(chat.days ?? [])].reverse();
    if (!days.length) return;
    const i = await showActionSheet({
      title: 'Past conversations',
      options: days.map((d) => `${d.label} · ${d.preview}`),
    });
    const y = i == null ? undefined : dayOffsets.current.get(days[i].date);
    if (y != null) scroll.current?.scrollTo({ y: listY.current + y, animated: true });
  };

  const body = chat.history.isError && !chat.messages ? (
    <EmptyState
      icon="wifiOff"
      title="Couldn’t load the conversation"
      body="Check your connection and try again."
      action={{ label: 'Try Again', onPress: () => void chat.history.refetch() }}
      testID="chat-load-error"
    />
  ) : !chat.messages ? (
    <View style={styles.loading} testID="chat-loading" accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Skeleton width="55%" height={40} radius={20} style={styles.right} />
      <Skeleton width="75%" height={84} radius={20} />
      <Skeleton width="45%" height={40} radius={20} style={styles.right} />
    </View>
  ) : chat.messages.length === 0 && !chat.pending && !chat.sending ? (
    <EmptyState title={`Say hello to ${chat.plantName}`} body={emptyText(chat.plantName)} testID="chat-empty" />
  ) : null;

  return (
    <View style={styles.root} testID="chat-screen">
      <NavBar
        title="Chat"
        actions={[
          { label: 'Past conversations', sf: 'clock.arrow.circlepath', icon: 'clock', onPress: pickDay, disabled: !chat.days?.length },
          ...(account.avatar ? [{ label: 'Account', sf: 'person.crop.circle' as const, icon: 'user' as const, onPress: account.onAvatarPress }] : []),
        ]}
      />
      <Stack.Screen options={{ headerTransparent: false, headerStyle: { backgroundColor: iosGroupedBackground } }} />
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        onScrollBeginDrag={() => (dragged.current = true)}
        onContentSizeChange={onContentSizeChange}
        onLayout={() => {
          if (atEnd.current) scroll.current?.scrollToEnd({ animated: false });
        }}
        scrollEventThrottle={64}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.dockHeight }]}
      >
        <View style={styles.top}>
          <Text style={styles.subtitle}>{`Answers come from ${chat.plantName}’s live readings`}</Text>
          <ReadingChips chat={chat} />
          {chat.display?.offline ? (
            <OfflineBanner device={chat.deviceId} since={chat.offlineSince} detail="Answers use the last reading." />
          ) : null}
        </View>
        {body ? <View style={styles.state}>{body}</View> : null}
        {body ? null : <IosMessages
            chat={chat}
            onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}
            onDayLayout={(date, y) => dayOffsets.current.set(date, y)}
          />}
        <View style={styles.suggestions}>
          <Suggestions chat={chat} />
        </View>
      </ScrollView>
      <View onLayout={insets.onOuterLayout} pointerEvents="box-none" style={[styles.dock, { bottom: insets.lift }]}>
        <SafeAreaView edges={{ bottom: true }} pointerEvents="box-none">
          <View onLayout={insets.onInnerLayout}>
            <IosComposer chat={chat} />
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: iosGroupedBackground },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  top: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, gap: 14 },
  subtitle: { ...typography.iosSubheadline, color: iosColors.labelSecondary },
  state: { flexGrow: 1, paddingHorizontal: 16 },
  suggestions: { paddingHorizontal: 16, paddingBottom: 12 },
  loading: { gap: 14, paddingTop: 12 },
  right: { alignSelf: 'flex-end' },
  dock: { position: 'absolute', left: 0, right: 0 },
});
