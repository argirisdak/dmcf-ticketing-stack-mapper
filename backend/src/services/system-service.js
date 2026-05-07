const prisma = require('../lib/prisma');
const { toSystemDto, toSystemDetailDto } = require('./system-list-dto');

const systemDetailInclude = {
  organisation_systems: {
    include: {
      organisation: {
        include: { organisation_type: true },
      },
    },
    orderBy: [
      { role: 'asc' },
      { organisation: { name: 'asc' } },
    ],
  },
};

function buildSystemListWhere({
  q,
  categories,
  deploymentModel,
  pricingModel,
  geographicFocus,
  membership,
  donation,
  seating,
  seasonSubscriptionsCapability,
  dynamicPricingCapability,
  multiVenueSupportCapability,
  marketingAutomationCapability,
  accessibilityFeaturesCapability,
} = {}) {
  const parts = [];

  const term = q?.trim();
  if (term) {
    parts.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { vendor: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  if (categories?.length) parts.push({ category: { in: categories } });
  if (deploymentModel)    parts.push({ deployment_model: deploymentModel });
  if (pricingModel)       parts.push({ pricing_model: pricingModel });
  if (Array.isArray(geographicFocus) && geographicFocus.length > 0) {
    // OR semantics: match systems whose geographic_focus array contains any of the requested values
    parts.push({ geographic_focus: { hasSome: geographicFocus } });
  }
  if (membership)         parts.push({ membership_capability: membership });
  if (donation)           parts.push({ donation_capability: donation });
  if (seating)            parts.push({ reserved_seating_capability: seating });
  if (seasonSubscriptionsCapability) parts.push({ season_subscriptions_capability: seasonSubscriptionsCapability });
  if (dynamicPricingCapability)       parts.push({ dynamic_pricing_capability: dynamicPricingCapability });
  if (multiVenueSupportCapability)    parts.push({ multi_venue_support_capability: multiVenueSupportCapability });
  if (marketingAutomationCapability)  parts.push({ marketing_automation_capability: marketingAutomationCapability });
  if (accessibilityFeaturesCapability) parts.push({ accessibility_features_capability: accessibilityFeaturesCapability });

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}

/**
 * Maps validated API sort key + direction to Prisma `orderBy` for system list queries.
 * @param {string} sortKey
 * @param {'asc' | 'desc'} orderDir
 */
function buildSystemListOrderBy(sortKey, orderDir) {
  switch (sortKey) {
    case 'name':
      return { name: orderDir };
    case 'vendor':
      return { vendor: orderDir };
    case 'category':
      return { category: orderDir };
    case 'lastUpdated':
      return { last_updated: orderDir };
    default:
      return { name: 'asc' };
  }
}

async function listSystems({
  q,
  categories,
  deploymentModel,
  pricingModel,
  geographicFocus,
  membership,
  donation,
  seating,
  seasonSubscriptionsCapability,
  dynamicPricingCapability,
  multiVenueSupportCapability,
  marketingAutomationCapability,
  accessibilityFeaturesCapability,
  page,
  limit,
  sort = 'name',
  order = 'asc',
}) {
  const where = buildSystemListWhere({
    q,
    categories,
    deploymentModel,
    pricingModel,
    geographicFocus,
    membership,
    donation,
    seating,
    seasonSubscriptionsCapability,
    dynamicPricingCapability,
    multiVenueSupportCapability,
    marketingAutomationCapability,
    accessibilityFeaturesCapability,
  });

  const orderBy = buildSystemListOrderBy(sort, order);

  const [rows, total] = await Promise.all([
    prisma.system.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.system.count({ where }),
  ]);

  return {
    data: rows.map(toSystemDto),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getSystemById(id) {
  const row = await prisma.system.findUnique({
    where: { id },
    include: systemDetailInclude,
  });
  if (!row) return null;
  return toSystemDetailDto(row);
}

async function createSystem(payload) {
  const row = await prisma.system.create({
    data: {
      name: payload.name,
      vendor: payload.vendor,
      category: payload.category,
      deployment_model: payload.deploymentModel ?? undefined,
      pricing_model: payload.pricingModel ?? undefined,
      ...(payload.geographicFocus !== undefined ? { geographic_focus: payload.geographicFocus } : {}),
      description: payload.description ?? undefined,
      membership_capability: payload.membershipCapability ?? undefined,
      donation_capability: payload.donationCapability ?? undefined,
      reserved_seating_capability: payload.reservedSeatingCapability ?? undefined,
      season_subscriptions_capability: payload.seasonSubscriptionsCapability ?? undefined,
      dynamic_pricing_capability: payload.dynamicPricingCapability ?? undefined,
      multi_venue_support_capability: payload.multiVenueSupportCapability ?? undefined,
      marketing_automation_capability: payload.marketingAutomationCapability ?? undefined,
      accessibility_features_capability: payload.accessibilityFeaturesCapability ?? undefined,
      source_reference: payload.sourceReference ?? undefined,
      ...(payload.fieldSources !== undefined ? { field_sources: payload.fieldSources } : {}),
      ...(payload.customAttributes !== undefined ? { custom_attributes: payload.customAttributes } : {}),
    },
  });
  return toSystemDto(row);
}

async function updateSystem(id, payload) {
  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.vendor !== undefined) data.vendor = payload.vendor;
  if (payload.category !== undefined) data.category = payload.category;
  if (payload.deploymentModel !== undefined) data.deployment_model = payload.deploymentModel;
  if (payload.pricingModel !== undefined) data.pricing_model = payload.pricingModel;
  if (payload.geographicFocus !== undefined) data.geographic_focus = payload.geographicFocus;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.membershipCapability !== undefined) data.membership_capability = payload.membershipCapability;
  if (payload.donationCapability !== undefined) data.donation_capability = payload.donationCapability;
  if (payload.reservedSeatingCapability !== undefined) data.reserved_seating_capability = payload.reservedSeatingCapability;
  if (payload.seasonSubscriptionsCapability !== undefined) data.season_subscriptions_capability = payload.seasonSubscriptionsCapability;
  if (payload.dynamicPricingCapability !== undefined) data.dynamic_pricing_capability = payload.dynamicPricingCapability;
  if (payload.multiVenueSupportCapability !== undefined) data.multi_venue_support_capability = payload.multiVenueSupportCapability;
  if (payload.marketingAutomationCapability !== undefined) data.marketing_automation_capability = payload.marketingAutomationCapability;
  if (payload.accessibilityFeaturesCapability !== undefined) data.accessibility_features_capability = payload.accessibilityFeaturesCapability;
  if (payload.sourceReference !== undefined) data.source_reference = payload.sourceReference;
  if (payload.fieldSources !== undefined) data.field_sources = payload.fieldSources;
  if (payload.customAttributes !== undefined) data.custom_attributes = payload.customAttributes;

  if (Object.keys(data).length === 0) {
    const row = await prisma.system.findUnique({ where: { id } });
    if (!row) return null;
    return toSystemDto(row);
  }

  try {
    const row = await prisma.system.update({ where: { id }, data });
    return toSystemDto(row);
  } catch (err) {
    if (err?.code === 'P2025') return null;
    throw err;
  }
}

async function deleteSystem(id) {
  try {
    await prisma.system.delete({ where: { id } });
    return id;
  } catch (err) {
    if (err?.code === 'P2025') return null;
    if (err?.code === 'P2003') {
      const count = await prisma.organisationSystem.count({ where: { system_id: id } });
      throw { code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount: count };
    }
    throw err;
  }
}

module.exports = {
  listSystems,
  getSystemById,
  buildSystemListWhere,
  buildSystemListOrderBy,
  createSystem,
  updateSystem,
  deleteSystem,
};
