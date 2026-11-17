import { FunctionsHttpError, type SupabaseClient, type User } from '@supabase/supabase-js';

import type { Database } from '../database.types';
import { fetchAll } from '../fetch-all';
import type { ChatMessageRow, OfflinePeriodRow, PlantWithProfile, Reading, Session, Thresholds } from '../types';
import { ChatError, DataError, type ChatErrorKind, type DataSource } from './index';

type Client = SupabaseClient<Database>;
type PgError = { message: string; code?: string };

const PLANT_SELECT = '*, profile:plant_profiles(id, common_name, scientific_name, thresholds)';

function maybe<T>(res: { data: T | null; error: PgError | null }): T | null {
  if (res.error) throw new DataError(res.error.message, res.error.code);
  return res.data;
}

function list<T>(res: { data: T[] | null; error: PgError | null }): T[] {
  return maybe(res) ?? [];
}

function one<T>(res: { data: T | null; error: PgError | null }): T {
  const row = maybe(res);
  if (row == null) throw new DataError('No row returned', 'PGRST116');
  return row;
}

function toSession(user: User | null | undefined): Session | null {
  if (!user) return null;
  const name = user.user_metadata?.name;
  return { userId: user.id, email: user.email ?? '', name: typeof name === 'string' && name ? name : null };
}

const CHAT_STATUS: Record<number, ChatErrorKind> = {
  400: 'invalid_message',
  401: 'unauthorized',
  404: 'not_found',
  429: 'rate_limited',
};

async function chatError(error: unknown): Promise<ChatError> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    let body: { error?: string; retry_after?: number } = {};
    try {
      body = await res.json();
    } catch {
      // A non-JSON error body (e.g. a gateway timeout page) keeps the HTTP status only.
    }
    const header = Number(res.headers.get('Retry-After'));
    const retryAfter = body.retry_after ?? (Number.isFinite(header) && header > 0 ? header : undefined);
    return new ChatError(CHAT_STATUS[res.status] ?? 'failed', body.error ?? `chat failed (${res.status})`, retryAfter);
  }
  return new ChatError('failed', error instanceof Error ? error.message : String(error));
}

