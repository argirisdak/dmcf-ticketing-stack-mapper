const prisma = require('../lib/prisma');

const getOrganisationTypes = async (req, res) => {
  try {
    const types = await prisma.organisationType.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: types, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

module.exports = { getOrganisationTypes };
