#!/usr/bin/env bash
#
# SafeMeet BigBlueButton 3.0 installer/updater.
#
# This script intentionally keeps the upstream/Roomeet bbb-install flow for the
# heavy BBB setup, then applies SafeMeet's package repository and persistent
# server-level defaults for the whiteboard PDF and meeting logo.
#
# Example:
#   wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
#     -w -v jammy-300 -s live71.roomeet.ir -e cert@roomeet.ir \
#     --default-pdf-url https://example.com/default.pdf \
#     --logo-url https://example.com/logo.svg
set -euo pipefail

SAFE_REPO_DOMAIN="${SAFE_REPO_DOMAIN:-new-bbb-install.roomeet.ir}"
SAFE_REPO_URL="${SAFE_REPO_URL:-https://${SAFE_REPO_DOMAIN}}"
SAFE_REPO_KEY_URL="${SAFE_REPO_KEY_URL:-${SAFE_REPO_URL}/repo/bigbluebutton.asc}"
BASE_INSTALLER_URL="${BASE_INSTALLER_URL:-https://bbb-install.roomeet.ir/bbb-install-3.0.sh}"
STATE_DIR="/etc/safemeet-bbb"
STATE_FILE="${STATE_DIR}/install.env"
BACKUP_DIR="/var/backups/safemeet-bbb"
ASSET_DIR="/var/www/bigbluebutton-default/assets/safemeet"
BBB_WEB_PROPS="/etc/bigbluebutton/bbb-web.properties"
APT_LIST="/etc/apt/sources.list.d/bigbluebutton.list"
SAFE_APT_LIST="/etc/apt/sources.list.d/safemeet-bigbluebutton.list"
APT_PIN="/etc/apt/preferences.d/safemeet-bbb"

DEFAULT_PDF_URL=""
LOGO_URL=""
DARK_LOGO_URL=""
CONFIG_ONLY=0
DRY_RUN=0
SKIP_HEALTH_CHECK=0
PACKAGES_UPGRADED=0
INSTALL_ARGS=()

log() {
  printf '[safemeet-install] %s\n' "$*"
}

die() {
  printf '[safemeet-install] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
SafeMeet BBB 3.0 installer/updater

Usage:
  bbb-install-safemeet-3.0.sh [bbb-install options] [SafeMeet options]

SafeMeet options:
  --default-pdf-url URL   Download and set the default whiteboard PDF.
  --logo-url URL          Download and set the default meeting logo.
  --dark-logo-url URL     Download and set the dark-mode meeting logo.
  --config-only           Do not run BBB install/upgrade; only apply SafeMeet config.
  --dry-run               Print planned actions without changing the target server.
  --skip-health-check     Skip bbb-conf/http checks at the end.

Common BBB options are passed through, for example:
  -w -v jammy-300 -s bbb.example.com -e cert@example.com
EOF
}

require_root() {
  [[ "${EUID}" == "0" ]] || die "Run as root."
}

