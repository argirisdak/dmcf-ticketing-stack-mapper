const mockListOrganisations = jest.fn();
const mockCreateOrganisation = jest.fn();
const mockGetOrganisationById = jest.fn();
const mockUpdateOrganisation = jest.fn();
const mockDeleteOrganisation = jest.fn();
const mockFindSimilarOrganisations = jest.fn();

jest.mock('../lib/prisma', () => ({
  organisationType: { findMany: jest.fn(), findUnique: jest.fn() },
  organisation: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $disconnect: jest.fn(),
}));

jest.mock('../services/organisation-service', () => ({
  listOrganisations: (...args) => mockListOrganisations(...args),
  createOrganisation: (...args) => mockCreateOrganisation(...args),
  getOrganisationById: (...args) => mockGetOrganisationById(...args),
  updateOrganisation: (...args) => mockUpdateOrganisation(...args),
  deleteOrganisation: (...args) => mockDeleteOrganisation(...args),
  findSimilarOrganisations: (...args) => mockFindSimilarOrganisations(...args),
}));

const request = require('supertest');
const prisma = require('../lib/prisma');
const app = require('../app');

const validCreateBody = {
  name: 'Acme Hall',
  country: 'United Kingdom',
  organisationTypeId: 'type-uuid-1',
  membershipCapability: 'YES',
  donationCapability: 'NO',
  reservedSeatingCapability: 'UNKNOWN',
};

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('GET /api/organisations', () => {
  beforeEach(() => {
    mockListOrganisations.mockReset();
  });

  it('returns HTTP 200 with pagination meta', async () => {
    mockListOrganisations.mockResolvedValue({
      data: [
        {
          id: 'org-1',
          name: 'Royal Opera House',
          city: null,
          country: 'United Kingdom',
          organisationType: { id: 't1', name: 'Venue' },
          membershipCapability: 'YES',
          donationCapability: 'NO',
          reservedSeatingCapability: 'UNKNOWN',
          sourceReference: 'REF-1',
          notes: null,
          capacity: 2000,
          fieldSources: null,
          lastUpdated: '2026-03-01T12:00:00.000Z',
          createdAt: '2025-06-01T08:00:00.000Z',
          updatedAt: '2026-03-01T12:00:00.000Z',
          systems: [],
        },
      ],
      total: 47,
      totalPages: 3,
    });

    const res = await request(app).get('/api/organisations?page=1&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 47, totalPages: 3 });
    expect(res.body.data).toHaveLength(1);
  });

  it('serialises list items with systems array and no legacy ticketingProvider/crmPlatform', async () => {
    mockListOrganisations.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'A',
          city: null,
          country: 'GB',
          organisationType: { id: 't', name: 'Festival' },
          membershipCapability: 'UNKNOWN',
          donationCapability: 'YES',
          reservedSeatingCapability: 'NO',
          sourceReference: null,
          notes: null,
          capacity: null,
          fieldSources: null,
          lastUpdated: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          systems: [],
        },
      ],
      total: 1,
      totalPages: 1,
    });

    const res = await request(app).get('/api/organisations');
    const item = res.body.data[0];
    expect(item).toHaveProperty('organisationType');
    expect(item).toHaveProperty('systems');
    expect(item).toHaveProperty('lastUpdated');
    expect(item).toHaveProperty('createdAt');
    expect(item).toHaveProperty('updatedAt');
    expect(item).toHaveProperty('membershipCapability');
    expect(item).not.toHaveProperty('ticketingProvider');
    expect(item).not.toHaveProperty('crmPlatform');
    expect(item).not.toHaveProperty('organisation_type');
    expect(item).not.toHaveProperty('last_updated');
    expect(item).not.toHaveProperty('membership_capability');
  });

  it('returns empty data array when catalogue is empty', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    const res = await request(app).get('/api/organisations');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.meta.totalPages).toBe(0);
  });

  it('defaults page to 1 and limit to 20 when omitted', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, sort: 'name', order: 'asc' });
  });

  it('uses first value when page or limit query keys are repeated', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?page=2&page=99&limit=10&limit=50');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 2, limit: 10, sort: 'name', order: 'asc' });
  });

  it('forwards trimmed q to the service when provided', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?q=  Opera  ');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'Opera', sort: 'name', order: 'asc' });
  });

  it('omits q when query is absent or whitespace-only', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?q=%20%09');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, sort: 'name', order: 'asc' });
  });

  it('uses first value when q query key is repeated', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?q=foo&q=bar');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'foo', sort: 'name', order: 'asc' });
  });

  it('returns 400 for invalid page', async () => {
    const res = await request(app).get('/api/organisations?page=0');
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.fields.some((f) => f.field === 'page')).toBe(true);
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 for non-integer page', async () => {
    const res = await request(app).get('/api/organisations?page=2.5');
    expect(res.status).toBe(400);
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 for limit above max', async () => {
    const res = await request(app).get('/api/organisations?limit=101');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'limit')).toBe(true);
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 500 envelope on unexpected service error', async () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockListOrganisations.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).get('/api/organisations');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('forwards v2 filter query params to the service', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get(
      `/api/organisations?page=2&limit=10&q=royal&country=United+Kingdom&type=Venue&system=${VALID_UUID}&system_role=PRIMARY_TICKETING&membership=YES&donation=NO&seating=UNKNOWN`,
    );
    expect(mockListOrganisations).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'royal',
      country: 'United Kingdom',
      type: 'Venue',
      system: VALID_UUID,
      system_role: 'PRIMARY_TICKETING',
      membership: 'YES',
      donation: 'NO',
      seating: 'UNKNOWN',
      sort: 'name',
      order: 'asc',
    });
  });

  it('returns 400 for invalid country on list', async () => {
    const res = await request(app).get('/api/organisations?country=Atlantis');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'country')).toBe(true);
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid capability on list', async () => {
    const res = await request(app).get('/api/organisations?membership=MAYBE');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'membership')).toBe(true);
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('ignores whitespace-only capability params on list (no filter)', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });
    const res = await request(app).get('/api/organisations?membership=%20%20&donation=%09');
    expect(res.status).toBe(200);
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, sort: 'name', order: 'asc' });
  });

  // v2: reject deprecated provider and crm params
  it('returns 400 when provider param is passed', async () => {
    const res = await request(app).get('/api/organisations?provider=Tessitura');
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'provider', message: 'Unknown filter' }),
      ]),
    );
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 when crm param is passed', async () => {
    const res = await request(app).get('/api/organisations?crm=Salesforce');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'crm', message: 'Unknown filter' }),
      ]),
    );
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 when both provider and crm are passed', async () => {
    const res = await request(app).get('/api/organisations?provider=Spektrix&crm=HubSpot');
    expect(res.status).toBe(400);
    const fieldNames = res.body.error.fields.map((f) => f.field);
    expect(fieldNames).toContain('provider');
    expect(fieldNames).toContain('crm');
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  // v2: system filter
  it('accepts valid system UUID and forwards to service', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });
    const res = await request(app).get(`/api/organisations?system=${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(mockListOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ system: VALID_UUID }),
    );
  });

  it('returns 400 when system param is not a valid UUID', async () => {
    const res = await request(app).get('/api/organisations?system=not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'system' }),
      ]),
    );
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 when system_role is passed without system', async () => {
    const res = await request(app).get('/api/organisations?system_role=PRIMARY_TICKETING');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'system_role',
          message: 'Provide a system filter to use a role sub-filter',
        }),
      ]),
    );
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('accepts system+system_role and forwards both to service', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });
    const res = await request(app).get(
      `/api/organisations?system=${VALID_UUID}&system_role=INTEGRATED_SUITE`,
    );
    expect(res.status).toBe(200);
    expect(mockListOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ system: VALID_UUID, system_role: 'INTEGRATED_SUITE' }),
    );
  });

  it('returns 400 for invalid system_role value when system is valid', async () => {
    const res = await request(app).get(
      `/api/organisations?system=${VALID_UUID}&system_role=NOT_A_ROLE`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'system_role' })]),
    );
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid sort with fields message listing allow-list', async () => {
    const res = await request(app).get('/api/organisations?sort=notAField');
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    const sortErr = res.body.error.fields.find((f) => f.field === 'sort');
    expect(sortErr).toBeDefined();
    expect(sortErr.message).toMatch(/^Sort field must be one of: /);
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid order', async () => {
    const res = await request(app).get('/api/organisations?order=upward');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'order', message: 'Order must be asc or desc' })]),
    );
    expect(mockListOrganisations).not.toHaveBeenCalled();
  });

  it('forwards validated sort and order to the service', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });
    const res = await request(app).get('/api/organisations?sort=lastUpdated&order=DESC&country=United+Kingdom');
    expect(res.status).toBe(200);
    expect(mockListOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: 'lastUpdated',
        order: 'desc',
        country: 'United Kingdom',
        page: 1,
        limit: 20,
      }),
    );
  });
});

const sampleDto = {
  id: VALID_UUID,
  name: 'Royal Opera House',
  city: null,
  country: 'United Kingdom',
  organisationType: { id: 't1', name: 'Venue' },
  membershipCapability: 'YES',
  donationCapability: 'NO',
  reservedSeatingCapability: 'UNKNOWN',
  sourceReference: 'SRC-REF-1',
  notes: 'Stage door on Bow Street',
  capacity: 2256,
  fieldSources: null,
  lastUpdated: '2026-03-01T12:00:00.000Z',
  createdAt: '2025-06-01T08:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
  systems: [],
};

describe('GET /api/organisations/:id', () => {
  beforeEach(() => {
    mockGetOrganisationById.mockReset();
  });

  it('returns 200 with camelCase data and meta null', async () => {
    mockGetOrganisationById.mockResolvedValue(sampleDto);
    const res = await request(app).get(`/api/organisations/${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: sampleDto, error: null, meta: null });
    expect(mockGetOrganisationById).toHaveBeenCalledWith(VALID_UUID);
  });

  it('returns 404 when organisation is missing', async () => {
    mockGetOrganisationById.mockResolvedValue(null);
    const res = await request(app).get(`/api/organisations/${VALID_UUID}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'Organisation not found', fields: [] },
      meta: null,
    });
  });

  it('returns 404 for malformed id (not a UUID)', async () => {
    const res = await request(app).get('/api/organisations/not-a-uuid');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Organisation not found');
    expect(mockGetOrganisationById).not.toHaveBeenCalled();
  });

  it('returns 500 envelope on unexpected service error', async () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetOrganisationById.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).get(`/api/organisations/${VALID_UUID}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
    logSpy.mockRestore();
  });
});

