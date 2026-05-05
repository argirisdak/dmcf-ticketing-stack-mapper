/**
 * Integration: GET /api/organisations/check-similar uses pg_trgm similarity + ILIKE.
 * Loads backend/.env for DATABASE_URL. Skips when DATABASE_URL is unset.
 */
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const hasDb = Boolean(process.env.DATABASE_URL?.trim());
const describeIntegration = hasDb ? describe : describe.skip;

describeIntegration('GET /api/organisations/check-similar (integration)', () => {
  const request = require('supertest');
  const app = require('../app');
  const prisma = require('../lib/prisma');

  let organisationTypeId;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nameCanon = `Royal Opera House ${runId}`;
  const nameTypo = `Royal Opera Hse ${runId}`;
  const city = 'London';
  const country = 'United Kingdom';
  let idCanon;
  let idTypo;

  beforeAll(async () => {
    const t = await prisma.organisationType.findFirst();
    if (!t) {
      throw new Error('No organisation_type row — seed the database before integration tests');
    }
    organisationTypeId = t.id;
  });

  afterAll(async () => {
    await prisma.organisation.deleteMany({ where: { id: { in: [idCanon, idTypo].filter(Boolean) } } });
    await prisma.$disconnect();
  });

  it('returns similar name match for typo vs canonical (trigram)', async () => {
    const body = {
      membershipCapability: 'UNKNOWN',
      donationCapability: 'UNKNOWN',
      reservedSeatingCapability: 'UNKNOWN',
      organisationTypeId,
      country,
      city,
    };

    const createCanon = await request(app).post('/api/organisations').send({ ...body, name: nameCanon });
    expect(createCanon.status).toBe(201);
    idCanon = createCanon.body.data.id;

    const createTypo = await request(app).post('/api/organisations').send({ ...body, name: nameTypo });
    expect(createTypo.status).toBe(201);
    idTypo = createTypo.body.data.id;

    const res = await request(app).get('/api/organisations/check-similar').query({ name: nameTypo });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    const ids = res.body.data.map((r) => r.id);
    expect(ids).toContain(idCanon);
    expect(ids).toContain(idTypo);
    for (const row of res.body.data) {
      expect(Object.keys(row).sort()).toEqual(['city', 'country', 'id', 'name']);
    }
  });

  it('excludes excludeId from results', async () => {
    const res = await request(app)
      .get('/api/organisations/check-similar')
      .query({ name: nameTypo, excludeId: idCanon });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((r) => r.id);
    expect(ids).not.toContain(idCanon);
    expect(ids).toContain(idTypo);
  });

  it('returns empty data when nothing matches', async () => {
    // Do not include runId here — org names created above embed runId, and ILIKE '%…%' would match.
    const res = await request(app)
      .get('/api/organisations/check-similar')
      .query({ name: 'zzzz-no-matches-xyzzy-plugh' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
