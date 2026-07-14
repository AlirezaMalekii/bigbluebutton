# SafeMeet Meeting UI Quality Checklist

Use only applicable sections, but do not omit a section silently when the change affects it.

## Architecture

- [ ] Existing BBB/SafeMeet component, hook, service, setting, or plugin was searched first.
- [ ] Source of truth and state owner are identified.
- [ ] SafeMeet customization is localized and gated.
- [ ] No transport, synchronization, or media core was rewritten for presentation-only work.
- [ ] Medium/high upstream-risk edits have a reason and compatibility note.

## UI and design

- [ ] Existing tokens and panel primitives are used.
- [ ] Visual hierarchy is clear without excessive accent/glow.
- [ ] Default, hover, focus, active, disabled, loading, empty, and error states are coherent.
- [ ] Text wraps safely and controls do not clip.
- [ ] Motion is subtle and does not cause layout instability.

## Responsive and RTL

- [ ] 390px phone checked.
- [ ] 768px tablet checked.
- [ ] 1440px desktop checked.
- [ ] Persian RTL and mixed Latin content checked.
- [ ] URLs, phone, email, tokens, and code are LTR where needed.
- [ ] No accidental horizontal scroll.
- [ ] Mobile zone ownership, close/fallback, and scrolling are defined.

## Roles and meeting state

- [ ] Moderator/presenter behavior checked.
- [ ] Viewer behavior checked.
- [ ] Role change during the meeting considered.
- [ ] Presentation and screenshare states checked.
- [ ] No, one, and many webcams considered.
- [ ] Reconnect and meeting-end behavior considered.
- [ ] Breakout/waiting-room boundaries considered when relevant.

## Accessibility

- [ ] Keyboard operation works.
- [ ] Focus is visible and not trapped/lost.
- [ ] Icon-only controls have localized accessible names.
- [ ] Hidden surfaces are not focusable.
- [ ] Contrast and non-color state cues are sufficient.
- [ ] Touch targets remain usable.
- [ ] Important asynchronous status is announced appropriately.

## Performance and realtime

- [ ] No duplicate subscription, polling, state store, timer, observer, or upload path.
- [ ] Writes/publishes are skipped when effective state is unchanged.
- [ ] Existing throttle/debounce values are preserved unless measured.
- [ ] Selectors and GraphQL projections are narrow.
- [ ] Layout work is coalesced and avoids per-frame React state.
- [ ] Two-client convergence is checked for synchronized features.

## Verification

- [ ] Targeted frontend ESLint passes.
- [ ] TypeScript checks pass when types or TS behavior changed.
- [ ] Relevant Playwright tests pass or the unavailable environment is stated.
- [ ] Browser console and failed network requests were inspected for interaction/layout changes.
- [ ] Screenshots were compared for meaningful visual changes.
- [ ] No secrets, generated build artifacts, or unrelated files were added.
