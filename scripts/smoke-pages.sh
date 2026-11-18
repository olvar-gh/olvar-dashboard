#!/usr/bin/env bash
# Serves a web export with Cloudflare's local Pages server (no login) and checks that deep links
# fall back to index.html and that the fallback HTML is never cached long-term.
#
#   scripts/smoke-pages.sh [dist] [port]
set -euo pipefail

dir=${1:-dist}
port=${2:-8788}
base="http://localhost:$port"
log=$(mktemp)

# A server already on the port would answer the probes instead of the one started here.
if curl -s -o /dev/null --max-time 2 "$base/" || [[ $? -ne 7 ]]; then
  echo "✗ port $port is already in use; stop that server or pass another port" >&2
  exit 1
fi

npx -y wrangler@4.164.0 pages dev "$dir" --port "$port" >"$log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true; rm -f "$log"' EXIT

ready=0
for _ in $(seq 1 90); do
  if ! kill -0 "$server" 2>/dev/null; then
    echo '✗ wrangler pages dev exited:' >&2
    cat "$log" >&2
    exit 1
  fi
  if curl -sf -o /dev/null "$base/"; then
    ready=1
    break
  fi
  sleep 1
done
if [[ $ready != 1 ]]; then
  echo "✗ wrangler pages dev did not answer on $base" >&2
  cat "$log" >&2
  exit 1
fi

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

stale="$base/_expo/static/js/web/removed-by-a-later-deploy.js"
if curl -sI "$stale" | grep -qiE '^cache-control:.*(immutable|max-age=[1-9])'; then
  echo "✗ the SPA fallback for a missing bundle is cached long-term"
  fail=1
else
  echo "✓ the SPA fallback for a missing bundle is revalidated"
fi

if grep -q 'invalid redirect rule' "$log"; then
  echo '✗ wrangler rejected a _redirects rule:'
  cat "$log"
  fail=1
fi

exit $fail
