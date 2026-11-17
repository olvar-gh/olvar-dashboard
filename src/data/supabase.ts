import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { getEnv } from '@/env';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | undefined;

/** The app's Supabase client (publishable key + the owner's persisted session). */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const env = getEnv();
  if (env.dataSource !== 'supabase') throw new Error('Supabase is not configured (EXPO_PUBLIC_DATA_SOURCE=fixtures)');
  const created = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  if (Platform.OS !== 'web') {
    // Native timers do not run in the background, so token refresh follows the app state.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void created.auth.startAutoRefresh();
      else void created.auth.stopAutoRefresh();
    });
  }
  client = created;
  return created;
}
