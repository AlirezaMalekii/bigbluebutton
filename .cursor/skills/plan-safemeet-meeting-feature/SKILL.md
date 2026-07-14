---
name: plan-safemeet-meeting-feature
description: Deeply researches and plans SafeMeet meeting-page features from short English or Persian product requests. Use for UI/UX redesigns, new meeting controls, panels, webcam behavior, presentation/whiteboard changes, moderator/viewer workflows, realtime interactions, or requests such as «ظاهرش را بهتر کن»، «این قابلیت را اضافه کن»، and «صفحه جلسه را تغییر بده».
metadata:
  owner: safemeet-frontend
  domain: bigbluebutton-meeting
---

# Plan SafeMeet Meeting Feature

Turn product intent into an implementation-ready BBB plan without inventing architecture.

## Workflow

1. Translate the request into observable user outcomes and acceptance criteria.
2. Read [persian-request-map.md](persian-request-map.md) when the request is Persian or uses product language rather than code terms.
3. Classify the work:
   - visual/copy only
   - local UI interaction
   - layout/media interaction
   - realtime/permission/backend contract
4. Inspect the current render path, state owner, existing SafeMeet extension seam, settings/feature flags, and relevant tests.
5. For architecture, lifecycle, GraphQL, or media changes, consult official BBB development docs and trace the implementation in this checkout.
6. Compare viable approaches. Prefer Skyroom CSS/components, wrappers, plugins, and existing BBB services over core edits.
7. Ask at most two focused questions only when the answer materially changes behavior, design, permissions, or risk. Otherwise use explicit sensible defaults.
8. Produce the plan using [plan-template.md](plan-template.md).

## Planning quality bar

Every substantial UI plan considers:

- desktop, tablet, and phone
- Persian RTL and mixed LTR content
- moderator/presenter/viewer permissions
- loading, empty, disabled, error, reconnect, and meeting-end states
- keyboard, focus, labels, contrast, and touch targets
- large meetings and low-end mobile performance
- GraphQL/subscription/write deduplication when relevant
- upstream merge impact and extension boundary
- exact verification and acceptance criteria

Do not expand a color, spacing, or copy request into backend work. Do not keep a simple request vague: infer the complete interaction and visual states from existing SafeMeet patterns.
