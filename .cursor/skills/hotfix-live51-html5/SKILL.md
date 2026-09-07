---
name: hotfix-live51-html5
description: >-
  Hot-deploys SafeMeet HTML5 client changes to the live51 test BBB server
  (rsync + remote webpack or CSS-only sync) without full CI/CD. Use ONLY when
  the user explicitly asks for هات فیکس، hot-fix، بگذار روی سرور ۵۱، or to
  update live51 in this turn. Do not run after ordinary html5/UI edits.
  Do not use for jars, akka, bbb-web, GraphQL, or non-test hosts.
paths:
  - bigbluebutton-html5/**
  - public/stylesheets/skyroom/**
metadata:
  owner: safemeet-frontend
  server: live51
---

# Hotfix HTML5 on live51 (test)

Fast path for iterative SafeMeet UI on the **test** BBB host. The user later
batches changes into git and runs CI/CD themselves — do **not** commit/push
unless they ask.

## When to use

**Only** when the user explicitly asks in this turn for hot-fix / هات فیکس /
put on server 51 / live51.

## When not to use

- After ordinary html5/skyroom UI, CSS, or layout edits — do not hot-fix
  unless the user asked in this turn
- `bbb-web`, Akka, GraphQL, mediasoup, recording jars, Debian packages
- Any host that is not the configured live51 test server
- Secrets, `.deploy.env`, or production package swaps

## Connection

```bash
cd /Users/alirezamaleki/Developer/laravel/SafeMeet/bigbluebutton
source .deploy.env   # gitignored — DEPLOY_HOST/PORT/USER/REMOTE_DIR
# Typical: root@78.157.39.51 -p 3698, REMOTE_DIR=/root/dev/bigbluebutton
```

Never print secrets. SSH identity from env/`SSH_IDENTITY` if set.

## Choose path

### A) CSS-only (seconds)

Skyroom styles under `bigbluebutton-html5/public/stylesheets/skyroom/`:

1. Rsync changed `.css` to **both**:
   - `${REMOTE_DIR}/bigbluebutton-html5/public/stylesheets/skyroom/`
   - `/usr/share/bigbluebutton/html5-client/stylesheets/skyroom/`
2. **Regenerate companion `.css.gz` only on the live html5-client path** (nginx `gzip_static on` — stale `.gz` silently wins). Do **not** gzip files under `${REMOTE_DIR}/.../public/stylesheets/` — leftover source `.css.gz` breaks webpack (`Multiple assets emit ... sidebar.css.gz`).

```bash
ssh ... 'cd /usr/share/bigbluebutton/html5-client/stylesheets/skyroom && gzip -kf sidebar.css theme.css  # only changed files'
```

3. Tell user to hard-refresh (`Cmd+Shift+R`). No webpack needed.

**Never** CSS-hot-fix without refreshing the matching live `.gz` files.

### B) JS/TS/TSX/React (minutes)

1. Rsync **only changed files** into `${REMOTE_DIR}/bigbluebutton-html5/...`
   (preserve relative paths under `imports/`, `public/`, etc.).
2. On server:

```bash
cd ${REMOTE_DIR}/bigbluebutton-html5
rm -rf dist
npm run build    # reuse existing node_modules; do not npm ci unless broken
rsync -a --delete --exclude 'private/' dist/ /usr/share/bigbluebutton/html5-client/
ln -sf /usr/share/bigbluebutton/nginx/bbb-html5.nginx.static \
  /usr/share/bigbluebutton/nginx/bbb-html5.nginx
systemctl restart nginx
```

3. Confirm new `bundle.*.js` exists under `/usr/share/bigbluebutton/html5-client/`.
4. Tell user: hard-refresh + preferably a **new** meeting (cache).

### C) Broader html5 sync (optional)

If many files changed and rsync-by-file is painful:

```bash
./deploy.sh --only html5
```

Slower (~10–20m) but still local-to-live51, not GitHub CI.

## Rules of engagement

- Do **not** hot-fix by default after UI work; only when the user asked this turn.
- Keep local git working tree as source of truth; hot-fix is delivery only.
- If you hot-fixed out of band, remind the user those changes are **not on the
  remote repo** until they commit/push.
- Do not hot-fix compiled artifacts without rebuilding when JS changed.
- Do not edit live files by hand in an editor over SSH; rsync from the laptop repo.

## Smoke check

```bash
ssh -p "$DEPLOY_PORT" "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "ls -1 /usr/share/bigbluebutton/html5-client/bundle.*.js | tail -3"
```
