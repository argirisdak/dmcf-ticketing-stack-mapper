-- CreateEnum
CREATE TYPE "SystemCategory" AS ENUM ('INTEGRATED', 'TICKETING', 'AUDIENCE_MANAGEMENT');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY');

-- CreateEnum
CREATE TYPE "DeploymentModel" AS ENUM ('SAAS', 'SELF_HOSTED', 'HYBRID');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('SUBSCRIPTION', 'TRANSACTION_FEE', 'LICENCE', 'HYBRID', 'UNKNOWN');

-- CreateTable
CREATE TABLE "system" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" "SystemCategory" NOT NULL,
    "deployment_model" "DeploymentModel",
    "pricing_model" "PricingModel",
    "geographic_focus" TEXT,
    "description" TEXT,
    "membership_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "donation_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "reserved_seating_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "source_reference" TEXT,
    "custom_attributes" JSONB,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_system" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "system_id" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL,
    "source_reference" TEXT,
    "note" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_system_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_name_key" ON "system"("name");

-- CreateIndex
CREATE INDEX "organisation_system_system_id_idx" ON "organisation_system"("system_id");

-- CreateIndex
CREATE INDEX "organisation_system_organisation_id_idx" ON "organisation_system"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_system_organisation_id_system_id_key" ON "organisation_system"("organisation_id", "system_id");

-- AddForeignKey
ALTER TABLE "organisation_system" ADD CONSTRAINT "organisation_system_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_system" ADD CONSTRAINT "organisation_system_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Story 6.1: GIN trigram indexes for ILIKE search on system (pg_trgm from init migration)
CREATE INDEX IF NOT EXISTS system_name_trgm_idx ON "system" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS system_vendor_trgm_idx ON "system" USING GIN ("vendor" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS system_description_trgm_idx ON "system" USING GIN ("description" gin_trgm_ops);
