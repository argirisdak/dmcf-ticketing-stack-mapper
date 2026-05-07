-- Migrate System.geographic_focus from nullable text to text[].
-- Single migration with backfill: existing data is sample/demo only and the column shape
-- is the only thing changing. Any non-null single value becomes a 1-element array; null becomes {}.

ALTER TABLE "system" ADD COLUMN "geographic_focus_new" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "system"
SET "geographic_focus_new" = ARRAY["geographic_focus"]
WHERE "geographic_focus" IS NOT NULL AND "geographic_focus" <> '';

ALTER TABLE "system" DROP COLUMN "geographic_focus";
ALTER TABLE "system" RENAME COLUMN "geographic_focus_new" TO "geographic_focus";
