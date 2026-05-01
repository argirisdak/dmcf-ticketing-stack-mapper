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
  if (geographicFocus)    parts.push({ geographic_focus: geographicFocus });
  if (membership)         parts.push({ membership_capability: membership });
  if (donation)           parts.push({ donation_capability: donation });
  if (seating)            parts.push({ reserved_seating_capability: seating });

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
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
  page,
  limit,
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
  });

  const [rows, total] = await Promise.all([
    prisma.system.findMany({
      where,
      orderBy: { name: 'asc' },
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
      geographic_focus: payload.geographicFocus ?? undefined,
      description: payload.description ?? undefined,
      membership_capability: payload.membershipCapability ?? undefined,
      donation_capability: payload.donationCapability ?? undefined,
      reserved_seating_capability: payload.reservedSeatingCapability ?? undefined,
      source_reference: payload.sourceReference ?? undefined,
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
  if (payload.sourceReference !== undefined) data.source_reference = payload.sourceReference;

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

module.exports = { listSystems, getSystemById, buildSystemListWhere, createSystem, updateSystem, deleteSystem };
