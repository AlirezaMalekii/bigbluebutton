#!/usr/bin/env bash
# Cursor beforeShellExecution: block git commit when BBB html5 pre-checks fail,
# and send errors to the agent so it can fix them before retrying.
set -euo pipefail

allow() {
  echo '{"permission":"allow"}'
  exit 0
}

deny() {
  local msg="$1"
  # Escape for JSON string (minimal: backslash, quote, newline)
  local escaped
  escaped="$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')"
  cat <<EOF
{
  "permission": "deny",
  "user_message": "کامیت متوقف شد — خطای ESLint/TypeScript در bigbluebutton-html5. Cursor در حال رفع خطاهاست؛ بعد دوباره commit کنید.",
  "agent_message": "Git commit in bigbluebutton-html5 was blocked because pre-commit checks failed. Fix ALL errors below in the staged/changed files, run \`cd bigbluebutton-html5 && ./scripts/pre-commit.sh\` to verify, then stage fixes and retry commit. Never use --no-verify.\n\n${escaped}"
}
EOF
  exit 0
}

if ! command -v jq >/dev/null 2>&1; then
  allow
fi

input="$(cat)"
command="$(echo "$input" | jq -r '.command // empty')"
cwd="$(echo "$input" | jq -r '.cwd // empty')"

if [[ ! "$command" =~ ^git[[:space:]]+(-c[[:space:]]+[^[:space:]]+[[:space:]]+)*commit ]]; then
  allow
fi

if [[ "$command" =~ --no-verify ]]; then
  allow
fi

html5_dir=""
if [[ "$cwd" == *"bigbluebutton-html5"* ]]; then
  html5_dir="${cwd%%/bigbluebutton-html5*}/bigbluebutton-html5"
elif [[ -d "${cwd}/bigbluebutton-html5" ]]; then
  html5_dir="${cwd}/bigbluebutton-html5"
elif [[ -d "${cwd%/bigbluebutton}/bigbluebutton-html5" ]]; then
  html5_dir="${cwd%/bigbluebutton}/bigbluebutton-html5"
fi

if [[ -z "$html5_dir" || ! -f "$html5_dir/package.json" ]]; then
  allow
fi

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

if (cd "$html5_dir" && ./scripts/pre-commit.sh) >"$log" 2>&1; then
  allow
fi

deny "$(cat "$log")"
