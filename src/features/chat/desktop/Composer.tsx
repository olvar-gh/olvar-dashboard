import { useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent } from 'react-native';

import { Icon } from '@/components/icons';
import { BOTTOM_BAR_CLEARANCE } from '@/components/shell';
import { Button, Notice } from '@/components/ui';
import { formatNumber } from '@/domain/format';
import { colors, typography, useBreakpoint } from '@/theme';

import { DISCLAIMER, isSendKey, MAX_MESSAGE_CHARS, RATE_LIMIT_RULE, suggestions, type ComposerKey } from '../model';
import type { ChatModel } from '../useChat';

const COUNTER_FROM = MAX_MESSAGE_CHARS - 200;
const INPUT_MIN = 36;
const INPUT_MAX = 160;

type Measurable = { style: { height: string }; scrollHeight: number };

/**
 * The textarea height for its current text. `scrollHeight` never reports less than the box it
 * is measured in, so the box is collapsed to one line first; otherwise a shorter draft would
 * keep the height of the longest one.
 */
export function fitInputHeight(node: Measurable): number {
  const prev = node.style.height;
  node.style.height = `${INPUT_MIN}px`;
  const content = node.scrollHeight;
  node.style.height = prev;
  return Math.min(INPUT_MAX, Math.max(INPUT_MIN, content));
}

function isMeasurable(node: unknown): node is Measurable {
  const n = node as Partial<Measurable> | null;
  return typeof n?.scrollHeight === 'number' && typeof n.style === 'object';
}

/** Suggestion chips, the message field and the disclaimer; sticks to the bottom of the viewport, above the compact bottom bar. */
export function Composer({ chat }: { chat: ChatModel }) {
  const length = chat.draft.trim().length;
  const compact = useBreakpoint().tier === 'compact';
  const [height, setHeight] = useState(INPUT_MIN);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useLayoutEffect(() => {
    if (isMeasurable(input.current)) setHeight(fitInputHeight(input.current));
  }, [chat.draft]);
  const onKeyPress = (e: NativeSyntheticEvent<ComposerKey>) => {
    if (isSendKey(e.nativeEvent)) {
      e.preventDefault();
      chat.sendDraft();
    }
  };
  return (
    <View testID="chat-composer" style={[styles.root, { bottom: compact ? BOTTOM_BAR_CLEARANCE : 0 }]}>
      {chat.rateLimit ? (
        <Notice tone="warn" icon="clock" testID="chat-rate-limit">
          {`${chat.rateLimit} ${RATE_LIMIT_RULE}`}
        </Notice>
      ) : null}
      {chat.notice ? (
        <Notice tone="warn" icon="wifiOff" testID="chat-offline" action={<Button variant="plain" label="Dismiss" onPress={chat.dismissNotice} />}>
          {chat.notice}
        </Notice>
      ) : null}
      <View style={styles.chips}>
        {suggestions(chat.reading?.temperature_c).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            disabled={!!chat.rateLimit || chat.sending || !chat.ready}
            onPress={() => chat.submit(s)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.chip, (pressed || hovered) && styles.chipHover]}
          >
            <Icon name="sparkle" size={13} color={colors.brand.olive} />
            <Text style={styles.chipText}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.field}>
        <TextInput
          ref={input}
          testID="chat-input"
          accessibilityLabel={`Message ${chat.plantName}`}
          placeholder={`Ask ${chat.plantName} anything…`}
          placeholderTextColor={colors.text.tertiary}
          value={chat.draft}
          onChangeText={chat.setDraft}
          onKeyPress={onKeyPress}
          multiline
          numberOfLines={1}
          maxLength={MAX_MESSAGE_CHARS + 200}
          style={[styles.input, { height: chat.draft ? height : INPUT_MIN }]}
        />
        <Pressable
          testID="chat-send"
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !chat.canSend }}
          disabled={!chat.canSend}
          onPress={() => chat.sendDraft()}
          style={[styles.send, !chat.canSend && styles.sendDisabled]}
        >
          <Icon name="arrow" size={18} color={colors.surface.card} style={styles.up} />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <View style={styles.disclaimer}>
          <Icon name="info" size={12} color={colors.text.tertiary} />
          <Text style={styles.meta}>{DISCLAIMER}</Text>
        </View>
        {length > COUNTER_FROM ? (
          <Text style={[styles.meta, length > MAX_MESSAGE_CHARS && styles.over]}>
            {`${formatNumber(length)} / ${formatNumber(MAX_MESSAGE_CHARS)}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'sticky' as 'relative',
    backgroundColor: colors.surface.card,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 29,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: colors.bg.sidebar,
  },
  chipHover: { backgroundColor: colors.brand.sageTint },
  chipText: { ...typography.status, color: colors.text.primary },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 14,
    backgroundColor: colors.bg.canvas,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    ...typography.pageSubtitle,
    flex: 1,
    paddingVertical: 9,
    color: colors.text.primary,
    outlineStyle: 'none',
  } as object,
  send: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  up: { transform: [{ rotate: '-45deg' }] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  meta: { ...typography.meta, fontSize: 11, color: colors.text.tertiary },
  over: { color: colors.status.alert },
});
