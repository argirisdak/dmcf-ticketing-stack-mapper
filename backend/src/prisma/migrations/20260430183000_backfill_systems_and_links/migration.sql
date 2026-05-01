-- Story 6.2 Migration B — Backfill Systems and Organisation Links (architecture-v2-delta §6.2).
-- Prerequisites: Migration A (`add_system_and_junction`). No schema deltas — data backfill only.
-- Executes as a single Prisma migration step (Prisma wraps the file in one transaction).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Step 1 — Insert one System row per canonical platform (11 rows total)
-- =============================================================================

INSERT INTO "system" ("id", "name", "vendor", "category", "last_updated", "created_at")
VALUES
  (gen_random_uuid()::TEXT, 'Tessitura',    'Tessitura Network',          'INTEGRATED'::"SystemCategory",           NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Spektrix',     'Spektrix Ltd',               'INTEGRATED'::"SystemCategory",           NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'AudienceView', 'AudienceView',               'INTEGRATED'::"SystemCategory",           NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Ticketmaster', 'Live Nation Entertainment', 'TICKETING'::"SystemCategory",            NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'PatronBase',   'PatronBase',                 'TICKETING'::"SystemCategory",            NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Eventbrite',   'Eventbrite, Inc.',           'TICKETING'::"SystemCategory",            NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Ticketsolve',  'Ticketsolve',                 'TICKETING'::"SystemCategory",            NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Universe',     'Live Nation Entertainment',  'TICKETING'::"SystemCategory",            NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Salesforce',   'Salesforce, Inc.',           'AUDIENCE_MANAGEMENT'::"SystemCategory", NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'HubSpot',      'HubSpot, Inc.',              'AUDIENCE_MANAGEMENT'::"SystemCategory", NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Donorfy',      'Donorfy',                    'AUDIENCE_MANAGEMENT'::"SystemCategory", NOW(), NOW());

-- =============================================================================
-- Step 2 — Translation tables (temp): legacy lookup FK → new system UUID + category
-- =============================================================================

CREATE TEMP TABLE tp_to_system AS
SELECT tp."id" AS old_id, s."id" AS system_id, s."category"
FROM "ticketing_provider" tp
JOIN "system" s ON s."name" = CASE tp."name"
  WHEN 'TicketSolve' THEN 'Ticketsolve'
  ELSE tp."name"
END;

CREATE TEMP TABLE crm_to_system AS
SELECT cp."id" AS old_id, s."id" AS system_id, s."category"
FROM "crm_platform" cp
JOIN "system" s ON s."name" = CASE cp."name"
  WHEN 'Tessitura CRM' THEN 'Tessitura'
  WHEN 'Spektrix' THEN 'Spektrix'
  ELSE cp."name"
END;

-- =============================================================================
-- Step 3 — Insert organisation_system from ticketing FKs
-- =============================================================================

INSERT INTO "organisation_system" ("id", "organisation_id", "system_id", "role", "source_reference", "note", "last_updated", "created_at")
SELECT
  gen_random_uuid()::TEXT,
  o."id",
  m.system_id,
  CASE
    WHEN m.category = 'INTEGRATED' THEN 'INTEGRATED_SUITE'::"SystemRole"
    ELSE 'PRIMARY_TICKETING'::"SystemRole"
  END,
  o."source_reference",
  NULL,
  o."last_updated",
  o."created_at"
FROM "organisation" o
JOIN tp_to_system m ON m.old_id = o.ticketing_provider_id
WHERE o.ticketing_provider_id IS NOT NULL;

-- =============================================================================
-- Step 4 — Insert organisation_system from CRM FKs (dedupe when pair already linked)
-- =============================================================================

INSERT INTO "organisation_system" ("id", "organisation_id", "system_id", "role", "source_reference", "note", "last_updated", "created_at")
SELECT
  gen_random_uuid()::TEXT,
  o."id",
  m.system_id,
  CASE
    WHEN m.category = 'INTEGRATED' THEN 'INTEGRATED_SUITE'::"SystemRole"
    ELSE 'PRIMARY_CRM'::"SystemRole"
  END,
  o."source_reference",
  NULL,
  o."last_updated",
  o."created_at"
FROM "organisation" o
JOIN crm_to_system m ON m.old_id = o.crm_platform_id
WHERE o.crm_platform_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "organisation_system" os
    WHERE os.organisation_id = o."id" AND os.system_id = m.system_id
  );

