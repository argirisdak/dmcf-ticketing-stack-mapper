const { SYSTEM_SEED_DEFINITIONS } = require('../prisma/system-seed-catalog');

const EPIC12_CAP_TO_SOURCE_KEY = [
  ['season_subscriptions_capability', 'seasonSubscriptionsCapability'],
  ['dynamic_pricing_capability', 'dynamicPricingCapability'],
  ['multi_venue_support_capability', 'multiVenueSupportCapability'],
  ['marketing_automation_capability', 'marketingAutomationCapability'],
  ['accessibility_features_capability', 'accessibilityFeaturesCapability'],
];

describe('system-seed-catalog', () => {
  it('defines exactly 11 systems with unique names', () => {
    expect(SYSTEM_SEED_DEFINITIONS.length).toBe(11);
    const names = new Set(SYSTEM_SEED_DEFINITIONS.map((r) => r.name));
    expect(names.size).toBe(11);
  });

  it('sets custom_attributes JSON on at least three systems', () => {
    const withAttrs = SYSTEM_SEED_DEFINITIONS.filter((r) => Array.isArray(r.custom_attributes));
    expect(withAttrs.length).toBeGreaterThanOrEqual(3);
  });

  it('Story 12.5: every system sets all five Epic-12 capability enums explicitly', () => {
    const allowed = new Set(['YES', 'NO', 'UNKNOWN']);
    for (const row of SYSTEM_SEED_DEFINITIONS) {
      for (const [cap] of EPIC12_CAP_TO_SOURCE_KEY) {
        expect(row).toHaveProperty(cap);
        expect(allowed.has(row[cap])).toBe(true);
      }
    }
  });

  it('Story 12.5: YES/NO capability values have a matching fieldSources URL; UNKNOWN omits the key', () => {
    for (const row of SYSTEM_SEED_DEFINITIONS) {
      const fs = row.fieldSources && typeof row.fieldSources === 'object' ? row.fieldSources : {};
      for (const [cap, sourceKey] of EPIC12_CAP_TO_SOURCE_KEY) {
        const v = row[cap];
        if (v === 'YES' || v === 'NO') {
          expect(fs[sourceKey]).toMatch(/^https:\/\//);
        } else {
          expect(fs[sourceKey]).toBeUndefined();
        }
      }
    }
  });

  it('Story 12.5 AC4: three reference triples show variation on at least three Epic-12 rows each', () => {
    const byName = Object.fromEntries(SYSTEM_SEED_DEFINITIONS.map((r) => [r.name, r]));
    const triples = [
      ['Tessitura', 'Spektrix', 'Eventbrite'],
      ['Ticketmaster', 'Eventbrite', 'Universe'],
      ['Salesforce', 'HubSpot', 'Donorfy'],
    ];
    const capFields = EPIC12_CAP_TO_SOURCE_KEY.map(([c]) => c);
    for (const names of triples) {
      for (const n of names) {
        expect(byName[n]).toBeDefined();
      }
      const rows = names.map((n) => byName[n]);
      let variedRows = 0;
      for (const cap of capFields) {
        const vals = new Set(rows.map((r) => r[cap]));
        if (vals.size >= 2) variedRows += 1;
      }
      expect(variedRows).toBeGreaterThanOrEqual(3);
    }
  });
});
