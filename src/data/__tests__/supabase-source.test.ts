import { FunctionsHttpError } from '@supabase/supabase-js';

import { createSupabaseSource } from '../source/supabase';

type Call = [string, ...unknown[]];

/** A PostgREST builder stand-in: records every chained call and resolves to `respond(calls)`. */
function builder(respond: (calls: Call[]) => { data: unknown; error: unknown }, log: Call[][]) {
  const calls: Call[] = [];
  log.push(calls);
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => resolve(respond(calls));
        }
        return (...args: unknown[]) => {
          calls.push([prop, ...args]);
          return proxy;
        };
      },
    },
  );
  return proxy;
}

function fakeClient(respond: (calls: Call[]) => { data: unknown; error: unknown }) {
  const log: Call[][] = [];
  const channelHandlers: { status?: (s: string) => void; on: unknown[][] } = { on: [] };
  const channel = {
    on: (...args: unknown[]) => {
      channelHandlers.on.push(args);
      return channel;
    },
    subscribe: (cb: (s: string) => void) => {
      channelHandlers.status = cb;
      return channel;
    },
  };
  const client = {
    from: (table: string) => builder((c) => respond([['from', table], ...c]), log),
    rpc: jest.fn(async () => ({ data: [], error: null })),
    functions: { invoke: jest.fn() },
    channel: jest.fn(() => channel),
    removeChannel: jest.fn(),
    auth: {},
  };
  return { client, log, channelHandlers };
}

const range = (calls: Call[]) => calls.find((c) => c[0] === 'range') as [string, number, number] | undefined;

describe('Supabase source', () => {
  it('reads the 24 h window in 1,000-row pages with a fixed upper bound and a total order', async () => {
    const total = 1440;
    const { client, log } = fakeClient((calls) => {
      const [, from, to] = range(calls)!;
      const ids = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({ id: from + i + 1 }));
      return { data: ids, error: null };
    });
    const source = createSupabaseSource(client as never);
    const to = new Date('2026-11-17T05:30:00Z');
    const rows = await source.getReadings('olvar-a1b2c3', new Date(to.getTime() - 86_400_000), to);
    expect(rows).toHaveLength(total);
    expect(log).toHaveLength(2);
    for (const calls of log) {
      expect(calls).toContainEqual(['select', '*']);
      expect(calls).toContainEqual(['eq', 'device_id', 'olvar-a1b2c3']);
      expect(calls).toContainEqual(['lte', 'recorded_at', '2026-11-17T05:30:00.000Z']);
      expect(calls.filter((c) => c[0] === 'order').map((c) => c[1])).toEqual(['recorded_at', 'id']);
    }
    expect(log.map((c) => range([['from', ''], ...c])!.slice(1))).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('keyset-pages chat older than the cursor', async () => {
    const { client, log } = fakeClient(() => ({ data: [], error: null }));
    await createSupabaseSource(client as never).getChatPage('p', 50, { created_at: '2026-11-15T01:00:00Z', id: 7 });
    expect(log[0]).toContainEqual([
      'or',
      'created_at.lt.2026-11-15T01:00:00Z,and(created_at.eq.2026-11-15T01:00:00Z,id.lt.7)',
    ]);
    expect(log[0]).toContainEqual(['limit', 50]);
  });

  it('maps a 429 from the chat function to a rate-limit error with retry_after', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }));
    const response = new Response(JSON.stringify({ error: 'rate_limited', retry_after: 42 }), {
      status: 429,
      headers: { 'Retry-After': '42' },
    });
    client.functions.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) });
    await expect(createSupabaseSource(client as never).sendChat('p', 'hi')).rejects.toMatchObject({
      name: 'ChatError',
      kind: 'rate_limited',
      retryAfterS: 42,
    });
  });

  it('returns the stored reply row', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }));
    client.functions.invoke.mockResolvedValue({ data: { reply: { id: 3, role: 'plant' } }, error: null });
    await expect(createSupabaseSource(client as never).sendChat('p', 'hi')).resolves.toEqual({ id: 3, role: 'plant' });
    expect(client.functions.invoke).toHaveBeenCalledWith('chat', { body: { plant_id: 'p', message: 'hi' } });
  });

  it('surfaces PostgREST errors with their code', async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: 'unknown time zone', code: '22023' } }));
    await expect(
      createSupabaseSource(client as never).updatePlant('p', { timezone: 'Mars/Base' }),
    ).rejects.toMatchObject({ name: 'DataError', code: '22023' });
  });

  it('falls back when effective_thresholds is not executable', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }));
    client.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied', code: '42501' } } as never);
    await expect(createSupabaseSource(client as never).getEffectiveThresholds('p')).resolves.toBeNull();
  });

  it('subscribes to readings, devices and chat_messages and reports re-subscribes as reconnects', () => {
    const { client, channelHandlers } = fakeClient(() => ({ data: [], error: null }));
    const handlers = { onReading: jest.fn(), onDevice: jest.fn(), onChatMessage: jest.fn(), onReconnect: jest.fn() };
    const stop = createSupabaseSource(client as never).subscribe({ deviceId: 'dev', plantId: 'p' }, handlers);
    const filters = channelHandlers.on.map((args) => args[1]);
    expect(filters).toEqual([
      { event: 'INSERT', schema: 'public', table: 'readings', filter: 'device_id=eq.dev' },
      { event: 'UPDATE', schema: 'public', table: 'devices', filter: 'id=eq.dev' },
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'plant_id=eq.p' },
    ]);
    (channelHandlers.on[0][2] as () => void)();
    expect(handlers.onReading).toHaveBeenCalledTimes(1);
    channelHandlers.status!('SUBSCRIBED');
    expect(handlers.onReconnect).not.toHaveBeenCalled();
    channelHandlers.status!('CHANNEL_ERROR');
    channelHandlers.status!('SUBSCRIBED');
    expect(handlers.onReconnect).toHaveBeenCalledTimes(1);
    stop();
    expect(client.removeChannel).toHaveBeenCalled();
  });
});
