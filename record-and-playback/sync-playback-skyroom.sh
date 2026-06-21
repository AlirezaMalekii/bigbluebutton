#!/bin/bash
# Sync shared Skyroom playback assets into each legacy player template directory.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/playback-skyroom"

TARGETS=(
  "video/playback/video"
  "screenshare/playback"
  "presentation/playback/presentation/0.9.0"
  "presentation/playback/presentation/0.81"
  "slides/playback/slides"
)

for target in "${TARGETS[@]}"; do
  dest="$ROOT/$target/playback-skyroom"
  rm -rf "$dest"
  cp -R "$SRC" "$dest"
  echo "synced playback-skyroom -> $target"
done
