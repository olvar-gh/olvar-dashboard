import { useChatHistory } from '../queries/chat';
import { useLatest } from '../queries/latest';
import { usePlant } from '../queries/plant';
import { SIGNAL_COALESCE_MS } from '../realtime';
import { advance, renderWithData, settle } from '../testing/render-with-data';

const NOW = new Date('2026-11-17T05:30:00Z');

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

function useLive() {
  return { latest: useLatest(), plant: usePlant(), chat: useChatHistory() };
}

describe('Realtime handling', () => {
  it('re-reads the latest row through readings_v after a readings signal', async () => {
    const { result, source } = await renderWithData(useLive, { now: NOW });
    await settle(() => !!result.current.latest.data);
    expect(result.current.latest.data?.temperature_c).toBe(23.4);
    await advance(60_000);
    const added = source.addReading({ temperature_c: 25.1, soil_raw: 2000 });
    await advance(SIGNAL_COALESCE_MS);
    await settle(() => result.current.latest.data?.id === added.id);
    expect(result.current.latest.data).toMatchObject({ temperature_c: 25.1, soil_raw: 2000, soil_pct: 56.3 });
  });

  it('collapses a duplicate signal into one re-read', async () => {
    const { result, source, handlers } = await renderWithData(useLive, { now: NOW });
    await settle(() => !!result.current.latest.data);
    const getLatest = jest.spyOn(source, 'getLatestReadings');
    handlers[0].onReading();
    handlers[0].onReading();
    await advance(SIGNAL_COALESCE_MS + 10);
    await settle(() => !result.current.latest.isFetching);
    expect(getLatest).toHaveBeenCalledTimes(1);
  });

  it('invalidates everything on reconnect', async () => {
    const { result, source } = await renderWithData(useLive, { now: NOW });
    await settle(() => !!result.current.latest.data && !!result.current.chat.messages);
    const getPlant = jest.spyOn(source, 'getPlant');
    const getLatest = jest.spyOn(source, 'getLatestReadings');
    const getChat = jest.spyOn(source, 'getChatPage');
    source.reconnect();
    await settle(() => getPlant.mock.calls.length > 0 && getLatest.mock.calls.length > 0 && getChat.mock.calls.length > 0);
  });

  it('merges a chat_messages INSERT once, even when delivered twice', async () => {
    const { result, handlers } = await renderWithData(useLive, { now: NOW });
    await settle(() => !!result.current.chat.messages);
    const before = result.current.chat.messages!.length;
    const row = { ...result.current.chat.messages!.at(-1)!, id: 9999, content: 'Hi!', created_at: NOW.toISOString() };
    handlers[0].onChatMessage(row);
    handlers[0].onChatMessage(row);
    await settle(() => result.current.chat.messages!.length === before + 1);
    expect(result.current.chat.messages!.at(-1)).toMatchObject({ id: 9999, content: 'Hi!' });
  });
});

describe('chat history', () => {
  it('pages 50 at a time, oldest first, keyset by (created_at, id)', async () => {
    const { result, source } = await renderWithData(useChatHistory, { now: NOW });
    await settle(() => !!result.current.messages);
    expect(result.current.messages).toHaveLength(50);
    expect(result.current.hasNextPage).toBe(true);
    await result.current.fetchNextPage();
    await settle(() => result.current.messages!.length === source.world.chat.length);
    expect(result.current.messages!.map((m) => m.id)).toEqual(source.world.chat.map((m) => m.id));
    expect(result.current.hasNextPage).toBe(false);
  });
});
