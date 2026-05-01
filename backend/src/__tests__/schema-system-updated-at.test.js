const fs = require('fs');
const path = require('path');

describe('schema: System and OrganisationSystem @updatedAt', () => {
  it('declares last_updated with @default(now()) @updatedAt on System and OrganisationSystem', () => {
    const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    const txt = fs.readFileSync(schemaPath, 'utf8');
    expect(txt).toMatch(/model System \{[\s\S]*?last_updated\s+DateTime\s+@default\(now\(\)\)\s+@updatedAt/);
    expect(txt).toMatch(/model OrganisationSystem \{[\s\S]*?last_updated\s+DateTime\s+@default\(now\(\)\)\s+@updatedAt/);
  });
});
