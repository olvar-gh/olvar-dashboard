import { basedOnText, dayLabel, groupChatDays, orderWithReplies, type ChatMessage } from '../chat-days';

const TZ = 'Asia/Seoul';
const NOW = new Date('2026-11-16T05:00:00Z'); // 14:00 on Nov 16 in Seoul

let nextId = 1;
const msg = (role: ChatMessage['role'], created_at: string, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: nextId++,
  role,
  content: `${role} at ${created_at}`,
  created_at,
  ...over,
});

describe('dayLabel', () => {
  it('labels relative to today in the plant zone', () => {
    expect(dayLabel('2026-11-16', TZ, NOW)).toBe('Today');
    expect(dayLabel('2026-11-15', TZ, NOW)).toBe('Yesterday');
    expect(dayLabel('2026-11-02', TZ, NOW)).toBe('Nov 2');
    expect(dayLabel('2025-12-30', TZ, NOW)).toBe('Dec 30, 2025');
  });
});

describe('orderWithReplies', () => {
  it('puts each reply under its question when chats overlap', () => {
    const q1 = msg('user', '2026-11-16T01:00:00Z', { id: 10 });
    const q2 = msg('user', '2026-11-16T01:00:05Z', { id: 11 });
    const a2 = msg('plant', '2026-11-16T01:00:07Z', { id: 12, reply_to: 11 });
    const a1 = msg('plant', '2026-11-16T01:00:09Z', { id: 13, reply_to: 10 });
    expect(orderWithReplies([a1, q2, a2, q1]).map((m) => m.id)).toEqual([10, 13, 11, 12]);
  });

  it('keeps time order for replies whose question is not loaded', () => {
    const q = msg('user', '2026-11-16T01:00:00Z', { id: 20 });
    const orphan = msg('plant', '2026-11-16T00:59:00Z', { id: 21, reply_to: 5 });
    const greeting = msg('plant', '2026-11-16T01:01:00Z', { id: 22 });
    expect(orderWithReplies([greeting, q, orphan]).map((m) => m.id)).toEqual([21, 20, 22]);
  });

  it('breaks time ties by id', () => {
    const a = msg('user', '2026-11-16T01:00:00Z', { id: 31 });
    const b = msg('user', '2026-11-16T01:00:00Z', { id: 30 });
    expect(orderWithReplies([a, b]).map((m) => m.id)).toEqual([30, 31]);
  });
});

describe('groupChatDays', () => {
  it('groups by local date, oldest first, with the first user message', () => {
    const msgs = [
      msg('plant', '2026-11-15T14:59:00Z', { content: 'Good night!' }), // 23:59 Nov 15
      msg('user', '2026-11-15T15:01:00Z', { content: 'Morning, Sparks!' }), // 00:01 Nov 16
      msg('user', '2026-11-15T10:00:00Z', { content: 'How are you?' }), // 19:00 Nov 15
      msg('plant', '2026-11-16T02:00:00Z', { content: 'Hello again' }),
    ];
    const days = groupChatDays(msgs, TZ, NOW);
    expect(days.map((d) => [d.date, d.label, d.preview, d.messages.length])).toEqual([
      ['2026-11-15', 'Yesterday', 'How are you?', 2],
      ['2026-11-16', 'Today', 'Morning, Sparks!', 2],
    ]);
    expect(days[0].firstUserMessage?.content).toBe('How are you?');
  });

  it('previews the first message on a day without user messages', () => {
    const days = groupChatDays([msg('plant', '2026-11-10T03:00:00Z', { content: 'I feel great' })], TZ, NOW);
    expect(days[0]).toMatchObject({ label: 'Nov 10', firstUserMessage: null, preview: 'I feel great' });
  });

  it('returns nothing for no messages', () => {
    expect(groupChatDays([], TZ, NOW)).toEqual([]);
  });
});

describe('basedOnText', () => {
  it('formats the reading time', () => {
    expect(basedOnText('2026-11-16T05:12:00Z', TZ)).toBe('Based on readings from 14:12');
    expect(basedOnText(null, TZ)).toBeNull();
  });
});
