---
name: verify-safemeet-meeting-ui
description: Verifies SafeMeet meeting UI changes with targeted lint/type checks, browser inspection, responsive and RTL scenarios, role/permission states, accessibility, console/network checks, and existing BBB Playwright tests. Use after implementing meeting-page UI, layout, interaction, or realtime changes.
paths:
  - bigbluebutton-html5/**
  - bigbluebutton-tests/playwright/**
metadata:
  owner: quality
---

# Verify SafeMeet Meeting UI

Read `docs/safemeet/meeting-ui-quality-checklist.md` and select checks proportional to the change.

## Static checks

- Run ESLint for touched frontend files.
- Run TypeScript checking when TS contracts or selectors changed.
- Validate locale JSON, CSS/HTML syntax, and MCP/rule metadata when relevant.

## Browser checks

Use the configured browser/MCP when a meeting URL is available:

- inspect at 390px, 768px, and 1440px
- check RTL plus mixed LTR content
- test moderator/presenter and viewer
- inspect console errors, failed requests, duplicate mutations, and layout loops
- verify keyboard focus, accessible names, touch targets, clipping, and scroll
- capture before/after screenshots for meaningful visual changes

## Realtime checks

Use at least two clients for synchronized behavior. Confirm unchanged state does not publish, reconnect converges, role changes apply, and cleanup occurs on close/end.

Use existing tests under `bigbluebutton-tests/playwright/` before creating a parallel harness. Never commit BBB URL/secret values or include them in reports.
