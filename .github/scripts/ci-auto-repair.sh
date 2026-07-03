#!/usr/bin/env bash
# Invoked by .github/workflows/ci-auto-repair.yml after CI/CD failure.
set -euo pipefail

MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
REPO_SLUG="${GITHUB_REPOSITORY}"
RUN_ID="${WORKFLOW_RUN_ID:-${GITHUB_RUN_ID:-}}"
RUN_URL="${WORKFLOW_RUN_URL:-${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}/actions/runs/${RUN_ID}}"
HEAD_SHA="${HEAD_SHA:-${GITHUB_SHA:-}}"
HEAD_BRANCH="${HEAD_BRANCH:-${GITHUB_REF_NAME:-}}"

if [[ -z "${RUN_ID}" || -z "${HEAD_SHA}" || -z "${HEAD_BRANCH}" ]]; then
  echo "Missing run context (RUN_ID/HEAD_SHA/HEAD_BRANCH)."
  exit 1
fi
PRODUCTION_BRANCH="${PRODUCTION_BRANCH}"
REPO_URL="${REPO_URL}"
PROJECT_NAME="${PROJECT_NAME}"

if [[ -z "${CURSOR_API_KEY:-}" ]]; then
  echo "CURSOR_API_KEY is not set — skip auto-repair."
  exit 0
fi

ensure_label() {
  gh label create "$1" --color "$2" --repo "${REPO_SLUG}" --force >/dev/null 2>&1 || true
}
ensure_label ci-auto-repair d73a4a
ensure_label ci-auto-repair-skipped fef2c0
ensure_label ci-auto-repair-exhausted 5319e7

if [[ "${HEAD_BRANCH}" != "${PRODUCTION_BRANCH}" ]]; then
  echo "Branch ${HEAD_BRANCH} is not production (${PRODUCTION_BRANCH}) — skip."
  exit 0
fi

echo "Fetching failed job logs for run ${RUN_ID}..."
LOGS="$(gh run view "${RUN_ID}" --repo "${REPO_SLUG}" --log-failed 2>/dev/null | tail -c 120000 || true)"
if [[ -z "${LOGS}" ]]; then
  LOGS="(failed to fetch logs — inspect ${RUN_URL})"
fi

INFRA_PATTERNS=(
  'Permission denied (publickey)'
  'Host key verification failed'
  'Could not resolve host'
  'ssh: connect to host'
  'DEPLOY_SSH_PRIVATE_KEY'
  'secrets\..*not found'
  'PRODUCTION_ENV'
  'npm ERR! 401'
  'composer.*401'
)

for pattern in "${INFRA_PATTERNS[@]}"; do
  if echo "${LOGS}" | grep -qiE "${pattern}"; then
    echo "Infrastructure/credentials failure detected (${pattern}) — auto-repair will not help."
    gh issue create \
      --repo "${REPO_SLUG}" \
      --title "[ci-auto-repair] infra failure ${HEAD_SHA:0:7}" \
      --label "ci-auto-repair,ci-auto-repair-skipped" \
      --body "CI failed with likely infra/secret issue. Manual intervention required.

Run: ${RUN_URL}
Commit: ${HEAD_SHA}
Branch: ${HEAD_BRANCH}

Pattern matched: ${pattern}
" || true
    exit 0
  fi
done

CHAIN_SHA="${HEAD_SHA}"
CHAIN_SHORT="${CHAIN_SHA:0:7}"
ATTEMPT=1
ISSUE_NUMBER=""

COMMIT_MSG="$(gh api "repos/${REPO_SLUG}/commits/${HEAD_SHA}" --jq '.commit.message' 2>/dev/null || echo '')"
if [[ "${COMMIT_MSG}" =~ ci-auto-repair:\ chain=([a-f0-9]+) ]]; then
  CHAIN_SHA="${BASH_REMATCH[1]}"
  CHAIN_SHORT="${CHAIN_SHA:0:7}"
fi

ISSUE_JSON="$(gh issue list --repo "${REPO_SLUG}" --label "ci-auto-repair" --state open --json number,title,body --limit 20 2>/dev/null || echo '[]')"
ISSUE_NUMBER="$(echo "${ISSUE_JSON}" | jq -r --arg chain "${CHAIN_SHORT}" '.[] | select(.title | contains($chain)) | .number' | head -1)"

if [[ -n "${ISSUE_NUMBER}" && "${ISSUE_NUMBER}" != "null" ]]; then
  BODY="$(echo "${ISSUE_JSON}" | jq -r --arg n "${ISSUE_NUMBER}" '.[] | select(.number == ($n | tonumber)) | .body')"
  if [[ "${BODY}" =~ attempt:\ ([0-9]+) ]]; then
    ATTEMPT=$((BASH_REMATCH[1] + 1))
  else
    ATTEMPT=2
  fi
