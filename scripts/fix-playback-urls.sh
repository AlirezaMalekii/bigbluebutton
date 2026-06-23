#!/usr/bin/env bash
#
# Fix playback_host in recording.yml and rewrite 127.0.0.1 links in published metadata.
#
# Usage:
#   PLAYBACK_HOST=live51.roomeet.ir ./fix-playback-urls.sh
#
set -euo pipefail

PLAYBACK_HOST="${PLAYBACK_HOST:-live51.roomeet.ir}"
PLAYBACK_PROTOCOL="${PLAYBACK_PROTOCOL:-https}"
REC_YML="/etc/bigbluebutton/recording/recording.yml"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi

mkdir -p "$(dirname "$REC_YML")"
touch "$REC_YML"

if grep -q '^playback_host:' "$REC_YML"; then
  sed -i "s/^playback_host:.*/playback_host: ${PLAYBACK_HOST}/" "$REC_YML"
else
  printf '\nplayback_host: %s\n' "$PLAYBACK_HOST" >> "$REC_YML"
fi

if grep -q '^playback_protocol:' "$REC_YML"; then
  sed -i "s/^playback_protocol:.*/playback_protocol: ${PLAYBACK_PROTOCOL}/" "$REC_YML"
else
  printf 'playback_protocol: %s\n' "$PLAYBACK_PROTOCOL" >> "$REC_YML"
fi

fixed=0
for meta in /var/bigbluebutton/published/presentation/*/metadata.xml; do
  [[ -f "$meta" ]] || continue
  if grep -qE '127\.0\.0\.1|localhost' "$meta"; then
    sed -i \
      -e "s|https://127\.0\.0\.1/|${PLAYBACK_PROTOCOL}://${PLAYBACK_HOST}/|g" \
      -e "s|http://127\.0\.0\.1/|${PLAYBACK_PROTOCOL}://${PLAYBACK_HOST}/|g" \
      -e "s|https://localhost/|${PLAYBACK_PROTOCOL}://${PLAYBACK_HOST}/|g" \
      "$meta"
    fixed=$((fixed + 1))
  fi
done

echo "playback_host=${PLAYBACK_HOST} (${REC_YML})"
echo "Updated metadata.xml files: ${fixed}"
