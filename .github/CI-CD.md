# CI/CD — BigBlueButton (SafeMeet fork)

## Branches

| Branch | CI | Deploy |
|--------|----|--------|
| `safemeet` | Yes | Auto → BBB server |
| PRs to `safemeet` | Yes | No |

## Workflow

File: [`.github/workflows/safemeet-ci-cd.yml`](workflows/safemeet-ci-cd.yml)

1. **ShellCheck** — `scripts/`
2. **HTML5** — eslint + typecheck in `bigbluebutton-html5/`
3. **SafeMeet recording** — RSpec in `record-and-playback/core/`
4. **Deploy** — smart component deploy via `./deploy.sh` on push to `safemeet`

## GitHub Secrets

| Secret | Example / notes |
|--------|-----------------|
| `DEPLOY_SSH_PRIVATE_KEY` | Private key with access to BBB server |
| `DEPLOY_HOST` | `78.157.39.51` |
| `DEPLOY_PORT` | `3698` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_REMOTE_DIR` | `/root/dev/bigbluebutton` |

Local override: copy [`deploy.env.example`](../deploy.env.example) → `.deploy.env`

## GitHub Environment

Create environment **`production`** (recommended). BBB deploys can take 10–90 minutes depending on changed components.

## Manual deploy

```bash
./deploy.sh                    # smart deploy (changed components only)
./deploy.sh --only html5       # UI only
./deploy.sh --only playback    # recording stack
./deploy.sh --full             # all components
```

Or: Actions → SafeMeet CI/CD → Run workflow (must be on `safemeet` branch for auto-deploy on push).

## After recording indexer changes

Worker restart is automatic. **Existing recordings** need manual re-index:

```bash
sudo -u bigbluebutton bundle exec ruby scripts/post_publish/90_safemeet_recording_asset_index.rb -m RECORD_ID -f presentation
```

## Rotate compromised credentials

Rotate BBB server SSH access and update `DEPLOY_SSH_PRIVATE_KEY` in GitHub Secrets.
