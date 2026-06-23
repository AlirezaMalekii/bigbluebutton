#!/usr/bin/env bash
# Map changed repo paths → deploy component names (used by ./deploy.sh on the laptop).
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
LAST_COMMIT="${1:-}"
CURRENT_COMMIT="${2:-HEAD}"

COMPONENTS=""

cd "$REPO_ROOT"

components_has() {
  [[ " ${COMPONENTS} " == *" $1 "* ]]
}

components_add() {
  local name="$1"
  components_has "$name" || COMPONENTS="${COMPONENTS} ${name}"
}

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "full"
  exit 0
fi

if [[ -z "$LAST_COMMIT" ]]; then
  echo "full"
  exit 0
fi

if ! git -C "$REPO_ROOT" cat-file -e "${LAST_COMMIT}^{commit}" 2>/dev/null; then
  echo "full"
  exit 0
fi

CHANGED_FILES="$(
  {
    git -C "$REPO_ROOT" diff --name-only "$LAST_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || true
    git -C "$REPO_ROOT" diff --name-only HEAD 2>/dev/null || true
    git -C "$REPO_ROOT" diff --name-only --cached HEAD 2>/dev/null || true
  } | awk 'NF && !seen[$0]++'
)"

if [[ -z "$CHANGED_FILES" ]]; then
  exit 0
fi

is_safemeet_recording_asset_path() {
  case "$1" in
    record-and-playback/core/lib/recordandplayback/safemeet/*|\
    record-and-playback/core/scripts/post_publish/90_safemeet*|\
    record-and-playback/core/scripts/post_publish/post_publish_recording_ready_callback.rb|\
    bbb-common-web/src/main/java/org/bigbluebutton/api/service/RecordingAsset*|\
    bbb-common-web/src/main/java/org/bigbluebutton/api/service/impl/RecordingAsset*|\
    bigbluebutton-web/grails-app/controllers/org/bigbluebutton/web/controllers/RecordingController.groovy|\
    bigbluebutton-web/grails-app/controllers/org/bigbluebutton/web/UrlMappings.groovy|\
    bigbluebutton-web/grails-app/conf/spring/resources.xml|\
    bigbluebutton-web/grails-app/conf/bigbluebutton.properties)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

path_to_component() {
  case "$1" in
    bigbluebutton-html5/*) echo html5 ;;
    bbb-playback/*) echo playback ;;
    record-and-playback/*) echo playback ;;
    bbb-recording-imex/*) echo imex ;;
    bigbluebutton-web/*) echo web ;;
    akka-bbb-apps/*) echo akka ;;
    akka-bbb-fsesl/*|bbb-fsesl-client/*) echo fsesl ;;
    bbb-common-message/*|bbb-common-web/*) echo libs ;;
    bbb-graphql-server/*) echo graphql ;;
    bbb-graphql-middleware/*) echo middleware ;;
    bbb-graphql-actions/*) echo actions ;;
    bbb-learning-dashboard/*) echo dashboard ;;
    bbb-export-annotations/*) echo export ;;
    bbb-shared-notes-server/*) echo notes ;;
    build/packages-template/bbb-playback/*) echo playback ;;
    scripts/deploy*.sh|deploy.sh|deploy.rsync-excludes) echo _meta ;;
    *) echo "" ;;
  esac
}

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  if is_safemeet_recording_asset_path "$path"; then
    components_add safemeet-recording
    continue
  fi
  comp="$(path_to_component "$path")"
  if [[ "$comp" == "_meta" ]]; then
    echo "full"
    exit 0
  fi
  [[ -n "$comp" ]] && components_add "$comp"
done <<< "$CHANGED_FILES"

if [[ -z "${COMPONENTS// }" ]]; then
  exit 0
fi

if components_has libs; then
  components_add web
  components_add akka
fi
if components_has web; then
  components_add libs
fi
if components_has akka; then
  components_add libs
fi
if components_has fsesl; then
  components_add libs
fi
if components_has imex; then
  components_add libs
fi
if components_has safemeet-recording; then
  components_add libs
  components_add web
  components_add playback
fi

ORDER="libs web akka fsesl graphql middleware actions html5 dashboard export notes safemeet-recording playback imex"
for name in $ORDER; do
  components_has "$name" && printf '%s\n' "$name"
done
