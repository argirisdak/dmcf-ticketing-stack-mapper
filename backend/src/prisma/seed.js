const prisma = require('../lib/prisma');
const { COUNTRIES } = require('../lib/countries');
const { SAMPLE_ORGANISATIONS } = require('./sample-organisations-seed-data');

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

function buildOrganisationScalars(org, typeByName, providerByName, crmByName) {
  const organisation_type_id = requireLookup(typeByName, org.organisationTypeName, 'organisation type');
  const ticketing_provider_id = org.ticketingProviderName == null
    ? null
    : requireLookup(providerByName, org.ticketingProviderName, 'ticketing provider');
  const crm_platform_id = org.crmPlatformName == null
    ? null
    : requireLookup(crmByName, org.crmPlatformName, 'CRM platform');

  return {
    name: org.name,
    city: org.city ?? null,
    country: org.country,
    organisation_type_id,
    ticketing_provider_id,
    crm_platform_id,
    membership_capability: org.membership_capability,
    donation_capability: org.donation_capability,
    reserved_seating_capability: org.reserved_seating_capability,
    source_reference: org.source_reference ?? null,
    notes: org.notes ?? null,
    capacity: org.capacity ?? null,
    created_at: new Date(org.created_at),
    last_updated: new Date(org.last_updated),
  };
}

async function seedSampleOrganisations() {
  const [types, providers, crms] = await Promise.all([
    prisma.organisationType.findMany(),
    prisma.ticketingProvider.findMany(),
    prisma.crmPlatform.findMany(),
  ]);

  const typeByName = mapByName(types);
  const providerByName = mapByName(providers);
  const crmByName = mapByName(crms);

  const seedIds = SAMPLE_ORGANISATIONS.map((o) => o.id);
  const preexisting = await prisma.organisation.findMany({
    where: { id: { in: seedIds } },
    select: { id: true },
  });
  const preCount = preexisting.length;

  for (const org of SAMPLE_ORGANISATIONS) {
    const data = buildOrganisationScalars(org, typeByName, providerByName, crmByName);
    await prisma.organisation.upsert({
      where: { id: org.id },
      create: { id: org.id, ...data },
      update: { ...data },
    });
  }

  const ac3 = await prisma.organisation.findFirst({
    where: {
      country: 'United Kingdom',
      ticketing_provider: { name: 'Tessitura' },
    },
    select: { id: true, name: true },
  });
  if (!ac3) {
    throw new Error('Seed invariant: no organisation with country United Kingdom and provider Tessitura (AC3).');
  }

  const created = SAMPLE_ORGANISATIONS.length - preCount;
  const updated = preCount;
  console.log(
    `Sample organisations: ${SAMPLE_ORGANISATIONS.length} upserted (${created} created, ${updated} updated).`,
  );
}

async function main() {
  const ticketingProviders = [
    'Tessitura', 'Spektrix', 'Ticketmaster', 'PatronBase',
    'Eventbrite', 'AudienceView', 'TicketSolve', 'Universe',
  ];

  for (const name of ticketingProviders) {
    await prisma.ticketingProvider.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const crmPlatforms = [
    'Salesforce', 'HubSpot', 'Spektrix', 'Tessitura CRM', 'Donorfy',
  ];

  for (const name of crmPlatforms) {
    await prisma.crmPlatform.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

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

  console.log('Reference data seeded.');

  await seedSampleOrganisations();
}

if (require.main === module) {
  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
