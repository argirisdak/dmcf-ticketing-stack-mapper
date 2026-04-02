const mockListOrganisations = jest.fn();

jest.mock('../lib/prisma', () => ({
  ticketingProvider: { findMany: jest.fn() },
  crmPlatform: { findMany: jest.fn() },
  organisationType: { findMany: jest.fn() },
  organisation: { findMany: jest.fn(), count: jest.fn() },
  $use: jest.fn(),
  $disconnect: jest.fn(),
}));

jest.mock('../services/organisation-service', () => ({
  listOrganisations: (...args) => mockListOrganisations(...args),
}));

const request = require('supertest');
const app = require('../app');

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
    mockListOrganisations.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).get('/api/organisations');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  });
});
