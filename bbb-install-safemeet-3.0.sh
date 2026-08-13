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
#     --logo-url https://example.com/logo.svg \
#     --logo-link-url https://roomeet.ir \
#     --theme-config-url https://cdn.example.com/safemeet/themes/roomeet.json
set -euo pipefail

SAFE_REPO_DOMAIN="${SAFE_REPO_DOMAIN:-new-bbb-install.roomeet.ir}"
SAFE_REPO_URL="${SAFE_REPO_URL:-https://${SAFE_REPO_DOMAIN}}"
SAFE_REPO_KEY_URL="${SAFE_REPO_KEY_URL:-${SAFE_REPO_URL}/repo/bigbluebutton.asc}"
SAFE_THEMES_URL="${SAFE_THEMES_URL:-${SAFE_REPO_URL}/themes}"
BASE_INSTALLER_URL="${BASE_INSTALLER_URL:-https://bbb-install.roomeet.ir/bbb-install-3.0.sh}"
STATE_DIR="/etc/safemeet-bbb"
STATE_FILE="${STATE_DIR}/install.env"
BACKUP_DIR="/var/backups/safemeet-bbb"
ASSET_DIR="/var/www/bigbluebutton-default/assets/safemeet"
THEME_JSON_STATE="${STATE_DIR}/theme.json"
THEME_CSS_ASSET="${ASSET_DIR}/theme-override.css"
THEME_JSON_ASSET="${ASSET_DIR}/theme.json"
THEME_COMPILE_URL="${THEME_COMPILE_URL:-${SAFE_THEMES_URL}/safemeet-theme-compile.py}"
BBB_WEB_PROPS="/etc/bigbluebutton/bbb-web.properties"
BBB_HTML5_YML="/etc/bigbluebutton/bbb-html5.yml"
APT_LIST="/etc/apt/sources.list.d/bigbluebutton.list"
SAFE_APT_LIST="/etc/apt/sources.list.d/safemeet-bigbluebutton.list"
APT_PIN="/etc/apt/preferences.d/safemeet-bbb"

DEFAULT_PDF_URL=""
LOGO_URL=""
LOGO_LINK_URL=""
THEME_CONFIG_URL=""
THEME_ID=""
THEME_RESET=0
CONFIG_ONLY=0
DRY_RUN=0
SKIP_HEALTH_CHECK=0
PACKAGES_UPGRADED=0
THEME_CHANGED=0
PLUGIN_MANIFEST_CHANGED=0
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
  --logo-url URL          Download and set the default meeting logo (also used as dark logo).
  --logo-link-url URL     Set the URL opened when users click the meeting logo.
  --theme-config-url URL  Download a theme JSON and apply meeting palette override.
  --theme-id ID           Shortcut for built-in themes hosted at ${SAFE_THEMES_URL}/<id>.json
                          (examples: safemeet, roomeet).
  --theme-reset           Remove meeting theme override and restore packaged default.
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
  local theme_url="${THEME_CONFIG_URL}"
  local theme_id_value="${THEME_ID}"
  if [[ -z "$theme_url" && -f "$STATE_FILE" ]]; then
    theme_url="$(sed -n 's/^THEME_CONFIG_URL=//p' "$STATE_FILE" | tail -n 1)"
  fi
  if [[ -z "$theme_id_value" && -f "$STATE_FILE" ]]; then
    theme_id_value="$(sed -n 's/^THEME_ID=//p' "$STATE_FILE" | tail -n 1)"
  fi
  if [[ "$THEME_RESET" == "1" ]]; then
    theme_url=""
    theme_id_value=""
  fi
  mkdir -p "$STATE_DIR"
  cat > "$STATE_FILE" <<EOF
SAFE_REPO_URL=${SAFE_REPO_URL}
HOST=${host}
DEFAULT_PDF_URL=${DEFAULT_PDF_URL}
LOGO_URL=${LOGO_URL}
LOGO_LINK_URL=${LOGO_LINK_URL}
THEME_CONFIG_URL=${theme_url}
THEME_ID=${theme_id_value}
UPDATED_AT=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
EOF
  chmod 600 "$STATE_FILE"
}

