/**
 * HTTP stack tests: real controller → service → DTO with Prisma shimmed to in-memory
 * seed-catalog rows (Story 7.1 Testing Requirements without a live Postgres).
 */
jest.mock('../lib/prisma', () => ({
  system: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const { SYSTEM_SEED_DEFINITIONS } = require('../prisma/system-seed-catalog');

function deterministicSystemId(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

const prismaRows = SYSTEM_SEED_DEFINITIONS.map((def, i) => ({
  id: deterministicSystemId(i),
  name: def.name,
  vendor: def.vendor,
  category: def.category,
  deployment_model: def.deployment_model,
  pricing_model: def.pricing_model,
  geographic_focus: def.geographic_focus,
  description: def.description,
  membership_capability: def.membership_capability,
  donation_capability: def.donation_capability,
  reserved_seating_capability: def.reserved_seating_capability,
  season_subscriptions_capability: def.season_subscriptions_capability,
  dynamic_pricing_capability: def.dynamic_pricing_capability,
  multi_venue_support_capability: def.multi_venue_support_capability,
  marketing_automation_capability: def.marketing_automation_capability,
  accessibility_features_capability: def.accessibility_features_capability,
  source_reference: def.source_reference,
  custom_attributes: def.custom_attributes,
  last_updated: new Date('2026-04-01T00:00:00.000Z'),
  created_at: new Date('2026-01-01T00:00:00.000Z'),
}));

const SPEKTRIX_ID = deterministicSystemId(1);

function matchesWhere(row, where) {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.AND) return where.AND.every(part => matchesWhere(row, part));
  if (where.OR) return where.OR.some(part => matchesWhere(row, part));

  const checks = [];

  if (where.name?.contains) {
    const term = String(where.name.contains).toLowerCase();
    checks.push(() => row.name.toLowerCase().includes(term));
  }
  if (where.vendor?.contains) {
    const term = String(where.vendor.contains).toLowerCase();
    checks.push(() => row.vendor.toLowerCase().includes(term));
  }
  if (where.description?.contains) {
    const term = String(where.description.contains).toLowerCase();
    const d = row.description || '';
    checks.push(() => d.toLowerCase().includes(term));
  }
  if (where.category?.in) {
    checks.push(() => where.category.in.includes(row.category));
  }

  const eqFields = [
    'deployment_model',
    'pricing_model',
    'membership_capability',
    'donation_capability',
    'reserved_seating_capability',
    'season_subscriptions_capability',
    'dynamic_pricing_capability',
    'multi_venue_support_capability',
    'marketing_automation_capability',
    'accessibility_features_capability',
  ];
  for (const f of eqFields) {
    if (where[f] !== undefined) {
      checks.push(() => row[f] === where[f]);
    }
  }

  // geographic_focus is an array column; service uses { hasSome: [...] } semantics.
  if (where.geographic_focus?.hasSome) {
    const wanted = where.geographic_focus.hasSome;
    const have = Array.isArray(row.geographic_focus) ? row.geographic_focus : [];
    checks.push(() => wanted.some((w) => have.includes(w)));
  }

  if (checks.length === 0) return true;
  return checks.every(c => c());
}

function filterRows(where) {
  return prismaRows.filter(r => matchesWhere(r, where)).sort((a, b) => a.name.localeCompare(b.name));
}

const prisma = require('../lib/prisma');
const request = require('supertest');
const app = require('../app');

beforeAll(() => {
  prisma.system.findMany.mockImplementation(async ({ where, skip, take }) => {
    const filtered = filterRows(where);
    return filtered.slice(skip, skip + take);
  });

  prisma.system.count.mockImplementation(async ({ where }) => filterRows(where).length);

  prisma.system.findUnique.mockImplementation(async ({ where, include }) => {
    const row = prismaRows.find(r => r.id === where.id);
    if (!row) return null;
    if (!include?.organisation_systems) return row;

    if (where.id !== SPEKTRIX_ID) {
      return { ...row, organisation_systems: [] };
    }

    const links = [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        role: 'PRIMARY_TICKETING',
        source_reference: null,
        note: null,
        last_updated: new Date('2026-01-03T00:00:00.000Z'),
        organisation: {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          name: 'Zebra Hall',
          country: 'United Kingdom',
          organisation_type: { name: 'Venue' },
        },
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        role: 'PRIMARY_TICKETING',
        source_reference: null,
        note: null,
        last_updated: new Date('2026-01-02T00:00:00.000Z'),
        organisation: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          name: 'Abbey Theatre',
          country: 'United Kingdom',
          organisation_type: { name: 'Venue' },
        },
      },
    ];

    links.sort((a, b) => {
      if (a.role !== b.role) return String(a.role).localeCompare(String(b.role));
      return a.organisation.name.localeCompare(b.organisation.name);
    });

    return { ...row, organisation_systems: links };
  });
});

describe('GET /api/systems — stack (real service, shim Prisma)', () => {
  it('returns 11 systems with correct envelope when no params', async () => {
    const res = await request(app).get('/api/systems').query({ limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta.total).toBe(11);
    expect(res.body.data).toHaveLength(11);
  });

  it('finds Spektrix via q=spektrix', async () => {
    const res = await request(app).get('/api/systems').query({ q: 'spektrix', limit: 100 });
    expect(res.status).toBe(200);
    const names = res.body.data.map(s => s.name);
    expect(names).toContain('Spektrix');
  });

  it('filters INTEGRATED and TICKETING categories (8 systems)', async () => {
    const res = await request(app).get(
      '/api/systems?category=INTEGRATED&category=TICKETING&limit=100'
    );
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(8);
  });
});

describe('GET /api/systems/:id — stack', () => {
  it('returns adoption evidence sorted by role then organisation name', async () => {
    const res = await request(app).get(`/api/systems/${SPEKTRIX_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.organisations).toHaveLength(2);
    expect(res.body.data.organisations[0].organisation.name).toBe('Abbey Theatre');
    expect(res.body.data.organisations[1].organisation.name).toBe('Zebra Hall');
  });

  it('returns 404 for a valid UUID not in the shim store', async () => {
    const res = await request(app).get('/api/systems/ffffffff-ffff-4fff-8fff-ffffffffffff');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('System not found');
  });
});
