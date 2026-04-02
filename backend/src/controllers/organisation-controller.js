const organisationService = require('../services/organisation-service');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const listOrganisations = async (req, res) => {
  const fields = [];

  let page = 1;
  if (req.query.page !== undefined && req.query.page !== '') {
    const p = Number(req.query.page);
    if (!Number.isInteger(p) || p < 1) {
      fields.push({ field: 'page', message: 'page must be a positive integer' });
    } else {
      page = p;
    }
  }

  let limit = DEFAULT_LIMIT;
  if (req.query.limit !== undefined && req.query.limit !== '') {
    const l = Number(req.query.limit);
    if (!Number.isInteger(l) || l < 1) {
      fields.push({ field: 'limit', message: 'limit must be a positive integer' });
    } else if (l > MAX_LIMIT) {
      fields.push({ field: 'limit', message: `limit must not exceed ${MAX_LIMIT}` });
    } else {
      limit = l;
    }
  }

  if (fields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields },
      meta: null,
    });
  }

  try {
    const { data, total, totalPages } = await organisationService.listOrganisations({ page, limit });
    return res.json({
      data,
      error: null,
      meta: { page, limit, total, totalPages },
    });
  } catch {
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

module.exports = { listOrganisations };