describe('GET /api/organisations/check-similar', () => {
  beforeEach(() => {
    mockFindSimilarOrganisations.mockReset();
    mockGetOrganisationById.mockReset();
  });

  it('returns 200 with minimal DTO rows and meta null', async () => {
    mockFindSimilarOrganisations.mockResolvedValue([
      { id: VALID_UUID, name: 'Royal Opera House', city: 'London', country: 'United Kingdom' },
    ]);
    const res = await request(app).get('/api/organisations/check-similar').query({ name: 'Royal Opera' });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.data).toEqual([
      { id: VALID_UUID, name: 'Royal Opera House', city: 'London', country: 'United Kingdom' },
    ]);
    expect(mockFindSimilarOrganisations).toHaveBeenCalledWith('Royal Opera', null);
    const row = res.body.data[0];
    expect(Object.keys(row).sort()).toEqual(['city', 'country', 'id', 'name']);
  });

  it('returns 400 when name is one character after trim', async () => {
    const res = await request(app).get('/api/organisations/check-similar').query({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.fields).toEqual([{ field: 'name', message: 'Name must be at least 2 characters.' }]);
    expect(mockFindSimilarOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).get('/api/organisations/check-similar');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0]).toEqual({
      field: 'name',
      message: 'Name must be at least 2 characters.',
    });
    expect(mockFindSimilarOrganisations).not.toHaveBeenCalled();
  });

  it('returns 400 when excludeId is not a UUID', async () => {
    const res = await request(app)
      .get('/api/organisations/check-similar')
      .query({ name: 'Royal', excludeId: 'not-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual([{ field: 'excludeId', message: 'Must be a valid UUID.' }]);
    expect(mockFindSimilarOrganisations).not.toHaveBeenCalled();
  });

  it('passes excludeId to the service when valid', async () => {
    mockFindSimilarOrganisations.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/organisations/check-similar')
      .query({ name: 'Royal', excludeId: VALID_UUID });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(mockFindSimilarOrganisations).toHaveBeenCalledWith('Royal', VALID_UUID);
  });

  it('treats whitespace-only excludeId as omitted', async () => {
    mockFindSimilarOrganisations.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/organisations/check-similar')
      .query({ name: 'Royal', excludeId: '   \t  ' });
    expect(res.status).toBe(200);
    expect(mockFindSimilarOrganisations).toHaveBeenCalledWith('Royal', null);
  });

  it('does not treat check-similar as organisation id', async () => {
    mockFindSimilarOrganisations.mockResolvedValue([]);
    const res = await request(app).get('/api/organisations/check-similar').query({ name: 'Theatre' });
    expect(res.status).toBe(200);
    expect(mockGetOrganisationById).not.toHaveBeenCalled();
  });
});

