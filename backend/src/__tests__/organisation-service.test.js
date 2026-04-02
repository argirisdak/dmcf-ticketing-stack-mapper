const { toOrganisationListDto } = require('../services/organisation-list-dto');

describe('toOrganisationListDto', () => {
  it('maps Prisma snake_case row to camelCase DTO with ISO dates', () => {
    const row = {
      id: 'org-1',
      name: 'Royal Opera House',
      country: 'United Kingdom',
      organisation_type_id: 't1',
      ticketing_provider_id: 'p1',
      crm_platform_id: null,
      membership_capability: 'YES',
      donation_capability: 'NO',
      reserved_seating_capability: 'UNKNOWN',
      source_reference: 'REF-1',
      notes: null,
      capacity: 2000,
      last_updated: new Date('2026-03-01T12:00:00.000Z'),
      created_at: new Date('2025-06-01T08:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      ticketing_provider: { id: 'p1', name: 'Spektrix' },
      crm_platform: null,
    };

    const dto = toOrganisationListDto(row);
    expect(dto.organisationType.name).toBe('Venue');
    expect(dto.ticketingProvider.name).toBe('Spektrix');
    expect(dto.crmPlatform).toBeNull();
    expect(dto.lastUpdated).toBe('2026-03-01T12:00:00.000Z');
    expect(dto.createdAt).toBe('2025-06-01T08:00:00.000Z');
    expect(dto.membershipCapability).toBe('YES');
    expect(dto).not.toHaveProperty('organisation_type');
    expect(dto).not.toHaveProperty('last_updated');
  });
});
