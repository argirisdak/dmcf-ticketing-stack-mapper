const { SYSTEM_GEOGRAPHIC_FOCUS } = require('../lib/system-geographic-focus');

/**
 * Canonical 11 systems — name / vendor / category match architecture-v2-delta §6.2 Step 1.
 * Enrichment fields satisfy Story 6.3 (geographic_focus uses ADR-016 list).
 * fieldSources: camelCase keys aligned with SYSTEM_FIELD_SOURCE_KEYS (Story 11.5).
 * Omit keys when no defensible non-root URL exists; omit UNKNOWN capability sources.
 * Story 12.5: five Epic-12 capability columns are explicit; every YES/NO has a matching fieldSources key.
 */
const SYSTEM_SEED_DEFINITIONS = [
  {
    name: 'Tessitura',
    vendor: 'Tessitura Network',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'LICENCE',
    geographic_focus: ['Global'],
    description:
      'Integrated ticketing and CRM stack for arts and culture; strong in mid-sized to flagship venues and regional touring networks.',
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'YES',
    season_subscriptions_capability: 'YES',
    dynamic_pricing_capability: 'YES',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'YES',
    accessibility_features_capability: 'YES',
    source_reference: 'https://www.tessituranetwork.com/',
    custom_attributes: [
      {
        label: 'Typical footprint',
        value: 'Mid-to-large venues and festivals',
        source_reference: 'https://www.tessituranetwork.com/',
      },
    ],
    fieldSources: {
      category: 'https://www.tessitura.com/features/unified-crm',
      vendor: 'https://www.tessitura.com/about',
      deploymentModel: 'https://www.tessitura.com/features/cloud-hosting',
      geographicFocus: 'https://www.tessitura.com/about',
      membershipCapability: 'https://www.tessitura.com/features/memberships',
      donationCapability: 'https://www.tessitura.com/features/fundraising',
      reservedSeatingCapability: 'https://www.tessitura.com/features/ticketing-admissions',
      seasonSubscriptionsCapability:
        'https://www.tessitura.com/items/articles/web-products/2018-12-06-tnew-subscription-renewals',
      dynamicPricingCapability:
        'https://www.tessitura.com/support/training/intro-courses/intro-to-ticketing/pricing-mos',
      multiVenueSupportCapability:
        'https://www.tessitura.com/support/training/intro-courses/intro-to-ticketing/facilities',
      marketingAutomationCapability: 'https://www.tessitura.com/features/unified-crm',
      accessibilityFeaturesCapability:
        'https://www.tessitura.com/items/videos/webinars/2022/v16-for-digital-part-2-accessibility',
    },
  },
  {
    name: 'Spektrix',
    vendor: 'Spektrix Ltd',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: ['UK', 'North America'],
    description:
      'Cloud-native combined box office and CRM focused on theatres and arts centres; widely adopted in the UK and Ireland.',
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'YES',
    season_subscriptions_capability: 'YES',
    dynamic_pricing_capability: 'UNKNOWN',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'YES',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.spektrix.com/',
    custom_attributes: [
      {
        label: 'Audience scale',
        value: 'Strong in small-to-mid halls and multi-venue trusts',
        source_reference: 'https://www.spektrix.com/',
      },
    ],
    fieldSources: {
      category: 'https://www.spektrix.com/en-gb/arts-management-crm-software',
      vendor: 'https://www.spektrix.com/en-gb/',
      deploymentModel: 'https://www.spektrix.com/en-gb/online-event-ticketing',
      pricingModel: 'https://www.spektrix.com/en-gb/pricing',
      geographicFocus: 'https://www.spektrix.com/en-gb/clients/ticketing-software-presenting-venues',
      membershipCapability: 'https://www.spektrix.com/en-gb/blog/create-membership-program-how-to',
      donationCapability:
        'https://www.spektrix.com/en-gb/blog/four-arts-fundraising-strategies-that-drive-donations',
      reservedSeatingCapability: 'https://www.spektrix.com/en-gb/online-event-ticketing',
      seasonSubscriptionsCapability: 'https://www.spektrix.com/en-gb/ticket-subscriptions-and-loyalty',
      multiVenueSupportCapability: 'https://www.spektrix.com/en-us/case-study/the-cultch-revenue-engagement',
      marketingAutomationCapability:
        'https://www.spektrix.com/en-gb/blog/easy-segmentation-an-essential-marketing-tool',
    },
  },
  {
    name: 'AudienceView',
    vendor: 'AudienceView',
    category: 'INTEGRATED',
    deployment_model: 'SAAS',
    pricing_model: 'HYBRID',
    geographic_focus: ['North America', 'UK', 'Europe'],
    description:
      'Integrated ticketing and fundraising platform with a North American footprint; common with universities and mid-size presenters.',
    membership_capability: 'YES',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'YES',
    season_subscriptions_capability: 'YES',
    dynamic_pricing_capability: 'UNKNOWN',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'YES',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.audienceview.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://www.audienceview.com/products/audienceview-unlimited/',
      vendor: 'https://www.audienceview.com/',
      deploymentModel: 'https://www.audienceview.com/products/audienceview-unlimited/',
      pricingModel: 'https://www.audienceview.com/products/audienceview-unlimited/',
      geographicFocus: 'https://www.audienceview.com/solutions/performing-arts',
      membershipCapability: 'https://www.audienceview.com/products/audienceview-unlimited/',
      reservedSeatingCapability: 'https://www.audienceview.com/solutions/performing-arts',
      seasonSubscriptionsCapability: 'https://www.audienceview.com/solutions/performing-arts',
      multiVenueSupportCapability: 'https://www.audienceview.com/solutions/performing-arts',
      marketingAutomationCapability: 'https://www.audienceview.com/products/audienceview-unlimited/',
    },
  },
  {
    name: 'Ticketmaster',
    vendor: 'Live Nation Entertainment',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'TRANSACTION_FEE',
    geographic_focus: ['Global'],
    description:
      'High-volume primary and resale ticketing; dominant at arenas and major commercial tours worldwide.',
    membership_capability: 'NO',
    donation_capability: 'NO',
    reserved_seating_capability: 'YES',
    season_subscriptions_capability: 'NO',
    dynamic_pricing_capability: 'YES',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'NO',
    accessibility_features_capability: 'YES',
    source_reference: 'https://www.ticketmaster.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://business.ticketmaster.com/',
      vendor: 'https://www.livenationentertainment.com/',
      deploymentModel: 'https://business.ticketmaster.com/',
      pricingModel: 'https://investors.livenationentertainment.com/',
      geographicFocus: 'https://business.ticketmaster.com/',
      membershipCapability: 'https://business.ticketmaster.com/',
      donationCapability: 'https://business.ticketmaster.com/',
      reservedSeatingCapability: 'https://business.ticketmaster.com/',
      seasonSubscriptionsCapability: 'https://business.ticketmaster.com/',
      dynamicPricingCapability: 'https://investors.livenationentertainment.com/',
      multiVenueSupportCapability: 'https://business.ticketmaster.com/',
      marketingAutomationCapability: 'https://business.ticketmaster.com/',
      accessibilityFeaturesCapability: 'https://business.ticketmaster.com/ada',
    },
  },
  {
    name: 'PatronBase',
    vendor: 'PatronBase',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'LICENCE',
    geographic_focus: ['UK', 'Other'],
    description:
      'Regional UK and European box-office product aimed at theatres and small-to-mid venues.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'YES',
    season_subscriptions_capability: 'YES',
    dynamic_pricing_capability: 'NO',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'UNKNOWN',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.patronbase.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://patronbase.com/products/ticketing/',
      vendor: 'https://patronbase.com/about/',
      deploymentModel: 'https://patronbase.com/products/ticketing/',
      pricingModel: 'https://patronbase.com/contact/',
      geographicFocus: 'https://patronbase.com/about/regions/',
      reservedSeatingCapability: 'https://patronbase.com/products/ticketing/',
      seasonSubscriptionsCapability: 'https://patronbase.com/products/seasons-and-packages/',
      dynamicPricingCapability: 'https://patronbase.com/products/ticketing/',
      multiVenueSupportCapability: 'https://patronbase.com/products/venue-manager/',
    },
  },
  {
    name: 'Eventbrite',
    vendor: 'Eventbrite, Inc.',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'TRANSACTION_FEE',
    geographic_focus: ['Global'],
    description:
      'Self-serve ticketing with a tilt toward festivals, discovery-led events, and community programming.',
    membership_capability: 'NO',
    donation_capability: 'NO',
    reserved_seating_capability: 'UNKNOWN',
    season_subscriptions_capability: 'NO',
    dynamic_pricing_capability: 'NO',
    multi_venue_support_capability: 'NO',
    marketing_automation_capability: 'NO',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.eventbrite.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://www.eventbrite.com/platform/',
      vendor: 'https://www.eventbrite.com/platform/',
      deploymentModel: 'https://www.eventbrite.com/platform/',
      pricingModel: 'https://www.eventbrite.com/organizer/pricing/',
      geographicFocus: 'https://www.eventbrite.com/platform/',
      membershipCapability: 'https://www.eventbrite.com/platform/',
      donationCapability: 'https://www.eventbrite.com/platform/',
      seasonSubscriptionsCapability: 'https://www.eventbrite.com/platform/',
      dynamicPricingCapability: 'https://www.eventbrite.com/organizer/pricing/',
      multiVenueSupportCapability: 'https://www.eventbrite.com/platform/',
      marketingAutomationCapability: 'https://www.eventbrite.com/platform/',
    },
  },
  {
    name: 'Ticketsolve',
    vendor: 'Ticketsolve',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: ['UK', 'Europe'],
    description:
      'Theatre- and arts-centre–oriented UK ticketing with lighter-weight operations than full enterprise stacks.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'UNKNOWN',
    season_subscriptions_capability: 'YES',
    dynamic_pricing_capability: 'UNKNOWN',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'UNKNOWN',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.ticketsolve.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://ticketsolve.com/features/ticketing',
      vendor: 'https://ticketsolve.com/about',
      deploymentModel: 'https://ticketsolve.com/features/ticketing',
      pricingModel: 'https://ticketsolve.com/pricing',
      geographicFocus: 'https://ticketsolve.com/a-partner-not-just-a-platform',
      seasonSubscriptionsCapability: 'https://ticketsolve.com/features/ticketing',
      multiVenueSupportCapability: 'https://ticketsolve.com/features/projects',
    },
  },
  {
    name: 'Universe',
    vendor: 'Live Nation Entertainment',
    category: 'TICKETING',
    deployment_model: 'SAAS',
    pricing_model: 'TRANSACTION_FEE',
    geographic_focus: ['Global'],
    description:
      'Event discovery and ticketing layer often paired with other Live Nation–family tools; used for selective runs.',
    membership_capability: 'NO',
    donation_capability: 'NO',
    reserved_seating_capability: 'UNKNOWN',
    season_subscriptions_capability: 'UNKNOWN',
    dynamic_pricing_capability: 'UNKNOWN',
    multi_venue_support_capability: 'NO',
    marketing_automation_capability: 'NO',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.universe.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://www.universe.com/features',
      vendor: 'https://www.livenationentertainment.com/',
      deploymentModel: 'https://www.universe.com/features',
      pricingModel: 'https://investors.livenationentertainment.com/',
      geographicFocus: 'https://www.universe.com/features',
      membershipCapability: 'https://www.universe.com/features',
      donationCapability: 'https://www.universe.com/features',
      multiVenueSupportCapability: 'https://www.universe.com/features',
      marketingAutomationCapability: 'https://www.universe.com/features',
    },
  },
  {
    name: 'Salesforce',
    vendor: 'Salesforce, Inc.',
    category: 'AUDIENCE_MANAGEMENT',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: ['Global'],
    description:
      'General-purpose CRM adopted by larger cultural institutions for fundraising, stewardship, and marketing automation.',
    membership_capability: 'YES',
    donation_capability: 'YES',
    reserved_seating_capability: 'UNKNOWN',
    season_subscriptions_capability: 'NO',
    dynamic_pricing_capability: 'YES',
    multi_venue_support_capability: 'YES',
    marketing_automation_capability: 'YES',
    accessibility_features_capability: 'YES',
    source_reference: 'https://www.salesforce.com/',
    custom_attributes: [
      {
        label: 'Common pairing',
        value: 'Often sits beside a dedicated ticketing engine',
        source_reference: 'https://www.salesforce.com/',
      },
    ],
    fieldSources: {
      category: 'https://www.salesforce.com/crm/what-is-crm/',
      vendor: 'https://www.salesforce.com/company/',
      deploymentModel: 'https://www.salesforce.com/products/',
      pricingModel: 'https://www.salesforce.com/pricing/',
      geographicFocus: 'https://www.salesforce.com/company/our-story/',
      membershipCapability: 'https://www.salesforce.com/solutions/industries/nonprofit/',
      donationCapability: 'https://www.salesforce.com/nonprofit/',
      seasonSubscriptionsCapability: 'https://www.salesforce.com/solutions/industries/nonprofit/',
      dynamicPricingCapability: 'https://www.salesforce.com/pricing/',
      multiVenueSupportCapability: 'https://www.salesforce.com/products/service-cloud/overview/',
      marketingAutomationCapability: 'https://www.salesforce.com/products/marketing-cloud/overview/',
      accessibilityFeaturesCapability: 'https://www.salesforce.com/company/equality/',
    },
  },
  {
    name: 'HubSpot',
    vendor: 'HubSpot, Inc.',
    category: 'AUDIENCE_MANAGEMENT',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: ['Global'],
    description:
      'Inbound marketing and lightweight CRM popular with festivals and mid-size organisations building digital audiences.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'UNKNOWN',
    reserved_seating_capability: 'UNKNOWN',
    season_subscriptions_capability: 'UNKNOWN',
    dynamic_pricing_capability: 'YES',
    multi_venue_support_capability: 'NO',
    marketing_automation_capability: 'YES',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://www.hubspot.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://www.hubspot.com/products/crm',
      vendor: 'https://www.hubspot.com/company',
      deploymentModel: 'https://www.hubspot.com/products/crm',
      pricingModel: 'https://www.hubspot.com/pricing',
      geographicFocus: 'https://www.hubspot.com/company',
      dynamicPricingCapability: 'https://www.hubspot.com/products/marketing',
      multiVenueSupportCapability: 'https://www.hubspot.com/products/crm',
      marketingAutomationCapability: 'https://www.hubspot.com/products/marketing',
    },
  },
  {
    name: 'Donorfy',
    vendor: 'Donorfy',
    category: 'AUDIENCE_MANAGEMENT',
    deployment_model: 'SAAS',
    pricing_model: 'SUBSCRIPTION',
    geographic_focus: ['UK'],
    description:
      'Charity-sector CRM with a UK heritage; common for donor management adjacent to Spektrix or PatronBase.',
    membership_capability: 'UNKNOWN',
    donation_capability: 'YES',
    reserved_seating_capability: 'UNKNOWN',
    season_subscriptions_capability: 'NO',
    dynamic_pricing_capability: 'UNKNOWN',
    multi_venue_support_capability: 'UNKNOWN',
    marketing_automation_capability: 'NO',
    accessibility_features_capability: 'UNKNOWN',
    source_reference: 'https://donorfy.com/',
    custom_attributes: null,
    fieldSources: {
      category: 'https://donorfy.com/which-donorfy',
      vendor: 'https://donorfy.com/',
      deploymentModel: 'https://donorfy.com/which-donorfy',
      pricingModel: 'https://donorfy.com/pricing',
      geographicFocus: 'https://donorfy.com/heritage-arts-education',
      donationCapability: 'https://donorfy.com/which-donorfy',
      seasonSubscriptionsCapability: 'https://donorfy.com/which-donorfy',
      marketingAutomationCapability: 'https://donorfy.com/which-donorfy',
    },
  },
];

function assertGeographicFocusInCatalog() {
  const allowed = new Set(SYSTEM_GEOGRAPHIC_FOCUS);
  for (const row of SYSTEM_SEED_DEFINITIONS) {
    if (!Array.isArray(row.geographic_focus)) {
      throw new Error(
        `SYSTEM_SEED_DEFINITIONS: "${row.name}" geographic_focus must be an array`,
      );
    }
    for (const v of row.geographic_focus) {
      if (!allowed.has(v)) {
        throw new Error(
          `SYSTEM_SEED_DEFINITIONS: "${row.name}" geographic_focus "${v}" not in SYSTEM_GEOGRAPHIC_FOCUS`,
        );
      }
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
