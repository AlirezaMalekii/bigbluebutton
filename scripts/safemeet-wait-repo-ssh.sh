#!/usr/bin/env bash
# Probe the SafeMeet apt repo SSH endpoint and write its host key to
# ~/.ssh/known_hosts. Used by GitHub Actions before package publish.
set -euo pipefail

REPO_HOST="${REPO_HOST:-78.157.39.4}"
REPO_PORT="${REPO_PORT:-3698}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-6}"
SCAN_TIMEOUT="${SCAN_TIMEOUT:-15}"

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"
touch "${HOME}/.ssh/known_hosts"
chmod 600 "${HOME}/.ssh/known_hosts"

tcp_probe() {
  timeout 8 bash -c "echo >/dev/tcp/${REPO_HOST}/${REPO_PORT}" 2>/dev/null || return 1
}

scan_host_key() {
  local out err
  out="$(mktemp)"
  err="$(mktemp)"
  # Keep stderr visible in CI logs; only hashed keys go to known_hosts.
  if ssh-keyscan -T "${SCAN_TIMEOUT}" -p "${REPO_PORT}" -H "${REPO_HOST}" \
      >"${out}" 2>"${err}"; then
    if grep -qE 'ssh-(rsa|ed25519|dss)|ecdsa-sha2-' "${out}"; then
      cat "${out}" >> "${HOME}/.ssh/known_hosts"
      rm -f "${out}" "${err}"
      return 0
    fi
  fi
  if [[ -s "${err}" ]]; then
    sed 's/^/  /' "${err}" >&2
  fi
  rm -f "${out}" "${err}"
  return 1
}

for ((attempt=1; attempt<=MAX_ATTEMPTS; attempt++)); do
  echo "Repo SSH probe ${attempt}/${MAX_ATTEMPTS} for ${REPO_HOST}:${REPO_PORT}"
  if tcp_probe; then
    echo "TCP ${REPO_HOST}:${REPO_PORT} is open"
  else
    echo "TCP ${REPO_HOST}:${REPO_PORT} is closed or filtered"
  fi
  if scan_host_key; then
    echo "ssh-keyscan succeeded on attempt ${attempt}"
    exit 0
  fi
  echo "ssh-keyscan attempt ${attempt} failed, retrying..."
  sleep $((attempt * 3))
done

cat >&2 <<EOF
ssh-keyscan failed after retries for ${REPO_HOST}:${REPO_PORT}
The SafeMeet apt repo VM (new-bbb-install.roomeet.ir / ${REPO_HOST}) is unreachable.
Power it on (Hyper-V guest; ARP fails even from 78.157.39.51) and re-run CI.
EOF
exit 1
