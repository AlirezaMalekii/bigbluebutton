# Agent Guide

This repository is the SafeMeet fork of BigBlueButton 3.x. Keep BBB as the realtime/media/state backbone and implement the custom meeting experience through localized SafeMeet extension seams.

## Mandatory

- Security disclosure policy: `CLAUDE.md`
- Core architecture guardrails: `.cursor/rules/BigBlueButton-3-x-Development.mdc`
- BBB server delivery: `.cursor/rules/bbb-git-first-deploy.mdc` — push to git first; update the BBB server from the repository. Do not hot-patch live server paths.
- Official BBB development documentation: https://docs.bigbluebutton.org/development/

## Meeting UI

- SafeMeet components: `bigbluebutton-html5/imports/ui/components/skyroom-layout/`
- SafeMeet styles/tokens: `bigbluebutton-html5/public/stylesheets/skyroom/`
- Design system: `docs/safemeet/meeting-ui-design-system.md`
- Architecture map: `docs/safemeet/meeting-ui-architecture.md`
- Quality checklist: `docs/safemeet/meeting-ui-quality-checklist.md`

Use project skills under `.cursor/skills/` for deep feature planning, UI implementation, realtime tracing, verification, and upstream-impact review. Short Persian product requests should still be investigated and converted into complete interaction, responsive, permission, accessibility, and verification requirements.

## Scoped rules

Rules in `.cursor/rules/` are loaded by relevant paths:

- `safemeet-meeting-ui.mdc`
- `bbb-layout-performance.mdc`
- `bbb-realtime-graphql.mdc`
- `bbb-i18n-rtl-fa.mdc`
- `bbb-meeting-ui-testing.mdc`
- `bbb-deploy-pipeline.mdc`
- `eslint-pre-commit.mdc`

Do not apply Meeting-Panel Ant Design/Tailwind conventions to the BBB HTML5 client.

## Delivery paths

- Local/staging UI iteration: see `DEPLOY-FA.md`; normally `./deploy.sh --only html5`.
- Branch CI/release: see `SAFEMEET-BBB-INSTALL-REPO.md`; CI builds and publishes Debian packages and does not deploy source to the old BBB server.
- Never commit `.deploy.env`, keys, tokens, or server secrets.

Do not create commits, pushes, deployments, or public PRs unless the user explicitly requests them.
