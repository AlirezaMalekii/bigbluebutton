#!/usr/bin/env bash
#
# Sync this BigBlueButton fork to your BBB server and deploy what changed (smart mode).
#
# Usage (from repo root on your Mac):
#   ./deploy.sh                    # sync + deploy only changed components
#   ./deploy.sh --full             # force full deploy (all components)
#   ./deploy.sh --with-graphql     # also run bbb-graphql-server (drops DB!)
#   ./deploy.sh --skip-sync        # only build/deploy on server
#   ./deploy.sh --sync-only        # only rsync sources
#   ./deploy.sh --only html5       # deploy one component (after sync)
#   ./deploy.sh --force            # deploy even if git detects no changes
#
# Override connection (copy deploy.env.example → .deploy.env):
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
SSH_IDENTITY="${SSH_IDENTITY:-${DEPLOY_SSH_PRIVATE_KEY_PATH:-}}"
DEPLOY_STATE_FILE="${REMOTE_DIR}/.deploy-state"
KNOWN_HOSTS_FILE="${DEPLOY_KNOWN_HOSTS_FILE:-${SCRIPT_DIR}/.deploy-known_hosts}"
mkdir -p "$(dirname "$KNOWN_HOSTS_FILE")" 2>/dev/null || true
touch "$KNOWN_HOSTS_FILE"
chmod 600 "$KNOWN_HOSTS_FILE" 2>/dev/null || true

WITH_GRAPHQL=0
WITH_SHARED_NOTES=1
WITH_RECORDING=1
SKIP_AKKA_FSESL=0
DO_SYNC=1
DO_REMOTE=1
ONLY_COMPONENTS=""
FORCE_FULL=0
FORCE_DEPLOY=0

usage() {
  sed -n '3,16p' "$0"
  cat <<'EOF'

Options:
  --full               Deploy all components (ignore change detection)
  --force              Run deploy even when no file changes are detected
  --with-graphql       Run bbb-graphql-server/deploy.sh (recreates PostgreSQL DB)
  --no-shared-notes    Skip bbb-shared-notes-server
  --no-recording       Skip playback / record-and-playback / bbb-recording-imex
  --skip-akka-fsesl    Skip akka-bbb-fsesl deb build
  --skip-sync          Do not rsync; only run remote build/deploy
  --sync-only          Only rsync sources to the server
  --only NAME          Deploy one component (html5, playback, web, …)
  -h, --help           Show this help

Smart mode (default):
  Compares git changes since the last successful deploy (.deploy-state on server)
  and runs only the matching component deploy scripts (html5, playback, web, …).

Environment:
  DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER, REMOTE_DIR, SSH_IDENTITY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full) FORCE_FULL=1 ;;
    --force) FORCE_DEPLOY=1 ;;
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

