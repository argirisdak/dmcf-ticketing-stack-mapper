const request = require('supertest');
const app = require('../app');

describe('unmatched API routes (legacy meta paths)', () => {
  it('GET /api/meta/ticketing-providers returns 404 JSON envelope', async () => {
    const res = await request(app).get('/api/meta/ticketing-providers');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'Route not found' },
      meta: null,
    });
  });

  it('GET /api/meta/crm-platforms returns 404 JSON envelope', async () => {
    const res = await request(app).get('/api/meta/crm-platforms');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { message: 'Route not found' },
      meta: null,
    });
  });
});
