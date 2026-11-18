import { onlineManager } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useChatHistory, useDevice, useGateway, useLatest, useNow, usePlant, usePlantStatus, useSendChat, type ChatError } from '@/data';
import { groupChatDays } from '@/domain/chat-days';
import { formatAge, formatTime, secondsSince } from '@/domain/format';

import { canRetry, contextRows, isChatRow, MAX_MESSAGE_CHARS, OFFLINE_TEXT, optimisticVisible, rateLimitText, sendErrorText } from './model';

type FailedSend = { id: number; text: string; lastIdAtSend: number; error: ChatError };

/** Everything the Chat screen shows, shared by the desktop and iPhone layouts. */
export function useChat() {
  const plant = usePlant().data;
  const timeZone = plant?.timezone ?? 'UTC';
  const history = useChatHistory();
  const send = useSendChat();
  const status = usePlantStatus();
  const latest = useLatest();
  const device = useDevice().data;
  const gateway = useGateway().data;

  const [draft, setDraft] = useState('');
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [lastIdAtSend, setLastIdAtSend] = useState(0);
  const [failures, setFailures] = useState<FailedSend[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const failureId = useRef(0);
  const now = useNow(retryUntil ? 1000 : 15_000);

  const all = history.messages;
  const messages = useMemo(() => all?.filter(isChatRow), [all]);
  const days = useMemo(() => (messages ? groupChatDays(messages, timeZone, now) : undefined), [messages, timeZone, now]);

  const secondsLeft = retryUntil ? (retryUntil - now.getTime()) / 1000 : 0;
  const rateLimited = secondsLeft > 0;
  // A send before the history is in would put its bubble nowhere and race the first page.
  const ready = messages !== undefined;

  /** Sends `text`; only a send from the composer (`fromDraft`) clears it, so a chip or retry keeps the draft. */
  const deliver = useCallback(
    (text: string, fromDraft: boolean) => {
      const message = text.trim();
      if (!ready || !message || message.length > MAX_MESSAGE_CHARS || send.isPending || rateLimited) return false;
      if (!onlineManager.isOnline()) {
        setNotice(OFFLINE_TEXT);
        return false;
      }
      setNotice(null);
      const lastId = Math.max(0, ...(messages ?? []).map((m) => m.id));
      setLastIdAtSend(lastId);
      send.mutate(message, {
        onError: (error: ChatError) => {
          if (error.kind === 'rate_limited') {
            setRetryUntil(Date.now() + (error.retryAfterS ?? 60) * 1000);
            setDraft((d) => d || message);
          } else {
            setFailures((f) => [...f, { id: ++failureId.current, text: message, lastIdAtSend: lastId, error }]);
          }
          send.reset();
        },
      });
      if (fromDraft) setDraft('');
      return true;
    },
    [messages, rateLimited, ready, send],
  );
  const submit = useCallback((text: string) => deliver(text, false), [deliver]);
  const sendDraft = useCallback(() => deliver(draft, true), [deliver, draft]);

  const retryFailed = (id: number) => {
    const failure = failures.find((f) => f.id === id);
    if (failure && submit(failure.text)) setFailures((f) => f.filter((x) => x.id !== id));
  };
  const dismissFailed = (id: number) => setFailures((f) => f.filter((x) => x.id !== id));

  const pendingText = send.isPending ? send.variables : undefined;
  const showPending = pendingText != null && optimisticVisible(messages ?? [], pendingText, lastIdAtSend);
  // A send that timed out may still have been stored; its row replaces the failed bubble.
  const failed = failures
    .filter((f) => optimisticVisible(messages ?? [], f.text, f.lastIdAtSend))
    .map((f) => ({ id: f.id, text: f.text, error: sendErrorText(f.error), retry: canRetry(f.error) }));

  const display = status.display;
  const reading = latest.data;
  const updatedText = reading
    ? `Updated ${formatAge(secondsSince(reading.recorded_at, now))}${gateway ? ` from ${gateway.id}` : ''}`
    : 'No readings yet';
  const offlineSince = display?.offline && display.offlineSince ? formatTime(display.offlineSince, timeZone) : null;
  const presence = !display
    ? null
    : display.offline
      ? offlineSince
        ? `Offline since ${offlineSince} · answers use the last reading`
        : 'Offline · answers use the last reading'
      : display.overall === 'no_data'
        ? 'No readings yet'
        : `${display.overallLabel} · reading sensors live`;

  return {
    plant,
    plantName: plant?.nickname ?? 'Your plant',
    timeZone,
    now,
    history,
    messages,
    days,
    draft,
    setDraft,
    submit,
    sendDraft,
    ready,
    canSend: ready && draft.trim().length > 0 && draft.trim().length <= MAX_MESSAGE_CHARS && !send.isPending && !rateLimited,
    sending: send.isPending,
    pending: showPending ? { text: pendingText } : null,
    failed,
    retryFailed,
    dismissFailed,
    /** A send refused before it left (offline); the draft is kept. */
    notice,
    dismissNotice: () => setNotice(null),
    rateLimit: rateLimited ? rateLimitText(secondsLeft) : null,
    display,
    presence,
    offlineSince,
    deviceId: device?.id ?? 'olvar-node',
    reading,
    readingLoading: latest.isPending || status.isPending,
    rows: contextRows(reading, status.data, timeZone),
    updatedText,
  };
}

export type ChatModel = ReturnType<typeof useChat>;
