jest.mock('../lib/prisma', () => ({
  system: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organisationSystem: {
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const prisma = require('../lib/prisma');
const { toSystemDto, toSystemDetailDto } = require('../services/system-list-dto');
const { buildSystemListWhere, listSystems, getSystemById, createSystem, updateSystem, deleteSystem } = require('../services/system-service');

// ─── DTO Tests ────────────────────────────────────────────────────────────────

describe('toSystemDto', () => {
  const baseRow = {
    id: 'sys-1',
    name: 'Spektrix',
    vendor: 'Spektrix Ltd',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: 'UK',
    description: 'Integrated platform',
    membership_capability: 'YES',
    donation_capability: 'NO',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://spektrix.com',
    custom_attributes: [{ label: 'Size', value: 'Mid', source_reference: null }],
    last_updated: new Date('2026-04-01T00:00:00.000Z'),
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('maps all scalar fields to camelCase', () => {
    const dto = toSystemDto(baseRow);
    expect(dto.id).toBe('sys-1');
    expect(dto.name).toBe('Spektrix');
    expect(dto.vendor).toBe('Spektrix Ltd');
    expect(dto.category).toBe('INTEGRATED');
    expect(dto.deploymentModel).toBe('SAAS');
    expect(dto.pricingModel).toBe('SUBSCRIPTION');
    expect(dto.geographicFocus).toBe('UK');
    expect(dto.description).toBe('Integrated platform');
    expect(dto.membershipCapability).toBe('YES');
    expect(dto.donationCapability).toBe('NO');
    expect(dto.reservedSeatingCapability).toBe('UNKNOWN');
    expect(dto.sourceReference).toBe('https://spektrix.com');
    expect(dto.customAttributes).toEqual([{ label: 'Size', value: 'Mid', source_reference: null }]);
    expect(dto.lastUpdated).toBe('2026-04-01T00:00:00.000Z');
    expect(dto.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('exposes no snake_case keys', () => {
    const dto = toSystemDto(baseRow);
    expect(dto).not.toHaveProperty('deployment_model');
    expect(dto).not.toHaveProperty('pricing_model');
    expect(dto).not.toHaveProperty('geographic_focus');
    expect(dto).not.toHaveProperty('membership_capability');
    expect(dto).not.toHaveProperty('source_reference');
    expect(dto).not.toHaveProperty('custom_attributes');
    expect(dto).not.toHaveProperty('last_updated');
    expect(dto).not.toHaveProperty('created_at');
  });

  it('nulls nullable fields when absent', () => {
    const row = { ...baseRow, deployment_model: null, pricing_model: null, geographic_focus: null, description: null, source_reference: null, custom_attributes: null };
    const dto = toSystemDto(row);
    expect(dto.deploymentModel).toBeNull();
    expect(dto.pricingModel).toBeNull();
    expect(dto.geographicFocus).toBeNull();
    expect(dto.description).toBeNull();
    expect(dto.sourceReference).toBeNull();
    expect(dto.customAttributes).toBeNull();
  });

  it('does not include an organisations key', () => {
    const dto = toSystemDto(baseRow);
    expect(dto).not.toHaveProperty('organisations');
  });
});

describe('toSystemDetailDto', () => {
  const baseRow = {
    id: 'sys-1',
    name: 'Tessitura',
    vendor: 'Tessitura Network',
    category: 'INTEGRATED',
    deployment_model: null,
    pricing_model: null,
    geographic_focus: 'Global',
    description: null,
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'YES',
    source_reference: null,
    custom_attributes: null,
    last_updated: new Date('2026-04-01T00:00:00.000Z'),
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    organisation_systems: [
      {
        id: 'link-1',
        role: 'INTEGRATED_SUITE',
        source_reference: null,
        note: 'Migrated 2025',
        last_updated: new Date('2026-03-01T00:00:00.000Z'),
        organisation: {
          id: 'org-1',
          name: 'Royal Opera House',
          country: 'United Kingdom',
          organisation_type: { name: 'Venue' },
        },
      },
      {
        id: 'link-2',
        role: 'PRIMARY_CRM',
        source_reference: 'https://ref.example',
        note: null,
        last_updated: new Date('2026-03-15T00:00:00.000Z'),
        organisation: {
          id: 'org-2',
          name: 'Barbican',
          country: 'United Kingdom',
          organisation_type: null,
        },
      },
    ],
  };

  it('includes all scalar fields from toSystemDto', () => {
    const dto = toSystemDetailDto(baseRow);
    expect(dto.id).toBe('sys-1');
    expect(dto.name).toBe('Tessitura');
    expect(dto.category).toBe('INTEGRATED');
  });

  it('maps organisations array with junction id, role, sourceReference, note, lastUpdated, and nested org', () => {
    const dto = toSystemDetailDto(baseRow);
    expect(dto.organisations).toHaveLength(2);

    const first = dto.organisations[0];
    expect(first.id).toBe('link-1');
    expect(first.role).toBe('INTEGRATED_SUITE');
    expect(first.sourceReference).toBeNull();
    expect(first.note).toBe('Migrated 2025');
    expect(first.lastUpdated).toBe('2026-03-01T00:00:00.000Z');
    expect(first.organisation.id).toBe('org-1');
    expect(first.organisation.name).toBe('Royal Opera House');
    expect(first.organisation.country).toBe('United Kingdom');
    expect(first.organisation.type).toBe('Venue');
  });

  it('handles null organisation_type on org', () => {
    const dto = toSystemDetailDto(baseRow);
    expect(dto.organisations[1].organisation.type).toBeNull();
  });

  it('omits junction rows with a missing organisation relation', () => {
    const row = {
      ...baseRow,
      organisation_systems: [
        {
          id: 'orphan-link',
          role: 'PRIMARY_TICKETING',
          source_reference: null,
          note: null,
          last_updated: new Date('2026-03-01T00:00:00.000Z'),
          organisation: null,
        },
        baseRow.organisation_systems[0],
      ],
    };
    const dto = toSystemDetailDto(row);
    expect(dto.organisations).toHaveLength(1);
    expect(dto.organisations[0].id).toBe('link-1');
  });

  it('returns empty organisations array when organisation_systems is absent', () => {
    const row = { ...baseRow, organisation_systems: undefined };
    const dto = toSystemDetailDto(row);
    expect(dto.organisations).toEqual([]);
  });
});

// ─── buildSystemListWhere Tests ───────────────────────────────────────────────

describe('buildSystemListWhere', () => {
  it('returns {} when no filters', () => {
    expect(buildSystemListWhere({})).toEqual({});
  });

  it('builds OR clause for q', () => {
    const where = buildSystemListWhere({ q: 'spektrix' });
    expect(where).toHaveProperty('OR');
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0].name.contains).toBe('spektrix');
  });

  it('builds category IN clause', () => {
    const where = buildSystemListWhere({ categories: ['INTEGRATED', 'TICKETING'] });
    expect(where.category).toEqual({ in: ['INTEGRATED', 'TICKETING'] });
  });

  it('builds deployment_model clause', () => {
    const where = buildSystemListWhere({ deploymentModel: 'SAAS' });
    expect(where.deployment_model).toBe('SAAS');
  });

  it('builds pricing_model clause', () => {
    const where = buildSystemListWhere({ pricingModel: 'SUBSCRIPTION' });
    expect(where.pricing_model).toBe('SUBSCRIPTION');
  });

  it('builds geographic_focus clause', () => {
    const where = buildSystemListWhere({ geographicFocus: 'UK' });
    expect(where.geographic_focus).toBe('UK');
  });

  it('builds capability clauses', () => {
    const where = buildSystemListWhere({ membership: 'YES', donation: 'NO', seating: 'UNKNOWN' });
    expect(where.AND).toEqual(expect.arrayContaining([
      { membership_capability: 'YES' },
      { donation_capability: 'NO' },
      { reserved_seating_capability: 'UNKNOWN' },
    ]));
  });

  it('combines multiple filters with AND', () => {
    const where = buildSystemListWhere({
      categories: ['INTEGRATED'],
      deploymentModel: 'SAAS',
    });
    expect(where.AND).toBeDefined();
    expect(where.AND).toHaveLength(2);
  });

  it('uses the single filter directly when only one', () => {
    const where = buildSystemListWhere({ deploymentModel: 'HYBRID' });
    expect(where).toEqual({ deployment_model: 'HYBRID' });
    expect(where.AND).toBeUndefined();
  });
});

// ─── listSystems Service Tests ────────────────────────────────────────────────

describe('listSystems', () => {
  beforeEach(() => {
    prisma.system.findMany.mockReset();
    prisma.system.count.mockReset();
  });

  it('calls Prisma findMany + count with correct skip/take', async () => {
    prisma.system.findMany.mockResolvedValue([]);
    prisma.system.count.mockResolvedValue(0);

    await listSystems({ page: 2, limit: 10 });

    expect(prisma.system.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
    expect(prisma.system.count).toHaveBeenCalled();
  });

  it('returns totalPages as Math.ceil(total/limit)', async () => {
    prisma.system.findMany.mockResolvedValue([]);
    prisma.system.count.mockResolvedValue(11);

    const result = await listSystems({ page: 1, limit: 20 });
    expect(result.totalPages).toBe(1);
    expect(result.total).toBe(11);
  });

  it('maps rows through toSystemDto', async () => {
    const row = {
      id: 's1', name: 'Tessitura', vendor: 'Tessitura Network', category: 'INTEGRATED',
      deployment_model: null, pricing_model: null, geographic_focus: null, description: null,
      membership_capability: 'YES', donation_capability: 'YES', reserved_seating_capability: 'YES',
      source_reference: null, custom_attributes: null,
      last_updated: new Date('2026-04-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    prisma.system.findMany.mockResolvedValue([row]);
    prisma.system.count.mockResolvedValue(1);

    const result = await listSystems({ page: 1, limit: 20 });
    expect(result.data[0].name).toBe('Tessitura');
    expect(result.data[0]).not.toHaveProperty('last_updated');
  });

  it('does not include organisation_systems in list query', async () => {
    prisma.system.findMany.mockResolvedValue([]);
    prisma.system.count.mockResolvedValue(0);

    await listSystems({ page: 1, limit: 20 });

    const callArg = prisma.system.findMany.mock.calls[0][0];
    expect(callArg.include).toBeUndefined();
  });
});

// ─── getSystemById Service Tests ──────────────────────────────────────────────

describe('getSystemById', () => {
  beforeEach(() => {
    prisma.system.findUnique.mockReset();
  });

  it('returns null when system not found', async () => {
    prisma.system.findUnique.mockResolvedValue(null);
    const result = await getSystemById('some-id');
    expect(result).toBeNull();
  });

  it('includes organisation_systems in the query', async () => {
    prisma.system.findUnique.mockResolvedValue(null);
    await getSystemById('some-id');

    const callArg = prisma.system.findUnique.mock.calls[0][0];
    expect(callArg.include).toBeDefined();
    expect(callArg.include.organisation_systems).toBeDefined();
  });

  it('returns toSystemDetailDto shape with organisations array', async () => {
    const row = {
      id: 's1', name: 'Tessitura', vendor: 'Tessitura Network', category: 'INTEGRATED',
      deployment_model: null, pricing_model: null, geographic_focus: null, description: null,
      membership_capability: 'YES', donation_capability: 'YES', reserved_seating_capability: 'YES',
      source_reference: null, custom_attributes: null,
      last_updated: new Date('2026-04-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      organisation_systems: [],
    };
    prisma.system.findUnique.mockResolvedValue(row);

    const result = await getSystemById('s1');
    expect(result).not.toBeNull();
    expect(result.organisations).toEqual([]);
    expect(result.name).toBe('Tessitura');
  });
});

// ─── createSystem Service Tests ───────────────────────────────────────────────

const BASE_ROW = {
  id: 'new-sys-id',
  name: 'Spektrix',
  vendor: 'Spektrix Ltd',
  category: 'INTEGRATED',
  deployment_model: null,
  pricing_model: null,
  geographic_focus: null,
  description: null,
  membership_capability: 'UNKNOWN',
  donation_capability: 'UNKNOWN',
  reserved_seating_capability: 'UNKNOWN',
  source_reference: null,
  custom_attributes: null,
  last_updated: new Date('2026-04-01T00:00:00.000Z'),
  created_at: new Date('2026-04-01T00:00:00.000Z'),
};

describe('createSystem', () => {
  beforeEach(() => {
    prisma.system.create.mockReset();
  });

  it('calls prisma.system.create with correct snake_case field mapping', async () => {
    prisma.system.create.mockResolvedValue(BASE_ROW);

    await createSystem({
      name: 'Spektrix',
      vendor: 'Spektrix Ltd',
      category: 'INTEGRATED',
      deploymentModel: 'SAAS',
      membershipCapability: 'YES',
    });

    const callData = prisma.system.create.mock.calls[0][0].data;
    expect(callData.name).toBe('Spektrix');
    expect(callData.vendor).toBe('Spektrix Ltd');
    expect(callData.category).toBe('INTEGRATED');
    expect(callData.deployment_model).toBe('SAAS');
    expect(callData.membership_capability).toBe('YES');
  });

  it('returns toSystemDto-shaped result (camelCase, no organisation_systems)', async () => {
    prisma.system.create.mockResolvedValue(BASE_ROW);

    const result = await createSystem({ name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' });

    expect(result.name).toBe('Spektrix');
    expect(result.id).toBe('new-sys-id');
    expect(result).not.toHaveProperty('last_updated');
    expect(result).not.toHaveProperty('organisations');
  });

  it('does not include id or custom_attributes in the create data object', async () => {
    prisma.system.create.mockResolvedValue(BASE_ROW);

    await createSystem({ name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' });

    const callData = prisma.system.create.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('id');
    expect(callData).not.toHaveProperty('custom_attributes');
  });

  it('propagates unexpected Prisma errors (e.g. P2002)', async () => {
    const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.system.create.mockRejectedValue(p2002);

    await expect(createSystem({ name: 'Tessitura', vendor: 'Tessitura Network', category: 'INTEGRATED' }))
      .rejects.toMatchObject({ code: 'P2002' });
  });
});

// ─── updateSystem Service Tests ───────────────────────────────────────────────

describe('updateSystem', () => {
  beforeEach(() => {
    prisma.system.update.mockReset();
    prisma.system.findUnique.mockReset();
  });

  it('loads current row when payload maps to no DB fields (no-op update)', async () => {
    prisma.system.findUnique.mockResolvedValue(BASE_ROW);

    const result = await updateSystem('sys-id', {});

    expect(prisma.system.update).not.toHaveBeenCalled();
    expect(prisma.system.findUnique).toHaveBeenCalledWith({ where: { id: 'sys-id' } });
    expect(result.id).toBe(BASE_ROW.id);
    expect(result.name).toBe(BASE_ROW.name);
  });

  it('returns null on no-op update when system does not exist', async () => {
    prisma.system.findUnique.mockResolvedValue(null);

    const result = await updateSystem('sys-id', {});

    expect(prisma.system.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null on P2025 (system not found)', async () => {
    prisma.system.update.mockRejectedValue(Object.assign(new Error('Not found'), { code: 'P2025' }));

    const result = await updateSystem('some-id', { name: 'New Name' });
    expect(result).toBeNull();
  });

  it('re-throws P2002 for controller to handle', async () => {
    const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.system.update.mockRejectedValue(p2002);

    await expect(updateSystem('some-id', { name: 'Duplicate' })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('calls prisma.system.update with only the provided fields (partial update)', async () => {
    prisma.system.update.mockResolvedValue({ ...BASE_ROW, name: 'New Name' });

    await updateSystem('sys-id', { name: 'New Name' });

    const callData = prisma.system.update.mock.calls[0][0].data;
    expect(callData.name).toBe('New Name');
    expect(callData).not.toHaveProperty('vendor');
    expect(callData).not.toHaveProperty('category');
    expect(callData).not.toHaveProperty('deployment_model');
  });

  it('returns toSystemDto-shaped result on success', async () => {
    prisma.system.update.mockResolvedValue({ ...BASE_ROW, name: 'Updated' });

    const result = await updateSystem('sys-id', { name: 'Updated' });

    expect(result.name).toBe('Updated');
    expect(result).not.toHaveProperty('last_updated');
    expect(result).not.toHaveProperty('organisations');
  });

  it('maps optional enum fields to snake_case DB columns', async () => {
    prisma.system.update.mockResolvedValue(BASE_ROW);

    await updateSystem('sys-id', {
      deploymentModel: 'SAAS',
      pricingModel: 'SUBSCRIPTION',
      membershipCapability: 'YES',
    });

    const callData = prisma.system.update.mock.calls[0][0].data;
    expect(callData.deployment_model).toBe('SAAS');
    expect(callData.pricing_model).toBe('SUBSCRIPTION');
    expect(callData.membership_capability).toBe('YES');
  });
});

// ─── deleteSystem Service Tests ───────────────────────────────────────────────

describe('deleteSystem', () => {
  beforeEach(() => {
    prisma.system.delete.mockReset();
    prisma.organisationSystem.count.mockReset();
  });

  it('returns the deleted id on success', async () => {
    prisma.system.delete.mockResolvedValue({});

    const result = await deleteSystem('sys-id');
    expect(result).toBe('sys-id');
  });

  it('calls prisma.system.delete with correct where clause', async () => {
    prisma.system.delete.mockResolvedValue({});

    await deleteSystem('sys-id');

    expect(prisma.system.delete).toHaveBeenCalledWith({ where: { id: 'sys-id' } });
  });

  it('returns null on P2025 (system not found)', async () => {
    prisma.system.delete.mockRejectedValue(Object.assign(new Error('Not found'), { code: 'P2025' }));

    const result = await deleteSystem('sys-id');
    expect(result).toBeNull();
  });

  it('throws { code: SYSTEM_HAS_LINKS, linkedOrganisationCount } on P2003', async () => {
    prisma.system.delete.mockRejectedValue(Object.assign(new Error('FK constraint'), { code: 'P2003' }));
    prisma.organisationSystem.count.mockResolvedValue(4);

    await expect(deleteSystem('sys-id')).rejects.toMatchObject({
      code: 'SYSTEM_HAS_LINKS',
      linkedOrganisationCount: 4,
    });
  });

  it('counts organisation_system rows using system_id when P2003', async () => {
    prisma.system.delete.mockRejectedValue(Object.assign(new Error('FK constraint'), { code: 'P2003' }));
    prisma.organisationSystem.count.mockResolvedValue(2);

    try {
      await deleteSystem('sys-id');
    } catch (_) {}

    expect(prisma.organisationSystem.count).toHaveBeenCalledWith({ where: { system_id: 'sys-id' } });
  });

  it('re-throws unexpected errors', async () => {
    const unexpected = new Error('Connection failed');
    prisma.system.delete.mockRejectedValue(unexpected);

    await expect(deleteSystem('sys-id')).rejects.toThrow('Connection failed');
  });
});
