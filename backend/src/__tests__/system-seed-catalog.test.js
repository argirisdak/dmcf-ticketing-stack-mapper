const { SYSTEM_SEED_DEFINITIONS } = require('../prisma/system-seed-catalog');

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
});
