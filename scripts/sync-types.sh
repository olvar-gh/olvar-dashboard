#!/usr/bin/env bash
# Pins olvar-gateway's generated types into src/data/database.types.ts.
#
#   scripts/sync-types.sh <ref>          write the pinned copy from <ref> (tag, branch or commit)
#   scripts/sync-types.sh --check <ref>  exit 1 if the pinned copy differs from <ref> (CI)
#
# Reads from a local checkout when GATEWAY_DIR (default ../olvar-gateway) has <ref>, otherwise from
# GitHub through `gh` (GATEWAY_REPO, default olvar-gh/olvar-gateway).
set -euo pipefail

check=0
if [[ "${1:-}" == "--check" ]]; then
  check=1
  shift
fi
ref="${1:?usage: scripts/sync-types.sh [--check] <ref>}"

root="$(cd "$(dirname "$0")/.." && pwd)"
target="$root/src/data/database.types.ts"
src_path="supabase/types/database.types.ts"
gateway_dir="${GATEWAY_DIR:-$root/../olvar-gateway}"
gateway_repo="${GATEWAY_REPO:-olvar-gh/olvar-gateway}"

fetch() {
  if git -C "$gateway_dir" rev-parse --verify --quiet "$ref^{commit}" >/dev/null 2>&1; then
    git -C "$gateway_dir" show "$ref:$src_path"
  else
    gh api -H "Accept: application/vnd.github.raw" "repos/$gateway_repo/contents/$src_path?ref=$ref"
  fi
}

body="$(fetch)"
expected="$(printf '// Synced from %s@%s:%s by scripts/sync-types.sh. Do not edit.\n\n%s\n' \
  "$gateway_repo" "$ref" "$src_path" "$body")"

if [[ $check -eq 1 ]]; then
  if [[ "$expected" != "$(cat "$target")" ]]; then
    echo "src/data/database.types.ts is not in sync with $gateway_repo@$ref; run scripts/sync-types.sh $ref" >&2
    exit 1
  fi
  echo "database.types.ts matches $ref"
else
  printf '%s\n' "$expected" >"$target"
  echo "wrote $target from $ref"
fi
