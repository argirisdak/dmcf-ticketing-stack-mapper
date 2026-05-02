const mockPrisma = {
  organisationType: { findMany: jest.fn() },
  $disconnect: jest.fn(),
};

jest.mock('../lib/prisma', () => mockPrisma);

const request = require('supertest');
const app = require('../app');

const ORGANISATION_TYPES = [
  { id: '1', name: 'Cultural Organisation' },
  { id: '2', name: 'Festival' },
  { id: '3', name: 'Promoter' },
  { id: '4', name: 'Venue' },
];

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
