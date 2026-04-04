const { COUNTRIES } = require('../lib/countries');
const { SAMPLE_ORGANISATIONS } = require('../prisma/sample-organisations-seed-data');

const ALLOWED_TYPES = new Set(['Venue', 'Festival', 'Promoter', 'Cultural Organisation']);
const CAPS = new Set(['YES', 'NO', 'UNKNOWN']);

describe('sample-organisations-seed-data', () => {
  it('defines at least 15 sample organisations with unique ids', () => {
    expect(SAMPLE_ORGANISATIONS.length).toBeGreaterThanOrEqual(15);
    const ids = new Set(SAMPLE_ORGANISATIONS.map((o) => o.id));
    expect(ids.size).toBe(SAMPLE_ORGANISATIONS.length);
  });

  it('uses only canonical countries and organisation types', () => {
    const countrySet = new Set(COUNTRIES);
    const types = new Set();
    for (const o of SAMPLE_ORGANISATIONS) {
      expect(countrySet.has(o.country)).toBe(true);
      expect(ALLOWED_TYPES.has(o.organisationTypeName)).toBe(true);
      types.add(o.organisationTypeName);
    }
    for (const t of ALLOWED_TYPES) {
      expect(types.has(t)).toBe(true);
    }
  });

  it('uses CapabilityState enum values and satisfies AC3 / richness helpers', () => {
    const caps = { m: new Set(), d: new Set(), r: new Set() };
    let ukTessitura = false;
    let hasTp = false;
    let hasCrm = false;
    const lastUpdated = new Set();
    const createdAt = new Set();

    for (const o of SAMPLE_ORGANISATIONS) {
      expect(CAPS.has(o.membership_capability)).toBe(true);
      expect(CAPS.has(o.donation_capability)).toBe(true);
      expect(CAPS.has(o.reserved_seating_capability)).toBe(true);
      caps.m.add(o.membership_capability);
      caps.d.add(o.donation_capability);
      caps.r.add(o.reserved_seating_capability);
      lastUpdated.add(o.last_updated);
      createdAt.add(o.created_at);
      if (o.country === 'United Kingdom' && o.ticketingProviderName === 'Tessitura') {
        ukTessitura = true;
      }
      if (o.ticketingProviderName) hasTp = true;
      if (o.crmPlatformName) hasCrm = true;
    }

    expect(ukTessitura).toBe(true);
    expect(hasTp).toBe(true);
    expect(hasCrm).toBe(true);
    expect(caps.m.size).toBeGreaterThanOrEqual(2);
    expect(caps.d.size).toBeGreaterThanOrEqual(2);
    expect(caps.r.size).toBeGreaterThanOrEqual(2);
    expect(lastUpdated.size).toBeGreaterThan(1);
    expect(createdAt.size).toBeGreaterThan(1);
  });
});
