/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkWebExport } from '../check-web-export';

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

describe('eas.json', () => {
  const eas = readJson('eas.json');

  it('never carries Supabase values; they come from EAS environments', () => {
    for (const profile of Object.values<{ env?: Record<string, string> }>(eas.build)) {
      for (const [name, value] of Object.entries(profile.env ?? {})) {
        expect(name).not.toMatch(/SUPABASE/);
        expect(value).not.toMatch(/sb_(secret|publishable)_/);
      }
    }
  });

  it('builds production with a remote, auto-incremented build number', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(eas.build.production).toMatchObject({ autoIncrement: true, environment: 'production' });
    expect(eas.build.production.developmentClient).toBeUndefined();
    expect(eas.build.production.distribution).toBeUndefined();
  });
});

describe('public/_headers', () => {
  const headers = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');

  it('caches hashed bundles forever and nothing else', () => {
    expect(headers).toMatch(/^\/_expo\/static\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m);
    expect(headers.match(/Cache-Control/g)).toHaveLength(1);
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
