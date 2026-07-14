---
name: implement-safemeet-meeting-ui
description: Implements polished SafeMeet meeting-page UI and UX while preserving BigBlueButton 3.x architecture. Use when changing the meeting layout, header, action dock, panels, chat, users, presentation, whiteboard, webcams, modals, loading/error states, mobile behavior, Persian RTL, or SafeMeet styling.
paths:
  - bigbluebutton-html5/**
metadata:
  owner: safemeet-frontend
---

# Implement SafeMeet Meeting UI

## Implementation sequence

1. Find the current BBB component, state owner, SafeMeet guard, design tokens, and responsive behavior.
2. Choose the least invasive seam:
   - tokens/scoped Skyroom CSS for visual changes
   - component under `skyroom-layout/` for SafeMeet-only UI
   - small `isSkyroomTheme()`-guarded integration in an upstream component
   - plugin extensible area when it satisfies the contract
3. Reuse layout context, panel toggles, panel chrome, feature flags, settings, intl, icons, and modal primitives.
4. Implement the complete state set: default, hover/focus/active, disabled, loading, empty, error, and narrow layout.
5. Keep RTL logical; explicitly mark technical LTR content.
6. Preserve existing throttle/debounce and avoid new timers, observers, global stores, subscriptions, and unconditional publishes.
7. Verify against `docs/safemeet/meeting-ui-quality-checklist.md`.

## Visual contract

- Dark-first near-black background with layered dark surfaces.
- Brand teal comes from tokens; do not introduce arbitrary accent shades.
- IRANYekan for Persian; compact, readable hierarchy.
- Panel chrome, radius, elevation, and controls match existing SafeMeet surfaces.
- Motion is subtle, fast, and never required to understand state.

## Boundaries

Do not rewrite BBB layout context, GraphQL transport, whiteboard synchronization, presentation camera synchronization, LiveKit/WebRTC bridges, or authentication for a UI request. If an integration edit is unavoidable, keep it minimal and document why the SafeMeet seam alone was insufficient.