_ssh_common_args() {
  local -n _out=$1
  _out=(-p "$DEPLOY_PORT" -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$KNOWN_HOSTS_FILE")
  if [[ -n "$SSH_IDENTITY" ]]; then
    _out+=(-i "$SSH_IDENTITY" -o IdentitiesOnly=yes)
  fi
}

ssh_rsh() {
  local rsh="ssh -p ${DEPLOY_PORT} -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=${KNOWN_HOSTS_FILE}"
  if [[ -n "$SSH_IDENTITY" ]]; then
    rsh+=" -i ${SSH_IDENTITY} -o IdentitiesOnly=yes"
  fi
  echo "$rsh"
}

ssh_cmd() {
  local ssh_args=()
  _ssh_common_args ssh_args
  ssh "${ssh_args[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" "$@"
}

read_deploy_state() {
  ssh_cmd "cat '${DEPLOY_STATE_FILE}' 2>/dev/null" || true
}

write_deploy_state() {
  local commit="$1"
  ssh_cmd "printf '%s\n' '${commit}' > '${DEPLOY_STATE_FILE}'"
}

current_commit() {
  if git -C "$SCRIPT_DIR" rev-parse HEAD >/dev/null 2>&1; then
    git -C "$SCRIPT_DIR" rev-parse HEAD
  else
    echo "unknown"
  fi
}

detect_components() {
  local last="$1"
  bash "$SCRIPT_DIR/scripts/deploy-detect-components.sh" "$last" "$(current_commit)"
}

needs_npm_install() {
  local last="$1"
  local cur
  cur="$(current_commit)"
  if [[ -z "$last" || "$last" == "unknown" ]]; then
    echo 1
    return
  fi
  if git -C "$SCRIPT_DIR" diff --name-only "$last" "$cur" -- bbb-playback/package.json bbb-playback/package-lock.json 2>/dev/null | grep -q .; then
    echo 1
    return
  fi
  if git -C "$SCRIPT_DIR" diff --name-only HEAD -- bbb-playback/package.json bbb-playback/package-lock.json 2>/dev/null | grep -q .; then
    echo 1
    return
  fi
  echo 0
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

remote_env_base() {
  printf "BBB_ROOT='%s' WITH_GRAPHQL='%s' WITH_SHARED_NOTES='%s' WITH_RECORDING='%s' SKIP_AKKA_FSESL='%s'" \
    "$REMOTE_DIR" "$WITH_GRAPHQL" "$WITH_SHARED_NOTES" "$WITH_RECORDING" "$SKIP_AKKA_FSESL"
}

log "Target: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PORT} → ${REMOTE_DIR}"
log "Testing SSH ..."
if ! ssh_cmd "echo OK" >/dev/null 2>&1; then
  if [[ "${GITHUB_ACTIONS:-false}" == "true" ]]; then
    echo "[deploy] ERROR: SSH key authentication required in CI. Configure DEPLOY_SSH_PRIVATE_KEY secret." >&2
    exit 1
  fi
  echo "[deploy] ERROR: SSH connection failed. Check DEPLOY_HOST, DEPLOY_PORT, and SSH key." >&2
  exit 1
fi

LAST_DEPLOY_COMMIT="$(read_deploy_state | head -1 | tr -d '[:space:]')"
CURRENT_COMMIT="$(current_commit)"

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
  "${SCRIPT_DIR}/scripts/deploy-detect-components.sh" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/scripts/"

ssh_cmd "chmod +x '${REMOTE_DIR}/scripts/deploy-remote.sh' '${REMOTE_DIR}/scripts/deploy-detect-components.sh'"

DEPLOY_MODE="full"
DEPLOY_COMPONENTS=""
NEEDS_NPM_INSTALL_FLAG=0

if [[ -n "$ONLY_COMPONENTS" ]]; then
  log "Partial deploy: ${ONLY_COMPONENTS}"
  ssh_cmd "$(remote_env_base) bash '${REMOTE_DIR}/scripts/deploy-remote.sh' --only '${ONLY_COMPONENTS}'"
  write_deploy_state "$CURRENT_COMMIT"
  log "Done."
  exit 0
fi

if [[ "$FORCE_FULL" == "1" ]]; then
  log "Full deploy requested (--full)"
else
  DETECTED="$(detect_components "$LAST_DEPLOY_COMMIT" || true)"
  if [[ "$DETECTED" == "full" ]]; then
    log "First deploy or deploy scripts changed → full deploy"
  elif [[ -z "${DETECTED// }" ]]; then
    if [[ "$FORCE_DEPLOY" == "1" ]]; then
      log "No changes detected; --force → full deploy"
    else
      log "No changes since last deploy (${LAST_DEPLOY_COMMIT:-none})."
      log "Sources are synced. Skipping remote build (use --force or --full to deploy anyway)."
      exit 0
    fi
  else
    DEPLOY_MODE="smart"
    DEPLOY_COMPONENTS="$(echo "$DETECTED" | tr '\n' ' ' | sed 's/  */ /g;s/^ //;s/ $//')"
    log "Smart deploy — changed components: ${DEPLOY_COMPONENTS}"
    if [[ " ${DEPLOY_COMPONENTS} " == *" playback "* ]]; then
      NEEDS_NPM_INSTALL_FLAG="$(needs_npm_install "$LAST_DEPLOY_COMMIT")"
    fi
  fi
fi

ssh_cmd "$(remote_env_base) DEPLOY_MODE='${DEPLOY_MODE}' DEPLOY_COMPONENTS='${DEPLOY_COMPONENTS}' NEEDS_NPM_INSTALL='${NEEDS_NPM_INSTALL_FLAG}' bash '${REMOTE_DIR}/scripts/deploy-remote.sh'"

write_deploy_state "$CURRENT_COMMIT"
log "Done. Recorded deploy state: ${CURRENT_COMMIT:0:12}"
