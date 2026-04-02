const prisma = require('../lib/prisma');

// Canonical country list — the single backend reference for allowed country values.
// frontend/src/lib/countries.js (Story 1.2) must mirror this list exactly.
// Epic 2 organisation controller validates against this list at the application layer.
const COUNTRIES = [
  'Australia',
  'Austria',
  'Belgium',
  'Canada',
  'Denmark',
  'Finland',
  'France',
  'Germany',
  'Ireland',
  'Italy',
  'Japan',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Poland',
  'Portugal',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
];

module.exports = { COUNTRIES };

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
}

if (require.main === module) {
  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
