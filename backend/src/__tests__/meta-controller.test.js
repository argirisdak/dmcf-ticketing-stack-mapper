const mockPrisma = {
  ticketingProvider: { findMany: jest.fn() },
  crmPlatform: { findMany: jest.fn() },
  organisationType: { findMany: jest.fn() },
  $disconnect: jest.fn(),
};

jest.mock('../lib/prisma', () => mockPrisma);

const request = require('supertest');
const app = require('../app');

const TICKETING_PROVIDERS = [
  { id: '1', name: 'AudienceView' },
  { id: '2', name: 'Eventbrite' },
  { id: '3', name: 'PatronBase' },
  { id: '4', name: 'Spektrix' },
  { id: '5', name: 'Tessitura' },
  { id: '6', name: 'Ticketmaster' },
  { id: '7', name: 'TicketSolve' },
  { id: '8', name: 'Universe' },
];

const CRM_PLATFORMS = [
  { id: '1', name: 'Donorfy' },
  { id: '2', name: 'HubSpot' },
  { id: '3', name: 'Salesforce' },
  { id: '4', name: 'Spektrix' },
  { id: '5', name: 'Tessitura CRM' },
];

const ORGANISATION_TYPES = [
  { id: '1', name: 'Cultural Organisation' },
  { id: '2', name: 'Festival' },
  { id: '3', name: 'Promoter' },
  { id: '4', name: 'Venue' },
];

describe('GET /api/meta/ticketing-providers', () => {
  beforeEach(() => mockPrisma.ticketingProvider.findMany.mockResolvedValue(TICKETING_PROVIDERS));

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/meta/ticketing-providers');
    expect(res.status).toBe(200);
  });

  it('returns the correct envelope shape', async () => {
    const res = await request(app).get('/api/meta/ticketing-providers');
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns at least 8 ticketing providers', async () => {
    const res = await request(app).get('/api/meta/ticketing-providers');
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
  });

  it('includes the required providers', async () => {
    const res = await request(app).get('/api/meta/ticketing-providers');
    const names = res.body.data.map((p) => p.name);
    ['Tessitura', 'Spektrix', 'Ticketmaster', 'PatronBase', 'Eventbrite', 'AudienceView', 'TicketSolve', 'Universe'].forEach(
      (required) => expect(names).toContain(required)
    );
  });

  it('returns 500 envelope on DB error', async () => {
    mockPrisma.ticketingProvider.findMany.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/meta/ticketing-providers');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  });
});

describe('GET /api/meta/crm-platforms', () => {
  beforeEach(() => mockPrisma.crmPlatform.findMany.mockResolvedValue(CRM_PLATFORMS));

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/meta/crm-platforms');
    expect(res.status).toBe(200);
  });

  it('returns the correct envelope shape', async () => {
    const res = await request(app).get('/api/meta/crm-platforms');
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns at least 5 CRM platforms', async () => {
    const res = await request(app).get('/api/meta/crm-platforms');
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('includes the required CRM platforms', async () => {
    const res = await request(app).get('/api/meta/crm-platforms');
    const names = res.body.data.map((p) => p.name);
    ['Salesforce', 'HubSpot', 'Spektrix', 'Tessitura CRM', 'Donorfy'].forEach(
      (required) => expect(names).toContain(required)
    );
  });

  it('returns 500 envelope on DB error', async () => {
    mockPrisma.crmPlatform.findMany.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/meta/crm-platforms');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});

describe('GET /api/meta/organisation-types', () => {
  beforeEach(() => mockPrisma.organisationType.findMany.mockResolvedValue(ORGANISATION_TYPES));

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/meta/organisation-types');
    expect(res.status).toBe(200);
  });

  it('returns the correct envelope shape', async () => {
    const res = await request(app).get('/api/meta/organisation-types');
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns at least 4 organisation types', async () => {
    const res = await request(app).get('/api/meta/organisation-types');
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it('includes the required organisation types', async () => {
    const res = await request(app).get('/api/meta/organisation-types');
    const names = res.body.data.map((t) => t.name);
    ['Venue', 'Festival', 'Promoter', 'Cultural Organisation'].forEach(
      (required) => expect(names).toContain(required)
    );
  });

  it('returns 500 envelope on DB error', async () => {
    mockPrisma.organisationType.findMany.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/meta/organisation-types');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});
