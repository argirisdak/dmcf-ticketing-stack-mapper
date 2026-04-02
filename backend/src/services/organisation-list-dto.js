/**
 * Maps a Prisma organisation row (snake_case fields, nested relations) to the public list API DTO (camelCase).
 */
function toOrganisationListDto(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    organisationType: row.organisation_type
      ? { id: row.organisation_type.id, name: row.organisation_type.name }
      : null,
    ticketingProvider: row.ticketing_provider
      ? { id: row.ticketing_provider.id, name: row.ticketing_provider.name }
      : null,
    crmPlatform: row.crm_platform
      ? { id: row.crm_platform.id, name: row.crm_platform.name }
      : null,
    membershipCapability: row.membership_capability,
    donationCapability: row.donation_capability,
    reservedSeatingCapability: row.reserved_seating_capability,
    sourceReference: row.source_reference ?? null,
    notes: row.notes ?? null,
    capacity: row.capacity ?? null,
    lastUpdated: row.last_updated instanceof Date ? row.last_updated.toISOString() : String(row.last_updated),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

module.exports = { toOrganisationListDto };
