/**
 * Integration: real DB enforces composite unique on (name, city, country).
 * Loads backend/.env for DATABASE_URL. Skips entire suite when DATABASE_URL is unset.
 */
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const hasDb = Boolean(process.env.DATABASE_URL?.trim());
const describeIntegration = hasDb ? describe : describe.skip;

describeIntegration('Organisation composite unique (integration)', () => {
  const request = require('supertest');
  const app = require('../app');
  const prisma = require('../lib/prisma');

  let organisationTypeId;
  /** Set when the first create succeeds — preferred teardown target. */
  let createdOrganisationId;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const uniqueName = `Composite-unique integration ${runId}`;
  const city = 'Manchester';
  const country = 'United Kingdom';

  beforeAll(async () => {
    const t = await prisma.organisationType.findFirst();
    if (!t) {
      throw new Error('No organisation_type row — seed the database before integration tests');
    }
    organisationTypeId = t.id;
  });

  afterAll(async () => {
    if (createdOrganisationId) {
      await prisma.organisation.deleteMany({ where: { id: createdOrganisationId } });
    } else {
      await prisma.organisation.deleteMany({ where: { name: uniqueName } });
    }
    await prisma.$disconnect();
  });

  it('returns 409 on second create with same name, city, country', async () => {
    const body = {
      name: uniqueName,
      city,
      country,
      organisationTypeId,
      membershipCapability: 'UNKNOWN',
      donationCapability: 'UNKNOWN',
      reservedSeatingCapability: 'UNKNOWN',
    };

    const first = await request(app).post('/api/organisations').send(body);
    expect(first.status).toBe(201);
    createdOrganisationId = first.body.data.id;

    const second = await request(app).post('/api/organisations').send(body);
    expect(second.status).toBe(409);
    expect(second.body.data).toBeNull();
    expect(second.body.meta).toBeNull();
    expect(second.body.error.message).toContain(city);
    expect(second.body.error.message).toContain(country);
    expect(second.body.error.fields[0].field).toBe('name');
  });
});
