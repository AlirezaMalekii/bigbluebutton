#!/usr/bin/env bash
# Best workflow for UI dev: run webpack on Mac, expose it through the BBB server URL.
# Join via Greenlight as usual — no copying sessionToken, no localhost proxy quirks.
#
# Prerequisites:
#   - SSH access to the BBB server
#   - On Mac: run WITHOUT BBB_SERVER (standard npm start on port 3000)
#
# Steps:
#   Terminal 1 (Mac):
#     cd bigbluebutton-html5
#     npm start
#
#   Terminal 2 (Mac) — keep open:
#     ./run-dev-tunnel.sh user@live51.roomeet.ir
#
#   Terminal 3 (server, once per dev session):
#     sudo ln -sf /usr/share/bigbluebutton/nginx/bbb-html5.nginx.dev \
#       /usr/share/bigbluebutton/nginx/bbb-html5.nginx
#     sudo systemctl restart nginx
#
#   Join from Greenlight normally:
#     https://live51.roomeet.ir/html5client/?sessionToken=...
#
#   When finished on the server:
#     sudo ln -sf /usr/share/bigbluebutton/nginx/bbb-html5.nginx.static \
#       /usr/share/bigbluebutton/nginx/bbb-html5.nginx
#     sudo systemctl restart nginx

set -euo pipefail

REMOTE="${1:-}"
LOCAL_PORT="${PORT:-3000}"

if [ -z "$REMOTE" ]; then
  echo "Usage: $0 user@your-bbb-server.example.com"
  echo ""
  echo "First run 'npm start' in another terminal (without BBB_SERVER)."
  exit 1
fi

echo "Tunnel: Mac localhost:${LOCAL_PORT} -> ${REMOTE}:127.0.0.1:3000"
echo "Press Ctrl+C to stop."
echo ""

exec ssh -N \
  -o ExitOnForwardFailure=yes \
  -R "127.0.0.1:${LOCAL_PORT}:127.0.0.1:${LOCAL_PORT}" \
  "$REMOTE"
