-- Story 3.1: optional city for search; GIN trigram indexes for ILIKE search paths (organisation.city, organisation.notes, ticketing_provider.name).
-- organisation.name already has organisation_name_trgm_idx (init migration).
ALTER TABLE "organisation" ADD COLUMN "city" TEXT;

CREATE INDEX IF NOT EXISTS organisation_city_trgm_idx ON "organisation" USING GIN ("city" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS organisation_notes_trgm_idx ON "organisation" USING GIN ("notes" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ticketing_provider_name_trgm_idx ON "ticketing_provider" USING GIN ("name" gin_trgm_ops);
