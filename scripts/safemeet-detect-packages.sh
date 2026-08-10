#!/usr/bin/env bash
# Map changed SafeMeet BBB source paths to Debian packages that must be built
# and published to the SafeMeet apt repository.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
LAST_COMMIT="${1:-}"
CURRENT_COMMIT="${2:-HEAD}"

cd "$REPO_ROOT"

PACKAGES=""

has_package() {
  [[ " ${PACKAGES} " == *" $1 "* ]]
}

add_package() {
  local package="$1"
  has_package "$package" || PACKAGES="${PACKAGES} ${package}"
}

add_full_package_set() {
  local package
  for package in \
    bbb-apps-akka \
    bbb-config \
    bbb-etherpad \
    bbb-export-annotations \
    bbb-freeswitch-core \
    bbb-freeswitch-sounds \
    bbb-fsesl-akka \
    bbb-graphql-actions \
    bbb-graphql-middleware \
    bbb-graphql-server \
    bbb-html5 \
    bbb-learning-dashboard \
    bbb-libreoffice-docker \
    bbb-mkclean \
    bbb-pads \
    bbb-playback \
    bbb-playback-notes \
    bbb-playback-podcast \
    bbb-playback-presentation \
    bbb-playback-screenshare \
    bbb-playback-video \
    bbb-record-core \
    bbb-shared-notes-server \
    bbb-transcription-controller \
    bbb-web \
    bbb-webhooks \
    bbb-webrtc-recorder \
    bbb-webrtc-sfu \
    bigbluebutton; do
    add_package "$package"
  done
}

component_to_packages() {
  local component="$1"
  case "$component" in
    libs)
      add_package bbb-web
      add_package bbb-apps-akka
      add_package bbb-fsesl-akka
      ;;
    web)
      add_package bbb-web
      ;;
    akka)
      add_package bbb-apps-akka
      ;;
    fsesl)
      add_package bbb-fsesl-akka
      ;;
    graphql)
      add_package bbb-graphql-server
      ;;
    middleware)
      add_package bbb-graphql-middleware
      ;;
    actions)
      add_package bbb-graphql-actions
      ;;
    html5)
      add_package bbb-html5
      ;;
    dashboard)
      add_package bbb-learning-dashboard
      ;;
    export)
      add_package bbb-export-annotations
      ;;
    notes)
      add_package bbb-shared-notes-server
      ;;
    playback|recording|safemeet-recording)
      add_package bbb-record-core
      add_package bbb-playback
      add_package bbb-playback-notes
      add_package bbb-playback-podcast
      add_package bbb-playback-presentation
      add_package bbb-playback-screenshare
      add_package bbb-playback-video
      add_package bbb-web
      ;;
    *)
      return 0
      ;;
  esac
}

