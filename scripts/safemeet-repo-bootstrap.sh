#!/usr/bin/env bash
#
# Bootstrap the SafeMeet BBB apt repository host.
#
# This script is safe to re-run. It installs nginx/aptly/GPG, creates the signed
# empty jammy-300 repository, exports the public key, and serves the repository
# through nginx. It does not install BigBlueButton on the repository server.
set -euo pipefail

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
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-cert@roomeet.ir}"
SSH_IDENTITY="${SSH_IDENTITY:-${DEPLOY_SSH_PRIVATE_KEY_PATH:-}}"
ENABLE_HTTPS=1

usage() {
  cat <<EOF
Usage: scripts/safemeet-repo-bootstrap.sh [OPTIONS]

Options:
  --no-https       Skip Let's Encrypt certificate provisioning
  -h, --help       Show this help

Environment:
  REPO_HOST, REPO_PORT, REPO_USER, REPO_DOMAIN, LETSENCRYPT_EMAIL,
  REPO_NAME, REPO_PREFIX, REPO_DISTRIBUTION, WEB_ROOT, GPG_IDENTITY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-https) ENABLE_HTTPS=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

ssh_args=(
  -p "$REPO_PORT"
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
  -o ServerAliveInterval=30
  -o ServerAliveCountMax=120
)
if [[ -n "$SSH_IDENTITY" ]]; then
  ssh_args+=(-i "$SSH_IDENTITY" -o IdentitiesOnly=yes)
fi

echo "[safemeet-repo-bootstrap] Bootstrapping ${REPO_USER}@${REPO_HOST}:${REPO_PORT} for ${REPO_DOMAIN}"

ssh "${ssh_args[@]}" "${REPO_USER}@${REPO_HOST}" "set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx aptly gnupg ca-certificates curl rsync certbot python3-certbot-nginx
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
fi

if ! aptly publish list -raw 2>/dev/null | grep -q '^${REPO_PREFIX} ${REPO_DISTRIBUTION}$'; then
  aptly publish repo -batch -architectures='${REPO_ARCHITECTURES}' -gpg-key='${GPG_IDENTITY}' -distribution='${REPO_DISTRIBUTION}' -component='${REPO_COMPONENT}' '${REPO_NAME}' '${REPO_PREFIX}'
fi

install -d -m 0755 '${WEB_ROOT}/${REPO_PREFIX}' '/root/.aptly/public/${REPO_PREFIX}'
if ! findmnt '${WEB_ROOT}/${REPO_PREFIX}' >/dev/null 2>&1; then
  rm -rf '${WEB_ROOT}/${REPO_PREFIX}'
  install -d -m 0755 '${WEB_ROOT}/${REPO_PREFIX}'
  mount --bind '/root/.aptly/public/${REPO_PREFIX}' '${WEB_ROOT}/${REPO_PREFIX}'
fi
if ! grep -Fq '${WEB_ROOT}/${REPO_PREFIX}' /etc/fstab; then
  echo '/root/.aptly/public/${REPO_PREFIX} ${WEB_ROOT}/${REPO_PREFIX} none bind 0 0' >> /etc/fstab
fi
chmod -R a+rX '${WEB_ROOT}'

cat >/etc/nginx/sites-available/${REPO_DOMAIN} <<'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name ${REPO_DOMAIN};

    root ${WEB_ROOT};
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    location ~* \\\\.(deb|gz|xz|bz2|gpg|asc|sh|list)$ {
        add_header Cache-Control \"public, max-age=300\";
        try_files \$uri =404;
    }
}
NGINXEOF
sed -i 's/server_name .*/server_name ${REPO_DOMAIN};/' /etc/nginx/sites-available/${REPO_DOMAIN}
sed -i 's#root .*#root ${WEB_ROOT};#' /etc/nginx/sites-available/${REPO_DOMAIN}
ln -sf /etc/nginx/sites-available/${REPO_DOMAIN} /etc/nginx/sites-enabled/${REPO_DOMAIN}
rm -f /etc/nginx/sites-enabled/default

cat > '${WEB_ROOT}/index.html' <<'HTMLEOF'
<!doctype html><html><head><meta charset=\"utf-8\"><title>SafeMeet BBB Install</title></head><body><h1>SafeMeet BBB Install Repository</h1><p>Use /bbb-install-safemeet-3.0.sh for installs and updates.</p></body></html>
HTMLEOF

nginx -t
systemctl enable --now nginx
systemctl reload nginx

if [[ '${ENABLE_HTTPS}' == '1' && ! -f '/etc/letsencrypt/live/${REPO_DOMAIN}/fullchain.pem' ]]; then
  certbot --nginx --non-interactive --agree-tos --email '${LETSENCRYPT_EMAIL}' -d '${REPO_DOMAIN}' --redirect
fi

test -f '${WEB_ROOT}/${REPO_PREFIX}/dists/${REPO_DISTRIBUTION}/Release'
test -f '${WEB_ROOT}/repo/bigbluebutton.asc'
"

echo "[safemeet-repo-bootstrap] Ready: https://${REPO_DOMAIN}/${REPO_PREFIX}/dists/${REPO_DISTRIBUTION}/Release"
