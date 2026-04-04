jest.mock('../lib/prisma', () => ({
  organisation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');
const { toOrganisationListDto } = require('../services/organisation-list-dto');
const {
  getOrganisationById,
  updateOrganisation,
  listOrganisations,
} = require('../services/organisation-service');

describe('toOrganisationListDto', () => {
  it('maps Prisma snake_case row to camelCase DTO with ISO dates', () => {
    const row = {
      id: 'org-1',
      name: 'Royal Opera House',
      city: 'London',
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
    expect(dto.city).toBe('London');
    expect(dto.organisationType.name).toBe('Venue');
    expect(dto.ticketingProvider.name).toBe('Spektrix');
    expect(dto.crmPlatform).toBeNull();
    expect(dto.lastUpdated).toBe('2026-03-01T12:00:00.000Z');
    expect(dto.createdAt).toBe('2025-06-01T08:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-03-01T12:00:00.000Z');
    expect(dto.membershipCapability).toBe('YES');
    expect(dto).not.toHaveProperty('organisation_type');
    expect(dto).not.toHaveProperty('last_updated');
  });
});

describe('listOrganisations', () => {
  beforeEach(() => {
    prisma.organisation.findMany.mockReset();
    prisma.organisation.count.mockReset();
  });

  it('lists without q using empty where', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const result = await listOrganisations({ page: 1, limit: 20 });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
      }),
    );
    expect(prisma.organisation.count).toHaveBeenCalledWith({ where: {} });
  });

  it('applies OR filter across name, city, notes, and ticketing provider name', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const expectedWhere = {
      OR: [
        { name: { contains: 'spek', mode: 'insensitive' } },
        { city: { contains: 'spek', mode: 'insensitive' } },
        { notes: { contains: 'spek', mode: 'insensitive' } },
        {
          ticketing_provider: {
            is: { name: { contains: 'spek', mode: 'insensitive' } },
          },
        },
      ],
    };

    await listOrganisations({ page: 2, limit: 10, q: 'spek' });

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 10,
        take: 10,
      }),
    );
    expect(prisma.organisation.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('trims q before filtering', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    await listOrganisations({ page: 1, limit: 20, q: '  x  ' });

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([{ name: { contains: 'x', mode: 'insensitive' } }]),
        },
      }),
    );
  });

  it('combines q with country and relation filters using AND', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const qWhere = {
      OR: [
        { name: { contains: 'royal', mode: 'insensitive' } },
        { city: { contains: 'royal', mode: 'insensitive' } },
        { notes: { contains: 'royal', mode: 'insensitive' } },
        {
          ticketing_provider: {
            is: { name: { contains: 'royal', mode: 'insensitive' } },
          },
        },
      ],
    };

    await listOrganisations({
      page: 1,
      limit: 20,
      q: 'royal',
      country: 'United Kingdom',
      provider: 'Spektrix',
      type: 'Venue',
      crm: 'HubSpot',
      membership: 'YES',
      donation: 'NO',
      seating: 'UNKNOWN',
    });

    const expectedWhere = {
      AND: [
        qWhere,
        { country: 'United Kingdom' },
        { ticketing_provider: { is: { name: 'Spektrix' } } },
        { organisation_type: { is: { name: 'Venue' } } },
        { crm_platform: { is: { name: 'HubSpot' } } },
        { membership_capability: 'YES' },
        { donation_capability: 'NO' },
        { reserved_seating_capability: 'UNKNOWN' },
      ],
    };

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(prisma.organisation.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('applies only country when q omitted', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    await listOrganisations({ page: 1, limit: 20, country: 'France' });

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { country: 'France' } }),
    );
    expect(prisma.organisation.count).toHaveBeenCalledWith({
      where: { country: 'France' },
    });
  });
});

describe('getOrganisationById', () => {
  beforeEach(() => {
    prisma.organisation.findUnique.mockReset();
  });

  it('returns null when no row', async () => {
    prisma.organisation.findUnique.mockResolvedValue(null);
    await expect(getOrganisationById('550e8400-e29b-41d4-a716-446655440000')).resolves.toBeNull();
    expect(prisma.organisation.findUnique).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      include: {
        organisation_type: true,
        ticketing_provider: true,
        crm_platform: true,
      },
    });
  });

  it('returns DTO when row exists', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Hall',
      country: 'United Kingdom',
      organisation_type_id: 't1',
      ticketing_provider_id: null,
      crm_platform_id: null,
      membership_capability: 'UNKNOWN',
      donation_capability: 'YES',
      reserved_seating_capability: 'NO',
      source_reference: 'R1',
      notes: null,
      capacity: null,
      last_updated: new Date('2026-01-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      ticketing_provider: null,
      crm_platform: null,
    });
    const dto = await getOrganisationById('550e8400-e29b-41d4-a716-446655440000');
    expect(dto.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(dto.name).toBe('Test Hall');
    expect(dto.organisationType.name).toBe('Venue');
    expect(dto.ticketingProvider).toBeNull();
    expect(dto.lastUpdated).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('updateOrganisation', () => {
  beforeEach(() => {
    prisma.organisation.update.mockReset();
  });

  it('returns null on P2025 (record not found)', async () => {
    const err = Object.assign(new Error('Record not found'), { code: 'P2025' });
    prisma.organisation.update.mockRejectedValue(err);
    await expect(
      updateOrganisation('550e8400-e29b-41d4-a716-446655440000', {
        name: 'X',
        city: null,
        country: 'United Kingdom',
        organisationTypeId: 't1',
        ticketingProviderId: null,
        crmPlatformId: null,
        membershipCapability: 'YES',
        donationCapability: 'NO',
        reservedSeatingCapability: 'UNKNOWN',
        sourceReference: null,
        notes: null,
        capacity: null,
      }),
    ).resolves.toBeNull();
  });

  it('returns DTO on success', async () => {
    prisma.organisation.update.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Updated',
      city: null,
      country: 'United Kingdom',
      organisation_type_id: 't1',
      ticketing_provider_id: null,
      crm_platform_id: null,
      membership_capability: 'YES',
      donation_capability: 'NO',
      reserved_seating_capability: 'UNKNOWN',
      source_reference: null,
      notes: null,
      capacity: 100,
      last_updated: new Date('2026-02-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      ticketing_provider: null,
      crm_platform: null,
    });
    const dto = await updateOrganisation('550e8400-e29b-41d4-a716-446655440000', {
      name: 'Updated',
      city: null,
      country: 'United Kingdom',
      organisationTypeId: 't1',
      ticketingProviderId: null,
      crmPlatformId: null,
      membershipCapability: 'YES',
      donationCapability: 'NO',
      reservedSeatingCapability: 'UNKNOWN',
      sourceReference: null,
      notes: null,
      capacity: 100,
    });
    expect(dto.name).toBe('Updated');
    expect(dto.capacity).toBe(100);
    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      data: {
        name: 'Updated',
        city: null,
        country: 'United Kingdom',
        organisation_type_id: 't1',
        ticketing_provider_id: null,
        crm_platform_id: null,
        membership_capability: 'YES',
        donation_capability: 'NO',
        reserved_seating_capability: 'UNKNOWN',
        source_reference: null,
        notes: null,
        capacity: 100,
      },
      include: {
        organisation_type: true,
        ticketing_provider: true,
        crm_platform: true,
      },
    });
  });
});
