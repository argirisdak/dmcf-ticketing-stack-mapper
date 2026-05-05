function dateTimeToIso(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

function toSystemDto(row) {
  return {
    id: row.id,
    name: row.name,
    vendor: row.vendor,
    category: row.category,
    deploymentModel: row.deployment_model ?? null,
    pricingModel: row.pricing_model ?? null,
    geographicFocus: row.geographic_focus ?? null,
    description: row.description ?? null,
    membershipCapability: row.membership_capability,
    donationCapability: row.donation_capability,
    reservedSeatingCapability: row.reserved_seating_capability,
    seasonSubscriptionsCapability: row.season_subscriptions_capability,
    dynamicPricingCapability: row.dynamic_pricing_capability,
    multiVenueSupportCapability: row.multi_venue_support_capability,
    marketingAutomationCapability: row.marketing_automation_capability,
    accessibilityFeaturesCapability: row.accessibility_features_capability,
    sourceReference: row.source_reference ?? null,
    fieldSources: row.field_sources ?? null,
    customAttributes: row.custom_attributes ?? null,
    lastUpdated: dateTimeToIso(row.last_updated),
    createdAt: dateTimeToIso(row.created_at),
  };
}

function toSystemDetailDto(row) {
  return {
    ...toSystemDto(row),
    organisations: (row.organisation_systems ?? [])
      .filter(link => link.organisation != null)
      .map(link => ({
      id: link.id,
      role: link.role,
      sourceReference: link.source_reference ?? null,
      note: link.note ?? null,
      lastUpdated: dateTimeToIso(link.last_updated),
      organisation: {
        id: link.organisation.id,
        name: link.organisation.name,
        type: link.organisation.organisation_type?.name ?? null,
        country: link.organisation.country,
      },
    })),
  };
}

module.exports = { toSystemDto, toSystemDetailDto, dateTimeToIso };
