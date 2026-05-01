const prisma = require('../lib/prisma');
const { toOrganisationDto } = require('./organisation-list-dto');

const organisationInclude = {
  organisation_type: true,
  systems: {
    include: {
      system: { select: { id: true, name: true, vendor: true, category: true } },
    },
    orderBy: [{ role: 'asc' }, { system: { name: 'asc' } }],
  },
};

/**
 * @param {string} q trimmed non-empty search term
 */
function buildOrganisationListWhere(q) {
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ],
  };
}

/**
 * @param {{
 *   q?: string
 *   country?: string
 *   type?: string
 *   system?: string
 *   system_role?: string
 *   membership?: string
 *   donation?: string
 *   seating?: string
 * }} filters
 */
function buildOrganisationListCompositeWhere(filters) {
  const parts = [];
  const q = filters.q?.trim();
  if (q) {
    parts.push(buildOrganisationListWhere(q));
  }
  if (filters.country) {
    parts.push({ country: filters.country });
  }
  if (filters.type) {
    parts.push({
      organisation_type: { is: { name: filters.type } },
    });
  }
  if (filters.system) {
    const linkFilter = { system_id: filters.system };
    if (filters.system_role) linkFilter.role = filters.system_role;
    parts.push({ systems: { some: linkFilter } });
  }
  if (filters.membership) {
    parts.push({ membership_capability: filters.membership });
  }
  if (filters.donation) {
    parts.push({ donation_capability: filters.donation });
  }
  if (filters.seating) {
    parts.push({ reserved_seating_capability: filters.seating });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}

/**
 * @param {{
 *   page: number
 *   limit: number
 *   q?: string
 *   country?: string
 *   type?: string
 *   system?: string
 *   system_role?: string
 *   membership?: string
 *   donation?: string
 *   seating?: string
 * }} params
 */
async function listOrganisations(params) {
  const { page, limit, q, country, type, system, system_role, membership, donation, seating } = params;
  const skip = (page - 1) * limit;
  const where = buildOrganisationListCompositeWhere({
    q,
    country,
    type,
    system,
    system_role,
    membership,
    donation,
    seating,
  });

  const [rows, total] = await Promise.all([
    prisma.organisation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: organisationInclude,
    }),
    prisma.organisation.count({ where }),
  ]);

  const data = rows.map(toOrganisationDto);
  const totalPages = Math.ceil(total / limit);

  return { data, total, totalPages };
}

/**
 * @param {object} payload normalised camelCase fields for Prisma create
 */
async function createOrganisation(payload) {
  const row = await prisma.organisation.create({
    data: {
      name: payload.name,
      city: payload.city,
      country: payload.country,
      organisation_type_id: payload.organisationTypeId,
      membership_capability: payload.membershipCapability,
      donation_capability: payload.donationCapability,
      reserved_seating_capability: payload.reservedSeatingCapability,
      source_reference: payload.sourceReference,
      notes: payload.notes,
      capacity: payload.capacity,
    },
    include: organisationInclude,
  });

  return toOrganisationDto(row);
}

/**
 * @param {string} id organisation UUID
 * @returns {Promise<object | null>} DTO or null when missing
 */
async function getOrganisationById(id) {
  const row = await prisma.organisation.findUnique({
    where: { id },
    include: organisationInclude,
  });
  if (!row) return null;
  return toOrganisationDto(row);
}

/**
 * @param {string} id organisation UUID
 * @param {object} payload normalised camelCase fields (same shape as create)
 * @returns {Promise<object | null>} DTO or null when row missing (P2025)
 */
async function updateOrganisation(id, payload) {
  try {
    const row = await prisma.organisation.update({
      where: { id },
      data: {
        name: payload.name,
        city: payload.city,
        country: payload.country,
        organisation_type_id: payload.organisationTypeId,
        membership_capability: payload.membershipCapability,
        donation_capability: payload.donationCapability,
        reserved_seating_capability: payload.reservedSeatingCapability,
        source_reference: payload.sourceReference,
        notes: payload.notes,
        capacity: payload.capacity,
      },
      include: organisationInclude,
    });
    return toOrganisationDto(row);
  } catch (err) {
    if (err && err.code === 'P2025') return null;
    throw err;
  }
}

/**
 * @param {string} id organisation UUID
 * @returns {Promise<string | null>} deleted id, or null when row missing (P2025)
 */
async function deleteOrganisation(id) {
  try {
    await prisma.organisation.delete({ where: { id } });
    return id;
  } catch (err) {
    if (err && err.code === 'P2025') return null;
    throw err;
  }
}

module.exports = {
  listOrganisations,
  createOrganisation,
  getOrganisationById,
  updateOrganisation,
  deleteOrganisation,
};
