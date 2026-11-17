import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import type { ChatError } from '../source';
import type { ChatCursor, ChatMessageRow } from '../types';
import { usePlant } from './plant';

export const CHAT_PAGE_SIZE = 50;

type ChatPages = InfiniteData<ChatMessageRow[], ChatCursor | null>;

/**
 * The conversation, keyset-paged 50 at a time (newest page first, `fetchNextPage` loads older).
 * `messages` is the loaded history, oldest first.
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
  const messages = query.data ? query.data.pages.flat().reverse() : undefined;
  return { ...query, messages };
}

/** Adds a message to the cached conversation unless it is already there (Realtime and the reply race). */
export function addChatMessage(qc: QueryClient, row: ChatMessageRow) {
  qc.setQueryData<ChatPages>(keys.chat(row.plant_id), (data) => {
    if (!data || data.pages.some((p) => p.some((m) => m.id === row.id))) return data;
    const [first = [], ...rest] = data.pages;
    const merged = [row, ...first].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    return { ...data, pages: [merged, ...rest] };
  });
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
    mutationFn: (message) => source.sendChat(plantId!, message),
    onSuccess: (reply) => {
      addChatMessage(qc, reply);
      // The stored user row normally arrives over Realtime; re-read in case that event was missed.
      void qc.invalidateQueries({ queryKey: keys.chat(reply.plant_id) });
    },
  });
}