package_template_from_path() {
  case "$1" in
    build/packages-template/*/*)
      local rest package
      rest="${1#build/packages-template/}"
      package="${rest%%/*}"
      [[ -d "build/packages-template/${package}" ]] && printf '%s' "$package"
      ;;
  esac
}

path_to_packages() {
  local path="$1"
  case "$path" in
    SAFEMEET_VERSION) add_package bbb-html5 ;;
    bigbluebutton-html5/*) add_package bbb-html5 ;;
    bigbluebutton-web/*) add_package bbb-web ;;
    bbb-common-web/*|bbb-common-message/*)
      add_package bbb-web
      add_package bbb-apps-akka
      ;;
    akka-bbb-apps/*) add_package bbb-apps-akka ;;
    akka-bbb-fsesl/*|bbb-fsesl-client/*) add_package bbb-fsesl-akka ;;
    bbb-graphql-server/*) add_package bbb-graphql-server ;;
    bbb-graphql-middleware/*) add_package bbb-graphql-middleware ;;
    bbb-graphql-actions/*) add_package bbb-graphql-actions ;;
    bbb-learning-dashboard/*) add_package bbb-learning-dashboard ;;
    bbb-export-annotations/*) add_package bbb-export-annotations ;;
    bbb-shared-notes-server/*) add_package bbb-shared-notes-server ;;
    bbb-etherpad/*) add_package bbb-etherpad ;;
    bbb-pads/*) add_package bbb-pads ;;
    bbb-playback/*) add_package bbb-playback ;;
    bbb-webrtc-sfu/*) add_package bbb-webrtc-sfu ;;
    bbb-webrtc-recorder/*) add_package bbb-webrtc-recorder ;;
    bbb-webhooks/*) add_package bbb-webhooks ;;
    bbb-transcription-controller/*) add_package bbb-transcription-controller ;;
    bbb-livekit/*) add_package bbb-livekit ;;
    freeswitch/*|bbb-voice-conference/*) add_package bbb-freeswitch-core ;;
    bbb-libreoffice/*) add_package bbb-libreoffice-docker ;;
    bigbluebutton-config/sounds/*)
      # Custom FreeSWITCH prompts (alone/mute) ship via bbb-freeswitch-sounds;
      # keep bbb-config in sync for apply-config /admin sound overrides.
      add_package bbb-config
      add_package bbb-freeswitch-sounds
      ;;
    bigbluebutton-config/*) add_package bbb-config ;;
    record-and-playback/core/*) add_package bbb-record-core ;;
    record-and-playback/notes/*) add_package bbb-playback-notes ;;
    record-and-playback/podcast/*) add_package bbb-playback-podcast ;;
    record-and-playback/presentation/*) add_package bbb-playback-presentation ;;
    record-and-playback/screenshare/*) add_package bbb-playback-screenshare ;;
    record-and-playback/video/*) add_package bbb-playback-video ;;
    record-and-playback/*)
      add_package bbb-record-core
      add_package bbb-playback
      ;;
  esac
}

if [[ -z "$LAST_COMMIT" ]] || ! git cat-file -e "${LAST_COMMIT}^{commit}" 2>/dev/null; then
  add_full_package_set
else
  CHANGED_FILES="$(git diff --name-only "$LAST_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || true)"

  if [[ -n "$CHANGED_FILES" ]]; then
    while IFS= read -r path; do
      [[ -n "$path" ]] || continue

      case "$path" in
        .gitlab-ci.yml|build/package-names.inc.sh|build/setup-inside-docker.sh|build/opts-global.sh)
          add_full_package_set
          break
          ;;
      esac

      package="$(package_template_from_path "$path" || true)"
      [[ -n "${package:-}" ]] && add_package "$package"
      path_to_packages "$path"
    done <<< "$CHANGED_FILES"
  fi

  COMPONENTS="$(bash scripts/deploy-detect-components.sh "$LAST_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || true)"
  if [[ "$COMPONENTS" == "full" ]]; then
    # deploy-detect-components.sh returns "full" for deploy orchestration changes.
    # That does not mean every Debian package changed, so keep the path-based
    # package selection above instead of forcing an expensive full package build.
    :
  elif [[ -n "${COMPONENTS// }" ]]; then
    while IFS= read -r component; do
      [[ -n "$component" ]] && component_to_packages "$component"
    done <<< "$COMPONENTS"
  fi
fi

ORDER="bbb-apps-akka bbb-config bbb-etherpad bbb-export-annotations bbb-freeswitch-core bbb-freeswitch-sounds bbb-fsesl-akka bbb-graphql-actions bbb-graphql-middleware bbb-graphql-server bbb-html5 bbb-learning-dashboard bbb-libreoffice-docker bbb-mkclean bbb-pads bbb-playback bbb-playback-notes bbb-playback-podcast bbb-playback-presentation bbb-playback-screenshare bbb-playback-video bbb-record-core bbb-shared-notes-server bbb-transcription-controller bbb-web bbb-webhooks bbb-webrtc-recorder bbb-webrtc-sfu bigbluebutton"
for package in $ORDER; do
  has_package "$package" && printf '%s\n' "$package"
done
