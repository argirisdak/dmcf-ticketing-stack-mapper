const prisma = require('../lib/prisma');
const { COUNTRIES } = require('../lib/countries');
const { SAMPLE_ORGANISATIONS } = require('./sample-organisations-seed-data');
const { SYSTEM_SEED_DEFINITIONS } = require('./system-seed-catalog');

/** Re-export for callers that previously imported `COUNTRIES` from seed. */
module.exports = { COUNTRIES };

function mapByName(rows) {
  const m = {};
  for (const row of rows) {
    m[row.name] = row.id;
  }
  return m;
}

function requireLookup(map, name, kind) {
  const id = map[name];
  if (!id) {
    throw new Error(`Seed: missing ${kind} lookup "${name}" — run reference upserts first.`);
  }
  return id;
}

function buildOrganisationScalars(org, typeByName) {
  const organisation_type_id = requireLookup(typeByName, org.organisationTypeName, 'organisation type');

  return {
    name: org.name,
    city: org.city ?? null,
    country: org.country,
    organisation_type_id,
    membership_capability: org.membership_capability,
    donation_capability: org.donation_capability,
    reserved_seating_capability: org.reserved_seating_capability,
    source_reference: org.source_reference ?? null,
    notes: org.notes ?? null,
    capacity: org.capacity ?? null,
    field_sources: org.fieldSources ?? null,
    created_at: new Date(org.created_at),
    last_updated: new Date(org.last_updated),
  };
}

