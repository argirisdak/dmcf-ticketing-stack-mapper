jest.mock('../lib/prisma', () => ({
  organisation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

const prisma = require('../lib/prisma');
const { toOrganisationListDto } = require('../services/organisation-list-dto');
const {
  getOrganisationById,
  updateOrganisation,
  listOrganisations,
  buildOrganisationListOrderBy,
  findSimilarOrganisations,
  escapeIlikePattern,
} = require('../services/organisation-service');

/** Mirrors `organisationInclude` in organisation-service (AC5/AC6 link ordering). */
const organisationSystemsIncludeExpectation = {
  organisation_type: true,
  systems: {
    include: {
      system: { select: { id: true, name: true, vendor: true, category: true } },
    },
    orderBy: [{ role: 'asc' }, { system: { name: 'asc' } }],
  },
};

describe('toOrganisationListDto', () => {
  it('maps Prisma snake_case row to camelCase DTO with ISO dates and systems array', () => {
    const row = {
      id: 'org-1',
      name: 'Royal Opera House',
      city: 'London',
      country: 'United Kingdom',
      organisation_type_id: 't1',
      membership_capability: 'YES',
      donation_capability: 'NO',
      reserved_seating_capability: 'UNKNOWN',
      source_reference: 'REF-1',
      notes: null,
      capacity: 2000,
      field_sources: null,
      last_updated: new Date('2026-03-01T12:00:00.000Z'),
      created_at: new Date('2025-06-01T08:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      systems: [],
    };

    const dto = toOrganisationListDto(row);
    expect(dto.city).toBe('London');
    expect(dto.organisationType.name).toBe('Venue');
    expect(dto.lastUpdated).toBe('2026-03-01T12:00:00.000Z');
    expect(dto.createdAt).toBe('2025-06-01T08:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-03-01T12:00:00.000Z');
    expect(dto.membershipCapability).toBe('YES');
    expect(dto.fieldSources).toBeNull();
    expect(dto.systems).toEqual([]);
    expect(dto).not.toHaveProperty('ticketingProvider');
    expect(dto).not.toHaveProperty('crmPlatform');
    expect(dto).not.toHaveProperty('organisation_type');
    expect(dto).not.toHaveProperty('last_updated');
  });

  it('maps embedded systems links using toLinkDto shape', () => {
    const row = {
      id: 'org-2',
      name: 'Barbican',
      city: 'London',
      country: 'United Kingdom',
      organisation_type_id: 't1',
      membership_capability: 'UNKNOWN',
      donation_capability: 'UNKNOWN',
      reserved_seating_capability: 'YES',
      source_reference: null,
      notes: null,
      capacity: null,
      last_updated: new Date('2026-04-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      systems: [
        {
          id: 'link-1',
          role: 'PRIMARY_TICKETING',
          source_reference: 'https://example.com',
          note: 'Main system',
          last_updated: new Date('2026-04-01T00:00:00.000Z'),
          system: { id: 'sys-1', name: 'Tessitura', vendor: 'Tessitura Network', category: 'INTEGRATED' },
        },
      ],
    };

    const dto = toOrganisationListDto(row);
    expect(dto.systems).toHaveLength(1);
    expect(dto.systems[0]).toEqual({
      id: 'link-1',
      role: 'PRIMARY_TICKETING',
      sourceReference: 'https://example.com',
      note: 'Main system',
      lastUpdated: '2026-04-01T00:00:00.000Z',
      system: { id: 'sys-1', name: 'Tessitura', vendor: 'Tessitura Network', category: 'INTEGRATED' },
    });
  });

  it('returns empty systems array when systems is absent from row (defensive)', () => {
    const row = {
      id: 'org-3',
      name: 'Test',
      city: null,
      country: 'France',
      organisation_type_id: 't1',
      membership_capability: 'UNKNOWN',
      donation_capability: 'UNKNOWN',
      reserved_seating_capability: 'UNKNOWN',
      source_reference: null,
      notes: null,
      capacity: null,
      last_updated: new Date('2026-01-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      // systems absent — simulates old code path without include
    };
    const dto = toOrganisationListDto(row);
    expect(dto.systems).toEqual([]);
  });
});

describe('buildOrganisationListOrderBy', () => {
  it.each([
    ['name', 'asc', { name: 'asc' }],
    ['country', 'desc', { country: 'desc' }],
    ['lastUpdated', 'asc', { last_updated: 'asc' }],
    ['capacity', 'desc', { capacity: 'desc' }],
    ['organisationType', 'asc', { organisation_type: { name: 'asc' } }],
  ])('maps %s + %s', (sortKey, order, expected) => {
    expect(buildOrganisationListOrderBy(sortKey, order)).toEqual(expected);
  });

  it('falls back to name asc for unknown key', () => {
    expect(buildOrganisationListOrderBy('unknown', 'desc')).toEqual({ name: 'asc' });
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
        include: organisationSystemsIncludeExpectation,
      }),
    );
    expect(prisma.organisation.count).toHaveBeenCalledWith({ where: {} });
  });

  it('applies orderBy from sort and order params', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    await listOrganisations({ page: 1, limit: 20, sort: 'organisationType', order: 'desc' });

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { organisation_type: { name: 'desc' } },
      }),
    );
  });

  it('composes q, country filter, and sort (AC6-style)', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    await listOrganisations({
      page: 1,
      limit: 20,
      q: 'opera',
      country: 'United Kingdom',
      sort: 'lastUpdated',
      order: 'desc',
    });

    const expectedWhere = {
      AND: [
        {
          OR: [
            { name: { contains: 'opera', mode: 'insensitive' } },
            { city: { contains: 'opera', mode: 'insensitive' } },
            { notes: { contains: 'opera', mode: 'insensitive' } },
          ],
        },
        { country: 'United Kingdom' },
      ],
    };

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: { last_updated: 'desc' },
      }),
    );
    expect(prisma.organisation.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('applies OR filter across name, city, and notes only (ticketing provider removed)', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const expectedWhere = {
      OR: [
        { name: { contains: 'spek', mode: 'insensitive' } },
        { city: { contains: 'spek', mode: 'insensitive' } },
        { notes: { contains: 'spek', mode: 'insensitive' } },
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

  it('combines q with country and type filters using AND', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const qWhere = {
      OR: [
        { name: { contains: 'royal', mode: 'insensitive' } },
        { city: { contains: 'royal', mode: 'insensitive' } },
        { notes: { contains: 'royal', mode: 'insensitive' } },
      ],
    };

    await listOrganisations({
      page: 1,
      limit: 20,
      q: 'royal',
      country: 'United Kingdom',
      type: 'Venue',
      membership: 'YES',
      donation: 'NO',
      seating: 'UNKNOWN',
    });

    const expectedWhere = {
      AND: [
        qWhere,
        { country: 'United Kingdom' },
        { organisation_type: { is: { name: 'Venue' } } },
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

  it('applies system filter using systems.some with system_id', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const sysUuid = '550e8400-e29b-41d4-a716-446655440000';
    await listOrganisations({ page: 1, limit: 20, system: sysUuid });

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { systems: { some: { system_id: sysUuid } } },
      }),
    );
  });

  it('applies system filter with system_role when both provided', async () => {
    prisma.organisation.findMany.mockResolvedValue([]);
    prisma.organisation.count.mockResolvedValue(0);

    const sysUuid = '550e8400-e29b-41d4-a716-446655440000';
    await listOrganisations({ page: 1, limit: 20, system: sysUuid, system_role: 'PRIMARY_TICKETING' });

    expect(prisma.organisation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { systems: { some: { system_id: sysUuid, role: 'PRIMARY_TICKETING' } } },
      }),
    );
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
      include: organisationSystemsIncludeExpectation,
    });
  });

  it('returns DTO when row exists with systems array', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Hall',
      country: 'United Kingdom',
      city: null,
      organisation_type_id: 't1',
      membership_capability: 'UNKNOWN',
      donation_capability: 'YES',
      reserved_seating_capability: 'NO',
      source_reference: 'R1',
      notes: null,
      capacity: null,
      last_updated: new Date('2026-01-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      systems: [],
    });
    const dto = await getOrganisationById('550e8400-e29b-41d4-a716-446655440000');
    expect(dto.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(dto.name).toBe('Test Hall');
    expect(dto.organisationType.name).toBe('Venue');
    expect(dto.systems).toEqual([]);
    expect(dto).not.toHaveProperty('ticketingProvider');
    expect(dto).not.toHaveProperty('crmPlatform');
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
        membershipCapability: 'YES',
        donationCapability: 'NO',
        reservedSeatingCapability: 'UNKNOWN',
        sourceReference: null,
        notes: null,
        capacity: null,
      }),
    ).resolves.toBeNull();
  });

  it('returns DTO on success and does NOT include ticketing_provider_id or crm_platform_id in Prisma data', async () => {
    prisma.organisation.update.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Updated',
      city: null,
      country: 'United Kingdom',
      organisation_type_id: 't1',
      membership_capability: 'YES',
      donation_capability: 'NO',
      reserved_seating_capability: 'UNKNOWN',
      source_reference: null,
      notes: null,
      capacity: 100,
      last_updated: new Date('2026-02-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_type: { id: 't1', name: 'Venue' },
      systems: [],
    });
    const dto = await updateOrganisation('550e8400-e29b-41d4-a716-446655440000', {
      name: 'Updated',
      city: null,
      country: 'United Kingdom',
      organisationTypeId: 't1',
      membershipCapability: 'YES',
      donationCapability: 'NO',
      reservedSeatingCapability: 'UNKNOWN',
      sourceReference: null,
      notes: null,
      capacity: 100,
    });
    expect(dto.name).toBe('Updated');
    expect(dto.capacity).toBe(100);
    expect(dto.systems).toEqual([]);
    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      data: {
        name: 'Updated',
        city: null,
        country: 'United Kingdom',
        organisation_type_id: 't1',
        membership_capability: 'YES',
        donation_capability: 'NO',
        reserved_seating_capability: 'UNKNOWN',
        source_reference: null,
        notes: null,
        capacity: 100,
      },
      include: organisationSystemsIncludeExpectation,
    });
    // Confirm legacy FK fields are NOT in the Prisma data call
    const dataArg = prisma.organisation.update.mock.calls[0][0].data;
    expect(dataArg).not.toHaveProperty('ticketing_provider_id');
    expect(dataArg).not.toHaveProperty('crm_platform_id');
  });
});

describe('escapeIlikePattern', () => {
  it('escapes backslash, percent, and underscore for ILIKE ESCAPE', () => {
    expect(escapeIlikePattern('a%b_c')).toBe('a\\%b\\_c');
    expect(escapeIlikePattern('x\\y')).toBe('x\\\\y');
  });
});

describe('findSimilarOrganisations', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  it('maps raw rows to minimal camelCase DTOs', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { id: 'a', name: 'Royal Opera House', city: 'London', country: 'United Kingdom' },
    ]);
    const out = await findSimilarOrganisations('Royal Opera', null);
    expect(out).toEqual([{ id: 'a', name: 'Royal Opera House', city: 'London', country: 'United Kingdom' }]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when query returns no rows', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    const out = await findSimilarOrganisations('zzzznonexistent', null);
    expect(out).toEqual([]);
  });
});
