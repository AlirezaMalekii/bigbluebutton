#!/usr/bin/env bash
# Runs ON the BBB server after rsync. Invoked by ./deploy.sh from the laptop.
set -euo pipefail

if [[ -f /root/.sdkman/bin/sdkman-init.sh ]]; then
  # shellcheck source=/dev/null
  source /root/.sdkman/bin/sdkman-init.sh
fi

BBB_ROOT="${BBB_ROOT:-/root/dev/bigbluebutton}"
WITH_GRAPHQL="${WITH_GRAPHQL:-0}"
WITH_SHARED_NOTES="${WITH_SHARED_NOTES:-1}"
WITH_RECORDING="${WITH_RECORDING:-1}"
SKIP_AKKA_FSESL="${SKIP_AKKA_FSESL:-0}"
ONLY=""

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

usage() {
  cat <<'EOF'
Usage: deploy-remote.sh [--only NAME]

  --only html5 | web | libs | akka | fsesl | graphql | middleware | actions |
        dashboard | export | notes | recording | imex
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only)
      shift
      ONLY="${1:-}"
      [[ -n "$ONLY" ]] || { usage; exit 2; }
      ;;
    --only=*) ONLY="${1#--only=}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1"; usage; exit 2 ;;
  esac
  shift
done

run_deploy() {
  local dir="$1"
  if [[ ! -d "$BBB_ROOT/$dir" ]]; then
    log "SKIP $dir (missing)"
    return 0
  fi
  if [[ ! -f "$BBB_ROOT/$dir/deploy.sh" ]]; then
    log "SKIP $dir (no deploy.sh)"
    return 0
  fi
  log "Deploying $dir ..."
  (cd "$BBB_ROOT/$dir" && bash ./deploy.sh)
}

# Akka reads meeting settings from html5-client on disk (not from dist/ alone).
deploy_html5() {
  run_deploy bigbluebutton-html5
  local settings="${BBB_ROOT}/bigbluebutton-html5/private/config/settings.yml"
  local dest="/usr/share/bigbluebutton/html5-client/private/config/settings.yml"
  if [[ -f "$settings" ]]; then
    log "Syncing settings.yml for bbb-apps-akka ..."
    mkdir -p "$(dirname "$dest")"
    cp "$settings" "$dest"
    chmod go+r "$dest"
    chown bigbluebutton:bigbluebutton "$dest" 2>/dev/null || true
    systemctl restart bbb-apps-akka
    log "bbb-apps-akka restarted (picks up new client settings)"
  fi
}

deploy_web() {
  if [[ ! -f "$BBB_ROOT/bigbluebutton-web/deploy_to_usr_share.sh" ]]; then
    log "SKIP web (deploy_to_usr_share.sh missing)"
    return 0
  fi
  log "Deploying bigbluebutton-web ..."
  (cd "$BBB_ROOT/bigbluebutton-web" && bash ./deploy_to_usr_share.sh)
}

deploy_libs() {
  run_deploy bbb-common-message
  run_deploy bbb-common-web
  run_deploy bbb-fsesl-client
}

deploy_akka_fsesl() {
  if [[ "$SKIP_AKKA_FSESL" == "1" ]]; then
    log "SKIP akka-bbb-fsesl"
    return 0
  fi
  log "Deploying akka-bbb-fsesl ..."
  cd "$BBB_ROOT/akka-bbb-fsesl"
  systemctl stop bbb-fsesl-akka || true
  sbt debian:packageBin
  dpkg -i ./target/bbb-fsesl-akka_*.deb
  systemctl start bbb-fsesl-akka
  log "bbb-fsesl-akka updated"
}

ensure_toolchain() {
  if command -v sbt >/dev/null && command -v go >/dev/null; then
    return 0
  fi
  local prereq="${BBB_ROOT}/scripts/deploy-server-prerequisites.sh"
  if [[ -f "$prereq" ]]; then
    log "Installing missing build tools (sbt, go, maven) ..."
    bash "$prereq"
    if [[ -f /root/.sdkman/bin/sdkman-init.sh ]]; then
      # shellcheck source=/dev/null
      source /root/.sdkman/bin/sdkman-init.sh
    fi
  else
    echo "Missing sbt/go and ${prereq} not found. Run deploy once with full sync."
    exit 1
  fi
}

preflight() {
  log "Preflight in $BBB_ROOT"
  command -v java >/dev/null || { echo "java not found"; exit 1; }
  command -v npm >/dev/null || { echo "npm not found"; exit 1; }
  [[ -d "$BBB_ROOT" ]] || { echo "BBB_ROOT missing: $BBB_ROOT"; exit 1; }
  # HTML5-only deploy does not need sbt/go on the server
  if [[ "$ONLY" == "html5" ]]; then
    return 0
  fi
  ensure_toolchain
  command -v sbt >/dev/null || { echo "sbt still not available after prerequisites"; exit 1; }
  command -v go >/dev/null || { echo "go still not available after prerequisites"; exit 1; }
}

deploy_only() {
  case "$ONLY" in
    libs) deploy_libs ;;
    web) deploy_libs; deploy_web ;;
    akka) deploy_libs; run_deploy akka-bbb-apps ;;
    fsesl) run_deploy bbb-fsesl-client; deploy_akka_fsesl ;;
    graphql)
      WITH_GRAPHQL=1
      run_deploy bbb-graphql-server
      ;;
    middleware) run_deploy bbb-graphql-middleware ;;
    actions) run_deploy bbb-graphql-actions ;;
    html5) deploy_html5 ;;
    dashboard) run_deploy bbb-learning-dashboard ;;
    export) run_deploy bbb-export-annotations ;;
    notes) run_deploy bbb-shared-notes-server ;;
    recording) run_deploy record-and-playback ;;
    imex) run_deploy bbb-recording-imex ;;
    *)
      echo "Unknown --only: $ONLY"
      usage
      exit 2
      ;;
  esac
}

deploy_full() {
  log "=== Phase 1: shared libraries ==="
  deploy_libs

  log "=== Phase 2: bbb-web ==="
  deploy_web

  log "=== Phase 3: Akka ==="
  run_deploy akka-bbb-apps
  deploy_akka_fsesl

  if [[ "$WITH_GRAPHQL" == "1" ]]; then
    log "=== Phase 4: GraphQL server (recreates DB) ==="
    run_deploy bbb-graphql-server
  else
    log "SKIP bbb-graphql-server (pass --with-graphql from laptop)"
  fi

  log "=== Phase 5: GraphQL middleware & actions ==="
  run_deploy bbb-graphql-middleware
  run_deploy bbb-graphql-actions

  log "=== Phase 6: HTML5 & related UI ==="
  deploy_html5
  run_deploy bbb-learning-dashboard
  run_deploy bbb-export-annotations

  if [[ "$WITH_SHARED_NOTES" == "1" ]]; then
    log "=== Phase 7: shared notes ==="
    run_deploy bbb-shared-notes-server
  else
    log "SKIP bbb-shared-notes-server"
  fi

  if [[ "$WITH_RECORDING" == "1" ]]; then
    log "=== Phase 8: recording ==="
    run_deploy record-and-playback
    run_deploy bbb-recording-imex
  fi

  log "=== Sanity check ==="
  if command -v bbb-conf >/dev/null 2>&1; then
    bbb-conf --check || true
  fi
}

main() {
  preflight
  cd "$BBB_ROOT"
  if [[ -n "$ONLY" ]]; then
    deploy_only
  else
    deploy_full
  fi
  log "=== Deploy finished ==="
}

main "$@"
