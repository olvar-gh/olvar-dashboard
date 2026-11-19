import { EMPTY_VALUE, formatMetric, formatNumber, formatTime, type Metric } from '@/domain/format';
import type { ChatError, ChatMessageRow, PlantStatus, Reading } from '@/data';

export type ChatRow = ChatMessageRow & { role: 'user' | 'plant' };

export function isChatRow(m: ChatMessageRow): m is ChatRow {
  return m.role === 'user' || m.role === 'plant';
}

/** The `chat` function's limit (§2.4): longer messages are rejected with 400. */
export const MAX_MESSAGE_CHARS = 1000;

export const RATE_LIMIT_RULE = 'Sparks answers up to 10 messages every 5 minutes and 200 a day.';

export const DISCLAIMER = 'Sparks answers from live sensor data and can still make mistakes.';

/** Suggestion chips; the temperature one quotes the current reading when there is one. */
export function suggestions(temperatureC: number | null | undefined, compact = false): string[] {
  const warm = temperatureC == null ? 'Is it too warm for me?' : `Is ${Math.round(temperatureC)} °C too warm for me?`;
  return compact
    ? ['How am I doing this week?', 'Do you need water?', warm]
    : ['How am I doing this week?', 'Do you need water today?', warm];
}

/** "2:35" for a countdown in seconds. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function rateLimitText(secondsLeft: number): string {
  return `Sparks needs a breather. You can ask again in ${formatCountdown(secondsLeft)}.`;
}

/** Inline copy for a send that failed for a reason other than the rate limit. */
export function sendErrorText(error: ChatError): string {
  switch (error.kind) {
    case 'invalid_message':
      return `Messages can be 1 to ${formatNumber(MAX_MESSAGE_CHARS)} characters.`;
    case 'unauthorized':
      return 'Your session has expired. Sign in again to keep chatting.';
    case 'not_found':
      return 'This plant is no longer on your account.';
    default:
      return 'Couldn’t reach Sparks. Check your connection and try again.';
  }
}

/** A send refused because the device is offline; the message stays in the composer. */
export const OFFLINE_TEXT = 'You’re offline, so your message wasn’t sent. It’s still in the box; send it when you’re back online.';

/** Under a reply stored with `error` set: the server answered with its fallback text. */
export const ERROR_ROW_TEXT = 'Sparks couldn’t think this through, so this is a basic answer.';

/** Sends that may be retried with the same text (not an invalid or unauthorised one). */
export function canRetry(error: ChatError): boolean {
  return error.kind === 'failed';
}

/**
 * Whether the optimistic bubble for `text` is still needed: it goes once the stored user row
 * (newer than every row seen at send time) is in the conversation.
 */
export function optimisticVisible(messages: readonly ChatMessageRow[], text: string, lastIdAtSend: number): boolean {
  return !messages.some((m) => m.role === 'user' && m.id > lastIdAtSend && m.content === text);
}

/**
 * The newest message when it is the user's and no reply to it is stored: the answer never
 * arrived (the send failed after the question was saved, or the app closed while waiting).
 */
export function unansweredQuestion<T extends ChatMessageRow>(messages: readonly T[]): T | null {
  const last = messages.at(-1);
  if (!last || last.role !== 'user') return null;
  return messages.some((m) => m.reply_to === last.id) ? null : last;
}

/** The question a plant reply answers, for Retry on an error row. */
export function questionFor(messages: readonly ChatMessageRow[], reply: ChatMessageRow): string | null {
  return messages.find((m) => m.id === reply.reply_to)?.content ?? null;
}

export type ContextRow = {
  metric: Metric;
  name: string;
  value: string;
  /** Server label (`<metric>_label`), or "Read failed" / "Not calibrated". */
  note: string | null;
  failed: boolean;
};

const METRICS: { metric: Metric; name: string; column: 'soil_pct' | 'lux' | 'temperature_c' | 'humidity_pct'; label: keyof PlantStatus }[] = [
  { metric: 'soil', name: 'Soil moisture', column: 'soil_pct', label: 'soil_label' },
  { metric: 'light', name: 'Light', column: 'lux', label: 'light_label' },
  { metric: 'temperature', name: 'Temperature', column: 'temperature_c', label: 'temperature_label' },
  { metric: 'humidity', name: 'Humidity', column: 'humidity_pct', label: 'humidity_label' },
];

const SHORT: Record<Metric, (v: number) => string> = {
  soil: (v) => `${formatNumber(v)}%`,
  light: (v) => `${formatNumber(v)} lx`,
  temperature: (v) => `${formatNumber(v, 1)}°`,
  humidity: (v) => `${formatNumber(v)}%`,
};

/**
 * "What Sparks sees right now": one row per metric from the latest reading. A null value is a
 * failed read; soil without calibration has no percentage, which is not a failed read (§5.5).
 */
export function contextRows(reading: Reading | null | undefined, status: PlantStatus | null | undefined, timeZone: string): ContextRow[] {
  const calibrated = status?.soil_calibrated !== false;
  return METRICS.map(({ metric, name, column, label }) => {
    const v = reading?.[column] ?? null;
    if (metric === 'soil' && !calibrated) {
      const failed = reading != null && reading.soil_raw == null;
      return { metric, name, value: EMPTY_VALUE, note: failed ? failedAt(reading, timeZone) : 'Not calibrated', failed };
    }
    if (reading && v == null) return { metric, name, value: EMPTY_VALUE, note: failedAt(reading, timeZone), failed: true };
    const note = (status?.[label] as string | null | undefined) ?? null;
    return { metric, name, value: formatMetric(metric, v).replace(' %', '%'), note, failed: false };
  });
}

/** Compact chip text for the iPhone readings row ("64%", "1,240 lx", "23.4°"). */
export function chipValue(row: ContextRow, reading: Reading | null | undefined): string {
  const column = METRICS.find((m) => m.metric === row.metric)!.column;
  const v = reading?.[column];
  return row.failed || v == null || row.value === EMPTY_VALUE ? EMPTY_VALUE : SHORT[row.metric](v);
}

function failedAt(reading: Reading, timeZone: string): string {
  return `Read failed at ${formatTime(reading.recorded_at, timeZone)}`;
}

/** Empty conversation body, with the real data path behind the answers. */
export function emptyText(plantName: string): string {
  return `Ask how it’s doing. ${plantName} answers from the readings its ESP32 sends over Wi-Fi/MQTT to the Raspberry Pi 3B gateway every 60 s.`;
}

export type ComposerKey = { key: string; shiftKey?: boolean; isComposing?: boolean; keyCode?: number };

/**
 * Enter sends, Shift+Enter adds a line. While an IME composition is active (Korean, Japanese,
 * Chinese), Enter only commits the composed text; Safari reports that keydown as keyCode 229
 * after `isComposing` has already turned false.
 */
export function isSendKey(e: ComposerKey): boolean {
  return e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229;
}
