-- AlterTable
ALTER TABLE "system" ADD COLUMN "season_subscriptions_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "system" ADD COLUMN "dynamic_pricing_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "system" ADD COLUMN "multi_venue_support_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "system" ADD COLUMN "marketing_automation_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "system" ADD COLUMN "accessibility_features_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';
