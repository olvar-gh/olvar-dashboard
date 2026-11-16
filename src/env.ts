import { z } from 'zod';

export type DataSourceKind = 'supabase' | 'fixtures';

export type Env =
  | { dataSource: 'fixtures'; supabaseUrl?: string; supabasePublishableKey?: string }
  | { dataSource: 'supabase'; supabaseUrl: string; supabasePublishableKey: string };

const schema = z
  .object({
    EXPO_PUBLIC_DATA_SOURCE: z.enum(['supabase', 'fixtures']).default('supabase'),
    EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .refine((k) => !k.startsWith('sb_secret_'), 'secret keys must never be used in the app')
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.EXPO_PUBLIC_DATA_SOURCE !== 'supabase') return;
    if (!v.EXPO_PUBLIC_SUPABASE_URL)
      ctx.addIssue({ code: 'custom', path: ['EXPO_PUBLIC_SUPABASE_URL'], message: 'required' });
    if (!v.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      ctx.addIssue({ code: 'custom', path: ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'], message: 'required' });
  });

type RawEnv = Record<string, string | undefined>;

export function parseEnv(raw: RawEnv): Env {
  // Empty strings (e.g. an unfilled .env line) count as unset.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ''));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const fields = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment (see .env.example): ${fields}`);
  }
  const v = result.data;
  return {
    dataSource: v.EXPO_PUBLIC_DATA_SOURCE,
    supabaseUrl: v.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: v.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  } as Env;
}

let cached: Env | undefined;

/** Validated app environment. Expo inlines EXPO_PUBLIC_* only for static `process.env.X` reads. */
export function getEnv(): Env {
  cached ??= parseEnv({
    EXPO_PUBLIC_DATA_SOURCE: process.env.EXPO_PUBLIC_DATA_SOURCE,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
