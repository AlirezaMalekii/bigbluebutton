#!/usr/bin/env bash
# Ensure BBB recording workers run 24/7 (disable legacy stop/start timers).
#
# Background: a custom timer previously stopped bbb-rap-resque-worker daily at 07:00
# and restarted at 14:00, delaying recording publish for up to 7 hours.
#
# Usage on BBB server (as root):
#   bash bbb-recording-processing-24x7.sh
#
set -euo pipefail

log() { printf '[bbb-recording-24x7] %s\n' "$*"; }

for timer in bbb-stop-processing.timer bbb-start-processing.timer; do
  if systemctl list-unit-files "$timer" &>/dev/null; then
    systemctl disable --now "$timer" 2>/dev/null || true
    log "Disabled $timer"
  fi
done

systemctl enable bbb-rap-resque-worker bbb-rap-starter 2>/dev/null || true
systemctl start bbb-rap-resque-worker bbb-rap-starter

log "bbb-rap-resque-worker: $(systemctl is-active bbb-rap-resque-worker)"
log "bbb-rap-starter: $(systemctl is-active bbb-rap-starter)"
log "Done."
