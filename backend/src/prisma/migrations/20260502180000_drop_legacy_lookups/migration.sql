-- Migration C (destructive only): drop legacy ticketing_provider / crm_platform lookups and organisation FK columns.

ALTER TABLE "organisation" DROP CONSTRAINT IF EXISTS "organisation_ticketing_provider_id_fkey";
ALTER TABLE "organisation" DROP CONSTRAINT IF EXISTS "organisation_crm_platform_id_fkey";

ALTER TABLE "organisation" DROP COLUMN IF EXISTS "ticketing_provider_id";
ALTER TABLE "organisation" DROP COLUMN IF EXISTS "crm_platform_id";

DROP TABLE IF EXISTS "ticketing_provider";
DROP TABLE IF EXISTS "crm_platform";