upsert_html5_yaml_string() {
  local key_path="$1"
  local value="$2"
  local file="$BBB_HTML5_YML"

  touch "$file"
  if command -v yq >/dev/null 2>&1; then
    yq e -i "${key_path} = \"${value}\"" "$file"
    return 0
  fi

  python3 - "$file" "$key_path" "$value" <<'PY'
import sys

path, key_path, value = sys.argv[1], sys.argv[2], sys.argv[3]
keys = [k for k in key_path.lstrip('.').split('.') if k]

try:
    import yaml  # type: ignore
except ImportError as exc:
    raise SystemExit(
        "Need yq or PyYAML to update /etc/bigbluebutton/bbb-html5.yml safely."
    ) from exc

with open(path, "r", encoding="utf-8") as handle:
    raw = handle.read().strip()
data = yaml.safe_load(raw) if raw else {}
if data is None:
    data = {}
if not isinstance(data, dict):
    raise SystemExit(f"{path} must contain a YAML mapping")

cursor = data
for key in keys[:-1]:
    nxt = cursor.get(key)
    if not isinstance(nxt, dict):
        nxt = {}
        cursor[key] = nxt
    cursor = nxt
cursor[keys[-1]] = value

with open(path, "w", encoding="utf-8") as handle:
    yaml.safe_dump(data, handle, default_flow_style=False, allow_unicode=True, sort_keys=False)
PY
}

resolve_theme_config_url() {
  if [[ -n "$THEME_CONFIG_URL" ]]; then
    printf '%s' "$THEME_CONFIG_URL"
    return 0
  fi
  if [[ -n "$THEME_ID" ]]; then
    [[ "$THEME_ID" =~ ^[a-z0-9][a-z0-9_-]*$ ]] \
      || die "--theme-id must be lowercase alphanumeric (optionally -/_)."
    printf '%s/%s.json' "$SAFE_THEMES_URL" "$THEME_ID"
    return 0
  fi
  return 1
}

fetch_theme_compiler() {
  local dest="$1"
  if [[ -f "${BASH_SOURCE[0]%/*}/scripts/safemeet-theme-compile.py" ]]; then
    cp -a "${BASH_SOURCE[0]%/*}/scripts/safemeet-theme-compile.py" "$dest"
    return 0
  fi
  if [[ -f "/usr/local/lib/safemeet/safemeet-theme-compile.py" ]]; then
    cp -a "/usr/local/lib/safemeet/safemeet-theme-compile.py" "$dest"
    return 0
  fi
  log "Downloading theme compiler: ${THEME_COMPILE_URL}"
  curl -fL --connect-timeout 15 --max-time 60 "$THEME_COMPILE_URL" -o "$dest"
  test -s "$dest" || die "Theme compiler download produced an empty file."
}

