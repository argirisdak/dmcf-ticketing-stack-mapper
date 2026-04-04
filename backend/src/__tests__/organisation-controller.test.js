const mockListOrganisations = jest.fn();
const mockCreateOrganisation = jest.fn();
const mockGetOrganisationById = jest.fn();
const mockUpdateOrganisation = jest.fn();
const mockDeleteOrganisation = jest.fn();

jest.mock('../lib/prisma', () => ({
  ticketingProvider: { findMany: jest.fn(), findUnique: jest.fn() },
  crmPlatform: { findMany: jest.fn(), findUnique: jest.fn() },
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
          ticketingProvider: { id: 'p1', name: 'Spektrix' },
          crmPlatform: null,
          membershipCapability: 'YES',
          donationCapability: 'NO',
          reservedSeatingCapability: 'UNKNOWN',
          sourceReference: 'REF-1',
          notes: null,
          capacity: 2000,
          lastUpdated: '2026-03-01T12:00:00.000Z',
          createdAt: '2025-06-01T08:00:00.000Z',
          updatedAt: '2026-03-01T12:00:00.000Z',
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

  it('serialises list items with camelCase keys only (no snake_case)', async () => {
    mockListOrganisations.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'A',
          city: null,
          country: 'GB',
          organisationType: { id: 't', name: 'Festival' },
          ticketingProvider: null,
          crmPlatform: { id: 'c', name: 'HubSpot' },
          membershipCapability: 'UNKNOWN',
          donationCapability: 'YES',
          reservedSeatingCapability: 'NO',
          sourceReference: null,
          notes: null,
          capacity: null,
          lastUpdated: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      totalPages: 1,
    });

    const res = await request(app).get('/api/organisations');
    const item = res.body.data[0];
    expect(item).toHaveProperty('organisationType');
    expect(item).toHaveProperty('ticketingProvider');
    expect(item).toHaveProperty('crmPlatform');
    expect(item).toHaveProperty('lastUpdated');
    expect(item).toHaveProperty('createdAt');
    expect(item).toHaveProperty('updatedAt');
    expect(item).toHaveProperty('membershipCapability');
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
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('uses first value when page or limit query keys are repeated', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?page=2&page=99&limit=10&limit=50');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });

  it('forwards trimmed q to the service when provided', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?q=  Opera  ');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'Opera' });
  });

  it('omits q when query is absent or whitespace-only', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?q=%20%09');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('uses first value when q query key is repeated', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/organisations?q=foo&q=bar');
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'foo' });
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

  it('forwards filter query params to the service', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get(
      '/api/organisations?page=2&limit=10&q=royal&country=United+Kingdom&provider=Spektrix&type=Venue&crm=HubSpot&membership=YES&donation=NO&seating=UNKNOWN',
    );
    expect(mockListOrganisations).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'royal',
      country: 'United Kingdom',
      provider: 'Spektrix',
      type: 'Venue',
      crm: 'HubSpot',
      membership: 'YES',
      donation: 'NO',
      seating: 'UNKNOWN',
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
    expect(mockListOrganisations).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('does not 400 for unknown provider name (empty list allowed)', async () => {
    mockListOrganisations.mockResolvedValue({ data: [], total: 0, totalPages: 0 });
    const res = await request(app).get('/api/organisations?provider=NoSuchProviderEver');
    expect(res.status).toBe(200);
    expect(mockListOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'NoSuchProviderEver' }),
    );
  });
});

const sampleDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Royal Opera House',
  city: null,
  country: 'United Kingdom',
  organisationType: { id: 't1', name: 'Venue' },
  ticketingProvider: { id: 'p1', name: 'Spektrix' },
  crmPlatform: null,
  membershipCapability: 'YES',
  donationCapability: 'NO',
  reservedSeatingCapability: 'UNKNOWN',
  sourceReference: 'SRC-REF-1',
  notes: 'Stage door on Bow Street',
  capacity: 2256,
  lastUpdated: '2026-03-01T12:00:00.000Z',
  createdAt: '2025-06-01T08:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
};

describe('GET /api/organisations/:id', () => {
  beforeEach(() => {
    mockGetOrganisationById.mockReset();
  });

  it('returns 200 with camelCase data and meta null', async () => {
    mockGetOrganisationById.mockResolvedValue(sampleDto);
    const res = await request(app).get(
      '/api/organisations/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: sampleDto, error: null, meta: null });
    expect(mockGetOrganisationById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
  });

  it('returns 404 when organisation is missing', async () => {
    mockGetOrganisationById.mockResolvedValue(null);
    const res = await request(app).get(
      '/api/organisations/550e8400-e29b-41d4-a716-446655440000',
    );
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
    const res = await request(app).get(
      '/api/organisations/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
    logSpy.mockRestore();
  });
});

describe('POST /api/organisations', () => {
  beforeEach(() => {
    mockCreateOrganisation.mockReset();
    prisma.organisationType.findUnique.mockReset();
    prisma.ticketingProvider.findUnique.mockReset();
    prisma.crmPlatform.findUnique.mockReset();
    prisma.organisationType.findUnique.mockResolvedValue({ id: 'type-uuid-1', name: 'Venue' });
    prisma.ticketingProvider.findUnique.mockResolvedValue(null);
    prisma.crmPlatform.findUnique.mockResolvedValue(null);
  });

  it('returns 201 with camelCase data envelope', async () => {
    mockCreateOrganisation.mockResolvedValue({
      id: 'new-org-id',
      name: 'Acme Hall',
      city: null,
      country: 'United Kingdom',
      organisationType: { id: 'type-uuid-1', name: 'Venue' },
      ticketingProvider: null,
      crmPlatform: null,
      membershipCapability: 'YES',
      donationCapability: 'NO',
      reservedSeatingCapability: 'UNKNOWN',
      sourceReference: null,
      notes: null,
      capacity: null,
      lastUpdated: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
      updatedAt: '2026-04-03T10:00:00.000Z',
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
});

describe('PUT /api/organisations/:id', () => {
  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockUpdateOrganisation.mockReset();
    prisma.organisationType.findUnique.mockReset();
    prisma.ticketingProvider.findUnique.mockReset();
    prisma.crmPlatform.findUnique.mockReset();
    prisma.organisationType.findUnique.mockResolvedValue({ id: 'type-uuid-1', name: 'Venue' });
    prisma.ticketingProvider.findUnique.mockResolvedValue(null);
    prisma.crmPlatform.findUnique.mockResolvedValue(null);
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
});

describe('DELETE /api/organisations/:id', () => {
  const orgId = '550e8400-e29b-41d4-a716-446655440000';

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
