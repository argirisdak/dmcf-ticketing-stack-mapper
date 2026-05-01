const { SYSTEM_GEOGRAPHIC_FOCUS } = require('../lib/system-geographic-focus');

/**
 * Canonical 11 systems — name / vendor / category match architecture-v2-delta §6.2 Step 1.
 * Enrichment fields satisfy Story 6.3 (geographic_focus uses ADR-016 list).
 */
const SYSTEM_SEED_DEFINITIONS = [
  {
    name: 'Tessitura',
    vendor: 'Tessitura Network',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'LICENCE',
    geographic_focus: 'Global',
    description:
      'Integrated ticketing and CRM stack for arts and culture; strong in mid-sized to flagship venues and regional touring networks.',
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'YES',
    source_reference: 'https://www.tessituranetwork.com/',
    custom_attributes: [
      {
        label: 'Typical footprint',
        value: 'Mid-to-large venues and festivals',
        source_reference: 'https://www.tessituranetwork.com/',
      },
    ],
  },
  {
    name: 'Spektrix',
    vendor: 'Spektrix Ltd',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: 'UK',
    description:
      'Cloud-native combined box office and CRM focused on theatres and arts centres; widely adopted in the UK and Ireland.',
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://www.spektrix.com/',
    custom_attributes: [
      {
        label: 'Audience scale',
        value: 'Strong in small-to-mid halls and multi-venue trusts',
        source_reference: 'https://www.spektrix.com/',
      },
    ],
  },
  {
    name: 'AudienceView',
    vendor: 'AudienceView',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'HYBRID',
    geographic_focus: 'North America',
    description:
      'Integrated ticketing and fundraising platform with a North American footprint; common with universities and mid-size presenters.',
    membership_capability: 'YES',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'YES',
    source_reference: 'https://www.audienceview.com/',
    custom_attributes: null,
  },
  {
    name: 'Ticketmaster',
    vendor: 'Live Nation Entertainment',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'TRANSACTION_FEE',
    geographic_focus: 'Global',
    description:
      'High-volume primary and resale ticketing; dominant at arenas and major commercial tours worldwide.',
    membership_capability: 'NO',
    donation_capability: 'NO',
    reserved_seating_capability: 'YES',
    source_reference: 'https://www.ticketmaster.com/',
    custom_attributes: null,
  },
  {
    name: 'PatronBase',
    vendor: 'PatronBase',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'LICENCE',
    geographic_focus: 'UK',
    description:
      'Regional UK and European box-office product aimed at theatres and small-to-mid venues.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'NO',
    source_reference: 'https://www.patronbase.com/',
    custom_attributes: null,
  },
  {
    name: 'Eventbrite',
    vendor: 'Eventbrite, Inc.',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'TRANSACTION_FEE',
    geographic_focus: 'Global',
    description:
      'Self-serve ticketing with a tilt toward festivals, discovery-led events, and community programming.',
    membership_capability: 'NO',
    donation_capability: 'NO',
    reserved_seating_capability: 'NO',
    source_reference: 'https://www.eventbrite.com/',
    custom_attributes: null,
  },
  {
    name: 'Ticketsolve',
    vendor: 'Ticketsolve',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: 'UK',
    description:
      'Theatre- and arts-centre–oriented UK ticketing with lighter-weight operations than full enterprise stacks.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://www.ticketsolve.com/',
    custom_attributes: null,
  },
  {
    name: 'Universe',
    vendor: 'Live Nation Entertainment',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'TRANSACTION_FEE',
    geographic_focus: 'Global',
    description:
      'Event discovery and ticketing layer often paired with other Live Nation–family tools; used for selective runs.',
    membership_capability: 'NO',
    donation_capability: 'NO',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://www.universe.com/',
    custom_attributes: null,
  },
  {
    name: 'Salesforce',
    vendor: 'Salesforce, Inc.',
    category: 'AUDIENCE_MANAGEMENT',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: 'Global',
    description:
      'General-purpose CRM adopted by larger cultural institutions for fundraising, stewardship, and marketing automation.',
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://www.salesforce.com/',
    custom_attributes: [
      {
        label: 'Common pairing',
        value: 'Often sits beside a dedicated ticketing engine',
        source_reference: 'https://www.salesforce.com/',
      },
    ],
  },
  {
    name: 'HubSpot',
    vendor: 'HubSpot, Inc.',
    category: 'AUDIENCE_MANAGEMENT',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: 'Global',
    description:
      'Inbound marketing and lightweight CRM popular with festivals and mid-size organisations building digital audiences.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'YES',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://www.hubspot.com/',
    custom_attributes: null,
  },
  {
    name: 'Donorfy',
    vendor: 'Donorfy',
    category: 'AUDIENCE_MANAGEMENT',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: 'UK',
    description:
      'Charity-sector CRM with a UK heritage; common for donor management adjacent to Spektrix or PatronBase.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'YES',
    reserved_seating_capability: 'UNKNOWN',
    source_reference: 'https://donorfy.com/',
    custom_attributes: null,
  },
];

function assertGeographicFocusInCatalog() {
  const allowed = new Set(SYSTEM_GEOGRAPHIC_FOCUS);
  for (const row of SYSTEM_SEED_DEFINITIONS) {
    if (!allowed.has(row.geographic_focus)) {
      throw new Error(
        `SYSTEM_SEED_DEFINITIONS: "${row.name}" geographic_focus "${row.geographic_focus}" not in SYSTEM_GEOGRAPHIC_FOCUS`,
      );
    }
  }
}

assertGeographicFocusInCatalog();

function systemCategoryByName() {
  const m = {};
  for (const r of SYSTEM_SEED_DEFINITIONS) {
    m[r.name] = r.category;
  }
  return m;
}

module.exports = {
  SYSTEM_SEED_DEFINITIONS,
  systemCategoryByName,
};
