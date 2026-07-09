#!/usr/bin/env bash
#
# Publish SafeMeet BigBlueButton .deb artifacts and installer assets to the
# SafeMeet apt repository server.
#
# Typical CI usage:
#   scripts/safemeet-publish-packages.sh --debs "artifacts/*.deb"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REPO_HOST="${REPO_HOST:-78.157.39.4}"
REPO_PORT="${REPO_PORT:-3698}"
REPO_USER="${REPO_USER:-root}"
REPO_DOMAIN="${REPO_DOMAIN:-new-bbb-install.roomeet.ir}"
REPO_NAME="${REPO_NAME:-safemeet-bbb-jammy-300}"
REPO_PREFIX="${REPO_PREFIX:-jammy-300}"
REPO_DISTRIBUTION="${REPO_DISTRIBUTION:-bigbluebutton-jammy}"
REPO_COMPONENT="${REPO_COMPONENT:-main}"
REPO_ARCHITECTURES="${REPO_ARCHITECTURES:-amd64}"
REMOTE_BASE="${REMOTE_BASE:-/srv/safemeet-bbb-apt}"
WEB_ROOT="${WEB_ROOT:-/var/www/new-bbb-install}"
GPG_IDENTITY="${GPG_IDENTITY:-repo@new-bbb-install.roomeet.ir}"
SSH_IDENTITY="${SSH_IDENTITY:-${DEPLOY_SSH_PRIVATE_KEY_PATH:-}}"
DEB_GLOB="${DEB_GLOB:-artifacts/*.deb}"
PUBLISH_INSTALLER=1
DRY_RUN=0

