-- Enable pg_trgm extension for ILIKE search performance (FR6, P1)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "CapabilityState" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateTable
CREATE TABLE "organisation_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticketing_provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticketing_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "organisation_type_id" TEXT NOT NULL,
    "ticketing_provider_id" TEXT,
    "crm_platform_id" TEXT,
    "membership_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "donation_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "reserved_seating_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "source_reference" TEXT,
    "notes" TEXT,
    "capacity" INTEGER,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_type_name_key" ON "organisation_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ticketing_provider_name_key" ON "ticketing_provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_platform_name_key" ON "crm_platform"("name");

-- AddForeignKey
ALTER TABLE "organisation" ADD CONSTRAINT "organisation_organisation_type_id_fkey" FOREIGN KEY ("organisation_type_id") REFERENCES "organisation_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation" ADD CONSTRAINT "organisation_ticketing_provider_id_fkey" FOREIGN KEY ("ticketing_provider_id") REFERENCES "ticketing_provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation" ADD CONSTRAINT "organisation_crm_platform_id_fkey" FOREIGN KEY ("crm_platform_id") REFERENCES "crm_platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GIN index for text search on organisation name
CREATE INDEX IF NOT EXISTS organisation_name_trgm_idx ON organisation USING GIN (name gin_trgm_ops);
