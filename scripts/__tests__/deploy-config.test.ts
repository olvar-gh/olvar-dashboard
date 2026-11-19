/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkBuildEnv, checkWebExport } from '../check-web-export';

const root = path.resolve(__dirname, '../..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

describe('app config', () => {
  const { expo } = readJson('app.json');

  it('exports the web app as a single-page app', () => {
    expect(expo.web.output).toBe('single');
  });

  it('answers the TestFlight export-compliance question', () => {
    expect(expo.ios.config.usesNonExemptEncryption).toBe(false);
  });

  it('keeps the bundle identifier the App Store record is created with', () => {
    expect(expo.ios.bundleIdentifier).toBe('app.olvar.dashboard');
  });
});

describe('iOS builds', () => {
  it('use no cloud build service', () => {
    expect(fs.existsSync(path.join(root, 'eas.json'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.eas'))).toBe(false);
  });

  it('run the local release script from npm', () => {
    const { scripts } = readJson('package.json');
    expect(scripts['ios:release']).toBe('node scripts/ios-release.js');
    expect(scripts['ios:archive']).toBe('node scripts/ios-release.js --archive');
  });
});

describe('public/_headers', () => {
  const rules = fs
    .readFileSync(path.join(root, 'public/_headers'), 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('#'));

  it('leaves caching to Pages, so the SPA fallback is never cached as a bundle', () => {
    expect(rules.filter((line) => /cache-control/i.test(line))).toEqual([]);
  });
});

describe('checkBuildEnv', () => {
  const url = 'https://ref.supabase.co';
  const notPublishable = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not a publishable key (sb_publishable_...)';

  it('accepts a Supabase build with a publishable key', () => {
    expect(
      checkBuildEnv({ EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' }),
    ).toEqual([]);
  });

  it('rejects a secret key', () => {
    const problems = checkBuildEnv({ EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/secret keys must never be used/);
    expect(problems[1]).toBe(notPublishable);
  });

  it('rejects a legacy JWT key', () => {
    expect(
      checkBuildEnv({ EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.x.y' }),
    ).toEqual([notPublishable]);
  });

  it('requires both Supabase values when the data source defaults to supabase', () => {
    const [problem, ...rest] = checkBuildEnv({ EXPO_PUBLIC_SUPABASE_URL: '' });
    expect(rest).toEqual([]);
    expect(problem).toMatch(/EXPO_PUBLIC_SUPABASE_URL: required/);
    expect(problem).toMatch(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required/);
  });

  it('rejects an unknown data source, which the app refuses at startup', () => {
    const [problem, ...rest] = checkBuildEnv({ EXPO_PUBLIC_DATA_SOURCE: 'fixture' });
    expect(rest).toEqual([]);
    expect(problem).toMatch(/EXPO_PUBLIC_DATA_SOURCE/);
  });

  it('rejects a Supabase URL without a scheme', () => {
    const [problem, ...rest] = checkBuildEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'ref.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
    });
    expect(rest).toEqual([]);
    expect(problem).toMatch(/EXPO_PUBLIC_SUPABASE_URL: Invalid URL/);
  });

  it('needs no Supabase values for a fixtures build', () => {
    expect(checkBuildEnv({ EXPO_PUBLIC_DATA_SOURCE: 'fixtures' })).toEqual([]);
  });

  it('still rejects a non-publishable key in a fixtures build, since it is inlined anyway', () => {
    expect(
      checkBuildEnv({ EXPO_PUBLIC_DATA_SOURCE: 'fixtures', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.x.y' }),
    ).toEqual([notPublishable]);
  });
});

describe('checkWebExport', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-export-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>');
    fs.writeFileSync(path.join(dir, '_headers'), '/*\n  X-Frame-Options: DENY\n');
    fs.mkdirSync(path.join(dir, '_expo/static/js/web'), { recursive: true });
    fs.writeFileSync(path.join(dir, '_expo/static/js/web/index-abc.js'), 'const k="sb_publishable_abc";');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('accepts a SPA export with a publishable key', () => {
    expect(checkWebExport(dir)).toEqual([]);
  });

  it('rejects a top-level 404.html, which turns off the SPA fallback', () => {
    fs.writeFileSync(path.join(dir, '404.html'), '');
    expect(checkWebExport(dir)).toEqual(['404.html turns off the Cloudflare Pages SPA fallback']);
  });

  it('rejects an index.html rewrite rule', () => {
    fs.writeFileSync(path.join(dir, '_redirects'), '/*    /index.html   200\n');
    expect(checkWebExport(dir)).toEqual(['_redirects rewrites to index.html; rely on the SPA fallback instead']);
  });

  it('allows other redirect rules', () => {
    fs.writeFileSync(path.join(dir, '_redirects'), '/home / 301\n');
    expect(checkWebExport(dir)).toEqual([]);
  });

  it('rejects a bundle that contains a secret key', () => {
    fs.writeFileSync(path.join(dir, '_expo/static/js/web/index-abc.js'), 'const k="sb_secret_abc123";');
    expect(checkWebExport(dir)).toEqual([
      `${path.join('_expo/static/js/web/index-abc.js')} contains a Supabase secret key`,
    ]);
  });

  it('reports missing files', () => {
    fs.rmSync(path.join(dir, 'index.html'));
    fs.rmSync(path.join(dir, '_headers'));
    expect(checkWebExport(dir)).toEqual([
      'index.html is missing',
      '_headers is missing (public/_headers was not copied)',
    ]);
  });
});
