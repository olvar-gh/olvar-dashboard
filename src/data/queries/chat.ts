import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import type { ChatError } from '../source';
import type { ChatCursor, ChatMessageRow } from '../types';
import { usePlant } from './plant';

export const CHAT_PAGE_SIZE = 50;

const NO_ROWS: ChatMessageRow[] = [];

/** Oldest first by the instant, then id: the same instant can be written as "…+00:00" or "…Z". */
export function compareMessages(a: ChatMessageRow, b: ChatMessageRow) {
  return Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id;
}

/**
 * The conversation, keyset-paged 50 at a time (newest page first, `fetchNextPage` loads older).
 * `messages` is the loaded history plus rows that arrived live, oldest first.
 */
export function useChatHistory() {
  const source = useDataSource();
  const plantId = usePlant().data?.id;
  const query = useInfiniteQuery({
    queryKey: keys.chat(plantId ?? ''),
    enabled: !!plantId,
    initialPageParam: null as ChatCursor | null,
    queryFn: ({ pageParam }) => source.getChatPage(plantId!, CHAT_PAGE_SIZE, pageParam ?? undefined),
    getNextPageParam: (last) => {
      const oldest = last[last.length - 1];
      return last.length < CHAT_PAGE_SIZE || !oldest ? undefined : { created_at: oldest.created_at, id: oldest.id };
    },
  });
  const live = useQuery({
    queryKey: keys.chatLive(plantId ?? ''),
    queryFn: () => NO_ROWS,
    enabled: false,
    initialData: NO_ROWS,
    staleTime: Infinity,
  }).data;
  let messages: ChatMessageRow[] | undefined;
  if (query.data) {
    const loaded = query.data.pages.flat();
    const ids = new Set(loaded.map((m) => m.id));
    messages = [...loaded, ...live.filter((m) => !ids.has(m.id))].sort(compareMessages);
  }
  return { ...query, messages };
}

/**
 * Records a message that arrived outside a page fetch (Realtime, the chat reply). It is kept
 * apart from the pages because a page fetch in flight writes back the pages it started from,
 * which would drop a row merged into them meanwhile.
 */
export function addChatMessage(qc: QueryClient, row: ChatMessageRow) {
  qc.setQueryData<ChatMessageRow[]>(keys.chatLive(row.plant_id), (rows = NO_ROWS) =>
    rows.some((m) => m.id === row.id) ? rows : [...rows, row],
  );
}

/**
 * Sends a message through the `chat` Edge Function. Render the optimistic bubble from
 * `variables` while `isPending`; a `ChatError` with `retryAfterS` means 429.
 */
export function useSendChat() {
  const source = useDataSource();
  const qc = useQueryClient();
  const plantId = usePlant().data?.id;
  return useMutation<ChatMessageRow, ChatError, string>({
    // Never queue a question silently while offline; the caller checks `onlineManager` first.
    networkMode: 'always',
    mutationFn: (message) => source.sendChat(plantId!, message),
    onSuccess: (reply) => {
      addChatMessage(qc, reply);
      // The stored user row normally arrives over Realtime; re-read in case that event was missed.
      void qc.invalidateQueries({ queryKey: keys.chat(reply.plant_id) });
    },
  });
}
