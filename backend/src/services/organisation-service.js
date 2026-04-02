const prisma = require('../lib/prisma');
const { toOrganisationListDto } = require('./organisation-list-dto');

/**
 * @param {{ page: number; limit: number }} params
 */
async function listOrganisations({ page, limit }) {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.organisation.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        organisation_type: true,
        ticketing_provider: true,
        crm_platform: true,
      },
    }),
    prisma.organisation.count(),
  ]);

  const data = rows.map(toOrganisationListDto);
  const totalPages = Math.ceil(total / limit);

  return { data, total, totalPages };
}

module.exports = { listOrganisations, toOrganisationListDto };