usage() {
  cat <<EOF
Usage: scripts/safemeet-publish-packages.sh [OPTIONS]

Options:
  --debs GLOB            Glob of .deb files to publish (default: artifacts/*.deb)
  --no-installer         Do not publish bbb-install-safemeet-3.0.sh
  --dry-run              Print actions without changing the repo server
  -h, --help             Show this help

Environment:
  REPO_HOST, REPO_PORT, REPO_USER, REPO_DOMAIN, REPO_NAME, REPO_PREFIX,
  REPO_DISTRIBUTION, REPO_COMPONENT, REPO_ARCHITECTURES, REMOTE_BASE,
  WEB_ROOT, GPG_IDENTITY, SSH_IDENTITY
EOF
}

log() {
  printf '[safemeet-publish] %s\n' "$*"
}

ssh_args() {
  local args=(-p "$REPO_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=120)
  if [[ -n "$SSH_IDENTITY" ]]; then
    args+=(-i "$SSH_IDENTITY" -o IdentitiesOnly=yes)
  fi
  printf '%q ' "${args[@]}"
}

ssh_cmd() {
  local args=()
  # shellcheck disable=SC2207
  args=($(ssh_args))
  ssh "${args[@]}" "${REPO_USER}@${REPO_HOST}" "$@"
}

rsync_rsh() {
  printf 'ssh %s' "$(ssh_args)"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --debs)
        shift
        DEB_GLOB="${1:-}"
        ;;
      --debs=*)
        DEB_GLOB="${1#--debs=}"
        ;;
      --no-installer)
        PUBLISH_INSTALLER=0
        ;;
      --dry-run)
        DRY_RUN=1
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 2
        ;;
    esac
    shift
  done
}

collect_debs() {
  local file
  shopt -s nullglob
  DEB_FILES=()
  # Intentionally allow glob expansion from DEB_GLOB.
  for file in $DEB_GLOB; do
    [[ -f "$file" ]] && DEB_FILES+=("$file")
  done
  shopt -u nullglob
}

remote_bootstrap() {
  log "Ensuring repository server prerequisites"
  ssh_cmd "set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx aptly gnupg ca-certificates curl rsync
install -d -m 0755 '${REMOTE_BASE}/incoming' '${WEB_ROOT}/repo' '${WEB_ROOT}/assets'
if ! gpg --batch --list-keys '${GPG_IDENTITY}' >/dev/null 2>&1; then
  cat >/tmp/safemeet-gpg.batch <<'GPGEOF'
Key-Type: RSA
Key-Length: 4096
Name-Real: SafeMeet BBB Apt Repository
Name-Email: ${GPG_IDENTITY}
Expire-Date: 0
%no-protection
%commit
GPGEOF
  sed -i 's/Name-Email: .*/Name-Email: ${GPG_IDENTITY}/' /tmp/safemeet-gpg.batch
  gpg --batch --generate-key /tmp/safemeet-gpg.batch
  rm -f /tmp/safemeet-gpg.batch
fi
gpg --batch --yes --armor --export '${GPG_IDENTITY}' > '${WEB_ROOT}/repo/bigbluebutton.asc'
if ! aptly repo show '${REPO_NAME}' >/dev/null 2>&1; then
  aptly repo create -distribution='${REPO_DISTRIBUTION}' -component='${REPO_COMPONENT}' '${REPO_NAME}'
fi"
}

upload_files() {
  local release_id remote_incoming
  release_id="$(date -u '+%Y%m%dT%H%M%SZ')"
  remote_incoming="${REMOTE_BASE}/incoming/${release_id}"

  log "Uploading artifacts to ${REPO_HOST}:${remote_incoming}"
  ssh_cmd "install -d -m 0755 '${remote_incoming}'"

  if [[ ${#DEB_FILES[@]} -gt 0 ]]; then
    rsync -az -e "$(rsync_rsh)" "${DEB_FILES[@]}" "${REPO_USER}@${REPO_HOST}:${remote_incoming}/"
  else
    log "No .deb artifacts matched '${DEB_GLOB}'"
  fi

  if [[ "$PUBLISH_INSTALLER" == "1" ]]; then
    rsync -az -e "$(rsync_rsh)" \
      "${REPO_ROOT}/bbb-install-safemeet-3.0.sh" \
      "${REPO_USER}@${REPO_HOST}:${WEB_ROOT}/bbb-install-safemeet-3.0.sh"
    ssh_cmd "chmod 0644 '${WEB_ROOT}/bbb-install-safemeet-3.0.sh'"
  fi

  REMOTE_INCOMING="$remote_incoming"
}

publish_remote() {
  log "Updating aptly repository"
  ssh_cmd "set -euo pipefail
if compgen -G '${REMOTE_INCOMING}/*.deb' >/dev/null; then
  aptly repo add -force-replace '${REPO_NAME}' '${REMOTE_INCOMING}'
fi
if aptly publish list -raw 2>/dev/null | grep -q '^${REPO_PREFIX} ${REPO_DISTRIBUTION}$'; then
  aptly publish update -batch -gpg-key='${GPG_IDENTITY}' '${REPO_DISTRIBUTION}' '${REPO_PREFIX}'
else
  aptly publish repo -batch -architectures='${REPO_ARCHITECTURES}' -gpg-key='${GPG_IDENTITY}' -distribution='${REPO_DISTRIBUTION}' -component='${REPO_COMPONENT}' '${REPO_NAME}' '${REPO_PREFIX}'
fi
rm -rf '${WEB_ROOT}/${REPO_PREFIX}'
install -d -m 0755 '${WEB_ROOT}/${REPO_PREFIX}'
rsync -a --delete '/root/.aptly/public/${REPO_PREFIX}/' '${WEB_ROOT}/${REPO_PREFIX}/'
chmod -R a+rX '${WEB_ROOT}'
test -f '${WEB_ROOT}/${REPO_PREFIX}/dists/${REPO_DISTRIBUTION}/Release'
test -f '${WEB_ROOT}/${REPO_PREFIX}/dists/${REPO_DISTRIBUTION}/Release.gpg'"
}

main() {
  parse_args "$@"
  cd "$REPO_ROOT"
  collect_debs

  log "Target repository: https://${REPO_DOMAIN}/${REPO_PREFIX} (${REPO_NAME})"
  if [[ "$DRY_RUN" == "1" ]]; then
    printf 'Would publish %s deb file(s):\n' "${#DEB_FILES[@]}"
    printf '  %s\n' "${DEB_FILES[@]:-}"
    [[ "$PUBLISH_INSTALLER" == "1" ]] && printf 'Would publish installer: %s\n' "${REPO_ROOT}/bbb-install-safemeet-3.0.sh"
    exit 0
  fi

  remote_bootstrap
  upload_files
  publish_remote
  log "Published: https://${REPO_DOMAIN}/${REPO_PREFIX}/dists/${REPO_DISTRIBUTION}/Release"
}

main "$@"
