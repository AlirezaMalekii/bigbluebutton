#!/usr/bin/env bash
# Run the HTML5 client locally while using a remote BigBlueButton server for all backend APIs.
#
# Usage:
#   ./run-dev-remote.sh
#   BBB_SERVER=https://your-bbb.example.com ./run-dev-remote.sh
#   ./run-dev-remote.sh --reset
#
# Join a meeting:
#   1. Create/join a meeting on the remote server (Greenlight, API, etc.)
#   2. Copy the html5client join URL (contains sessionToken=...)
#   3. Open the same URL on localhost, e.g.:
#      http://localhost:3000/html5client/?sessionToken=YOUR_TOKEN

set -euo pipefail
cd "$(dirname "$0")"

BBB_SERVER="${BBB_SERVER:-https://live51.roomeet.ir}"
RESET=false

for var in "$@"; do
  case "$var" in
    --reset) RESET=true ;;
    --help|-h)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $var"
      exit 2
      ;;
  esac
done

if $RESET; then
  echo "Performing a full reset..."
  rm -rf node_modules
fi

if [ ! -d ./node_modules ] || ! npm ls --depth=0 >/dev/null 2>&1; then
  echo "Running npm install..."
  npm install
fi

export BBB_SERVER
export NODE_ENV=development
export DETAILED_LOGS=true
export HOT_RELOAD=true

echo ""
echo "Remote BBB server: ${BBB_SERVER}"
echo "Local client:      http://localhost:3000/html5client/"
echo ""
echo "=== Easiest ways to join (pick one) ==="
echo ""
echo "A) API join (recommended — no copying token from Chrome):"
echo "   export BBB_SECRET='...'   # from: bbb-conf --salt on server"
echo "   ./join-local.sh --meeting-id MEETING_ID --password PASS --name 'Your Name'"
echo ""
echo "B) Paste token page (after copying URL from Network tab, not address bar):"
echo "   http://localhost:3000/html5client/dev-join.html"
echo ""
echo "C) SSH tunnel (best long-term — join via Greenlight normally):"
echo "   See ./run-dev-tunnel.sh"
echo ""
echo "If GraphQL WebSocket still fails, on the server add:"
echo "  /etc/bigbluebutton/bbb-graphql-middleware.yml"
echo "    server:"
echo "      authorized_cross_origin: localhost"
echo "  then: sudo systemctl restart bbb-graphql-middleware"
echo ""

npm start
