#!/usr/bin/env bash
# SafeMeet product version helper.
#
# Canonical file: SAFEMEET_VERSION (repo root)
# Mirrored into: bigbluebutton-html5/private/config/settings.yml → public.app.html5ClientBuild
#                (shown in Settings → About Roomeet)
#
# Scheme:
#   - Milestones (0.8, 0.9, 1.0) are set manually:  --set 0.9
#   - Every push to safemeet auto-increments the patch: 0.8 → 0.8.1 → 0.8.2
#
# Usage:
#   scripts/safemeet-bump-version.sh           # bump patch
#   scripts/safemeet-bump-version.sh --set 0.9 # set milestone (resets patch)
#   scripts/safemeet-bump-version.sh --get     # print current version

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="${ROOT}/SAFEMEET_VERSION"
SETTINGS_FILE="${ROOT}/bigbluebutton-html5/private/config/settings.yml"
INITIAL_VALUES_FILE="${ROOT}/bigbluebutton-html5/imports/ui/core/initial-values/meetingClientSettings.ts"

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \?//'
  exit 1
}

read_version() {
  if [[ ! -f "$VERSION_FILE" ]]; then
    echo "Missing ${VERSION_FILE}" >&2
    exit 1
  fi
  tr -d '[:space:]' < "$VERSION_FILE"
  # callers that print should add a newline; keep raw for composition
}

print_version() {
  printf '%s\n' "$(read_version)"
}

validate_version() {
  local v="$1"
  if [[ ! "$v" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
    echo "Invalid version '${v}'. Expected MAJOR.MINOR or MAJOR.MINOR.PATCH" >&2
    exit 1
  fi
}

bump_patch() {
  local v="$1"
  if [[ "$v" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.1"
  elif [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))"
  else
    echo "Cannot bump version '${v}'" >&2
    exit 1
  fi
}

sync_mirrors() {
  local v="$1"

  if [[ -f "$SETTINGS_FILE" ]]; then
    # Keep YAML quoting consistent with surrounding style (unquoted is fine for 0.8.1)
    if grep -qE '^[[:space:]]*html5ClientBuild:' "$SETTINGS_FILE"; then
      sed -i.bak -E "s|^([[:space:]]*html5ClientBuild:).*|\1 ${v}|" "$SETTINGS_FILE"
      rm -f "${SETTINGS_FILE}.bak"
    else
      echo "html5ClientBuild key not found in ${SETTINGS_FILE}" >&2
      exit 1
    fi
  fi

  if [[ -f "$INITIAL_VALUES_FILE" ]]; then
    if grep -qE 'html5ClientBuild:' "$INITIAL_VALUES_FILE"; then
      sed -i.bak -E "s|(html5ClientBuild:[[:space:]]*)['\"][^'\"]*['\"]|\1'${v}'|" "$INITIAL_VALUES_FILE"
      rm -f "${INITIAL_VALUES_FILE}.bak"
    fi
  fi
}

write_version() {
  local v="$1"
  validate_version "$v"
  printf '%s\n' "$v" > "$VERSION_FILE"
  sync_mirrors "$v"
  echo "$v"
}

cmd="${1:-bump}"

case "$cmd" in
  --get|get)
    print_version
    ;;
  --set|set)
    [[ -n "${2:-}" ]] || usage
    write_version "$2"
    ;;
  --bump|bump|"")
    current="$(read_version)"
    write_version "$(bump_patch "$current")"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    ;;
esac
