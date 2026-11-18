#!/usr/bin/env node
// Checks an `expo export -p web` output before it goes to Cloudflare Pages (docs/DEPLOY.md).
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

module.exports = { checkWebExport };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] ?? 'dist');
  const problems = checkWebExport(dir);
  for (const p of problems) console.error(`✗ ${p}`);
  if (problems.length) process.exit(1);
  console.log(`✓ ${path.relative(process.cwd(), dir) || dir} is ready for Cloudflare Pages`);
}
