import { useCallback, useMemo, useState } from 'react';

import { useChatHistory, useDevice, useGateway, useLatest, useNow, usePlant, usePlantStatus, useSendChat, type ChatError } from '@/data';
import { groupChatDays } from '@/domain/chat-days';
import { formatAge, formatTime, secondsSince } from '@/domain/format';

import { canRetry, contextRows, isChatRow, MAX_MESSAGE_CHARS, optimisticVisible, rateLimitText, sendErrorText } from './model';

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
  const now = useNow(retryUntil ? 1000 : 15_000);

  const all = history.messages;
  const messages = useMemo(() => all?.filter(isChatRow), [all]);
  const days = useMemo(() => (messages ? groupChatDays(messages, timeZone, now) : undefined), [messages, timeZone, now]);

  const secondsLeft = retryUntil ? (retryUntil - now.getTime()) / 1000 : 0;
  const rateLimited = secondsLeft > 0;

  const submit = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || message.length > MAX_MESSAGE_CHARS || send.isPending || rateLimited) return false;
      setLastIdAtSend(Math.max(0, ...(messages ?? []).map((m) => m.id)));
      send.mutate(message, {
        onError: (error: ChatError) => {
          if (error.kind === 'rate_limited') {
            setRetryUntil(Date.now() + (error.retryAfterS ?? 60) * 1000);
            setDraft((d) => d || message);
            send.reset();
          }
        },
      });
      setDraft('');
      return true;
    },
    [messages, rateLimited, send],
  );

  const pendingText = send.variables;
  const showPending =
    pendingText != null && (send.isPending || send.isError) && optimisticVisible(messages ?? [], pendingText, lastIdAtSend);
  const sendError = send.isError && send.error.kind !== 'rate_limited' ? send.error : null;

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
    canSend: draft.trim().length > 0 && draft.trim().length <= MAX_MESSAGE_CHARS && !send.isPending && !rateLimited,
    sending: send.isPending,
    pending: showPending ? { text: pendingText!, failed: send.isError } : null,
    sendError: sendError ? { text: sendErrorText(sendError), retry: canRetry(sendError) } : null,
    retrySend: () => {
      if (pendingText) {
        send.reset();
        submit(pendingText);
      }
    },
    dismissSendError: () => send.reset(),
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
