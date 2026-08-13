# SafeMeet Meeting Theme Packs

Per-server meeting color themes for SafeMeet BBB. The packaged HTML5 client keeps
the default SafeMeet teal palette. Install/update can optionally apply a JSON
theme that becomes a CSS variable override on that server only.

## Built-in packs

| ID | File | Brand |
|---|---|---|
| `safemeet` | `safemeet.json` | Teal (default product palette) |
| `roomeet` | `roomeet.json` | Dual violet brand — Warm `#B61FD8`, Cool `#A78BFA`, Navy `#0F1440` |

Schema version: `1`

## Apply on a BBB server

RooMeet theme by id (hosted on the SafeMeet install repo after publish):

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -w -v jammy-300 -s live51.roomeet.ir -e cert@roomeet.ir \
  --theme-id roomeet
```

Custom theme JSON from any public HTTPS URL:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -s live51.roomeet.ir --config-only \
  --theme-config-url "https://cdn.example.com/safemeet/themes/my-brand.json"
```

Restore packaged default:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -s live51.roomeet.ir --config-only --theme-reset
```

## What the installer writes

```text
/etc/safemeet-bbb/theme.json
/var/www/bigbluebutton-default/assets/safemeet/theme.json
/var/www/bigbluebutton-default/assets/safemeet/theme-override.css
```

Public URL used by the meeting client:

```text
https://<bbb-host>/safemeet/theme-override.css
```

## Compile locally

```bash
python3 scripts/safemeet-theme-compile.py branding/themes/roomeet.json --validate-only
python3 scripts/safemeet-theme-compile.py branding/themes/roomeet.json -o /tmp/theme-override.css
```

## JSON shape

Required top-level fields:

- `schemaVersion` (number, currently `1`)
- `id`, `name`
- `dark` palette object

Optional:

- `light` palette object
- `description`

Each palette (`dark` / `light`) requires:

- `brand` — `50`…`700`, `accent`, optional `gradient` / `gradientSoft`
- `status` — `danger` (plus optional success/warning/danger* helpers)
- `surface` — backgrounds, chrome, webcam, gray steps
- `text` — primary/secondary/muted/body/onBrand
- `accent` — soft/border/glow/hover/button helpers
- `border` — default/strong/subtle/emphasis
- `glass` — glass/strong/blur
- `shadow` — glowSm/glowMd
- `loader` — bullet/ring/ringActive
- `panel` — sidebar/chat panel tokens
- `modal`, `skeleton`, `gradientBg`

Missing optional derived colors are filled from brand hex values by the compiler.
