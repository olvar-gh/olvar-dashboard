#!/usr/bin/env node
// Checks an `expo export -p web` output and the env it was built with, before it goes to
// Cloudflare Pages (docs/DEPLOY.md). Reads the same .env files as the production export.
//
//   node scripts/check-web-export.js [dist]
const fs = require('node:fs');
const path = require('node:path');

const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]+/;
const SCANNED = new Set(['.html', '.js', '.json', '.map']);

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else yield full;
  }
}

function checkBuildEnv(env) {
  const problems = [];
  const value = (name) => (env[name] === '' ? undefined : env[name]);
  const source = value('EXPO_PUBLIC_DATA_SOURCE') ?? 'supabase';
  const key = value('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  // src/env.ts reads the key statically, so Expo inlines it even into a fixtures build.
  if (key !== undefined && !key.startsWith('sb_publishable_')) {
    problems.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not a publishable key (sb_publishable_...)');
  }
  if (source === 'supabase') {
    if (key === undefined) problems.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set');
    if (value('EXPO_PUBLIC_SUPABASE_URL') === undefined) problems.push('EXPO_PUBLIC_SUPABASE_URL is not set');
  }
  return problems;
}

function checkWebExport(dir) {
  const problems = [];
  if (!fs.existsSync(path.join(dir, 'index.html'))) problems.push('index.html is missing');
  // Pages only serves index.html for unknown paths (SPA mode) when there is no top-level 404.html.
  if (fs.existsSync(path.join(dir, '404.html'))) problems.push('404.html turns off the Cloudflare Pages SPA fallback');
  // `/* /index.html 200` is rejected by Pages as an infinite loop; the SPA fallback needs no rule.
  if (fs.existsSync(path.join(dir, '_redirects'))) {
    const rules = fs.readFileSync(path.join(dir, '_redirects'), 'utf8');
    if (/index\.html\s+200/.test(rules)) problems.push('_redirects rewrites to index.html; rely on the SPA fallback instead');
  }
  if (!fs.existsSync(path.join(dir, '_headers'))) problems.push('_headers is missing (public/_headers was not copied)');
  if (fs.existsSync(dir)) {
    for (const file of files(dir)) {
      if (!SCANNED.has(path.extname(file))) continue;
      if (SECRET_KEY.test(fs.readFileSync(file, 'utf8'))) {
        problems.push(`${path.relative(dir, file)} contains a Supabase secret key`);
      }
    }
  }
  return problems;
}

module.exports = { checkBuildEnv, checkWebExport };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] ?? 'dist');
  require('@expo/env').loadProjectEnv(process.cwd(), { mode: 'production', silent: true });
  const problems = [...checkBuildEnv(process.env), ...checkWebExport(dir)];
  for (const p of problems) console.error(`✗ ${p}`);
  if (problems.length) process.exit(1);
  console.log(`✓ ${path.relative(process.cwd(), dir) || dir} is ready for Cloudflare Pages`);
}
