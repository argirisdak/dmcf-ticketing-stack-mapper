'use strict';

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../prisma/migrations/20260502180000_drop_legacy_lookups/migration.sql',
);

describe('Migration C: drop_legacy_lookups (structural sanity)', () => {
  /** @type {string} */
  let sql;

  beforeAll(() => {
    sql = fs.readFileSync(migrationPath, 'utf8');
  });

  it('migration file exists and drops legacy FK constraints and columns', () => {
    expect(sql.length).toBeGreaterThan(0);
    const lower = sql.toLowerCase();
    expect(lower).toMatch(/drop\s+constraint.*organisation_ticketing_provider_id_fkey/);
    expect(lower).toMatch(/drop\s+constraint.*organisation_crm_platform_id_fkey/);
    expect(lower).toMatch(/drop\s+column.*ticketing_provider_id/);
    expect(lower).toMatch(/drop\s+column.*crm_platform_id/);
  });

  it('drops legacy lookup tables', () => {
    const lower = sql.toLowerCase();
    expect(lower).toMatch(/drop\s+table.*ticketing_provider/);
    expect(lower).toMatch(/drop\s+table.*crm_platform/);
  });

  it('is destructive-only (no backfill DML or additive DDL)', () => {
    const lower = sql.toLowerCase();
    expect(lower).not.toMatch(/\binsert\s+into\b/);
    expect(lower).not.toMatch(/\bupdate\s+/);
    expect(lower).not.toMatch(/select\s+.*\s+into\b/);
    expect(lower).not.toMatch(/\bcreate\s+table\b/);
    expect(lower).not.toMatch(/\badd\s+column\b/);
  });
});
