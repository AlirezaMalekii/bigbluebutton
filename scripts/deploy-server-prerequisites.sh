#!/usr/bin/env bash
# One-time (or idempotent) dev toolchain on the BBB server for source deploys.
set -euo pipefail

SBT_VERSION="${SBT_VERSION:-1.6.2}"

log() { printf '[prereq] %s\n' "$*"; }

install_apt_packages() {
  local pkgs=()
  command -v go >/dev/null || pkgs+=(golang-go)
  command -v mvn >/dev/null || pkgs+=(maven)
  if [[ ${#pkgs[@]} -gt 0 ]]; then
    log "Installing apt packages: ${pkgs[*]}"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq "${pkgs[@]}"
  fi
}

install_sbt() {
  if command -v sbt >/dev/null; then
    log "sbt already installed: $(sbt --version 2>&1 | head -1)"
    return 0
  fi

  log "Installing SDKMAN + sbt ${SBT_VERSION} ..."
  if [[ ! -d /root/.sdkman ]]; then
    curl -fsSL "https://get.sdkman.io" | bash
  fi
  # shellcheck source=/dev/null
  source /root/.sdkman/bin/sdkman-init.sh
  sdk install sbt "$SBT_VERSION" || sdk install sbt "$SBT_VERSION" </dev/null
  sdk default sbt "$SBT_VERSION"

  if ! grep -q sdkman-init /root/.bashrc 2>/dev/null; then
    echo 'source "/root/.sdkman/bin/sdkman-init.sh"' >> /root/.bashrc
  fi
}

ensure_path() {
  if [[ -f /root/.sdkman/bin/sdkman-init.sh ]]; then
    # shellcheck source=/dev/null
    source /root/.sdkman/bin/sdkman-init.sh
  fi
}

main() {
  install_apt_packages
  install_sbt
  ensure_path

  log "Tool versions:"
  java -version 2>&1 | head -1 || true
  node -v || true
  npm -v || true
  go version 2>/dev/null || true
  mvn -version 2>/dev/null | head -1 || true
  sbt --version 2>&1 | head -1 || true
}

main "$@"
