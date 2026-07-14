# SafeMeet Meeting UI Design System

This document describes the implemented SafeMeet meeting UI. The internal code name remains `skyroom`; the product name is SafeMeet / سیف میت.

## Sources of truth

- Tokens: `bigbluebutton-html5/public/stylesheets/skyroom/tokens.css`
- Semantic theme: `bigbluebutton-html5/public/stylesheets/skyroom/theme.css`
- Panel theme: `bigbluebutton-html5/public/stylesheets/skyroom/sidebar.css`
- Shared panel primitives: `bigbluebutton-html5/imports/ui/components/skyroom-layout/panel-chrome/`
- Mobile skin: `bigbluebutton-html5/public/stylesheets/skyroom/responsive.css`
- Typography: `bigbluebutton-html5/public/stylesheets/skyroom/iranyekan.css`
- Bootstrap and stylesheet order: `bigbluebutton-html5/client/main.html`

Do not duplicate these values in agent guidance or components. Read the current files before changing tokens.

## Product character

SafeMeet is a focused, professional realtime meeting interface:

- dark-first, calm, and low-distraction
- near-black backgrounds with layered dark surfaces
- restrained teal accent for identity and interactive state
- compact but readable Persian typography
- subtle depth and glass effects, not decorative noise
- fast feedback and stable geometry

Production currently forces dark theme. Light tokens remain available for future use but are not a reason to expose a theme toggle.

## Color model

Core values currently include:

- brand 500: `#0D887E`
- brand 400: `#14A99E`
- interactive accent: `#20C7BB`
- app background: `#070B14`
- dark surfaces: `#0F141C`, `#151C28`, `#1A2436`
- primary text: `#E6EDF7`
- secondary text: `#B5C0CE`
- muted text: `#8B95A5`
- danger base: `#DF2721`

Use semantic variables rather than these literals:

- `--color-primary`, `--color-text`, `--color-heading`
- `--skyroom-surface`, `--skyroom-surface-2`, `--skyroom-surface-3`
- `--skyroom-accent`, `--skyroom-accent-soft`, `--skyroom-accent-border`
- `--skyroom-panel-*`
- `--skyroom-danger-*`

Accent indicates selection, focus, speaking, primary action, or important status. It must not become a general decoration applied to every border.

## Spacing

The base rhythm is 4/8px:

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-7`: 32px
- `--space-page`: 22px
- `--space-column-stack`: 18px

Use 8–12px for compact control groups, 12–16px for panel interiors, and the existing page/column tokens for layout geometry.

## Radius and elevation

- controls and bubbles: 8–12px
- panel/modal surfaces: 16–20px
- column panels: approximately 18px
- pills: `--radius-pill`

Use existing `--shadow-*`, `--skyroom-elevation-*`, and panel/stage shadow tokens. Elevation should communicate layer ownership: application background → panel → floating control → modal.

## Typography

- Persian UI uses IRANYekan with Persian numeric cuts.
- Latin fallback follows the BBB font stack.
- Panel body is generally 13–14px.
- Section titles are compact and strong, commonly weight 700.
- Secondary metadata is smaller but must remain readable.
- Do not add letter spacing to Persian text.
- Preserve BBB icon-font families when applying broad typography selectors.

Use concise Persian labels. Prefer a clear verb for actions and a noun for destinations.

## Components

### Panels

Reuse `skyroom-layout/panel-chrome/` for title, search, options, and header alignment. A panel should have one obvious hierarchy:

1. title and primary contextual action
2. optional search/filter
3. content
4. composer or persistent action, if needed

### Buttons

- Primary: teal gradient/token, clear label, restrained glow.
- Secondary: dark surface with subtle border.
- Destructive: danger token and explicit confirmation when irreversible.
- Icon-only: localized accessible name and tooltip.
- Minimum touch target should remain usable on mobile even when the visual glyph is compact.

### Modals

Use BBB common modal primitives and the existing Skyroom modal skin. Keep focus trapping, close behavior, escape handling, and modal priority intact.

### Chat and user lists

Optimize for scanning. Preserve avatar/name hierarchy, compact metadata, wrapping, mixed RTL/LTR content, empty state, and large-list rendering behavior.

### Presentation, whiteboard, and webcams

Visual changes must not obscure stage content or alter synchronization. Floating controls need stable safe areas on phone, tablet, and desktop.

## Responsive policy

- phone: below 600px, using SafeMeet top/bottom split zones
- tablet: 600–1199px, constrained column and stage space
- desktop: 1200px and above

Do not solve phone behavior by shrinking desktop UI. Decide which zone owns the feature, whether it scrolls, how it closes, and what happens when presentation/screenshare/webcams appear.

Use logical CSS properties. `dir="rtl"` is the normal meeting direction; URLs, phone numbers, email, tokens, and code should be explicitly LTR.

## Motion

- keep transitions approximately 130–220ms unless an existing component defines otherwise
- use small opacity, border, color, or 1px transform changes
- do not animate layout continuously during media or whiteboard interaction
- respect reduced motion where meaningful
- never require animation to identify state

## CSS extension policy

Preferred scopes:

```css
#layout[data-skyroom-column="true"] { /* meeting layout */ }
html[data-skyroom="true"] { /* portals and global SafeMeet surfaces */ }
```

Prefer stable IDs, roles, `data-test`, and explicit SafeMeet attributes. Avoid generated styled-component class names and broad unscoped selectors.

## JS/CSS synchronization

Layout constants in `skyroom-layout/column-layout.js` mirror CSS tokens such as page gap, column stack gap, chrome height, mobile edge, and footer lift. Update both sources in one change and verify all device sizes.

## Accessibility baseline

- visible `:focus-visible` state
- localized accessible names
- keyboard operation for all controls
- sufficient text and state contrast
- status changes announced when appropriate
- no color-only meaning
- no hidden content left focusable
- no accidental horizontal scrolling at supported widths

## New UI decision order

1. Reuse an existing BBB/SafeMeet component.
2. Compose existing primitives.
3. Add a SafeMeet component under `skyroom-layout/`.
4. Add a scoped CSS rule/token.
5. Patch an upstream component only through a small guarded seam.

Never create a second design system for one feature.
