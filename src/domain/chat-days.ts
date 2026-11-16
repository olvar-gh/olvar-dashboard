// Groups the single per-plant conversation into local days ("Past conversations")
// and orders plant replies under the question they answer (`reply_to`).

import { formatLocalDate, formatTime, truncate } from './format';
import { addDays, localDate, type LocalDate } from './time';

export type ChatMessage = {
  id: number;
  role: 'user' | 'plant';
  content: string;
  created_at: string;
  reply_to?: number | null;
  error?: string | null;
  based_on_reading_at?: string | null;
};

export type ChatDay<M extends ChatMessage = ChatMessage> = {
  date: LocalDate;
  /** "Today", "Yesterday", "Nov 14", or "Nov 14, 2025" in an earlier year. */
  label: string;
  /** First user message of the day, for the day entry and Timeline. */
  firstUserMessage: M | null;
  /** Preview of the first user message (or first message). */
  preview: string;
  messages: M[];
};

const PREVIEW_CHARS = 80;

function byTime(a: ChatMessage, b: ChatMessage): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id;
}

/** "Today" / "Yesterday" / "Nov 14" / "Nov 14, 2025" relative to `now` in the plant time zone. */
export function dayLabel(date: LocalDate, timeZone: string, now: Date): string {
  const today = localDate(timeZone, now);
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatLocalDate(date, date.slice(0, 4) !== today.slice(0, 4));
}

/**
 * Messages in display order: by time, except that each plant reply follows
 * the user message it answers, even when two chats overlap.
 */
export function orderWithReplies<M extends ChatMessage>(messages: readonly M[]): M[] {
  const sorted = [...messages].sort(byTime);
  const present = new Set(sorted.map((m) => m.id));
  const replies = new Map<number, M[]>();
  for (const m of sorted) {
    if (m.role === 'plant' && m.reply_to != null && present.has(m.reply_to)) {
      const list = replies.get(m.reply_to) ?? [];
      list.push(m);
      replies.set(m.reply_to, list);
    }
  }
  const out: M[] = [];
  for (const m of sorted) {
    if (m.role === 'plant' && m.reply_to != null && present.has(m.reply_to)) continue;
    out.push(m, ...(replies.get(m.id) ?? []));
  }
  return out;
}

/** Group messages by local date in the plant time zone, oldest day first. */
export function groupChatDays<M extends ChatMessage>(messages: readonly M[], timeZone: string, now: Date): ChatDay<M>[] {
  const days = new Map<LocalDate, M[]>();
  for (const m of [...messages].sort(byTime)) {
    const date = localDate(timeZone, m.created_at);
    const list = days.get(date) ?? [];
    list.push(m);
    days.set(date, list);
  }
  return [...days.entries()].map(([date, list]) => {
    const firstUserMessage = list.find((m) => m.role === 'user') ?? null;
    return {
      date,
      label: dayLabel(date, timeZone, now),
      firstUserMessage,
      preview: truncate((firstUserMessage ?? list[0]).content, PREVIEW_CHARS),
      messages: orderWithReplies(list),
    };
  });
}

/** Footer under a plant reply: "Based on readings from HH:mm", or null without a reading time. */
export function basedOnText(basedOnReadingAt: string | null | undefined, timeZone: string): string | null {
  return basedOnReadingAt ? `Based on readings from ${formatTime(basedOnReadingAt, timeZone)}` : null;
}
