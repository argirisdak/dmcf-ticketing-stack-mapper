'use strict';

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../prisma/migrations/20260505120000_organisation_composite_unique/migration.sql',
);

describe('Migration organisation_composite_unique (structural sanity)', () => {
  let sql;

  beforeAll(() => {
    sql = fs.readFileSync(migrationPath, 'utf8');
  });

  it('contains exactly one CREATE UNIQUE INDEX on organisation (name, city, country)', () => {
    const lines = sql
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('--'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      'CREATE UNIQUE INDEX "organisation_name_city_country_key" ON "organisation"("name", "city", "country");',
    );
  });
});