describe('POST /api/organisations', () => {
  beforeEach(() => {
    mockCreateOrganisation.mockReset();
    prisma.organisationType.findUnique.mockReset();
    prisma.organisationType.findUnique.mockResolvedValue({ id: 'type-uuid-1', name: 'Venue' });
  });

  it('returns 201 with camelCase data envelope', async () => {
    mockCreateOrganisation.mockResolvedValue({
      id: 'new-org-id',
      name: 'Acme Hall',
      city: null,
      country: 'United Kingdom',
      organisationType: { id: 'type-uuid-1', name: 'Venue' },
      membershipCapability: 'YES',
      donationCapability: 'NO',
      reservedSeatingCapability: 'UNKNOWN',
      sourceReference: null,
      notes: null,
      capacity: null,
      fieldSources: null,
      lastUpdated: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
      updatedAt: '2026-04-03T10:00:00.000Z',
      systems: [],
    });

    const res = await request(app).post('/api/organisations').send(validCreateBody);
    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.data).toMatchObject({
      id: 'new-org-id',
      name: 'Acme Hall',
      organisationType: { id: 'type-uuid-1', name: 'Venue' },
    });
    expect(res.body.data).not.toHaveProperty('organisation_type');
    expect(mockCreateOrganisation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Hall',
        city: null,
        country: 'United Kingdom',
        organisationTypeId: 'type-uuid-1',
      }),
    );
    // Confirm legacy FK fields are not in the service call
    const payload = mockCreateOrganisation.mock.calls[0][0];
    expect(payload).not.toHaveProperty('ticketingProviderId');
    expect(payload).not.toHaveProperty('crmPlatformId');
  });

  it('returns 400 when name is missing', async () => {
    const { name: _n, ...rest } = validCreateBody;
    const res = await request(app).post('/api/organisations').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'name')).toBe(true);
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when country is missing', async () => {
    const { country: _c, ...rest } = validCreateBody;
    const res = await request(app).post('/api/organisations').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'country')).toBe(true);
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when organisationTypeId is missing', async () => {
    const { organisationTypeId: _t, ...rest } = validCreateBody;
    const res = await request(app).post('/api/organisations').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'organisationTypeId')).toBe(true);
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 for unknown country string', async () => {
    const res = await request(app).post('/api/organisations').send({ ...validCreateBody, country: 'Atlantis' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'country')).toBe(true);
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid capability value', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, membershipCapability: 'MAYBE' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'membershipCapability')).toBe(true);
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 500 envelope on unexpected service error', async () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateOrganisation.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).post('/api/organisations').send(validCreateBody);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
    logSpy.mockRestore();
  });

  it('returns 409 when create hits composite (name, city, country) unique (P2002 meta target columns)', async () => {
    const body = { ...validCreateBody, city: 'London' };
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['name', 'city', 'country'] },
    });
    const created = {
      id: 'first-org-id',
      name: 'Acme Hall',
      city: 'London',
      country: 'United Kingdom',
      organisationType: { id: 'type-uuid-1', name: 'Venue' },
      membershipCapability: 'YES',
      donationCapability: 'NO',
      reservedSeatingCapability: 'UNKNOWN',
      sourceReference: null,
      notes: null,
      capacity: null,
      fieldSources: null,
      lastUpdated: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
      updatedAt: '2026-04-03T10:00:00.000Z',
      systems: [],
    };
    mockCreateOrganisation.mockResolvedValueOnce(created).mockRejectedValueOnce(p2002);

    await request(app).post('/api/organisations').send(body);
    const res = await request(app).post('/api/organisations').send(body);

    expect(res.status).toBe(409);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.message).toContain('London');
    expect(res.body.error.message).toContain('United Kingdom');
    expect(res.body.error.message).toContain('Acme Hall');
    expect(res.body.error.fields[0].field).toBe('name');
    expect(res.body.error.fields[0].message).toBe('Conflicts with existing organisation in this city and country.');
  });

  it('returns 409 when create hits composite unique (P2002 constraint name in meta.target)', async () => {
    const body = { ...validCreateBody, city: 'Bath' };
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: 'organisation_name_city_country_key' },
    });
    mockCreateOrganisation.mockRejectedValueOnce(p2002);

    const res = await request(app).post('/api/organisations').send(body);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('Bath');
    expect(res.body.error.message).toContain('United Kingdom');
    expect(res.body.error.fields[0].field).toBe('name');
  });

  it('uses (no city) in 409 message when city is omitted and composite unique fails', async () => {
    const body = { ...validCreateBody };
    delete body.city;
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['name', 'city', 'country'] },
    });
    mockCreateOrganisation.mockRejectedValueOnce(p2002);

    const res = await request(app).post('/api/organisations').send(body);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('(no city)');
    expect(res.body.error.message).toContain('United Kingdom');
  });

  it('returns generic 409 for other P2002 targets on create', async () => {
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['organisation_type_id'] },
    });
    mockCreateOrganisation.mockRejectedValueOnce(p2002);

    const res = await request(app).post('/api/organisations').send(validCreateBody);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('A record with this value already exists');
    expect(res.body.error.fields).toEqual([]);
  });

  // v2: reject legacy body keys
  it('returns 400 when ticketing_provider_id is in POST body', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, ticketing_provider_id: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'ticketing_provider_id',
          message: 'Use POST /api/organisations/:id/systems instead',
        }),
      ]),
    );
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when ticketingProviderId (camelCase) is in POST body', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, ticketingProviderId: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'ticketingProviderId' }),
      ]),
    );
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when crmPlatformId (camelCase) is in POST body', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, crmPlatformId: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'crmPlatformId' }),
      ]),
    );
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when crm_platform_id is in POST body', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, crm_platform_id: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'crm_platform_id' }),
      ]),
    );
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when systems array is in POST body', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, systems: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'systems' }),
      ]),
    );
    expect(mockCreateOrganisation).not.toHaveBeenCalled();
  });
});