else
  ISSUE_URL="$(gh issue create \
    --repo "${REPO_SLUG}" \
    --title "[ci-auto-repair] ${PROJECT_NAME} chain=${CHAIN_SHORT}" \
    --label "ci-auto-repair" \
    --body "Auto-repair chain for failed CI/CD on production branch.

chain_sha: ${CHAIN_SHA}
branch: ${HEAD_BRANCH}
attempt: 0
run: ${RUN_URL}
")"
  ISSUE_NUMBER="${ISSUE_URL##*/}"
  ATTEMPT=1
fi

if [[ "${ATTEMPT}" -gt "${MAX_ATTEMPTS}" ]]; then
  echo "Max attempts (${MAX_ATTEMPTS}) reached for chain ${CHAIN_SHA}."
  gh issue comment "${ISSUE_NUMBER}" --repo "${REPO_SLUG}" --body "Stopped after ${MAX_ATTEMPTS} auto-repair attempts. Manual fix required.

Last run: ${RUN_URL}
" || true
  gh issue edit "${ISSUE_NUMBER}" --repo "${REPO_SLUG}" --add-label "ci-auto-repair-exhausted" || true
  exit 0
fi

gh issue edit "${ISSUE_NUMBER}" --repo "${REPO_SLUG}" --body "Auto-repair chain for failed CI/CD on production branch.

chain_sha: ${CHAIN_SHA}
branch: ${HEAD_BRANCH}
attempt: ${ATTEMPT}
last_run: ${RUN_URL}
last_sha: ${HEAD_SHA}
" || true

PROMPT="$(cat <<EOF
You are repairing a failed CI/CD pipeline for SafeMeet **${PROJECT_NAME}**.

## Context
- Repository: ${REPO_URL}
- Production branch: ${PRODUCTION_BRANCH} (push fixes here with workOnCurrentBranch)
- Failed workflow run: ${RUN_URL}
- Commit: ${HEAD_SHA}
- Auto-repair attempt: ${ATTEMPT}/${MAX_ATTEMPTS}

## Failed logs (tail)
\`\`\`
${LOGS}
\`\`\`

## Your job
1. Diagnose the CI/CD failure from the logs and fix the **minimal** code/config change needed.
2. Run local checks if feasible (lint/test/build relevant to this project).
3. Commit with message starting: \`ci-auto-repair: chain=${CHAIN_SHA} attempt=${ATTEMPT}\`
4. Push to \`${PRODUCTION_BRANCH}\` so CI/CD re-runs automatically.

## Hard limits (do NOT violate)
- Never edit, commit, or expose: \`.env\`, \`.env.prodocution\`, \`env.production\`, deploy secrets, SSH keys, \`DEPLOY_*\` credentials.
- Never change GitHub Actions secrets or server infrastructure.
- Never run destructive DB migrations or drop tables.
- Never disable security checks broadly (e.g. removing entire test jobs).
- If failure is SSH/deploy/secret/infra related, STOP and explain — do not push a noop fix.
- Keep changes focused; prefer fixing the actual test/lint/build error.

## Project notes
- Laravel API: Pest/Pint/PHPStan in CI; production env file is \`.env.prodocution\` (server-only).
- Deploy docs: \`.github/CI-CD.md\`
EOF
)"

PAYLOAD="$(jq -n \
  --arg text "${PROMPT}" \
  --arg url "${REPO_URL}" \
  --arg ref "${PRODUCTION_BRANCH}" \
  '{
    prompt: { text: $text },
    model: { id: "composer-2.5" },
    repos: [{ url: $url, startingRef: $ref }],
    workOnCurrentBranch: true,
    autoCreatePR: false,
    skipReviewerRequest: true
  }')"

echo "Launching Cursor Cloud Agent (attempt ${ATTEMPT}/${MAX_ATTEMPTS})..."
RESPONSE="$(curl -sS -X POST "https://api.cursor.com/v1/agents" \
  -u "${CURSOR_API_KEY}:" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")"

AGENT_ID="$(echo "${RESPONSE}" | jq -r '.id // .agentId // empty')"
AGENT_URL="$(echo "${RESPONSE}" | jq -r '.url // empty')"

if [[ -z "${AGENT_ID}" ]]; then
  echo "Cursor API error:"
  echo "${RESPONSE}" | jq . 2>/dev/null || echo "${RESPONSE}"
  gh issue comment "${ISSUE_NUMBER}" --repo "${REPO_SLUG}" --body "Cursor agent launch failed. Response logged in workflow.

\`\`\`
${RESPONSE}
\`\`\`
" || true
  exit 1
fi

echo "Agent started: ${AGENT_ID}"
[[ -n "${AGENT_URL}" ]] && echo "Dashboard: ${AGENT_URL}"

gh issue comment "${ISSUE_NUMBER}" --repo "${REPO_SLUG}" --body "Launched Cursor auto-repair agent (attempt ${ATTEMPT}/${MAX_ATTEMPTS}).

- Agent: \`${AGENT_ID}\`
- Run: ${RUN_URL}
${AGENT_URL:+- Dashboard: ${AGENT_URL}}
" || true
