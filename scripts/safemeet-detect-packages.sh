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
    done <<< "$CHANGED_FILES"
  fi

  COMPONENTS="$(bash scripts/deploy-detect-components.sh "$LAST_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || true)"
  if [[ "$COMPONENTS" == "full" ]]; then
    add_full_package_set
  elif [[ -n "${COMPONENTS// }" ]]; then
    while IFS= read -r component; do
      [[ -n "$component" ]] && component_to_packages "$component"
    done <<< "$COMPONENTS"
  fi
fi

if [[ -n "${PACKAGES// }" ]] && ! has_package bigbluebutton; then
  add_package bigbluebutton
fi

ORDER="bbb-apps-akka bbb-config bbb-etherpad bbb-export-annotations bbb-freeswitch-core bbb-freeswitch-sounds bbb-fsesl-akka bbb-graphql-actions bbb-graphql-middleware bbb-graphql-server bbb-html5 bbb-learning-dashboard bbb-libreoffice-docker bbb-mkclean bbb-pads bbb-playback bbb-playback-notes bbb-playback-podcast bbb-playback-presentation bbb-playback-screenshare bbb-playback-video bbb-record-core bbb-shared-notes-server bbb-transcription-controller bbb-web bbb-webhooks bbb-webrtc-recorder bbb-webrtc-sfu bigbluebutton"
for package in $ORDER; do
  has_package "$package" && printf '%s\n' "$package"
done
