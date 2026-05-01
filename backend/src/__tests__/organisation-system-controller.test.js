const mockListLinks = jest.fn();
const mockCreateLink = jest.fn();
const mockUpdateLink = jest.fn();
const mockDeleteLink = jest.fn();

jest.mock('../lib/prisma', () => ({
  organisation: { findUnique: jest.fn() },
  system: { findUnique: jest.fn() },
  organisationSystem: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

jest.mock('../services/organisation-system-service', () => ({
  listLinks: (...args) => mockListLinks(...args),
  createLink: (...args) => mockCreateLink(...args),
  updateLink: (...args) => mockUpdateLink(...args),
  deleteLink: (...args) => mockDeleteLink(...args),
}));

const request = require('supertest');
const prisma = require('../lib/prisma');
const app = require('../app');

const VALID_ORG_ID   = '11111111-1111-4111-8111-111111111111';
const VALID_LINK_ID  = '22222222-2222-4222-8222-222222222222';
const VALID_SYS_ID   = '33333333-3333-4333-8333-333333333333';
const MALFORMED_UUID = 'not-a-uuid';

const sampleLink = {
  id: VALID_LINK_ID,
  role: 'PRIMARY_TICKETING',
  sourceReference: 'https://example.com',
  note: 'Test note',
  lastUpdated: '2026-05-01T00:00:00.000Z',
  system: { id: VALID_SYS_ID, name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'TICKETING' },
};

// ─── GET /api/organisations/:id/systems ────────────────────────────────────────

describe('GET /api/organisations/:id/systems', () => {
  beforeEach(() => {
    mockListLinks.mockReset();
    prisma.organisation.findUnique.mockReset();
  });

  it('returns 200 with data array for known org', async () => {
    mockListLinks.mockResolvedValue([sampleLink]);
    const res = await request(app).get(`/api/organisations/${VALID_ORG_ID}/systems`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: [sampleLink], error: null, meta: null });
    expect(mockListLinks).toHaveBeenCalledWith(VALID_ORG_ID);
  });

  it('returns 200 with empty array when org has no links', async () => {
    mockListLinks.mockResolvedValue([]);
    const res = await request(app).get(`/api/organisations/${VALID_ORG_ID}/systems`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 404 when service returns null (org not found)', async () => {
    mockListLinks.mockResolvedValue(null);
    const res = await request(app).get(`/api/organisations/${VALID_ORG_ID}/systems`);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/organisation not found/i);
  });

  it('returns 404 for malformed org UUID', async () => {
    const res = await request(app).get(`/api/organisations/${MALFORMED_UUID}/systems`);
    expect(res.status).toBe(404);
    expect(mockListLinks).not.toHaveBeenCalled();
  });
});

// ─── POST /api/organisations/:id/systems ───────────────────────────────────────

describe('POST /api/organisations/:id/systems', () => {
  const validBody = {
    systemId: VALID_SYS_ID,
    role: 'PRIMARY_TICKETING',
  };

  beforeEach(() => {
    mockCreateLink.mockReset();
    prisma.organisation.findUnique.mockReset();
    prisma.system.findUnique.mockReset();
  });

  it('returns 201 with link DTO on success', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: VALID_ORG_ID });
    prisma.system.findUnique.mockResolvedValue({ id: VALID_SYS_ID });
    mockCreateLink.mockResolvedValue(sampleLink);

    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ data: sampleLink, error: null, meta: null });
  });

  it('returns 400 when systemId is missing', async () => {
    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send({ role: 'PRIMARY_TICKETING' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'systemId')).toBe(true);
  });

  it('returns 400 when role is missing', async () => {
    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send({ systemId: VALID_SYS_ID });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'role')).toBe(true);
  });

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send({ systemId: VALID_SYS_ID, role: 'NOT_A_ROLE' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'role')).toBe(true);
  });

  it('returns 400 when systemId is not a valid UUID', async () => {
    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send({ systemId: MALFORMED_UUID, role: 'PRIMARY_TICKETING' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'systemId')).toBe(true);
  });

  it('returns 404 when org UUID is malformed', async () => {
    const res = await request(app)
      .post(`/api/organisations/${MALFORMED_UUID}/systems`)
      .send(validBody);
    expect(res.status).toBe(404);
    expect(mockCreateLink).not.toHaveBeenCalled();
  });

  it('returns 404 when org does not exist in DB', async () => {
    prisma.organisation.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/organisation not found/i);
    expect(mockCreateLink).not.toHaveBeenCalled();
  });

  it('returns 404 when system does not exist in DB', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: VALID_ORG_ID });
    prisma.system.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/system not found/i);
    expect(mockCreateLink).not.toHaveBeenCalled();
  });

  it('returns 409 when duplicate link (P2002)', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: VALID_ORG_ID });
    prisma.system.findUnique.mockResolvedValue({ id: VALID_SYS_ID });
    const p2002 = new Error('Unique constraint violation');
    p2002.code = 'P2002';
    mockCreateLink.mockRejectedValue(p2002);

    const res = await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.fields.some(f => f.field === 'systemId')).toBe(true);
  });

  it('strips server-controlled keys from body', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: VALID_ORG_ID });
    prisma.system.findUnique.mockResolvedValue({ id: VALID_SYS_ID });
    mockCreateLink.mockResolvedValue(sampleLink);

    await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send({ ...validBody, id: 'should-be-stripped', last_updated: '2020-01-01' });

    expect(mockCreateLink).toHaveBeenCalledWith(
      VALID_ORG_ID,
      expect.not.objectContaining({ id: 'should-be-stripped' }),
    );
  });

  it('passes sourceReference and note through to service when provided', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: VALID_ORG_ID });
    prisma.system.findUnique.mockResolvedValue({ id: VALID_SYS_ID });
    mockCreateLink.mockResolvedValue(sampleLink);

    await request(app)
      .post(`/api/organisations/${VALID_ORG_ID}/systems`)
      .send({ ...validBody, sourceReference: 'https://example.com', note: 'A note' });

    expect(mockCreateLink).toHaveBeenCalledWith(
      VALID_ORG_ID,
      expect.objectContaining({ sourceReference: 'https://example.com', note: 'A note' }),
    );
  });
});

