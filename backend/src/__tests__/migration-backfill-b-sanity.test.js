'use strict';

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../prisma/migrations/20260430183000_backfill_systems_and_links/migration.sql',
);

describe('Migration B: backfill_systems_and_links (structural sanity)', () => {
  /** @type {string} */
  let sql;

  beforeAll(() => {
    sql = fs.readFileSync(migrationPath, 'utf8');
  });

  it('migration file exists and enables pgcrypto before uuid generation', () => {
    expect(sql.length).toBeGreaterThan(0);
    const extAt = sql.indexOf('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    expect(extAt).toBeGreaterThanOrEqual(0);
    const firstUuidAt = sql.indexOf('gen_random_uuid()');
    expect(firstUuidAt).toBeGreaterThan(extAt);
  });

  it('does not destructively drop legacy lookup tables or organisation FK columns (Migration C only)', () => {
    const lower = sql.toLowerCase();
    expect(lower).not.toMatch(/drop\s+table\s+"ticketing_provider"/);
    expect(lower).not.toMatch(/drop\s+table\s+"crm_platform"/);
    expect(lower).not.toMatch(/drop\s+column.*ticketing_provider_id/);
    expect(lower).not.toMatch(/drop\s+column.*crm_platform_id/);
  });

  it('includes deterministic backfill steps (labelled sections)', () => {
    expect(sql).toMatch(/\bstep\s+1\b/i);
    expect(sql).toMatch(/\b11\s+rows?\b/i);
    expect(sql).toMatch(/tp_to_system/i);
    expect(sql).toMatch(/crm_to_system/i);
    expect(sql).toMatch(/RAISE EXCEPTION/i);
  });
});
