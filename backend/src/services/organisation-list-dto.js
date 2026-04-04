/**
 * @param {unknown} value
 * @returns {string | null} ISO 8601 or null when missing / invalid
 */
function dateTimeToIso(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

/**
 * Maps a Prisma organisation row (snake_case fields, nested relations) to the public API DTO (camelCase).
 */
function toOrganisationDto(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city ?? null,
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
    lastUpdated: dateTimeToIso(row.last_updated),
    createdAt: dateTimeToIso(row.created_at),
    updatedAt: dateTimeToIso(row.last_updated),
  };
}

/** @deprecated Prefer `toOrganisationDto`; kept for existing imports. */
const toOrganisationListDto = toOrganisationDto;

module.exports = { toOrganisationDto, toOrganisationListDto };
