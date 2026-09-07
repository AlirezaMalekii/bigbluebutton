# Agent Guide

This repository is the SafeMeet fork of BigBlueButton 3.x. Keep BBB as the realtime/media/state backbone and implement the custom meeting experience through localized SafeMeet extension seams.

## Mandatory

- Security disclosure policy: `CLAUDE.md`
- Core architecture guardrails: `.cursor/rules/BigBlueButton-3-x-Development.mdc`
- BBB server delivery: `.cursor/rules/bbb-git-first-deploy.mdc` — git first. live51 HTML5 hot-fix only when the user explicitly asks this turn (skill `hotfix-live51-html5`).
- Official BBB development documentation: https://docs.bigbluebutton.org/development/

## Meeting UI

- SafeMeet components: `bigbluebutton-html5/imports/ui/components/skyroom-layout/`
- SafeMeet styles/tokens: `bigbluebutton-html5/public/stylesheets/skyroom/`
- Design system: `docs/safemeet/meeting-ui-design-system.md`
- Architecture map: `docs/safemeet/meeting-ui-architecture.md`
- Quality checklist: `docs/safemeet/meeting-ui-quality-checklist.md`
- Meeting theme packs (install-time JSON): `branding/themes/`

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

- **Git / CI** (default): user commits/pushes when they choose; see `SAFEMEET-BBB-INSTALL-REPO.md`.
- Local/staging html5 deploy: see `DEPLOY-FA.md`; `./deploy.sh --only html5` only when asked.
- **live51 HTML5 hot-fix**: skill `.cursor/skills/hotfix-live51-html5/` — only if the user explicitly asks for هات فیکس / live51 update this turn. Do not hot-fix after ordinary UI edits.
- Never commit `.deploy.env`, keys, tokens, or server secrets.

Do not create commits, pushes, deployments, or public PRs unless the user explicitly requests them.
