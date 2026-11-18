import { compareMessages } from '../queries/chat';
import type { ChatMessageRow } from '../types';

const row = (id: number, created_at: string) => ({ id, created_at }) as ChatMessageRow;

it('orders messages by the instant, not by how the timestamp is written', () => {
  const rows = [row(3, '2026-11-18T10:00:00.5Z'), row(2, '2026-11-18T19:00:00+09:00'), row(1, '2026-11-18T10:00:00.250+00:00')];
  expect(rows.sort(compareMessages).map((m) => m.id)).toEqual([2, 1, 3]);
});

it('breaks ties on the same instant by id', () => {
  const rows = [row(5, '2026-11-18T10:00:00Z'), row(4, '2026-11-18T10:00:00.000+00:00')];
  expect(rows.sort(compareMessages).map((m) => m.id)).toEqual([4, 5]);
});
