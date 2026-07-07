#!/usr/bin/env bash
# Idempotent disk maintenance on the BBB deploy server (safe for test/staging).
# Run before remote deploy builds to avoid unbounded cache and log growth.
set -euo pipefail

BBB_ROOT="${BBB_ROOT:-/root/dev/bigbluebutton}"
HTML5_CLIENT="${HTML5_CLIENT:-/usr/share/bigbluebutton/html5-client}"
JOURNAL_MAX="${JOURNAL_MAX:-500M}"
DISK_WARN_PCT="${DISK_WARN_PCT:-85}"

log() {
  printf '[cleanup] %s\n' "$*"
}

disk_use_pct() {
  df -P / | awk 'NR==2 { gsub(/%/, "", $5); print $5 }'
}

log "Disk before: $(df -h / | awk 'NR==2 { print $3 "/" $2 " (" $5 ")" }')"

if command -v journalctl >/dev/null; then
  log "Vacuuming systemd journal to ${JOURNAL_MAX} ..."
  journalctl --vacuum-size="$JOURNAL_MAX" 2>/dev/null || true
fi

if [[ -d "${BBB_ROOT}/bigbluebutton-html5/node_modules/.cache" ]]; then
  log "Removing html5 webpack/babel cache ..."
  rm -rf "${BBB_ROOT}/bigbluebutton-html5/node_modules/.cache"
fi

if command -v npm >/dev/null; then
  npm cache clean --force 2>/dev/null || true
fi

if command -v docker >/dev/null; then
  log "Pruning unused Docker images ..."
  docker image prune -af 2>/dev/null || true
fi

if command -v apt-get >/dev/null; then
  apt-get clean 2>/dev/null || true
fi

pct="$(disk_use_pct)"
if [[ "$pct" -ge "$DISK_WARN_PCT" ]]; then
  log "Disk at ${pct}% — removing server-side target/ build outputs (rebuilt on demand) ..."
  find "$BBB_ROOT" -type d -name target -prune -exec rm -rf {} + 2>/dev/null || true
fi

# Legacy: many deploys used cp without delete, leaving hundreds of bundle.* files.
if [[ -d "$HTML5_CLIENT" ]]; then
  bundle_count="$(find "$HTML5_CLIENT" -maxdepth 1 -name 'bundle.*.js' 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${bundle_count:-0}" -gt 3 ]]; then
    log "Pruning ${bundle_count} stale html5-client bundle files (pre-rsync legacy) ..."
    find "$HTML5_CLIENT" -maxdepth 1 \( -name 'bundle.*.js' -o -name 'bundle.*.js.map' -o -name 'bundle.*.js.gz' -o -name '*.bundle.*.js' -o -name '*.bundle.*.js.map' -o -name '*.bundle.*.js.gz' \) -delete 2>/dev/null || true
  fi
fi

log "Disk after: $(df -h / | awk 'NR==2 { print $3 "/" $2 " (" $5 ")" }')"