// ─── PUT /api/organisations/:id/systems/:linkId ────────────────────────────────

describe('PUT /api/organisations/:id/systems/:linkId', () => {
  beforeEach(() => {
    mockUpdateLink.mockReset();
    prisma.system.findUnique.mockReset();
  });

  it('returns 200 with updated link DTO on success', async () => {
    mockUpdateLink.mockResolvedValue(sampleLink);

    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({ role: 'PRIMARY_CRM' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: sampleLink, error: null, meta: null });
    expect(mockUpdateLink).toHaveBeenCalledWith(
      VALID_ORG_ID,
      VALID_LINK_ID,
      expect.objectContaining({ role: 'PRIMARY_CRM' }),
    );
  });

  it('returns 404 when service returns null (link not found)', async () => {
    mockUpdateLink.mockResolvedValue(null);
    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({ role: 'PRIMARY_CRM' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for malformed org UUID', async () => {
    const res = await request(app)
      .put(`/api/organisations/${MALFORMED_UUID}/systems/${VALID_LINK_ID}`)
      .send({ role: 'PRIMARY_CRM' });
    expect(res.status).toBe(404);
    expect(mockUpdateLink).not.toHaveBeenCalled();
  });

  it('returns 404 for malformed linkId UUID', async () => {
    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${MALFORMED_UUID}`)
      .send({ role: 'PRIMARY_CRM' });
    expect(res.status).toBe(404);
    expect(mockUpdateLink).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid role value', async () => {
    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({ role: 'INVALID_ROLE' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'role')).toBe(true);
  });

  it('returns 400 for non-UUID systemId', async () => {
    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({ systemId: MALFORMED_UUID });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'systemId')).toBe(true);
  });

  it('returns 404 when systemId system does not exist in DB', async () => {
    prisma.system.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({ systemId: VALID_SYS_ID });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/system not found/i);
    expect(mockUpdateLink).not.toHaveBeenCalled();
  });

  it('returns 409 when systemId change hits unique constraint (P2002)', async () => {
    prisma.system.findUnique.mockResolvedValue({ id: VALID_SYS_ID });
    const p2002 = new Error('Unique constraint violation');
    p2002.code = 'P2002';
    mockUpdateLink.mockRejectedValue(p2002);

    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({ systemId: VALID_SYS_ID });

    expect(res.status).toBe(409);
    expect(res.body.error.fields.some(f => f.field === 'systemId')).toBe(true);
  });

  it('allows empty patch body (no-op touch)', async () => {
    mockUpdateLink.mockResolvedValue(sampleLink);
    const res = await request(app)
      .put(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`)
      .send({});
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/organisations/:id/systems/:linkId ─────────────────────────────

describe('DELETE /api/organisations/:id/systems/:linkId', () => {
  beforeEach(() => {
    mockDeleteLink.mockReset();
  });

  it('returns 200 with { data: { id } } on success', async () => {
    mockDeleteLink.mockResolvedValue({ id: VALID_LINK_ID });
    const res = await request(app)
      .delete(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: { id: VALID_LINK_ID }, error: null, meta: null });
    expect(mockDeleteLink).toHaveBeenCalledWith(VALID_ORG_ID, VALID_LINK_ID);
  });

  it('returns 404 when service returns null (link not found)', async () => {
    mockDeleteLink.mockResolvedValue(null);
    const res = await request(app)
      .delete(`/api/organisations/${VALID_ORG_ID}/systems/${VALID_LINK_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for malformed org UUID', async () => {
    const res = await request(app)
      .delete(`/api/organisations/${MALFORMED_UUID}/systems/${VALID_LINK_ID}`);
    expect(res.status).toBe(404);
    expect(mockDeleteLink).not.toHaveBeenCalled();
  });

  it('returns 404 for malformed linkId UUID', async () => {
    const res = await request(app)
      .delete(`/api/organisations/${VALID_ORG_ID}/systems/${MALFORMED_UUID}`);
    expect(res.status).toBe(404);
    expect(mockDeleteLink).not.toHaveBeenCalled();
  });
});
