#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail() {
  printf 'Repository validation failed: %s\n' "$1" >&2
  exit 1
}

mode="${1:---full}"
[[ "$#" -le 1 ]] || fail "usage: $0 [--checks-only|--full]"
case "$mode" in
  --checks-only|--full) ;;
  *) fail "usage: $0 [--checks-only|--full]" ;;
esac

command -v git >/dev/null 2>&1 || fail "git is required"
command -v rg >/dev/null 2>&1 || fail "ripgrep (rg) is required"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "run this command inside the product Git repository"

required_files=(
  "AGENTS.md"
  "README.md"
  "CHANGELOG.md"
  "VERSION"
  "package.json"
  "package-lock.json"
  "docs/product.md"
  "docs/roadmap.md"
  "docs/architecture.md"
  "docs/testing.md"
  "docs/operations.md"
  "docs/decisions/README.md"
)

for required_file in "${required_files[@]}"; do
  [[ -f "$required_file" ]] || fail "missing required file: $required_file"
done

version="$(tr -d '[:space:]' < VERSION)"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "VERSION must contain a SemVer-shaped X.Y.Z value"
rg --fixed-strings --quiet "## [$version]" CHANGELOG.md || fail "CHANGELOG.md has no section for version $version"
package_version="$(node -p "require('./package.json').version")"
[[ "$package_version" == "$version" ]] || fail "package.json version must match VERSION"

ready_count="$(rg --count '^\| C[0-9]{2} \|.*\| ready \|$' docs/roadmap.md || true)"
in_progress_count="$(rg --count '^\| C[0-9]{2} \|.*\| in_progress \|$' docs/roadmap.md || true)"
ready_count="${ready_count:-0}"
in_progress_count="${in_progress_count:-0}"
selectable_count="$((ready_count + in_progress_count))"
capability_count="$(rg --count '^\| C[0-9]{2} \|' docs/roadmap.md || true)"
complete_count="$(rg --count '^\| C[0-9]{2} \|.*\| complete \|$' docs/roadmap.md || true)"
queued_count="$(rg --count '^\| C[0-9]{2} \|.*\| queued \|$' docs/roadmap.md || true)"
capability_count="${capability_count:-0}"
complete_count="${complete_count:-0}"
queued_count="${queued_count:-0}"
[[ "$capability_count" -gt 0 ]] || fail "roadmap must contain capabilities"
[[ "$((complete_count + queued_count + selectable_count))" -eq "$capability_count" ]] || fail "roadmap contains an invalid capability status"
if [[ "$complete_count" -eq "$capability_count" ]]; then
  [[ "$selectable_count" -eq 0 ]] || fail "completed roadmap cannot select more work"
else
  [[ "$selectable_count" -eq 1 ]] || fail "unfinished roadmap must contain exactly one ready or in-progress capability"
fi

prohibited_reference_pattern='(/Users/|Lesto MVP/internal|\.\./internal(?:/|$)|bureau-of-petty-grievances-(foundation|taste-direction)\.md)'
if rg --line-number --hidden \
  --glob '!.git/**' \
  --glob '!scripts/validate-repository.sh' \
  "$prohibited_reference_pattern" .; then
  fail "private workspace or machine-specific reference detected"
fi

if find . -path './.git' -prune -o -name '.DS_Store' -print | rg --quiet '.'; then
  fail ".DS_Store must not exist in the product repository"
fi

tracked_forbidden="$(git ls-files | rg '(^|/)(\.env($|\.)|.*\.(pem|key|p12)|\.DS_Store$)' | rg --invert-match '(^|/)\.env\.example$' || true)"
if [[ -n "$tracked_forbidden" ]]; then
  printf '%s\n' "$tracked_forbidden" >&2
  fail "forbidden local or credential-bearing filename is tracked"
fi

if [[ "$mode" == "--checks-only" ]]; then
  printf 'Lightweight repository checks passed for version %s.\n' "$version"
  exit 0
fi

command -v npm >/dev/null 2>&1 || fail "npm is required"
node_major="$(node -p "process.versions.node.split('.')[0]")"
[[ "$node_major" == "24" ]] || fail "Node.js 24 is required; found $(node --version)"
./scripts/validate-prototype.sh
npm run verify:app

printf 'Repository validation passed for version %s.\n' "$version"
