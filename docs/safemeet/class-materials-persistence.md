# SafeMeet Class Materials Persistence

Keep uploaded presentations and whiteboard annotations across BBB sessions for the same SafeMeet class (stable external `meetingID` / `bbb_meeting_id`), with a **14-day idle retention** window.

## Why this exists

BBB creates a new **internal** meeting id on every `/create` (`sha1(externalId)-timestamp`). Live presentation/whiteboard state is destroyed when the session ends. Disk trees under `/var/bigbluebutton/<internalId>/` are not remounted into the next session.

SafeMeet Meeting-Core already reuses the same external `bbb_meeting_id` when the host rejoins. This feature snapshots class materials on end and restores them on the next create.

## Behavior

| Event | What happens |
|-------|----------------|
| Meeting ends (API end, logout-end, expiry, no-moderator, …) | Akka snapshots presentation trees + whiteboard JSON keyed by **external** meeting id |
| Next `/create` for that external id | bbb-web restores presentations with **stable presentation ids**, then Akka reinjects annotations after conversion |
| Host rejoins within 14 days of last activity | Files + whiteboard are present again |
| Idle longer than retention | Snapshot is purged by daily cron |

Breakout rooms are never snapshotted.

## Storage

```
/var/bigbluebutton/safemeet-class-materials/<sanitized-external-meeting-id>/
  manifest.json
  whiteboard.json
  presentations/<presentationId>/   # copy of converted tree (original file used on restore)
```

## Configuration

**bbb-web** (`bigbluebutton.properties` or `/etc/bigbluebutton/bbb-web.properties`):

```properties
safemeetClassMaterialsEnabled=true
safemeetClassMaterialsDir=/var/bigbluebutton/safemeet-class-materials
safemeetClassMaterialsRetentionDays=14
```

**akka-apps** (`application.conf` or `/etc/bigbluebutton/bbb-apps-akka.conf`):

```hocon
safemeet {
  classMaterials {
    enabled = true
    dir = "/var/bigbluebutton/safemeet-class-materials"
    presentationDir = "/var/bigbluebutton"
    retentionDays = 14
  }
}
```

**cron** (`/etc/default/bigbluebutton-cron-config`):

```bash
safemeet_class_materials_days=14
```

## Code seams

- Snapshot: `akka-bbb-apps/.../safemeet/SafemeetClassMaterials.scala` (from `HandlerHelpers.sendEndMeetingDueToExpiry`)
- Restore presentations: `ApiController.restoreClassMaterials`
- Restore annotations: `PresentationConversionCompletedSysPubMsgHdlr` → `maybeRestoreAnnotations`
- Manifest helpers: `ClassMaterialsService` / `ClassMaterialsServiceImpl`

## Meeting-Core

No Meeting-Core change is required as long as `bbb_meeting_id` stays stable per class (current `prepareBbbSessionForJoin` behavior).

## Verification checklist

1. Host joins class A, uploads a PDF, draws on the whiteboard, ends the meeting.
2. Confirm snapshot exists under `/var/bigbluebutton/safemeet-class-materials/<bbb_meeting_id>/`.
3. Host joins the same class again (BBB recreates internal id).
4. Uploaded PDF appears and whiteboard shapes are visible after conversion.
5. After an idle period longer than retention days, cron removes the snapshot directory.

## Limits / notes

- Shared notes, chat, polls, and webcams are **not** restored.
- Restore re-converts the original file (page ids stay `presentationId/pageNum` because presentation ids are preserved).
- Explicit create-time pre-upload XML is skipped when a valid materials snapshot is restored (SafeMeet default path has no pre-uploads).
- Retention is **idle-based**: each successful restore/snapshot refreshes `lastAccessedAt` / `manifest.json` mtime.
