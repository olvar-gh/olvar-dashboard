#!/usr/bin/env bash
# Serves a web export with Cloudflare's local Pages server (no login) and checks that deep links
# fall back to index.html and that hashed bundles get the immutable cache header.
#
#   scripts/smoke-pages.sh [dist] [port]
set -euo pipefail

dir=${1:-dist}
port=${2:-8788}
base="http://localhost:$port"
log=$(mktemp)

npx -y wrangler@4.164.0 pages dev "$dir" --port "$port" >"$log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true; rm -f "$log"' EXIT

for _ in $(seq 1 90); do
  curl -sf -o /dev/null "$base/" && break
  sleep 1
done

fail=0
for route in / /settings/devices /sensors /timeline /chat /sign-in /no/such/page; do
  body=$(curl -s -w '\n%{http_code}' "$base$route")
  code=${body##*$'\n'}
  if [[ $code != 200 || $body != *'<div id="root">'* ]]; then
    echo "✗ $route -> $code, not the app shell"
    fail=1
  else
    echo "✓ $route -> index.html"
  fi
done

bundle=$(cd "$dir" && find _expo/static/js -name '*.js' | head -n 1)
if curl -sI "$base/$bundle" | grep -qi 'cache-control: public, max-age=31536000, immutable'; then
  echo "✓ /$bundle is cached immutable"
else
  echo "✗ /$bundle is missing the immutable Cache-Control header"
  fail=1
fi

if grep -q 'invalid redirect rule' "$log"; then
  echo '✗ wrangler rejected a _redirects rule:'
  cat "$log"
  fail=1
fi

exit $fail