-- =============================================================================
-- Step 5 — Verify invariants (architecture-v2-delta §6.2 Step 4). Raise = rollback.
--
-- Canonical diagnostic queries (comments only — runnable checks enforce below):
--
-- SELECT count(*) FROM organisation_system os LEFT JOIN organisation o ...
-- Expected 0 orphaned organisations / systems.
--
-- Junction count formula:
-- |orgs ticketing| + |orgs crm| - |orgs where both FK map to SAME system|
--
-- (d) UK + Tessitura: enforced only when legacy organisation rows exist with
--     country = UK and Tessitura lineage (ticketing Tessitura or CRM Tessitura CRM);
--     otherwise skipped (migrate-before-seed on empty DB). See epics Story 6.2.
-- =============================================================================

DO $$
DECLARE
  orphan_org BIGINT;
  orphan_sys BIGINT;
  uk_tess BIGINT;
  expected BIGINT;
  actual BIGINT;
BEGIN
  -- (a) No link without a matching organisation
  SELECT COUNT(*) INTO orphan_org
  FROM "organisation_system" os
  LEFT JOIN "organisation" o ON o."id" = os.organisation_id
  WHERE o."id" IS NULL;

  IF orphan_org <> 0 THEN
    RAISE EXCEPTION 'migration B: orphan organisation on organisation_system rows (got %)', orphan_org;
  END IF;

  -- (b) No link without a matching system (RESTRICT-safe)
  SELECT COUNT(*) INTO orphan_sys
  FROM "organisation_system" os
  LEFT JOIN "system" s ON s."id" = os.system_id
  WHERE s."id" IS NULL;

  IF orphan_sys <> 0 THEN
    RAISE EXCEPTION 'migration B: orphan system on organisation_system rows (got %)', orphan_sys;
  END IF;

  -- (c) Pre-FK cardinality vs junction count (same-system pair subtraction via translation temps)
  SELECT (
    (SELECT COUNT(*)::BIGINT FROM "organisation" WHERE ticketing_provider_id IS NOT NULL)
    +
    (SELECT COUNT(*)::BIGINT FROM "organisation" WHERE crm_platform_id IS NOT NULL)
    -
    (
      SELECT COUNT(*)::BIGINT
      FROM "organisation" o
      INNER JOIN tp_to_system tt ON tt.old_id = o.ticketing_provider_id
      INNER JOIN crm_to_system cc ON cc.old_id = o.crm_platform_id
      WHERE o.ticketing_provider_id IS NOT NULL
        AND o.crm_platform_id IS NOT NULL
        AND tt.system_id = cc.system_id
    )
  ) INTO expected;

  SELECT COUNT(*)::BIGINT INTO actual FROM "organisation_system";

  IF actual <> expected THEN
    RAISE EXCEPTION 'migration B: junction count mismatch expected % actual %', expected, actual;
  END IF;

  -- (d) AC3 Tessitura + UK — only when legacy data contains a qualifying UK organisation
  --       (migrate runs before prisma db seed on fresh installs; unconditional check fails there).
  IF EXISTS (
    SELECT 1 FROM "organisation" o
    LEFT JOIN "ticketing_provider" tp ON tp."id" = o.ticketing_provider_id
    LEFT JOIN "crm_platform" cp ON cp."id" = o.crm_platform_id
    WHERE o."country" = 'United Kingdom'
      AND (
        tp."name" = 'Tessitura'
        OR cp."name" IN ('Tessitura CRM')
      )
  ) THEN
    SELECT COUNT(*) INTO uk_tess
    FROM "organisation_system" os
    JOIN "organisation" o ON o."id" = os.organisation_id
    JOIN "system" s ON s."id" = os.system_id
    WHERE o."country" = 'United Kingdom'
      AND s."name" = 'Tessitura';

    IF uk_tess < 1 THEN
      RAISE EXCEPTION 'migration B: AC3 Tessitura+UK invariant failed (got %)', uk_tess;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Step 6 — Drop translation temps (architecture §6.2 Step 5)
-- =============================================================================

DROP TABLE IF EXISTS tp_to_system;
DROP TABLE IF EXISTS crm_to_system;
