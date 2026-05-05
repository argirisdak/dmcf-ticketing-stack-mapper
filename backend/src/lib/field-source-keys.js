/** Allow-lists for `field_sources` JSON keys (camelCase, aligned with API DTO field names). */

const SYSTEM_FIELD_SOURCE_KEYS = Object.freeze([
  'category',
  'vendor',
  'deploymentModel',
  'pricingModel',
  'geographicFocus',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'seasonSubscriptionsCapability',
  'dynamicPricingCapability',
  'multiVenueSupportCapability',
  'marketingAutomationCapability',
  'accessibilityFeaturesCapability',
]);

const ORGANISATION_FIELD_SOURCE_KEYS = Object.freeze([
  'country',
  'city',
  'organisationType',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'capacity',
]);

module.exports = { SYSTEM_FIELD_SOURCE_KEYS, ORGANISATION_FIELD_SOURCE_KEYS };