describe('POST /api/organisations — fieldSources', () => {
  beforeEach(() => {
    mockCreateOrganisation.mockReset();
    prisma.organisationType.findUnique.mockReset();
    prisma.organisationType.findUnique.mockResolvedValue({ id: 'type-uuid-1', name: 'Venue' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 201 and passes validated fieldSources to service (round-trip)', async () => {
    const returned = {
      id: 'new-org-id',
      name: 'Acme Hall',
      city: null,
      country: 'United Kingdom',
      organisationType: { id: 'type-uuid-1', name: 'Venue' },
      membershipCapability: 'YES',
      donationCapability: 'NO',
      reservedSeatingCapability: 'UNKNOWN',
      sourceReference: null,
      notes: null,
      capacity: null,
      fieldSources: { country: 'https://example.com/source' },
      lastUpdated: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
      updatedAt: '2026-04-03T10:00:00.000Z',
      systems: [],
    };
    mockCreateOrganisation.mockResolvedValue(returned);

    const res = await request(app)
      .post('/api/organisations')
      .send({
        ...validCreateBody,
        fieldSources: { country: 'https://example.com/source' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.fieldSources).toEqual({ country: 'https://example.com/source' });
    expect(mockCreateOrganisation).toHaveBeenCalledWith(
      expect.objectContaining({ fieldSources: { country: 'https://example.com/source' } }),
    );
  });

  it('returns 400 for unknown fieldSources key', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, fieldSources: { unknownKey: 'https://x.com' } });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'fieldSources.unknownKey')).toBe(true);
  });

  it('returns 400 when fieldSources URL is invalid', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, fieldSources: { country: '//bad' } });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('fieldSources.country');
  });

  it('returns 400 when fieldSources is not a plain object', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .send({ ...validCreateBody, fieldSources: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0]).toEqual(
      expect.objectContaining({ field: 'fieldSources', message: 'Must be an object.' }),
    );
  });
});

