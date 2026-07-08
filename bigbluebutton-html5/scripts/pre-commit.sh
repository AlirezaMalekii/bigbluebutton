#!/usr/bin/env bash
# Husky pre-commit: auto-fix ESLint on staged files, then typecheck.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGED="$(
  git diff --cached --name-only --diff-filter=ACM \
    | grep -E '^bigbluebutton-html5/.*\.(js|jsx|ts|tsx)$' \
    | sed 's#^bigbluebutton-html5/##' \
    || true
)"

if [[ -n "$STAGED" ]]; then
  echo "pre-commit: eslint --fix on staged files..."
  # shellcheck disable=SC2086
  npx eslint --fix $STAGED || true
fi

echo "pre-commit: lint-staged..."
npx lint-staged

echo "pre-commit: tscheck..."
npm run tscheck:staged
