#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail() {
  printf 'Repository validation failed: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
command -v rg >/dev/null 2>&1 || fail "ripgrep (rg) is required"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "run this command inside the product Git repository"

required_files=(
  "AGENTS.md"
  "README.md"
  "CHANGELOG.md"
  "VERSION"
  "docs/product.md"
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

printf 'Repository validation passed for version %s.\n' "$version"
