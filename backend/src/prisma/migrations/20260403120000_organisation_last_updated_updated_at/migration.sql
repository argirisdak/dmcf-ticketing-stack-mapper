-- Organisation: single "business" freshness column maintained by Prisma @updatedAt (see ADR-011).
-- Drops redundant updated_at; last_updated now auto-updates on every write via the client.
ALTER TABLE "organisation" DROP COLUMN "updated_at";
