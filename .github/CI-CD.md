# CI/CD — BigBlueButton SafeMeet fork

## Source of truth

Workflow: `.github/workflows/safemeet-ci-cd.yml`

Package/install details: `SAFEMEET-BBB-INSTALL-REPO.md`

## Branch behavior

- Push to `safemeet`: run path-aware checks, build selected Debian packages, and publish the SafeMeet apt repository.
- Pull request to `safemeet`: run checks; do not publish packages.
- Manual workflow: optionally force publication of the full package set.

CI does not sync source to the old BBB server and does not run `./deploy.sh` there.

## Jobs

1. Detect changed areas.
2. Run ShellCheck for deployment/package scripts when affected.
3. Run HTML5 lint and TypeScript checks when the client is affected.
4. Run SafeMeet recording specs when recording code is affected.
5. Plan, build, and publish selected Debian packages on eligible `safemeet` runs.
6. Start bounded CI auto-repair for actionable code failures.

The package planner compares the current commit with the published baseline and uses `scripts/safemeet-detect-packages.sh` to minimize package builds.

## Repository publication

Packages and installer artifacts are published to:

```text
https://new-bbb-install.roomeet.ir/jammy-300
```

That host is an apt repository server, not a BBB meeting server.

Publication imports `.deb` files with replacement enabled, updates the signed aptly publication, and synchronizes its web root.

## Local development deployment

`deploy.sh` remains a separate laptop-to-BBB-server development/staging workflow:

```bash
./deploy.sh --only html5
```

It uses gitignored `.deploy.env`. See `DEPLOY-FA.md`. Do not describe this path as branch CI.

## Secrets

The active workflow may require repository-publication and Cursor auto-repair credentials. Inspect the workflow for current secret names before changing configuration.

Never place credentials, SSH keys, tokens, or `.deploy.env` values in repository files, logs, plans, or agent output.

## Verification

For a package publication:

- inspect the workflow summary for planned package names
- confirm expected `.deb` artifacts were built
- verify apt repository metadata and package policy on a target BBB server
- run `bbb-conf --status` and `bbb-conf --check` after installation/update

For local HTML5 deployment:

- hard-refresh or use a private window
- create a new meeting
- check browser console/network and relevant moderator/viewer scenarios

## CI auto-repair

The Cursor automation may apply a minimal fix and push to `safemeet`, with a bounded number of attempts. It must stop for infrastructure, authentication, repository-server, quota, or SSH failures instead of changing deployment architecture or credentials.