apply_theme_config() {
  local host="$1"
  local stamp="$2"
  local theme_url=""
  local tmp_json tmp_css tmp_py

  if [[ "$THEME_RESET" == "1" ]]; then
    if [[ "$DRY_RUN" == "1" ]]; then
      log "DRY RUN: would remove ${THEME_CSS_ASSET}, ${THEME_JSON_ASSET}, ${THEME_JSON_STATE}"
      return 0
    fi
    backup_file "$THEME_CSS_ASSET" "$stamp"
    backup_file "$THEME_JSON_ASSET" "$stamp"
    backup_file "$THEME_JSON_STATE" "$stamp"
    rm -f "$THEME_CSS_ASSET" "$THEME_JSON_ASSET" "$THEME_JSON_STATE"
    THEME_CHANGED=1
    log "Meeting theme override removed; packaged SafeMeet default will be used"
    return 0
  fi

  if theme_url="$(resolve_theme_config_url)"; then
    :
  elif [[ -f "$THEME_JSON_STATE" && ! -s "$THEME_CSS_ASSET" ]]; then
    log "Rebuilding missing theme override from cached JSON"
    theme_url=""
  else
    return 0
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    if [[ -n "$theme_url" ]]; then
      log "DRY RUN: would download theme JSON from ${theme_url}"
    fi
    log "DRY RUN: would compile theme override to ${THEME_CSS_ASSET}"
    return 0
  fi

  command -v python3 >/dev/null 2>&1 || die "python3 is required to compile meeting themes."

  mkdir -p "$STATE_DIR" "$ASSET_DIR"
  backup_file "$THEME_CSS_ASSET" "$stamp"
  backup_file "$THEME_JSON_ASSET" "$stamp"
  backup_file "$THEME_JSON_STATE" "$stamp"

  tmp_json="$(mktemp /tmp/safemeet-theme.XXXXXX.json)"
  tmp_css="$(mktemp /tmp/safemeet-theme.XXXXXX.css)"
  tmp_py="$(mktemp /tmp/safemeet-theme.XXXXXX.py)"
  # shellcheck disable=SC2064
  trap 'rm -f "'"$tmp_json"'" "'"$tmp_css"'" "'"$tmp_py"'"; trap - RETURN' RETURN

  if [[ -n "$theme_url" ]]; then
    download_asset "$theme_url" "$tmp_json" "theme JSON"
  else
    cp -a "$THEME_JSON_STATE" "$tmp_json"
  fi

  fetch_theme_compiler "$tmp_py"
  chmod 0755 "$tmp_py"
  python3 "$tmp_py" --validate-only "$tmp_json"
  python3 "$tmp_py" "$tmp_json" -o "$tmp_css"
  test -s "$tmp_css" || die "Theme compiler produced an empty CSS file."

  install -m 0644 "$tmp_json" "$THEME_JSON_STATE"
  install -m 0644 "$tmp_json" "$THEME_JSON_ASSET"
  install -m 0644 "$tmp_css" "$THEME_CSS_ASSET"
  THEME_CHANGED=1
  log "Meeting theme override applied at https://${host}/safemeet/theme-override.css"
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

ensure_skyroom_plugin_manifest() {
  local host="$1"
  local manifest_url="https://${host}/html5client/resources/skyroom-layout/manifest.json"
  local result

  result="$(python3 - "$BBB_WEB_PROPS" "$manifest_url" <<'PY'
import json
import os
import sys
import tempfile

path, manifest_url = sys.argv[1:]
try:
    with open(path, "r", encoding="utf-8") as source:
        lines = source.readlines()
except FileNotFoundError:
    lines = []

key = "pluginManifests"
current = []
for line in lines:
    if line.startswith(f"{key}="):
        raw = line.split("=", 1)[1].strip()
        if raw:
            current = json.loads(raw)
        break

if not isinstance(current, list):
    raise SystemExit("pluginManifests must be a JSON array")

suffix = "/html5client/resources/skyroom-layout/manifest.json"
updated = [
    entry for entry in current
    if not (isinstance(entry, dict) and str(entry.get("url", "")).endswith(suffix))
]
updated.append({"url": manifest_url})
serialized = json.dumps(updated, ensure_ascii=False, separators=(",", ":"))
replacement = f"{key}={serialized}\n"

new_lines = []
replaced = False
for line in lines:
    if line.startswith(f"{key}="):
        if not replaced:
            new_lines.append(replacement)
            replaced = True
        continue
    new_lines.append(line)
if not replaced:
    if new_lines and not new_lines[-1].endswith("\n"):
        new_lines[-1] += "\n"
    new_lines.append(replacement)

if new_lines == lines:
    print("unchanged")
    raise SystemExit(0)

directory = os.path.dirname(path) or "."
os.makedirs(directory, exist_ok=True)
mode = os.stat(path).st_mode & 0o777 if os.path.exists(path) else 0o644
uid = os.stat(path).st_uid if os.path.exists(path) else os.getuid()
gid = os.stat(path).st_gid if os.path.exists(path) else os.getgid()
with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=directory, delete=False) as target:
    target.writelines(new_lines)
    temporary_path = target.name
os.chmod(temporary_path, mode)
os.chown(temporary_path, uid, gid)
os.replace(temporary_path, path)
print("changed")
PY
)" || die "Unable to update pluginManifests in ${BBB_WEB_PROPS}."

  if [[ "$result" == "changed" ]]; then
    PLUGIN_MANIFEST_CHANGED=1
    log "Registered SafeMeet realtime data-channel manifest"
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
    log "DRY RUN: would backup ${BBB_WEB_PROPS}, ${BBB_HTML5_YML}, ${APT_LIST}, ${SAFE_APT_LIST}, and ${APT_PIN}"
    log "DRY RUN: would cache assets in ${ASSET_DIR}"
    [[ -n "$LOGO_LINK_URL" ]] && log "DRY RUN: would set branding.logoLinkUrl=${LOGO_LINK_URL}"
    log "DRY RUN: would register the SafeMeet data-channel manifest in ${BBB_WEB_PROPS}"
    apply_theme_config "$host" "$stamp"
    return 0
  fi

  mkdir -p "$ASSET_DIR"
  backup_file "$BBB_WEB_PROPS" "$stamp"
  backup_file "$BBB_HTML5_YML" "$stamp"
  backup_file "$APT_LIST" "$stamp"
  backup_file "$SAFE_APT_LIST" "$stamp"
  backup_file "$APT_PIN" "$stamp"

  ensure_skyroom_plugin_manifest "$host"
  if [[ "$PLUGIN_MANIFEST_CHANGED" == "1" ]]; then
    changed=1
  fi

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
    # SafeMeet ships a single dark meeting theme; reuse the same logo asset.
    upsert_property "$BBB_WEB_PROPS" "useDefaultDarkLogo" "true"
    upsert_property "$BBB_WEB_PROPS" "defaultDarkLogoURL" "$logo_public"
    changed=1
  fi

  if [[ -n "$LOGO_LINK_URL" ]]; then
    upsert_html5_yaml_string ".public.app.branding.logoLinkUrl" "$LOGO_LINK_URL"
    changed=1
  fi

  apply_theme_config "$host" "$stamp"
  if [[ "$THEME_CHANGED" == "1" ]]; then
    changed=1
  fi

  chown -R root:root "$ASSET_DIR"
  chmod -R a+rX "$ASSET_DIR"
  write_state "$host"

  if [[ "$changed" == "1" ]]; then
    log "Restarting services that read BBB web / HTML5 defaults"
    systemctl reload nginx || true
    systemctl restart bbb-web || true
    if [[ -n "$LOGO_LINK_URL" ]]; then
      systemctl restart bbb-apps-akka || true
    fi
  fi
}

