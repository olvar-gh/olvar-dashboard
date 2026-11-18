import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { GlassSurface } from '@/components/ui';
import { colors, iosColors, typography } from '@/theme';

import { MAX_MESSAGE_CHARS, suggestions } from '../model';
import type { ChatModel } from '../useChat';

/** Suggestion capsules after the last message, or the rate-limit countdown in their place. */
export function Suggestions({ chat }: { chat: ChatModel }) {
  if (chat.rateLimit) {
    return (
      <Text style={styles.limit} testID="chat-rate-limit">
        {chat.rateLimit}
      </Text>
    );
  }
  const blocked = chat.sending;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chips}
      keyboardShouldPersistTaps="handled"
    >
      {suggestions(chat.reading?.temperature_c, true).map((s) => (
        <Pressable key={s} accessibilityRole="button" disabled={blocked} onPress={() => chat.submit(s)} style={styles.chip}>
          <Icon name="sparkle" size={12} color={colors.brand.olive} />
          <Text style={styles.chipText}>{s}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** The Liquid Glass message field, pinned above the tab bar and the keyboard. */
export function IosComposer({ chat }: { chat: ChatModel }) {
  return (
    <View style={styles.root}>
      <View style={styles.fieldWrap}>
        <GlassSurface interactive style={styles.glass} />
        <TextInput
          testID="chat-input"
          accessibilityLabel={`Message ${chat.plantName}`}
          placeholder={`Ask ${chat.plantName}…`}
          placeholderTextColor={iosColors.labelTertiary}
          value={chat.draft}
          onChangeText={chat.setDraft}
          multiline
          maxLength={MAX_MESSAGE_CHARS}
          style={styles.input}
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
          <Icon name="arrow" size={20} color="#ffffff" style={styles.up} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 10 },
  chipsScroll: { marginHorizontal: -16 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.brand.sageTint,
  },
  chipText: { ...typography.iosFootnoteEmphasized, color: colors.text.primary },
  limit: { ...typography.iosFootnote, color: iosColors.labelSecondary, textAlign: 'center' },
  fieldWrap: {
    marginHorizontal: 16,
    minHeight: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  glass: { ...StyleSheet.absoluteFill, borderRadius: 24 },
  input: { ...typography.iosBody, flex: 1, maxHeight: 120, paddingTop: 7, paddingBottom: 7, color: iosColors.labelPrimary },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  up: { transform: [{ rotate: '-45deg' }] },
});
