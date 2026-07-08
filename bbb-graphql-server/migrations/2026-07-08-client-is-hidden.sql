-- SafeMeet tab-presence indicator: incremental migration (does NOT drop the database).
-- Apply against bbb_graphql as postgres.

ALTER TABLE "user_connectionStatus"
  ADD COLUMN IF NOT EXISTS "clientIsHidden" bool DEFAULT false;

ALTER TABLE "user_connectionStatus"
  ADD COLUMN IF NOT EXISTS "clientVisibilityUpdatedAt" timestamp with time zone;

CREATE OR REPLACE FUNCTION update_user_connectionStatus_visibility_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."clientIsHidden" IS DISTINCT FROM OLD."clientIsHidden" THEN
        NEW."clientVisibilityUpdatedAt" := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_connectionStatus_visibility_trigger ON "user_connectionStatus";
CREATE TRIGGER update_user_connectionStatus_visibility_trigger
  BEFORE UPDATE OF "clientIsHidden" ON "user_connectionStatus"
  FOR EACH ROW EXECUTE FUNCTION update_user_connectionStatus_visibility_trigger_func();

CREATE OR REPLACE VIEW "v_user_connectionStatus" AS
SELECT * FROM "user_connectionStatus";

DROP VIEW IF EXISTS "v_user_connectionStatusReport";
CREATE VIEW "v_user_connectionStatusReport" AS
SELECT DISTINCT ON (u."meetingId", u."userId")
  u."meetingId",
  u."userId",
  cs."sessionToken",
  cs."connectionAliveAt",
  cs."status" AS "currentStatus",
  CASE
    WHEN u."currentlyInMeeting"
      AND cs."connectionAliveAt" < current_timestamp - INTERVAL '1 millisecond' * cs."connectionAliveAtMaxIntervalMs"
    THEN TRUE
    ELSE FALSE
  END AS "clientNotResponding",
  cs."clientIsHidden",
  cs."clientVisibilityUpdatedAt",
  csm."status" AS "lastUnstableStatus",
  csm."lastOccurrenceAt" AS "lastUnstableStatusAt"
FROM "user" u
JOIN "user_connectionStatus" cs
  ON cs."meetingId" = u."meetingId" AND cs."userId" = u."userId"
LEFT JOIN "user_connectionStatusMetrics" csm
  ON csm."meetingId" = u."meetingId"
 AND csm."userId" = u."userId"
 AND csm."status" != 'normal'
ORDER BY u."meetingId", u."userId", cs."sessionToken", csm."lastOccurrenceAt" DESC;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO bbb_hasura;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bbb_core;
