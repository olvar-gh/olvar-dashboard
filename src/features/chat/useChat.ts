import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { keys, useChatHistory, useDevice, useGateway, useLatest, useNow, usePlant, usePlantStatus, useSendChat, type ChatError, type ChatMessageRow } from '@/data';
import { groupChatDays } from '@/domain/chat-days';
import { formatAge, formatTime, secondsSince } from '@/domain/format';

import { ANSWER_TIMEOUT_MS, canRetry, contextRows, isChatRow, MAX_MESSAGE_CHARS, OFFLINE_RETRY_TEXT, OFFLINE_TEXT, optimisticVisible, rateLimitText, sendErrorText, storedRowOf, unansweredQuestion } from './model';
import { isOffline } from './network';

/** `retryOf` is the stored question a Retry asked again; its failure shows on that bubble. */
type FailedSend = { id: number; text: string; lastIdAtSend: number; error: ChatError; retryOf?: number };

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

  const all = history.messages;
  const messages = useMemo(() => all?.filter(isChatRow), [all]);
  const lastQuestion = messages ? unansweredQuestion(messages) : null;
  // A question with no answer gets Retry once its send could have timed out (sooner for a known failure).
  const answerDueAt = lastQuestion ? new Date(Date.parse(lastQuestion.created_at) + ANSWER_TIMEOUT_MS) : null;
  const now = useNow(retryUntil ? 1000 : 15_000, answerDueAt);
  const days = useMemo(() => (messages ? groupChatDays(messages, timeZone, now) : undefined), [messages, timeZone, now]);

  const secondsLeft = retryUntil ? (retryUntil - now.getTime()) / 1000 : 0;
  const rateLimited = secondsLeft > 0;
  // A send before the history is in would put its bubble nowhere and race the first page.
  const ready = messages !== undefined;

  const qc = useQueryClient();
  const plantId = plant?.id ?? '';
  /** The rows in the history cache now; a send reads them after its await, not the render's copy. */
  const cachedRows = useCallback(() => {
    const pages = qc.getQueryData<InfiniteData<ChatMessageRow[]>>(keys.chat(plantId))?.pages.flat() ?? [];
    return [...pages, ...(qc.getQueryData<ChatMessageRow[]>(keys.chatLive(plantId)) ?? [])];
  }, [qc, plantId]);

  // Set while the connection is checked, so a second tap cannot slip a duplicate send in.
  const checking = useRef(false);

  /**
   * Sends `text`. Only a send from the composer (`fromDraft`) clears it, so a chip or retry keeps the
   * draft; `retryOf` is the stored question a Retry asks again.
   */
  const deliver = useCallback(
    async (text: string, { fromDraft = false, retryOf }: { fromDraft?: boolean; retryOf?: number } = {}) => {
      const message = text.trim();
      if (!ready || !message || message.length > MAX_MESSAGE_CHARS || send.isPending || rateLimited || checking.current) return false;
      checking.current = true;
      let offline: boolean;
      try {
        offline = await isOffline();
      } finally {
        checking.current = false;
      }
      if (offline) {
        setNotice(fromDraft ? OFFLINE_TEXT : OFFLINE_RETRY_TEXT);
        return false;
      }
      const rows = cachedRows();
      // The answer may have come in while the connection was checked.
      if (retryOf != null && rows.some((m) => m.reply_to === retryOf)) return false;
      setNotice(null);
      const lastId = Math.max(0, ...rows.map((m) => m.id));
      setLastIdAtSend(lastId);
      send.mutate(message, {
        onError: (error: ChatError) => {
          if (error.kind === 'rate_limited') {
            setRetryUntil(Date.now() + (error.retryAfterS ?? 60) * 1000);
            if (retryOf == null) setDraft((d) => d || message);
          } else {
            setFailures((f) => [...f, { id: ++failureId.current, text: message, lastIdAtSend: lastId, error, retryOf }]);
            // A timeout may come after the question was stored; without Realtime only a re-read shows it.
            if (error.kind === 'failed') void history.refetch();
          }
          send.reset();
        },
      });
      // Edits typed while the connection was checked stay in the composer.
      if (fromDraft) setDraft((d) => (d === text ? '' : d));
      return true;
    },
    [cachedRows, history, rateLimited, ready, send],
  );
  const submit = useCallback((text: string) => deliver(text), [deliver]);
  const sendDraft = useCallback(() => deliver(draft, { fromDraft: true }), [deliver, draft]);

  const retryFailed = (id: number) => {
    const failure = failures.find((f) => f.id === id);
    if (!failure) return;
    void submit(failure.text).then((sent) => {
      if (sent) setFailures((f) => f.filter((x) => x.id !== id));
    });
  };
  const dismissFailed = (id: number) => setFailures((f) => f.filter((x) => x.id !== id));

  const rows = messages ?? [];
  const pendingText = send.isPending ? send.variables : undefined;
  const showPending = pendingText != null && optimisticVisible(rows, pendingText, lastIdAtSend);
  // A send that timed out may still have been stored; its row replaces the failed bubble.
  const failed = failures
    .filter((f) => f.retryOf == null && optimisticVisible(rows, f.text, f.lastIdAtSend))
    .map((f) => ({ id: f.id, text: f.text, error: sendErrorText(f.error), retry: canRetry(f.error) }));
  // The last question was stored but never answered: offer Retry when a send of it is known to have
  // failed, or once any send of it (perhaps from another device) could have timed out.
  const failure = lastQuestion
    ? failures.findLast((f) => f.retryOf === lastQuestion.id || storedRowOf(rows, f.text, f.lastIdAtSend)?.id === lastQuestion.id)
    : undefined;
  const unanswered =
    lastQuestion && !send.isPending && (failure || now.getTime() >= answerDueAt!.getTime())
      ? { id: lastQuestion.id, text: lastQuestion.content, error: failure ? sendErrorText(failure.error) : null }
      : null;
  const retryUnanswered = () => {
    if (!unanswered) return Promise.resolve(false);
    const { id, text } = unanswered;
    return deliver(text, { retryOf: id }).then((sent) => {
      if (sent) setFailures((f) => f.filter((x) => x.retryOf !== id && storedRowOf(rows, x.text, x.lastIdAtSend)?.id !== id));
      return sent;
    });
  };

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
    /** The newest question has no stored answer (`error` when a send of it failed); `retryUnanswered` asks it again. */
    unanswered,
    retryUnanswered,
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