describe('PUT /api/organisations/:id', () => {
  const orgId = VALID_UUID;

  beforeEach(() => {
    mockUpdateOrganisation.mockReset();
    prisma.organisationType.findUnique.mockReset();
    prisma.organisationType.findUnique.mockResolvedValue({ id: 'type-uuid-1', name: 'Venue' });
  });

  it('returns 200 with camelCase data and meta null', async () => {
    mockUpdateOrganisation.mockResolvedValue({
      ...sampleDto,
      id: orgId,
    });

    const res = await request(app).put(`/api/organisations/${orgId}`).send(validCreateBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { ...sampleDto, id: orgId },
      error: null,
      meta: null,
    });
    expect(mockUpdateOrganisation).toHaveBeenCalledWith(
      orgId,
      expect.objectContaining({
        name: 'Acme Hall',
        city: null,
        country: 'United Kingdom',
        organisationTypeId: 'type-uuid-1',
      }),
    );
    expect(mockUpdateOrganisation.mock.calls[0][1]).not.toHaveProperty('lastUpdated');
    expect(mockUpdateOrganisation.mock.calls[0][1]).not.toHaveProperty('id');
    expect(mockUpdateOrganisation.mock.calls[0][1]).not.toHaveProperty('ticketingProviderId');
    expect(mockUpdateOrganisation.mock.calls[0][1]).not.toHaveProperty('crmPlatformId');
  });

  it('returns 404 for malformed id (not a UUID)', async () => {
    const res = await request(app).put('/api/organisations/not-a-uuid').send(validCreateBody);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Organisation not found');
    expect(mockUpdateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 404 when organisation is missing', async () => {
    mockUpdateOrganisation.mockResolvedValue(null);
    const res = await request(app).put(`/api/organisations/${orgId}`).send(validCreateBody);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'Organisation not found', fields: [] },
      meta: null,
    });
  });

  it('returns 400 when name is missing', async () => {
    const { name: _n, ...rest } = validCreateBody;
    const res = await request(app).put(`/api/organisations/${orgId}`).send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'name')).toBe(true);
    expect(mockUpdateOrganisation).not.toHaveBeenCalled();
  });

  it('strips lastUpdated from body before service call', async () => {
    mockUpdateOrganisation.mockResolvedValue({ ...sampleDto, id: orgId });
    await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({ ...validCreateBody, lastUpdated: '2020-01-01T00:00:00.000Z' });
    expect(mockUpdateOrganisation).toHaveBeenCalledWith(
      orgId,
      expect.not.objectContaining({ lastUpdated: expect.anything() }),
    );
  });

  it('strips last_updated and created_at from body before service call', async () => {
    mockUpdateOrganisation.mockResolvedValue({ ...sampleDto, id: orgId });
    await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({
        ...validCreateBody,
        last_updated: '2020-01-01T00:00:00.000Z',
        created_at: '2019-01-01T00:00:00.000Z',
      });
    const payload = mockUpdateOrganisation.mock.calls[0][1];
    expect(payload).not.toHaveProperty('last_updated');
    expect(payload).not.toHaveProperty('created_at');
  });

  it('returns 500 envelope on unexpected service error', async () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateOrganisation.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).put(`/api/organisations/${orgId}`).send(validCreateBody);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
    logSpy.mockRestore();
  });

  it('returns 409 when update hits composite (name, city, country) unique (P2002)', async () => {
    const body = { ...validCreateBody, city: 'York' };
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['name', 'city', 'country'] },
    });
    mockUpdateOrganisation.mockRejectedValueOnce(p2002);

    const res = await request(app).put(`/api/organisations/${orgId}`).send(body);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('York');
    expect(res.body.error.message).toContain('United Kingdom');
    expect(res.body.error.fields[0].field).toBe('name');
  });

  // v2: reject legacy body keys on PUT
  it('returns 400 when ticketing_provider_id is in PUT body', async () => {
    const res = await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({ ...validCreateBody, ticketing_provider_id: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'ticketing_provider_id' }),
      ]),
    );
    expect(mockUpdateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when crm_platform_id is in PUT body', async () => {
    const res = await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({ ...validCreateBody, crm_platform_id: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'crm_platform_id' }),
      ]),
    );
    expect(mockUpdateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when crmPlatformId (camelCase) is in PUT body', async () => {
    const res = await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({ ...validCreateBody, crmPlatformId: 'some-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'crmPlatformId' }),
      ]),
    );
    expect(mockUpdateOrganisation).not.toHaveBeenCalled();
  });

  it('returns 400 when systems array is in PUT body', async () => {
    const res = await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({ ...validCreateBody, systems: [{ systemId: 'x', role: 'PRIMARY_TICKETING' }] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'systems' }),
      ]),
    );
    expect(mockUpdateOrganisation).not.toHaveBeenCalled();
  });

  it('passes fieldSources: {} to clear stored sources', async () => {
    mockUpdateOrganisation.mockResolvedValue({ ...sampleDto, id: orgId, fieldSources: {} });

    const res = await request(app)
      .put(`/api/organisations/${orgId}`)
      .send({ ...validCreateBody, fieldSources: {} });

    expect(res.status).toBe(200);
    expect(mockUpdateOrganisation).toHaveBeenCalledWith(
      orgId,
      expect.objectContaining({ fieldSources: {} }),
    );
  });

  it('omits fieldSources from update payload when key not in body', async () => {
    mockUpdateOrganisation.mockResolvedValue({ ...sampleDto, id: orgId });

    await request(app).put(`/api/organisations/${orgId}`).send(validCreateBody);

    const payload = mockUpdateOrganisation.mock.calls[0][1];
    expect(payload).not.toHaveProperty('fieldSources');
  });
});

describe('DELETE /api/organisations/:id', () => {
  const orgId = VALID_UUID;

  beforeEach(() => {
    mockDeleteOrganisation.mockReset();
  });

  it('returns 200 with data id and meta null', async () => {
    mockDeleteOrganisation.mockResolvedValue(orgId);

    const res = await request(app).delete(`/api/organisations/${orgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { id: orgId },
      error: null,
      meta: null,
    });
    expect(mockDeleteOrganisation).toHaveBeenCalledWith(orgId);
  });

  it('returns 404 for malformed id (not a UUID)', async () => {
    const res = await request(app).delete('/api/organisations/not-a-uuid');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Organisation not found');
    expect(mockDeleteOrganisation).not.toHaveBeenCalled();
  });

  it('returns 404 when organisation is missing', async () => {
    mockDeleteOrganisation.mockResolvedValue(null);
    const res = await request(app).delete(`/api/organisations/${orgId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'Organisation not found', fields: [] },
      meta: null,
    });
  });

  it('returns 500 envelope on unexpected service error', async () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDeleteOrganisation.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).delete(`/api/organisations/${orgId}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
