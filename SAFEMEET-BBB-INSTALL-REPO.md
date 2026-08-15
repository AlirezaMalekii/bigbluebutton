# SafeMeet BBB Install Repository

This repository can publish SafeMeet BigBlueButton packages to:

```text
https://new-bbb-install.roomeet.ir/jammy-300
```

The repo server only hosts installer files and apt packages. Do not install BBB
on that server.

## Bootstrap Repo Server

The server has already been bootstrapped, but the setup is repeatable:

```bash
scripts/safemeet-repo-bootstrap.sh
```

Useful environment overrides:

```bash
REPO_HOST=78.157.39.4 REPO_PORT=3698 REPO_DOMAIN=new-bbb-install.roomeet.ir \
  scripts/safemeet-repo-bootstrap.sh
```

## Build And Publish Packages

Pushes to the `safemeet` branch are handled by `.github/workflows/safemeet-ci-cd.yml`.
That workflow no longer syncs source code to an existing BBB server and no longer
runs `./deploy.sh` on the old BBB host. It only builds Debian packages and
publishes the installer/package repository on `new-bbb-install.roomeet.ir`.

For manual releases, use the GitHub workflow `SafeMeet BBB Package Publish`, or
build locally and publish:

```bash
build/setup.sh bbb-html5
build/setup.sh bigbluebutton
scripts/safemeet-publish-packages.sh --debs "artifacts/*.deb"
```

The publish script uploads `.deb` files, imports them into the aptly repo with
`-force-replace`, keeps the latest two versions of each package, updates the
signed `jammy-300` publication, and serves it from aptly's public tree (nginx
bind-mount). It does not copy the pool into `/var/www` — that duplicate filled
the 36G repo VM.

## Install Fresh BBB Server

Run this on the target BBB server, not on the repo server:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -w -v jammy-300 -s live71.roomeet.ir -e cert@roomeet.ir \
  --default-pdf-url "https://example.com/default.pdf" \
  --logo-url "https://example.com/logo.svg" \
  --logo-link-url "https://roomeet.ir" \
  --theme-id roomeet
```

Fresh install first uses the existing Roomeet/BBB install flow as the baseline,
then adds the SafeMeet repository and upgrades any BBB packages that exist there.
This lets the SafeMeet repo start small and override only changed packages.
The installer also persists `fa-IR` as the default meeting locale, so a new
meeting opens in Persian even when the browser language is English and the join
URL contains no locale userdata parameter.

## Meeting theme packs

Default packaged meeting UI stays SafeMeet teal. Optional per-server palettes:

```text
https://new-bbb-install.roomeet.ir/themes/safemeet.json
https://new-bbb-install.roomeet.ir/themes/roomeet.json
```

Apply RooMeet colors:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -s live71.roomeet.ir --config-only --theme-id roomeet
```

Or point at any public JSON:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -s live71.roomeet.ir --config-only \
  --theme-config-url "https://cdn.example.com/safemeet/themes/custom.json"
```

Reset to packaged default:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -s live71.roomeet.ir --config-only --theme-reset
```

Theme docs and schema notes: `branding/themes/README.md`.

## Update Existing BBB Server

Run the same command on an existing BBB 3.0 server. The installer detects the
installed `bigbluebutton` package, adds the SafeMeet apt source with a higher
pin priority, upgrades BBB packages, applies PDF/logo defaults, and runs health
checks.

For changing only the default PDF/logo without upgrading BBB packages:

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -s live71.roomeet.ir --config-only \
  --default-pdf-url "https://example.com/default.pdf" \
  --logo-url "https://example.com/logo.svg" \
  --logo-link-url "https://roomeet.ir"
```

## Dry Run

```bash
wget -qO- https://new-bbb-install.roomeet.ir/bbb-install-safemeet-3.0.sh | bash -s -- \
  -v jammy-300 -s live71.roomeet.ir --dry-run \
  --default-pdf-url "https://example.com/default.pdf" \
  --logo-url "https://example.com/logo.svg" \
  --logo-link-url "https://roomeet.ir"
```

## Persistent Overrides

The installer caches assets locally on the BBB server:

```text
/var/www/bigbluebutton-default/assets/safemeet/default.pdf
/var/www/bigbluebutton-default/assets/safemeet/logo.<ext>
/var/www/bigbluebutton-default/assets/safemeet/theme.json
/var/www/bigbluebutton-default/assets/safemeet/theme-override.css
```

It writes persistent BBB web overrides to:

```text
/etc/bigbluebutton/bbb-web.properties
```

Relevant keys:

```properties
beans.presentationService.defaultUploadedPresentation=https://<bbb-host>/safemeet/default.pdf
defaultWelcomeMessage=<Persian brand-neutral welcome copy>
defaultWelcomeMessageFooter=<Persian connectivity/headset guidance>
useDefaultLogo=true
defaultLogoURL=https://<bbb-host>/safemeet/logo.<ext>
useDefaultDarkLogo=true
defaultDarkLogoURL=https://<bbb-host>/safemeet/logo.<ext>
```

`--default-pdf-url` also copies the file to `/var/www/bigbluebutton-default/assets/default.pdf` and refreshes snapshotted `default.pdf` files under class-materials. An already-running meeting keeps its current slides until that session ends and is created again; teacher uploads stay.

`--logo-url` replaces the **single** meeting platform logo (both light and dark
defaults). It does not sit beside SafeMeet/RooMeet — it becomes the logo.

If `--logo-url` is omitted, the client uses the packaged mark for `--theme-id`:

- `roomeet` → RooMeet Persian lockup
- `safemeet` or unset → SafeMeet lockup

`--logo-link-url` writes the click target for that one logo into:

```text
/etc/bigbluebutton/bbb-html5.yml
```

```yaml
public:
  app:
    defaultSettings:
      application:
        overrideLocale: fa-IR
    branding:
      logoLinkUrl: https://roomeet.ir
      themeId: roomeet
```

The HTML5 client loads `/safemeet/theme-override.css` when present. Meeting theme
JSON is stored at `/etc/safemeet-bbb/theme.json`. Theme JSON `id` is also written
to `public.app.branding.themeId` so the meeting uses the matching packaged
platform logo when `--logo-url` is not set.

Class materials persistence (presentations + whiteboard across sessions for the same external `meetingID`) is documented in `docs/safemeet/class-materials-persistence.md`. Defaults are enabled with 14-day idle retention under `/var/bigbluebutton/safemeet-class-materials`.

Backups are written to:

```text
/var/backups/safemeet-bbb/<timestamp>/
```

State from the latest run is written to:

```text
/etc/safemeet-bbb/install.env
```

## Post-Update Checks

On a target BBB server:

```bash
apt-cache policy bigbluebutton bbb-html5
bbb-conf --status
bbb-conf --check
curl -fsS "https://<bbb-host>/safemeet/default.pdf" >/dev/null
curl -fsS "https://<bbb-host>/safemeet/logo.svg" >/dev/null
curl -fsS "https://<bbb-host>/safemeet/theme-override.css" >/dev/null   # only if a theme was applied
yq e '.public.app.defaultSettings.application.overrideLocale' /etc/bigbluebutton/bbb-html5.yml
```

New default PDF/logo/theme values are reliable for newly created meetings (hard-refresh
existing HTML5 tabs after a theme change).