health_check() {
  local host="$1"
  [[ "$SKIP_HEALTH_CHECK" == "1" ]] && return 0
  [[ "$DRY_RUN" == "1" ]] && return 0

  if [[ "$PACKAGES_UPGRADED" -eq 0 && -z "$DEFAULT_PDF_URL" && -z "$LOGO_URL" && -z "$LOGO_LINK_URL" && -z "$THEME_CONFIG_URL" && -z "$THEME_ID" && "$THEME_RESET" != "1" && "$THEME_CHANGED" != "1" && "$PLUGIN_MANIFEST_CHANGED" != "1" ]]; then
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
  if [[ -n "$LOGO_LINK_URL" ]]; then
    grep -qE 'logoLinkUrl:' "$BBB_HTML5_YML" \
      || die "logoLinkUrl was not written to ${BBB_HTML5_YML}"
  fi
  if [[ "$THEME_CHANGED" == "1" && "$THEME_RESET" != "1" ]]; then
    curl -fsSL "https://${host}/safemeet/theme-override.css" -o /dev/null \
      || die "Theme override is not reachable at https://${host}/safemeet/theme-override.css"
  fi
  if [[ "$PLUGIN_MANIFEST_CHANGED" == "1" || "$PACKAGES_UPGRADED" -gt 0 ]]; then
    curl -fsSL "https://${host}/html5client/resources/skyroom-layout/manifest.json" \
      | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["name"] == "skyroom-layout"' \
      || die "SafeMeet data-channel manifest is not reachable or valid."
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
      --logo-link-url)
        shift
        LOGO_LINK_URL="${1:-}"
        ;;
      --logo-link-url=*)
        LOGO_LINK_URL="${1#--logo-link-url=}"
        ;;
      --theme-config-url)
        shift
        THEME_CONFIG_URL="${1:-}"
        ;;
      --theme-config-url=*)
        THEME_CONFIG_URL="${1#--theme-config-url=}"
        ;;
      --theme-id)
        shift
        THEME_ID="${1:-}"
        ;;
      --theme-id=*)
        THEME_ID="${1#--theme-id=}"
        ;;
      --theme-reset)
        THEME_RESET=1
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
      --dark-logo-url|--dark-logo-url=*)
        die "--dark-logo-url was removed; pass a single --logo-url (also used as the dark logo)."
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
  [[ -n "$LOGO_LINK_URL" ]] && validate_url "$LOGO_LINK_URL" "--logo-link-url"
  [[ -n "$THEME_CONFIG_URL" ]] && validate_url "$THEME_CONFIG_URL" "--theme-config-url"
  if [[ -n "$THEME_CONFIG_URL" && -n "$THEME_ID" ]]; then
    die "Use either --theme-config-url or --theme-id, not both."
  fi
  if [[ "$THEME_RESET" == "1" && ( -n "$THEME_CONFIG_URL" || -n "$THEME_ID" ) ]]; then
    die "Do not combine --theme-reset with --theme-config-url/--theme-id."
  fi

  local host stamp
  host="$(detect_host)"
  stamp="$(date -u '+%Y%m%dT%H%M%SZ')"

  log "Target host: ${host}"
  log "SafeMeet repo: ${SAFE_REPO_URL}/jammy-300"
  if [[ -n "$THEME_ID" ]]; then
    log "Theme id: ${THEME_ID}"
  elif [[ -n "$THEME_CONFIG_URL" ]]; then
    log "Theme config: ${THEME_CONFIG_URL}"
  fi

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
