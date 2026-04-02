const prisma = require('../lib/prisma');

const getTicketingProviders = async (req, res) => {
  try {
    const providers = await prisma.ticketingProvider.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: providers, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

const getCrmPlatforms = async (req, res) => {
  try {
    const platforms = await prisma.crmPlatform.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: platforms, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

const getOrganisationTypes = async (req, res) => {
  try {
    const types = await prisma.organisationType.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: types, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

module.exports = { getTicketingProviders, getCrmPlatforms, getOrganisationTypes };
