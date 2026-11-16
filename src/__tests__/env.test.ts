import { parseEnv } from '../env';

const url = 'https://abc.supabase.co';
const key = 'sb_publishable_abc123';

describe('parseEnv', () => {
  it('accepts a supabase config', () => {
    expect(
      parseEnv({
        EXPO_PUBLIC_DATA_SOURCE: 'supabase',
        EXPO_PUBLIC_SUPABASE_URL: url,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toEqual({ dataSource: 'supabase', supabaseUrl: url, supabasePublishableKey: key });
  });

  it('allows fixtures without supabase values', () => {
    expect(parseEnv({ EXPO_PUBLIC_DATA_SOURCE: 'fixtures', EXPO_PUBLIC_SUPABASE_URL: '' })).toEqual({
      dataSource: 'fixtures',
    });
  });

  it('defaults to supabase and requires its values', () => {
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL: required/);
  });

  it('rejects a secret key', () => {
    expect(() =>
      parseEnv({ EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_x' }),
    ).toThrow(/secret keys/);
  });

  it('rejects an unknown data source', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_DATA_SOURCE: 'mock' })).toThrow(/EXPO_PUBLIC_DATA_SOURCE/);
  });
});
