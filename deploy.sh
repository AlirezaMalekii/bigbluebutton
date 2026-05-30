#!/usr/bin/env bash
#
# Sync this BigBlueButton fork to your BBB server and run all component deploy scripts.
#
# Usage (from repo root on your Mac):
#   ./deploy.sh
#   ./deploy.sh --with-graphql          # also run bbb-graphql-server (drops DB!)
#   ./deploy.sh --skip-sync             # only build/deploy on server
#   ./deploy.sh --sync-only             # only rsync sources
#   ./deploy.sh --only html5            # deploy only bigbluebutton-html5 (after sync)
#
# Override connection (or copy deploy.env.example → .deploy.env):
#   DEPLOY_HOST=78.157.39.51 DEPLOY_PORT=3698 ./deploy.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -f "$SCRIPT_DIR/.deploy.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/.deploy.env"
fi

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:-78.157.39.51}"
DEPLOY_PORT="${DEPLOY_PORT:-3698}"
REMOTE_DIR="${REMOTE_DIR:-/root/dev/bigbluebutton}"
SSH_IDENTITY="${SSH_IDENTITY:-}"

WITH_GRAPHQL=0
WITH_SHARED_NOTES=1
WITH_RECORDING=1
SKIP_AKKA_FSESL=0
DO_SYNC=1
DO_REMOTE=1
ONLY_COMPONENTS=""

usage() {
  sed -n '3,15p' "$0"
  cat <<'EOF'

Options:
  --with-graphql       Run bbb-graphql-server/deploy.sh (recreates PostgreSQL DB)
  --no-shared-notes    Skip bbb-shared-notes-server (faster when unchanged)
  --no-recording       Skip record-and-playback and bbb-recording-imex
  --skip-akka-fsesl    Skip akka-bbb-fsesl deb build
  --skip-sync          Do not rsync; only run remote build/deploy
  --sync-only          Only rsync sources to the server
  --only NAME          Deploy one component (html5, web, akka, fsesl, graphql, …)
  -h, --help           Show this help

Environment:
  DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER, REMOTE_DIR, SSH_IDENTITY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-graphql) WITH_GRAPHQL=1 ;;
    --no-shared-notes) WITH_SHARED_NOTES=0 ;;
    --no-recording) WITH_RECORDING=0 ;;
    --skip-akka-fsesl) SKIP_AKKA_FSESL=1 ;;
    --skip-sync) DO_SYNC=0 ;;
    --sync-only) DO_REMOTE=0 ;;
    --only)
      shift
      ONLY_COMPONENTS="${1:-}"
      [[ -n "$ONLY_COMPONENTS" ]] || { echo "--only requires a name"; exit 2; }
      ;;
    --only=*) ONLY_COMPONENTS="${1#--only=}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 2 ;;
  esac
  shift
done

log() {
  printf '[deploy] %s\n' "$*"
}

ssh_rsh() {
  if [[ -n "$SSH_IDENTITY" ]]; then
    echo "ssh -p ${DEPLOY_PORT} -i ${SSH_IDENTITY}"
  else
    echo "ssh -p ${DEPLOY_PORT}"
  fi
}

ssh_cmd() {
  local ssh_args=(-p "$DEPLOY_PORT" -o BatchMode=yes -o ConnectTimeout=15)
  if [[ -n "$SSH_IDENTITY" ]]; then
    ssh_args+=(-i "$SSH_IDENTITY")
  fi
  ssh "${ssh_args[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" "$@"
}

rsync_to_server() {
  log "Syncing sources → ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}"
  ssh_cmd "mkdir -p '${REMOTE_DIR}'"

  rsync -az --delete \
    --exclude-from="${SCRIPT_DIR}/deploy.rsync-excludes" \
    -e "$(ssh_rsh)" \
    "${SCRIPT_DIR}/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/"
}

remote_env() {
  printf "BBB_ROOT='%s' WITH_GRAPHQL='%s' WITH_SHARED_NOTES='%s' WITH_RECORDING='%s' SKIP_AKKA_FSESL='%s'"
    "$REMOTE_DIR" "$WITH_GRAPHQL" "$WITH_SHARED_NOTES" "$WITH_RECORDING" "$SKIP_AKKA_FSESL"
}

log "Target: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PORT} → ${REMOTE_DIR}"
log "Testing SSH ..."
ssh_cmd "echo OK" >/dev/null

if [[ "$DO_SYNC" == "1" ]]; then
  rsync_to_server
fi

if [[ "$DO_REMOTE" == "0" ]]; then
  log "Sync only — done."
  exit 0
fi

rsync -az \
  -e "$(ssh_rsh)" \
  "${SCRIPT_DIR}/scripts/deploy-remote.sh" \
  "${SCRIPT_DIR}/scripts/deploy-server-prerequisites.sh" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/scripts/"

ssh_cmd "chmod +x '${REMOTE_DIR}/scripts/deploy-remote.sh'"

if [[ -n "$ONLY_COMPONENTS" ]]; then
  log "Partial deploy: ${ONLY_COMPONENTS}"
  ssh_cmd "$(remote_env) bash '${REMOTE_DIR}/scripts/deploy-remote.sh' --only '${ONLY_COMPONENTS}'"
else
  log "Running full remote deploy (often 20–60+ minutes) ..."
  ssh_cmd "$(remote_env) bash '${REMOTE_DIR}/scripts/deploy-remote.sh'"
fi

log "Done."