export function createSupabaseSource(client: Client): DataSource {
  const readings = () => client.from('readings_v').select('*');

  return {
    kind: 'supabase',

    auth: {
      async getSession() {
        const { data } = await client.auth.getSession();
        return toSession(data.session?.user);
      },
      onChange(listener) {
        const { data } = client.auth.onAuthStateChange((_event, session) => listener(toSession(session?.user)));
        return () => data.subscription.unsubscribe();
      },
      async signIn(email, password) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw new DataError(error.message, error.code);
        return toSession(data.user)!;
      },
      async signOut() {
        const { error } = await client.auth.signOut();
        if (error) throw new DataError(error.message, error.code);
      },
      async updateName(name) {
        const { data, error } = await client.auth.updateUser({ data: { name } });
        if (error) throw new DataError(error.message, error.code);
        return toSession(data.user)!;
      },
      async changePassword(currentPassword, newPassword) {
        const { data } = await client.auth.getSession();
        const email = data.session?.user.email;
        if (!email) throw new DataError('Not signed in');
        const reauth = await client.auth.signInWithPassword({ email, password: currentPassword });
        if (reauth.error) throw new DataError('Current password is incorrect', reauth.error.code);
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw new DataError(error.message, error.code);
      },
    },

    async getPlant() {
      const rows = list(await client.from('plants').select(PLANT_SELECT).order('created_at').limit(1));
      return (rows[0] as unknown as PlantWithProfile | undefined) ?? null;
    },

    async updatePlant(plantId, patch) {
      const row = one(await client.from('plants').update(patch).eq('id', plantId).select(PLANT_SELECT).single());
      return row as unknown as PlantWithProfile;
    },

    async getEffectiveThresholds(plantId) {
      const { data, error } = await client.rpc('effective_thresholds', { p_plant_id: plantId });
      if (error) {
        // 42501: execute not granted; the caller merges profile + overrides instead.
        if (error.code === '42501') return null;
        throw new DataError(error.message, error.code);
      }
      return data as Thresholds;
    },

    async getStatus(plantId) {
      return maybe(await client.from('plant_status_v').select('*').eq('plant_id', plantId).maybeSingle());
    },

    async getDevice(plantId) {
      const rows = list(await client.from('devices').select('*').eq('plant_id', plantId).order('created_at').limit(1));
      return rows[0] ?? null;
    },

    async updateCalibration(deviceId, dryRaw, wetRaw) {
      return one(
        await client
          .from('devices')
          .update({ soil_dry_raw: dryRaw, soil_wet_raw: wetRaw, soil_calibrated_at: new Date().toISOString() })
          .eq('id', deviceId)
          .select('*')
          .single(),
      );
    },

    async getGateway() {
      const rows = list(
        await client.from('gateways').select('*').order('last_seen_at', { ascending: false }).limit(1),
      );
      return rows[0] ?? null;
    },

    async getLatestReadings(deviceId, limit) {
      return list(
        await readings()
          .eq('device_id', deviceId)
          .order('recorded_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(limit),
      );
    },

    getReadings(deviceId, from, to) {
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      return fetchAll((a, b) =>
        readings()
          .eq('device_id', deviceId)
          .gte('recorded_at', fromIso)
          .lte('recorded_at', toIso)
          .order('recorded_at')
          .order('id')
          .range(a, b),
      );
    },

    async getHourly(deviceId, from, to) {
      // 90 days of hours is 2,160 rows, past the row limit; rollups have no id, so key by bucket.
      const rows = await fetchAll(async (a, b) => {
        const res = await client
          .from('readings_hourly_v')
          .select('*')
          .eq('device_id', deviceId)
          .gte('bucket', from.toISOString())
          .lt('bucket', to.toISOString())
          .order('bucket')
          .range(a, b);
        return { data: res.data?.map((r) => ({ ...r, id: Date.parse(r.bucket) })) ?? null, error: res.error };
      });
      return rows.map(({ id: _id, ...r }) => r);
    },

    async getDaily(deviceId, fromDate, toDate) {
      return list(
        await client
          .from('readings_daily_v')
          .select('*')
          .eq('device_id', deviceId)
          .gte('bucket', fromDate)
          .lte('bucket', toDate)
          .order('bucket'),
      );
    },

    async getOfflinePeriods(deviceId, from, to) {
      const rows = list(
        await client.rpc('device_offline_periods', {
          p_device_id: deviceId,
          p_from: from.toISOString(),
          p_to: to.toISOString(),
        }),
      );
      return rows as OfflinePeriodRow[];
    },

    async findReadingWithValue(deviceId, from, to, column, value) {
      const rows = list(
        await readings()
          .eq('device_id', deviceId)
          .gte('recorded_at', from.toISOString())
          .lt('recorded_at', to.toISOString())
          .eq(column, value)
          .order('recorded_at')
          .limit(1),
      );
      return rows[0] ?? null;
    },

    async findExtremeReading(deviceId, from, to, column, direction) {
      const rows = list<Reading>(
        await readings()
          .eq('device_id', deviceId)
          .gte('recorded_at', from.toISOString())
          .lt('recorded_at', to.toISOString())
          .not(column, 'is', null)
          .order(column, { ascending: direction === 'asc' })
          .order('recorded_at')
          .limit(1)
          .overrideTypes<Reading[], { merge: false }>(),
      );
      return rows[0] ?? null;
    },

    async getChatPage(plantId, limit, before) {
      let q = client.from('chat_messages').select('*').eq('plant_id', plantId);
      if (before) {
        q = q.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
      }
      return list(
        await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit),
      );
    },

    async getFirstUserMessage(plantId, from, to) {
      const rows = list(
        await client
          .from('chat_messages')
          .select('*')
          .eq('plant_id', plantId)
          .eq('role', 'user')
          .gte('created_at', from.toISOString())
          .lt('created_at', to.toISOString())
          .order('created_at')
          .order('id')
          .limit(1),
      );
      return rows[0] ?? null;
    },

    async sendChat(plantId, message) {
      const { data, error } = await client.functions.invoke<{ reply: ChatMessageRow }>('chat', {
        body: { plant_id: plantId, message },
      });
      if (error) throw await chatError(error);
      if (!data?.reply) throw new ChatError('failed', 'chat returned no reply');
      return data.reply;
    },

    subscribe({ deviceId, plantId }, handlers) {
      let subscribedOnce = false;
      const channel = client
        .channel(`live:${deviceId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'readings', filter: `device_id=eq.${deviceId}` },
          () => handlers.onReading(),
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'devices', filter: `id=eq.${deviceId}` },
          (payload) => handlers.onDevice(payload.new as Database['public']['Tables']['devices']['Row']),
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `plant_id=eq.${plantId}` },
          (payload) => handlers.onChatMessage(payload.new as ChatMessageRow),
        )
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return;
          if (subscribedOnce) handlers.onReconnect();
          subscribedOnce = true;
        });
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