validate_url() {
  local value="$1"
  local label="$2"
  [[ "$value" =~ ^https?://[^[:space:]]+$ ]] || die "${label} must be a full http(s) URL."
}

get_arg_value() {
  local key="$1"
  local i
  for ((i = 0; i < ${#INSTALL_ARGS[@]}; i += 1)); do
    if [[ "${INSTALL_ARGS[$i]}" == "$key" && $((i + 1)) -lt ${#INSTALL_ARGS[@]} ]]; then
      printf '%s' "${INSTALL_ARGS[$((i + 1))]}"
      return 0
    fi
  done
  return 1
}

detect_host() {
  local host="${HOST:-}"
  if [[ -z "$host" ]]; then
    host="$(get_arg_value "-s" || true)"
  fi
  if [[ -z "$host" && -f "$BBB_WEB_PROPS" ]]; then
    host="$(sed -n 's#^bigbluebutton.web.serverURL=https\?://##p' "$BBB_WEB_PROPS" | tail -n 1)"
  fi
  [[ -n "$host" ]] || die "Unable to determine BBB hostname. Pass -s <hostname>."
  printf '%s' "$host"
}

backup_file() {
  local file="$1"
  local stamp="$2"
  [[ -f "$file" ]] || return 0
  mkdir -p "$BACKUP_DIR/$stamp"
  cp -a "$file" "$BACKUP_DIR/$stamp/"
}

write_state() {
  local host="$1"
  mkdir -p "$STATE_DIR"
  cat > "$STATE_FILE" <<EOF
SAFE_REPO_URL=${SAFE_REPO_URL}
HOST=${host}
DEFAULT_PDF_URL=${DEFAULT_PDF_URL}
LOGO_URL=${LOGO_URL}
DARK_LOGO_URL=${DARK_LOGO_URL}
UPDATED_AT=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
EOF
  chmod 600 "$STATE_FILE"
}

install_repo_key_and_pin() {
  if repo_key_and_pin_current; then
    log "SafeMeet apt source already configured"
    return 0
  fi

  log "Installing SafeMeet apt key and pinning"
  mkdir -p /etc/apt/keyrings
  curl -fsSL "$SAFE_REPO_KEY_URL" -o /etc/apt/keyrings/safemeet-bigbluebutton.asc
  chmod 0644 /etc/apt/keyrings/safemeet-bigbluebutton.asc

  local version distro
  version="$(get_arg_value "-v" || true)"
  version="${version:-jammy-300}"
  distro="${version%%-*}"
  cat > "$SAFE_APT_LIST" <<EOF
deb [signed-by=/etc/apt/keyrings/safemeet-bigbluebutton.asc] ${SAFE_REPO_URL}/${version} bigbluebutton-${distro} main
EOF
  chmod 0644 "$SAFE_APT_LIST"

  cat > "$APT_PIN" <<EOF
Package: bigbluebutton bbb-* freeswitch* libmediasoup* mediasoup*
Pin: origin "${SAFE_REPO_DOMAIN}"
Pin-Priority: 1001
EOF
  chmod 0644 "$APT_PIN"
}

repo_key_and_pin_current() {
  [[ -f "$SAFE_APT_LIST" && -f "$APT_PIN" && -f /etc/apt/keyrings/safemeet-bigbluebutton.asc ]]
}

packages_with_safemeet_upgrades() {
  local pkg
  local upgrades=()
  local installed_packages=()

  mapfile -t installed_packages < <(dpkg-query -W -f='${binary:Package}\n' 'bbb-*' 2>/dev/null | sort -u || true)
  ((${#installed_packages[@]})) || return 0

  for pkg in "${installed_packages[@]}"; do
    if apt-get -s --only-upgrade install "$pkg" 2>/dev/null | grep -q "^Inst ${pkg} "; then
      upgrades+=("$pkg")
    fi
  done

  ((${#upgrades[@]})) || return 0
  printf '%s\n' "${upgrades[@]}"
}

restart_services_for_packages() {
  local pkg
  local restart_all=0

  for pkg in "$@"; do
    case "$pkg" in
      bbb-web)
        systemctl restart bbb-web 2>/dev/null || true
        systemctl reload nginx 2>/dev/null || true
        ;;
      bbb-html5|bbb-learning-dashboard|bbb-playback|bbb-playback-*)
        systemctl reload nginx 2>/dev/null || true
        ;;
      bbb-graphql-server)
        systemctl restart bbb-graphql-server 2>/dev/null || true
        ;;
      bbb-graphql-middleware)
        systemctl restart bbb-graphql-middleware 2>/dev/null || true
        ;;
      bbb-graphql-actions)
        systemctl restart bbb-graphql-actions 2>/dev/null || true
        ;;
      bbb-apps-akka)
        systemctl restart bbb-apps-akka 2>/dev/null || true
        ;;
      bbb-fsesl-akka)
        systemctl restart bbb-fsesl-akka 2>/dev/null || true
        ;;
      bbb-webrtc-sfu)
        systemctl restart bbb-webrtc-sfu 2>/dev/null || true
        ;;
      bbb-webrtc-recorder)
        systemctl restart bbb-webrtc-recorder 2>/dev/null || true
        ;;
      bbb-record-core)
        systemctl restart bbb-rap-starter bbb-rap-resque-worker bbb-rap-caption-inbox 2>/dev/null || true
        ;;
      *)
        restart_all=1
        ;;
    esac
  done

  if [[ "$restart_all" == "1" ]] && command -v bbb-conf >/dev/null 2>&1; then
    bbb-conf --restart || true
  fi
}

patch_and_run_base_installer() {
  local tmp
  tmp="$(mktemp /tmp/bbb-install-safemeet.XXXXXX)"
  trap 'rm -f "${tmp:-}"' RETURN

  log "Fetching base installer from ${BASE_INSTALLER_URL}"
  curl -fsSL "$BASE_INSTALLER_URL" -o "$tmp"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY RUN: would run base installer with baseline repository: ${INSTALL_ARGS[*]}"
    return 0
  fi

  log "Running baseline BBB installer/updater"
  bash "$tmp" "${INSTALL_ARGS[@]}"
}

bbb_installed() {
  if dpkg-query -W -f='${Status}' bigbluebutton 2>/dev/null | grep -q "install ok installed"; then
    return 0
  fi
  # SafeMeet incremental updates may remove the meta-package while BBB remains
  # fully installed. Treat core packages as an existing install.
  dpkg-query -W -f='${Status}' bbb-web 2>/dev/null | grep -q "install ok installed" \
    || dpkg-query -W -f='${Status}' bbb-html5 2>/dev/null | grep -q "install ok installed"
}

upgrade_existing_bbb() {
  local host="$1"
  local stamp="$2"
  local packages=()
  local upgraded=()

  backup_file "$APT_LIST" "$stamp"
  backup_file "$SAFE_APT_LIST" "$stamp"
  backup_file "$APT_PIN" "$stamp"
  install_repo_key_and_pin

  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY RUN: would run apt-get update"
    log "DRY RUN: would check for SafeMeet package upgrades"
    apt-get update
    mapfile -t packages < <(packages_with_safemeet_upgrades || true)
    if ((${#packages[@]})); then
      log "DRY RUN: would upgrade: ${packages[*]}"
      apt-get -s --only-upgrade install "${packages[@]}" || true
    else
      log "DRY RUN: no SafeMeet package upgrades available"
    fi
    return 0
  fi

  log "Checking SafeMeet repo for package upgrades"
  apt-get update
  mapfile -t packages < <(packages_with_safemeet_upgrades || true)

  if ((${#packages[@]} == 0)); then
    log "No SafeMeet package upgrades available; skipping apt install"
    PACKAGES_UPGRADED=0
    return 0
  fi

  log "Upgrading SafeMeet packages: ${packages[*]}"
  apt-get install -y \
    --only-upgrade \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confnew" \
    "${packages[@]}"
  upgraded=("${packages[@]}")
  PACKAGES_UPGRADED=${#upgraded[@]}

  if command -v bbb-conf >/dev/null 2>&1; then
    bbb-conf --setip "$host" || true
  fi
  restart_services_for_packages "${upgraded[@]}"
}

upsert_property() {
  local file="$1"
  local key="$2"
  local value="$3"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

asset_ext_from_url() {
  local url="$1"
  local fallback="$2"
  local path="${url%%\?*}"
  local ext="${path##*.}"
  ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in
    pdf|svg|png|jpg|jpeg|webp) printf '%s' "$ext" ;;
    *) printf '%s' "$fallback" ;;
  esac
}

download_asset() {
  local url="$1"
  local dest="$2"
  local label="$3"
  local tmp="${dest}.tmp"
  validate_url "$url" "$label"
  log "Downloading ${label}: ${url}"
  curl -fL --connect-timeout 15 --max-time 120 "$url" -o "$tmp"
  test -s "$tmp" || die "${label} download produced an empty file."
  mv "$tmp" "$dest"
  chmod 0644 "$dest"
}

apply_safemeet_config() {
  local host="$1"
  local stamp="$2"
  local changed=0

  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY RUN: would backup ${BBB_WEB_PROPS}, ${APT_LIST}, ${SAFE_APT_LIST}, and ${APT_PIN}"
    log "DRY RUN: would cache assets in ${ASSET_DIR}"
    return 0
  fi

  mkdir -p "$ASSET_DIR"
  backup_file "$BBB_WEB_PROPS" "$stamp"
  backup_file "$APT_LIST" "$stamp"
  backup_file "$SAFE_APT_LIST" "$stamp"
  backup_file "$APT_PIN" "$stamp"

  if [[ -n "$DEFAULT_PDF_URL" ]]; then
    local pdf_dest="${ASSET_DIR}/default.pdf"
    download_asset "$DEFAULT_PDF_URL" "$pdf_dest" "default PDF"
    upsert_property "$BBB_WEB_PROPS" "beans.presentationService.defaultUploadedPresentation" "https://${host}/safemeet/default.pdf"
    changed=1
  fi

  if [[ -n "$LOGO_URL" ]]; then
    local logo_ext logo_dest logo_public
    logo_ext="$(asset_ext_from_url "$LOGO_URL" "svg")"
    logo_dest="${ASSET_DIR}/logo.${logo_ext}"
    logo_public="https://${host}/safemeet/logo.${logo_ext}"
    download_asset "$LOGO_URL" "$logo_dest" "logo"
    upsert_property "$BBB_WEB_PROPS" "useDefaultLogo" "true"
    upsert_property "$BBB_WEB_PROPS" "defaultLogoURL" "$logo_public"
    changed=1

    if [[ -z "$DARK_LOGO_URL" ]]; then
      upsert_property "$BBB_WEB_PROPS" "useDefaultDarkLogo" "true"
      upsert_property "$BBB_WEB_PROPS" "defaultDarkLogoURL" "$logo_public"
    fi
  fi

  if [[ -n "$DARK_LOGO_URL" ]]; then
    local dark_ext dark_dest dark_public
    dark_ext="$(asset_ext_from_url "$DARK_LOGO_URL" "svg")"
    dark_dest="${ASSET_DIR}/dark-logo.${dark_ext}"
    dark_public="https://${host}/safemeet/dark-logo.${dark_ext}"
    download_asset "$DARK_LOGO_URL" "$dark_dest" "dark logo"
    upsert_property "$BBB_WEB_PROPS" "useDefaultDarkLogo" "true"
    upsert_property "$BBB_WEB_PROPS" "defaultDarkLogoURL" "$dark_public"
    changed=1
  fi

  chown -R root:root "$ASSET_DIR"
  chmod -R a+rX "$ASSET_DIR"
  write_state "$host"

  if [[ "$changed" == "1" ]]; then
    log "Restarting services that read BBB web defaults"
    systemctl reload nginx || true
    systemctl restart bbb-web || true
  fi
}

health_check() {
  local host="$1"
  [[ "$SKIP_HEALTH_CHECK" == "1" ]] && return 0
  [[ "$DRY_RUN" == "1" ]] && return 0

  if [[ "$PACKAGES_UPGRADED" -eq 0 && -z "$DEFAULT_PDF_URL" && -z "$LOGO_URL" && -z "$DARK_LOGO_URL" ]]; then
    log "No package or config changes applied; skipping health checks"
    return 0
  fi

  log "Running health checks"
  if command -v bbb-conf >/dev/null 2>&1; then
    bbb-conf --status || true
    bbb-conf --check || true
  fi

  if [[ -n "$DEFAULT_PDF_URL" ]]; then
    curl -fsSL "https://${host}/safemeet/default.pdf" -o /dev/null \
      || die "Default PDF is not reachable at https://${host}/safemeet/default.pdf"
  fi
  if [[ -n "$LOGO_URL" ]]; then
    local logo_path
    logo_path="$(grep -E '^defaultLogoURL=' "$BBB_WEB_PROPS" | tail -n 1 | cut -d= -f2-)"
    [[ -n "$logo_path" ]] && curl -fsSL "$logo_path" -o /dev/null \
      || die "Logo is not reachable at ${logo_path}"
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --default-pdf-url)
        shift
        DEFAULT_PDF_URL="${1:-}"
        ;;
      --default-pdf-url=*)
        DEFAULT_PDF_URL="${1#--default-pdf-url=}"
        ;;
      --logo-url)
        shift
        LOGO_URL="${1:-}"
        ;;
      --logo-url=*)
        LOGO_URL="${1#--logo-url=}"
        ;;
      --dark-logo-url)
        shift
        DARK_LOGO_URL="${1:-}"
        ;;
      --dark-logo-url=*)
        DARK_LOGO_URL="${1#--dark-logo-url=}"
        ;;
      --config-only)
        CONFIG_ONLY=1
        ;;
      --dry-run)
        DRY_RUN=1
        ;;
      --skip-health-check)
        SKIP_HEALTH_CHECK=1
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        INSTALL_ARGS+=("$1")
        ;;
    esac
    shift || true
  done
}

main() {
  parse_args "$@"
  require_root

  [[ -n "$DEFAULT_PDF_URL" ]] && validate_url "$DEFAULT_PDF_URL" "--default-pdf-url"
  [[ -n "$LOGO_URL" ]] && validate_url "$LOGO_URL" "--logo-url"
  [[ -n "$DARK_LOGO_URL" ]] && validate_url "$DARK_LOGO_URL" "--dark-logo-url"

  local host stamp
  host="$(detect_host)"
  stamp="$(date -u '+%Y%m%dT%H%M%SZ')"

  log "Target host: ${host}"
  log "SafeMeet repo: ${SAFE_REPO_URL}/jammy-300"

  if [[ "$CONFIG_ONLY" != "1" ]]; then
    if bbb_installed; then
      upgrade_existing_bbb "$host" "$stamp"
    else
      patch_and_run_base_installer
      upgrade_existing_bbb "$host" "$stamp"
    fi
  else
    install_repo_key_and_pin
    if [[ "$DRY_RUN" != "1" ]]; then
      apt-get update
    fi
  fi

  apply_safemeet_config "$host" "$stamp"
  health_check "$host"
  log "Done"
}

main "$@"
