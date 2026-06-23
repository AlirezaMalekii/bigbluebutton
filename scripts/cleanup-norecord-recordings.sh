#!/usr/bin/env bash
#
# Remove BBB recordings stopped at archive with .norecord (no recording marks).
# Safe: skips anything with published playback metadata.
#
# Usage:
#   ./cleanup-norecord-recordings.sh              # delete matching recordings
#   ./cleanup-norecord-recordings.sh --dry-run    # list only
#   ./cleanup-norecord-recordings.sh --include-orphans
#
set -euo pipefail

DRY_RUN=0
INCLUDE_ORPHANS=0
RECORDING_DIR="/var/bigbluebutton/recording"
PUBLISHED_DIR="/var/bigbluebutton/published/presentation"
LOG_DIR="/var/log/bigbluebutton"
ARCHIVED_STATUS="${RECORDING_DIR}/status/archived"
RAW_PRESENTATION_SRC="/var/bigbluebutton"

usage() {
  sed -n '3,12p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --include-orphans) INCLUDE_ORPHANS=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 2 ;;
  esac
  shift
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (uses bbb-record --delete)."
  exit 1
fi

if ! command -v bbb-record >/dev/null; then
  echo "bbb-record not found."
  exit 1
fi

is_published() {
  local id="$1"
  [[ -f "${PUBLISHED_DIR}/${id}/metadata.xml" ]]
}

bytes_before=0
if command -v du >/dev/null; then
  bytes_before="$(du -sb "${RECORDING_DIR}/raw" "${RAW_PRESENTATION_SRC}" 2>/dev/null | awk '{s+=$1} END {print s+0}')"
fi

declare -a TO_DELETE=()
declare -a SKIPPED=()

collect_norecord() {
  local f id
  shopt -s nullglob
  for f in "${ARCHIVED_STATUS}"/*.norecord; do
    id="$(basename "$f" .norecord)"
    if is_published "$id"; then
      SKIPPED+=("$id (published — skipped)")
      continue
    fi
    TO_DELETE+=("$id")
  done
}

collect_orphans() {
  local id dir
  shopt -s nullglob
  for dir in "${RAW_PRESENTATION_SRC}"/*-*; do
    [[ -d "$dir" ]] || continue
    id="$(basename "$dir")"
    [[ "$id" =~ ^[0-9a-f]+-[0-9]+$ ]] || continue
    is_published "$id" && continue
    [[ -f "${ARCHIVED_STATUS}/${id}.norecord" ]] && continue
    [[ -f "${ARCHIVED_STATUS}/${id}.done" ]] && continue
    [[ -f "${ARCHIVED_STATUS}/${id}.fail" ]] && continue
    [[ -d "${RECORDING_DIR}/raw/${id}" ]] && continue
    TO_DELETE+=("$id")
  done
}

collect_norecord
if [[ "$INCLUDE_ORPHANS" == "1" ]]; then
  collect_orphans
fi

# Deduplicate IDs (bash 4+)
mapfile -t UNIQUE_IDS < <(printf '%s\n' "${TO_DELETE[@]}" | awk '!seen[$0]++')

echo "=== BBB norecord cleanup ==="
echo "Mode: $([[ "$DRY_RUN" == "1" ]] && echo DRY-RUN || echo DELETE)"
echo "Candidates: ${#UNIQUE_IDS[@]}"
echo "Skipped (published): ${#SKIPPED[@]}"
echo

deleted=0
failed=0

for id in "${UNIQUE_IDS[@]}"; do
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "would delete: $id"
    deleted=$((deleted + 1))
    continue
  fi

  echo "deleting: $id"
  if bbb-record --delete "$id" >/dev/null 2>&1; then
    rm -f "${LOG_DIR}/archive-${id}.log" "${LOG_DIR}/sanity-${id}.log" 2>/dev/null || true
    rm -f "${RECORDING_DIR}/safemeet-assets/${id}.json" \
          "${RECORDING_DIR}/safemeet-assets/${id}.events.json" 2>/dev/null || true
    deleted=$((deleted + 1))
  else
    echo "  FAILED: $id" >&2
    failed=$((failed + 1))
  fi
done

if [[ ${#SKIPPED[@]} -gt 0 && ${#SKIPPED[@]} -le 10 ]]; then
  printf 'skipped: %s\n' "${SKIPPED[@]}"
elif [[ ${#SKIPPED[@]} -gt 10 ]]; then
  echo "skipped ${#SKIPPED[@]} published norecord entries (not listed)"
fi

bytes_after=0
if command -v du >/dev/null; then
  bytes_after="$(du -sb "${RECORDING_DIR}/raw" "${RAW_PRESENTATION_SRC}" 2>/dev/null | awk '{s+=$1} END {print s+0}')"
fi

freed=$((bytes_before - bytes_after))
echo
echo "Done. deleted=$deleted failed=$failed"
if [[ "$bytes_before" -gt 0 ]]; then
  echo "Approx. freed: $((freed / 1024 / 1024)) MiB (raw + /var/bigbluebutton before/after)"
fi
echo "Remaining norecord markers: $(find "${ARCHIVED_STATUS}" -name '*.norecord' 2>/dev/null | wc -l | tr -d ' ')"
echo "Published presentations: $(find "${PUBLISHED_DIR}" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"

exit "$([[ "$failed" -gt 0 ]] && echo 1 || echo 0)"
