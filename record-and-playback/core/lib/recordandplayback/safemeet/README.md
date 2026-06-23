# SafeMeet Recording Asset Indexer

Post-publish extension for BigBlueButton that indexes published recording assets into JSON manifests.

## Components

- `core/lib/recordandplayback/safemeet/asset_indexer.rb`
- `core/lib/recordandplayback/safemeet/event_parser.rb`
- `core/lib/recordandplayback/safemeet/manifest_store.rb`
- `core/scripts/post_publish/90_safemeet_recording_asset_index.rb`

## Config (`bigbluebutton.yml`)

```yaml
safemeet_recording_assets_enabled: true
safemeet_assets_dir: /var/bigbluebutton/recording/safemeet-assets
safemeet_assets_checksum_enabled: false
```

## Output

- `{assets_dir}/{recordId}.json` — merged asset manifest
- `{assets_dir}/{recordId}.events.json` — normalized events cache

See Meeting-Core docs: `Meeting-Core/docs/bbb-recording-asset-api.md`

## Manual re-index (existing published recording)

```bash
RECORD_ID="your-record-id-here"
cd /usr/local/bigbluebutton/core
sudo -u bigbluebutton bundle exec ruby scripts/post_publish/90_safemeet_recording_asset_index.rb \
  -m "$RECORD_ID" -f presentation
ls -la /var/bigbluebutton/recording/safemeet-assets/
```

Do not run with plain `ruby` — gems (optimist, etc.) are loaded via Bundler from `core/Gemfile`.
