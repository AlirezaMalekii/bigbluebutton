#!/usr/bin/env bash
# Join a BBB meeting on the local dev client WITHOUT opening the server html5client URL.
# Uses join?redirect=false to get session_token from XML (token is not consumed by the browser).
#
# Usage:
#   export BBB_SECRET='your-secret-from-bbb-conf-salt'
#
#   With password:
#   ./join-local.sh --meeting-id MEETING_ID --password PASS --name "Your Name"
#
#   Without password (use role instead — typical for Greenlight open rooms):
#   ./join-local.sh --meeting-id MEETING_ID --name "Guest" --role VIEWER
#   ./join-local.sh --meeting-id MEETING_ID --name "Moderator" --role MODERATOR
#
# Get meeting ID from Greenlight room settings (while the room is running).

set -euo pipefail
cd "$(dirname "$0")"

BBB_SERVER="${BBB_SERVER:-https://live51.roomeet.ir}"
LOCAL_PORT="${PORT:-3000}"
LOCAL_CLIENT="http://localhost:${LOCAL_PORT}/html5client"
MEETING_ID=""
PASSWORD=""
FULL_NAME=""
ROLE=""
OPEN_BROWSER=true

usage() {
  sed -n '2,16p' "$0"
  echo ""
  echo "Environment:"
  echo "  BBB_SERVER   Remote BBB URL (default: https://live51.roomeet.ir)"
  echo "  BBB_SECRET   Required. Run 'bbb-conf --salt' on the server to get it."
  echo "  PORT         Local webpack port (default: 3000)"
  echo ""
  echo "Note: BBB requires either --password or --role (MODERATOR / VIEWER)."
}

urlencode() {
  python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --meeting-id) MEETING_ID="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --name) FULL_NAME="$2"; shift 2 ;;
    --role) ROLE="$(printf '%s' "$2" | tr '[:lower:]' '[:upper:]')"; shift 2 ;;
    --no-open) OPEN_BROWSER=false; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 2 ;;
  esac
done

if [ -z "${BBB_SECRET:-}" ]; then
  echo "Error: BBB_SECRET is not set."
  echo "On the BBB server run: bbb-conf --salt"
  exit 1
fi

if [ -z "$MEETING_ID" ] || [ -z "$FULL_NAME" ]; then
  echo "Error: --meeting-id and --name are required."
  usage
  exit 1
fi

if [ -z "$PASSWORD" ] && [ -z "$ROLE" ]; then
  echo "Error: provide --password or --role (MODERATOR / VIEWER)."
  usage
  exit 1
fi

if [ -n "$ROLE" ] && [ "$ROLE" != "MODERATOR" ] && [ "$ROLE" != "VIEWER" ]; then
  echo "Error: --role must be MODERATOR or VIEWER."
  exit 1
fi

ENCODED_NAME="$(urlencode "$FULL_NAME")"

# BBB checksum: sha1(apiName + alphabetically sorted query string + secret)
QUERY="fullName=${ENCODED_NAME}&meetingID=${MEETING_ID}&redirect=false"
if [ -n "$PASSWORD" ]; then
  ENCODED_PASSWORD="$(urlencode "$PASSWORD")"
  QUERY="${QUERY}&password=${ENCODED_PASSWORD}"
fi
if [ -n "$ROLE" ]; then
  QUERY="${QUERY}&role=${ROLE}"
fi

CHECKSUM=$(printf 'join%s%s' "$QUERY" "$BBB_SECRET" | shasum -a 1 | awk '{print $1}')
JOIN_URL="${BBB_SERVER%/}/bigbluebutton/api/join?${QUERY}&checksum=${CHECKSUM}"

echo "Requesting session token from server..."
RESPONSE=$(curl -sS --fail "$JOIN_URL" || {
  echo "Join API failed. Check meeting ID, password/role, and BBB_SECRET."
  exit 1
})

SESSION_TOKEN=$(echo "$RESPONSE" | sed -n 's:.*<session_token>\([^<]*\)</session_token>.*:\1:p')

if [ -z "$SESSION_TOKEN" ]; then
  echo "Could not parse session_token. API response:"
  echo "$RESPONSE"
  exit 1
fi

LOCAL_URL="${LOCAL_CLIENT}/?sessionToken=${SESSION_TOKEN}"

echo ""
echo "Session token: ${SESSION_TOKEN}"
echo "Local URL:     ${LOCAL_URL}"
echo ""

if $OPEN_BROWSER; then
  if command -v open >/dev/null 2>&1; then
    open "$LOCAL_URL"
  else
    echo "Open this URL in your browser."
  fi
fi
