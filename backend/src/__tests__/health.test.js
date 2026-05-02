jest.mock('../lib/prisma', () => ({
  organisationType: { findMany: jest.fn() },
  $disconnect: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns the correct envelope shape', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ data: { status: 'ok' }, error: null, meta: null });
  });
});