async function seedOrganisationTypes() {
  const organisationTypes = [
    'Venue', 'Festival', 'Promoter', 'Cultural Organisation',
  ];
  for (const name of organisationTypes) {
    await prisma.organisationType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function seedSystems() {
  const catalogNames = new Set(SYSTEM_SEED_DEFINITIONS.map((d) => d.name));
  const allSystems = await prisma.system.findMany({ select: { id: true, name: true } });
  for (const sys of allSystems) {
    if (!catalogNames.has(sys.name)) {
      const linkCount = await prisma.organisationSystem.count({ where: { system_id: sys.id } });
      if (linkCount === 0) {
        await prisma.system.delete({ where: { id: sys.id } });
        console.log(`Seed cleanup: removed stale system "${sys.name}" (no organisation links).`);
      }
    }
  }

  for (const def of SYSTEM_SEED_DEFINITIONS) {
    await prisma.system.upsert({
      where: { name: def.name },
      update: {
        vendor: def.vendor,
        category: def.category,
        deployment_model: def.deployment_model,
        pricing_model: def.pricing_model,
        geographic_focus: def.geographic_focus,
        description: def.description,
        membership_capability: def.membership_capability,
        donation_capability: def.donation_capability,
        reserved_seating_capability: def.reserved_seating_capability,
        season_subscriptions_capability: def.season_subscriptions_capability,
        dynamic_pricing_capability: def.dynamic_pricing_capability,
        multi_venue_support_capability: def.multi_venue_support_capability,
        marketing_automation_capability: def.marketing_automation_capability,
        accessibility_features_capability: def.accessibility_features_capability,
        source_reference: def.source_reference,
        custom_attributes: def.custom_attributes,
        field_sources: def.fieldSources ?? null,
      },
      create: {
        name: def.name,
        vendor: def.vendor,
        category: def.category,
        deployment_model: def.deployment_model,
        pricing_model: def.pricing_model,
        geographic_focus: def.geographic_focus,
        description: def.description,
        membership_capability: def.membership_capability,
        donation_capability: def.donation_capability,
        reserved_seating_capability: def.reserved_seating_capability,
        season_subscriptions_capability: def.season_subscriptions_capability,
        dynamic_pricing_capability: def.dynamic_pricing_capability,
        multi_venue_support_capability: def.multi_venue_support_capability,
        marketing_automation_capability: def.marketing_automation_capability,
        accessibility_features_capability: def.accessibility_features_capability,
        source_reference: def.source_reference,
        custom_attributes: def.custom_attributes,
        field_sources: def.fieldSources ?? null,
      },
    });
  }
}

async function seedSampleOrganisationsAndLinks() {
  const [types, systems] = await Promise.all([
    prisma.organisationType.findMany(),
    prisma.system.findMany(),
  ]);

  const typeByName = mapByName(types);
  const systemByName = mapByName(systems);

  const seedIds = SAMPLE_ORGANISATIONS.map((o) => o.id);
  const preexisting = await prisma.organisation.findMany({
    where: { id: { in: seedIds } },
    select: { id: true },
  });
  const preCount = preexisting.length;

  for (const org of SAMPLE_ORGANISATIONS) {
    const data = buildOrganisationScalars(org, typeByName);
    await prisma.organisation.upsert({
      where: { id: org.id },
      create: { id: org.id, ...data },
      update: { ...data },
    });
  }

  for (const org of SAMPLE_ORGANISATIONS) {
    for (const link of org.links) {
      const systemId = systemByName[link.systemName];
      if (!systemId) {
        throw new Error(`Seed: system "${link.systemName}" not found for organisation ${org.name}`);
      }
      const existing = await prisma.organisationSystem.findUnique({
        where: {
          organisation_id_system_id: {
            organisation_id: org.id,
            system_id: systemId,
          },
        },
      });
      if (existing) continue;
      await prisma.organisationSystem.create({
        data: {
          organisation_id: org.id,
          system_id: systemId,
          role: link.role,
          source_reference: link.sourceReference ?? null,
          note: link.note ?? null,
        },
      });
    }
  }

  const ac3Rows = await prisma.$queryRaw`
    SELECT count(*)::int AS c
    FROM organisation_system os
    JOIN organisation o ON o.id = os.organisation_id
    JOIN system s ON s.id = os.system_id
    WHERE o.country = 'United Kingdom'
      AND s.name = 'Tessitura'
      AND os.role = 'INTEGRATED_SUITE'
  `;
  if (ac3Rows[0].c < 1) {
    throw new Error(
      'Seed invariant: AC3 — expect ≥1 United Kingdom organisation linked to Tessitura with INTEGRATED_SUITE',
    );
  }

  const multiLink = await prisma.$queryRaw`
    SELECT organisation_id FROM organisation_system
    GROUP BY organisation_id
    HAVING count(*) >= 2
    LIMIT 1
  `;
  if (multiLink.length < 1) {
    throw new Error('Seed invariant: expected at least one organisation with 2+ linked systems');
  }

  const secondaryCt = await prisma.organisationSystem.count({ where: { role: 'SECONDARY' } });
  if (secondaryCt < 1) {
    throw new Error('Seed invariant: expected at least one SECONDARY organisation_system link');
  }

  const suiteAndCrm = await prisma.$queryRaw`
    SELECT o.id::text AS id
    FROM organisation o
    WHERE EXISTS (
      SELECT 1 FROM organisation_system os1
      JOIN system s1 ON s1.id = os1.system_id
      WHERE os1.organisation_id = o.id
        AND os1.role = 'INTEGRATED_SUITE'
        AND s1.category = 'INTEGRATED'
    )
    AND EXISTS (
      SELECT 1 FROM organisation_system os2
      WHERE os2.organisation_id = o.id AND os2.role = 'PRIMARY_CRM'
    )
    LIMIT 1
  `;
  if (suiteAndCrm.length < 1) {
    throw new Error(
      'Seed invariant: expected an organisation with INTEGRATED_SUITE (integrated system) and a separate PRIMARY_CRM link',
    );
  }

  const systemCount = await prisma.system.count();
  if (systemCount !== 11) {
    throw new Error(`Seed invariant: expected exactly 11 systems, found ${systemCount}`);
  }

  const created = SAMPLE_ORGANISATIONS.length - preCount;
  const updated = preCount;
  console.log(
    `Sample organisations: ${SAMPLE_ORGANISATIONS.length} upserted (${created} created, ${updated} updated).`,
  );
}

async function main() {
  await seedOrganisationTypes();
  console.log('Reference data seeded.');

  await seedSystems();
  console.log(`Systems: ${SYSTEM_SEED_DEFINITIONS.length} upserted.`);

  await seedSampleOrganisationsAndLinks();
}

if (require.main === module) {
  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
