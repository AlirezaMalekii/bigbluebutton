#!/usr/bin/env bash
# Return the oldest published SafeMeet git commit (among tracked packages) that is
# still an ancestor of HEAD. Used when CI was cancelled or failed before publish
# so incremental builds do not skip already-merged source changes.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
REPO_DOMAIN="${REPO_DOMAIN:-new-bbb-install.roomeet.ir}"
TARGET_COMMIT="${1:-HEAD}"
TRACKED_PACKAGES=(
  bbb-html5
  bbb-web
  bbb-apps-akka
  bbb-fsesl-akka
)

cd "$REPO_ROOT"

latest_published_commit() {
  local package="$1"
  curl -fsSL "https://${REPO_DOMAIN}/jammy-300/dists/bigbluebutton-jammy/main/binary-amd64/Packages.gz" \
    | gzip -dc \
    | awk -v pkg="$package" '
      $1 == "Package:" && $2 == pkg { in_pkg = 1; next }
      in_pkg && $1 == "Version:" {
        print $0
        exit
      }
      in_pkg && $1 == "Package:" && $2 != pkg { exit }
    ' | sed -n 's/.*safemeet\.\([0-9a-f]\{40\}\).*/\1/p' | head -n 1
}

pick_oldest_ancestor() {
  local candidate head="$1"
  shift
  local commit oldest=""

  for commit in "$@"; do
    [[ -n "$commit" ]] || continue
    git cat-file -e "${commit}^{commit}" 2>/dev/null || continue
    git merge-base --is-ancestor "$commit" "$head" || continue
    if [[ -z "$oldest" ]] || git merge-base --is-ancestor "$commit" "$oldest"; then
      oldest="$commit"
    fi
  done

  [[ -n "$oldest" ]] && printf '%s' "$oldest"
}

published_commits=()
for package in "${TRACKED_PACKAGES[@]}"; do
  commit="$(latest_published_commit "$package" || true)"
  [[ -n "${commit:-}" ]] && published_commits+=("$commit")
done

if ((${#published_commits[@]} == 0)); then
  exit 0
fi

pick_oldest_ancestor "$TARGET_COMMIT" "${published_commits[@]}"
