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

type FakeChannel = {
  topic: string;
  bindings: [string, Record<string, unknown>, (payload: unknown) => void][];
  status?: (s: string) => void;
};

function fakeClient(respond: (calls: Call[]) => { data: unknown; error: unknown }) {
  const log: Call[][] = [];
  const channels: FakeChannel[] = [];
  const client = {
    from: (table: string) => builder((c) => respond([['from', table], ...c]), log),
    rpc: jest.fn(async () => ({ data: [], error: null })),
    functions: { invoke: jest.fn() },
    channel: jest.fn((topic: string) => {
      const record: FakeChannel = { topic, bindings: [] };
      channels.push(record);
      const channel = {
        on: (type: string, filter: Record<string, unknown>, cb: (payload: unknown) => void) => {
          record.bindings.push([type, filter, cb]);
          return channel;
        },
        subscribe: (cb: (s: string) => void) => {
          record.status = cb;
          return channel;
        },
      };
      return channel;
    }),
    removeChannel: jest.fn(),
    auth: {},
  };
  return { client, log, channels };
}

async function waitForCall(fn: jest.Mock) {
  while (fn.mock.calls.length === 0) await new Promise((r) => setImmediate(r));
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

  it('signs out only this browser’s session', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }));
    const signOut = jest.fn(async () => ({ error: null }));
    (client.auth as Record<string, unknown>).signOut = signOut;
    await createSupabaseSource(client as never).auth.signOut();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  describe('password change and sign-out', () => {
    function authClient() {
      const { client } = fakeClient(() => ({ data: [], error: null }));
      let signedIn = true;
      const listeners = new Set<(event: string) => void>();
      let verify!: () => void;
      const auth = {
        getSession: jest.fn(async () => ({ data: { session: signedIn ? { user: { email: 'dev@olvar.local' } } : null } })),
        onAuthStateChange: jest.fn((cb: (event: string) => void) => {
          listeners.add(cb);
          return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
        }),
        signInWithPassword: jest.fn(
          () =>
            new Promise((resolve) => {
              verify = () => {
                signedIn = true;
                resolve({ data: { user: { id: 'u' } }, error: null });
              };
            }),
        ),
        signOut: jest.fn(async () => {
          signedIn = false;
          listeners.forEach((l) => l('SIGNED_OUT'));
          return { error: null };
        }),
        updateUser: jest.fn(async () => ({ data: {}, error: null })),
      };
      (client as { auth: unknown }).auth = auth;
      return { source: createSupabaseSource(client as never), auth, verify: () => verify(), isSignedIn: () => signedIn };
    }

    it('refuses to sign out while the current password is being verified', async () => {
      const { source, auth, verify } = authClient();
      const change = source.auth.changePassword('old-password', 'new-password-1');
      await waitForCall(auth.signInWithPassword);
      await expect(source.auth.signOut()).rejects.toMatchObject({ code: 'auth_busy' });
      expect(auth.signOut).not.toHaveBeenCalled();
      verify();
      await expect(change).resolves.toBeUndefined();
      await expect(source.auth.signOut()).resolves.toBeUndefined();
    });

    it('refuses a password change while signing out', async () => {
      const { source, auth } = authClient();
      let finish!: () => void;
      auth.signOut.mockImplementationOnce(() => new Promise((r) => (finish = () => r({ error: null }))));
      const out = source.auth.signOut();
      await expect(source.auth.changePassword('old-password', 'new-password-1')).rejects.toMatchObject({ code: 'auth_busy' });
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
      finish();
      await out;
    });

    it('does not keep a session that re-authentication installs after a sign-out from elsewhere', async () => {
      const { source, auth, verify, isSignedIn } = authClient();
      const change = source.auth.changePassword('old-password', 'new-password-1');
      await waitForCall(auth.signInWithPassword);
      auth.onAuthStateChange.mock.calls.forEach(([cb]) => cb('SIGNED_OUT'));
      verify();
      await expect(change).rejects.toMatchObject({ code: 'signed_out' });
      expect(isSignedIn()).toBe(false);
      expect(auth.updateUser).not.toHaveBeenCalled();
    });
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

  it('subscribes on one channel per table, so a rejected table cannot silence the others', () => {
    const { client, channels } = fakeClient(() => ({ data: [], error: null }));
    const handlers = {
      onReading: jest.fn(),
      onDevice: jest.fn(),
      onChatMessage: jest.fn(),
      onReconnect: jest.fn(),
      onReady: jest.fn(),
    };
    const stop = createSupabaseSource(client as never).subscribe({ deviceId: 'dev', plantId: 'p' }, handlers);
    expect(channels.map((c) => c.topic)).toEqual(['live:readings:dev', 'live:devices:dev', 'live:chat_messages:dev']);
    const changes = channels.map((c) => c.bindings.filter(([type]) => type === 'postgres_changes').map(([, f]) => f));
    expect(changes).toEqual([
      [{ event: 'INSERT', schema: 'public', table: 'readings', filter: 'device_id=eq.dev' }],
      [{ event: 'UPDATE', schema: 'public', table: 'devices', filter: 'id=eq.dev' }],
      [{ event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'plant_id=eq.p' }],
    ]);

    const system = (c: FakeChannel) => c.bindings.find(([type]) => type === 'system')![2];
    const changesCb = (c: FakeChannel) => c.bindings.find(([type]) => type === 'postgres_changes')![2];
    system(channels[2])({ extension: 'postgres_changes', status: 'error', message: 'not in publication' });
    system(channels[0])({ extension: 'postgres_changes', status: 'ok' });
    expect(handlers.onReady).toHaveBeenCalledWith('readings');
    expect(handlers.onReady).toHaveBeenCalledTimes(1);
    changesCb(channels[0])({ new: { id: 1 } });
    expect(handlers.onReading).toHaveBeenCalledTimes(1);
    changesCb(channels[1])({ new: { id: 'dev', status: 'offline' } });
    expect(handlers.onDevice).toHaveBeenCalledWith({ id: 'dev', status: 'offline' });

    channels[0].status!('SUBSCRIBED');
    expect(handlers.onReconnect).not.toHaveBeenCalled();
    channels[0].status!('CHANNEL_ERROR');
    channels[0].status!('SUBSCRIBED');
    expect(handlers.onReconnect).toHaveBeenCalledTimes(1);
    stop();
    expect(client.removeChannel).toHaveBeenCalledTimes(3);
  });
});
