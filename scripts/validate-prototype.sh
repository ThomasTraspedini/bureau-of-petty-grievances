#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail() {
  printf 'Prototype validation failed: %s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js is required"

required_files=(
  "prototype/en/index.html"
  "prototype/en/messages.mjs"
  "prototype/app.mjs"
  "prototype/prototype-state.mjs"
  "prototype/styles.css"
  "prototype/assets/fonts/PublicSans-Variable.ttf"
  "prototype/assets/fonts/SourceSerif4-Variable.ttf"
  "prototype/assets/fonts/IBMPlexMono-Regular.ttf"
  "prototype/assets/fonts/OFL-PublicSans.txt"
  "prototype/assets/fonts/OFL-SourceSerif4.txt"
  "prototype/assets/fonts/OFL-IBMPlexMono.txt"
)

for required_file in "${required_files[@]}"; do
  [[ -f "$required_file" ]] || fail "missing required file: $required_file"
done

node --check prototype/app.mjs
node --check prototype/en/messages.mjs
node --check prototype/prototype-state.mjs
node --test prototype/tests/*.test.mjs

printf 'Prototype validation passed.\n'
