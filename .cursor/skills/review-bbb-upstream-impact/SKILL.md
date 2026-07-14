---
name: review-bbb-upstream-impact
description: Reviews planned or completed SafeMeet changes for BigBlueButton upstream merge risk, core coupling, duplicated infrastructure, performance regressions, and extension-boundary violations. Use before finalizing multi-file meeting UI, GraphQL, layout, media, settings, or backend changes.
metadata:
  owner: architecture
---

# Review BBB Upstream Impact

Compare changes with `upstream/v3.0.x-release` when available and classify each touched area:

- Green: new SafeMeet component, scoped Skyroom CSS, documentation, tests, wrapper, plugin
- Yellow: small guarded integration in an upstream component, settings/type extension, co-located query/mutation
- Red: transport, layout reducer/engine, presentation/whiteboard synchronization, WebRTC/media bridge, authentication, backend contract

Check:

1. Could an existing BBB hook, service, setting, mutation, subscription, or plugin replace custom infrastructure?
2. Was a source file copied instead of wrapped?
3. Are writes/subscriptions/timers/observers duplicated?
4. Are selectors based on stable semantic anchors?
5. Are SafeMeet changes gated and localized?
6. Is upgrade behavior documented for yellow/red edits?
7. Are relevant role, reconnect, mobile, and large-meeting cases verified?

Return concrete findings ordered by risk. Do not recommend cosmetic refactors that increase the diff without reducing merge risk.
