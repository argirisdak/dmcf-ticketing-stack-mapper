const systemService = require('../services/system-service');
const { SYSTEM_GEOGRAPHIC_FOCUS } = require('../lib/system-geographic-focus');
const { stripClientControlledSystemWriteKeys } = require('../lib/strip-client-controlled-write-keys');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_Q_LENGTH = 200;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidParam(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

const SYSTEM_CATEGORY_SET = new Set(['INTEGRATED', 'TICKETING', 'AUDIENCE_MANAGEMENT']);
const DEPLOYMENT_MODEL_SET = new Set(['SAAS', 'SELF_HOSTED', 'HYBRID']);
const PRICING_MODEL_SET = new Set(['SUBSCRIPTION', 'TRANSACTION_FEE', 'LICENCE', 'HYBRID', 'UNKNOWN']);
const CAPABILITY_SET = new Set(['YES', 'NO', 'UNKNOWN']);
const GEOGRAPHIC_FOCUS_SET = new Set(SYSTEM_GEOGRAPHIC_FOCUS);

/** Normalise Express query param to a single string or undefined. */
function asQueryString(param) {
  if (param === undefined || param === null || param === '') return undefined;
  if (typeof param === 'string') return param;
  if (Array.isArray(param)) {
    if (param.length === 0) return undefined;
    const first = param[0];
    if (first === undefined || first === null || first === '') return undefined;
    return String(first);
  }
  return String(param);
}

/** Normalise Express query param to a non-empty string[] or undefined (for repeated params). */
function asQueryArray(param) {
  if (param === undefined || param === null) return undefined;
  if (Array.isArray(param)) {
    const filtered = param.filter(v => typeof v === 'string' && v.trim() !== '');
    return filtered.length > 0 ? filtered : undefined;
  }
  if (typeof param === 'string' && param.trim() !== '') return [param.trim()];
  return undefined;
}

const listSystems = async (req, res) => {
  const fields = [];

  let page = 1;
  const pageStr = asQueryString(req.query.page);
  if (pageStr !== undefined) {
    const p = Number(pageStr);
    if (!Number.isInteger(p) || p < 1 || !Number.isSafeInteger(p)) {
      fields.push({ field: 'page', message: 'page must be a positive integer' });
    } else {
      page = p;
    }
  }

  let limit = DEFAULT_LIMIT;
  const limitStr = asQueryString(req.query.limit);
  if (limitStr !== undefined) {
    const l = Number(limitStr);
    if (!Number.isInteger(l) || l < 1 || !Number.isSafeInteger(l)) {
      fields.push({ field: 'limit', message: 'limit must be a positive integer' });
    } else if (l > MAX_LIMIT) {
      fields.push({ field: 'limit', message: `limit must not exceed ${MAX_LIMIT}` });
    } else {
      limit = l;
    }
  }

  const skipSlots = (page - 1) * limit;
  if (!Number.isSafeInteger(skipSlots)) {
    fields.push({ field: 'page', message: 'pagination values are out of safe range' });
  }

  const qTrimmedEarly = (() => {
    const raw = asQueryString(req.query.q);
    if (raw === undefined || raw.trim() === '') return null;
    return raw.trim();
  })();
  if (qTrimmedEarly !== null && qTrimmedEarly.length > MAX_Q_LENGTH) {
    fields.push({ field: 'q', message: `q must not exceed ${MAX_Q_LENGTH} characters` });
  }

  // category — multi-value; ADR-017
  const categoriesRaw = asQueryArray(req.query.category);
  let categories;
  if (categoriesRaw !== undefined) {
    const normalised = categoriesRaw.map(c => c.trim().toUpperCase());
    const invalid = normalised.find(c => !SYSTEM_CATEGORY_SET.has(c));
    if (invalid !== undefined) {
      fields.push({ field: 'category', message: 'Invalid category value' });
    } else {
      categories = normalised;
    }
  }

  const deploymentModelRaw = asQueryString(req.query.deployment_model);
  let deploymentModel;
  if (deploymentModelRaw !== undefined) {
    const v = deploymentModelRaw.trim().toUpperCase();
    if (!DEPLOYMENT_MODEL_SET.has(v)) {
      fields.push({ field: 'deployment_model', message: 'Invalid deployment_model value' });
    } else {
      deploymentModel = v;
    }
  }

  const pricingModelRaw = asQueryString(req.query.pricing_model);
  let pricingModel;
  if (pricingModelRaw !== undefined) {
    const v = pricingModelRaw.trim().toUpperCase();
    if (!PRICING_MODEL_SET.has(v)) {
      fields.push({ field: 'pricing_model', message: 'Invalid pricing_model value' });
    } else {
      pricingModel = v;
    }
  }

  const geographicFocusRaw = asQueryString(req.query.geographic_focus);
  let geographicFocus;
  if (geographicFocusRaw !== undefined) {
    const v = geographicFocusRaw.trim();
    if (!GEOGRAPHIC_FOCUS_SET.has(v)) {
      fields.push({ field: 'geographic_focus', message: 'Invalid geographic_focus value' });
    } else {
      geographicFocus = v;
    }
  }

  const membershipRaw = asQueryString(req.query.membership);
  let membership;
  if (membershipRaw !== undefined) {
    const v = membershipRaw.trim().toUpperCase();
    if (!CAPABILITY_SET.has(v)) {
      fields.push({ field: 'membership', message: 'Select a valid option' });
    } else {
      membership = v;
    }
  }

  const donationRaw = asQueryString(req.query.donation);
  let donation;
  if (donationRaw !== undefined) {
    const v = donationRaw.trim().toUpperCase();
    if (!CAPABILITY_SET.has(v)) {
      fields.push({ field: 'donation', message: 'Select a valid option' });
    } else {
      donation = v;
    }
  }

  const seatingRaw = asQueryString(req.query.seating);
  let seating;
  if (seatingRaw !== undefined) {
    const v = seatingRaw.trim().toUpperCase();
    if (!CAPABILITY_SET.has(v)) {
      fields.push({ field: 'seating', message: 'Select a valid option' });
    } else {
      seating = v;
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
    const { data, total, totalPages } = await systemService.listSystems({
      page,
      limit,
      q: qTrimmedEarly ?? undefined,
      categories,
      deploymentModel,
      pricingModel,
      geographicFocus,
      membership,
      donation,
      seating,
    });

    return res.json({
      data,
      error: null,
      meta: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error('[GET /api/systems] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

const notFoundEnvelope = {
  data: null,
  error: { message: 'System not found', fields: [] },
  meta: null,
};

const getSystemById = async (req, res) => {
  const rawId = req.params?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(id)) {
    return res.status(404).json(notFoundEnvelope);
  }

  try {
    const data = await systemService.getSystemById(id);
    if (!data) {
      return res.status(404).json(notFoundEnvelope);
    }
    return res.json({ data, error: null, meta: null });
  } catch (err) {
    console.error('[GET /api/systems/:id] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

function normaliseOptionalEnum(raw, set) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const v = String(raw).trim().toUpperCase();
  return set.has(v) ? v : '__invalid__';
}

function normaliseOptionalString(raw) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function parseSystemWritePayload(raw, { requireAll = true } = {}) {
  const fields = [];

  let name;
  if (requireAll || 'name' in raw) {
    const n = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!n) fields.push({ field: 'name', message: 'Enter the system name' });
    else name = n;
  }

  let vendor;
  if (requireAll || 'vendor' in raw) {
    const v = typeof raw.vendor === 'string' ? raw.vendor.trim() : '';
    if (!v) fields.push({ field: 'vendor', message: 'Enter the vendor name' });
    else vendor = v;
  }

  let category;
  if (requireAll || 'category' in raw) {
    const c = typeof raw.category === 'string' ? raw.category.trim().toUpperCase() : '';
    if (!SYSTEM_CATEGORY_SET.has(c)) fields.push({ field: 'category', message: 'Select a category' });
    else category = c;
  }

  const rawDeployment = 'deployment_model' in raw ? raw.deployment_model : raw.deploymentModel;
  let deploymentModel;
  if ('deployment_model' in raw || 'deploymentModel' in raw) {
    const v = normaliseOptionalEnum(rawDeployment, DEPLOYMENT_MODEL_SET);
    if (v === '__invalid__') fields.push({ field: 'deployment_model', message: 'Select a deployment model' });
    else deploymentModel = v;
  }

  const rawPricing = 'pricing_model' in raw ? raw.pricing_model : raw.pricingModel;
  let pricingModel;
  if ('pricing_model' in raw || 'pricingModel' in raw) {
    const v = normaliseOptionalEnum(rawPricing, PRICING_MODEL_SET);
    if (v === '__invalid__') fields.push({ field: 'pricing_model', message: 'Select a pricing model' });
    else pricingModel = v;
  }

  const rawGeo = 'geographic_focus' in raw ? raw.geographic_focus : raw.geographicFocus;
  let geographicFocus;
  if ('geographic_focus' in raw || 'geographicFocus' in raw) {
    if (rawGeo === null || rawGeo === undefined || rawGeo === '') {
      geographicFocus = null;
    } else {
      const v = String(rawGeo).trim();
      if (!GEOGRAPHIC_FOCUS_SET.has(v)) fields.push({ field: 'geographic_focus', message: 'Select a valid region' });
      else geographicFocus = v;
    }
  }

  const rawMem = 'membership_capability' in raw ? raw.membership_capability : raw.membershipCapability;
  let membershipCapability;
  if ('membership_capability' in raw || 'membershipCapability' in raw) {
    const v = normaliseOptionalEnum(rawMem, CAPABILITY_SET);
    if (v === '__invalid__') fields.push({ field: 'membership_capability', message: 'Select a valid option' });
    else membershipCapability = v === null ? 'UNKNOWN' : v;
  }

  const rawDon = 'donation_capability' in raw ? raw.donation_capability : raw.donationCapability;
  let donationCapability;
  if ('donation_capability' in raw || 'donationCapability' in raw) {
    const v = normaliseOptionalEnum(rawDon, CAPABILITY_SET);
    if (v === '__invalid__') fields.push({ field: 'donation_capability', message: 'Select a valid option' });
    else donationCapability = v === null ? 'UNKNOWN' : v;
  }

  const rawSeating = 'reserved_seating_capability' in raw ? raw.reserved_seating_capability : raw.reservedSeatingCapability;
  let reservedSeatingCapability;
  if ('reserved_seating_capability' in raw || 'reservedSeatingCapability' in raw) {
    const v = normaliseOptionalEnum(rawSeating, CAPABILITY_SET);
    if (v === '__invalid__') fields.push({ field: 'reserved_seating_capability', message: 'Select a valid option' });
    else reservedSeatingCapability = v === null ? 'UNKNOWN' : v;
  }

  const description = 'description' in raw ? normaliseOptionalString(raw.description) : undefined;
  const sourceReferenceRaw = 'source_reference' in raw ? raw.source_reference : ('sourceReference' in raw ? raw.sourceReference : undefined);
  const sourceReference = sourceReferenceRaw !== undefined ? normaliseOptionalString(sourceReferenceRaw) : undefined;

  if (fields.length > 0) return { fields, payload: null };

  return {
    fields: [],
    payload: {
      name,
      vendor,
      category,
      deploymentModel,
      pricingModel,
      geographicFocus,
      description,
      membershipCapability,
      donationCapability,
      reservedSeatingCapability,
      sourceReference,
    },
  };
}

function stripAndSanitise(body) {
  const stripped = stripClientControlledSystemWriteKeys(body);
  delete stripped.customAttributes;
  delete stripped.custom_attributes;
  return stripped;
}

const createSystem = async (req, res) => {
  if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields: [{ field: 'body', message: 'Request body must be a JSON object' }] },
      meta: null,
    });
  }

  const raw = stripAndSanitise(req.body);
  const { fields, payload } = parseSystemWritePayload(raw, { requireAll: true });

  if (fields.length > 0) {
    return res.status(400).json({ data: null, error: { message: 'Validation failed', fields }, meta: null });
  }

  try {
    const data = await systemService.createSystem(payload);
    return res.status(201).json({ data, error: null, meta: null });
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.status(409).json({
        data: null,
        error: { message: 'A system with this name already exists', fields: [{ field: 'name', message: 'A system with this name already exists' }] },
        meta: null,
      });
    }
    console.error('[POST /api/systems] unexpected error', err);
    return res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

const updateSystem = async (req, res) => {
  const rawId = req.params?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(id)) {
    return res.status(404).json(notFoundEnvelope);
  }

  if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields: [{ field: 'body', message: 'Request body must be a JSON object' }] },
      meta: null,
    });
  }

  const raw = stripAndSanitise(req.body);
  const { fields, payload } = parseSystemWritePayload(raw, { requireAll: false });

  if (fields.length > 0) {
    return res.status(400).json({ data: null, error: { message: 'Validation failed', fields }, meta: null });
  }

  try {
    const data = await systemService.updateSystem(id, payload);
    if (!data) {
      return res.status(404).json(notFoundEnvelope);
    }
    return res.status(200).json({ data, error: null, meta: null });
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.status(409).json({
        data: null,
        error: { message: 'A system with this name already exists', fields: [{ field: 'name', message: 'A system with this name already exists' }] },
        meta: null,
      });
    }
    console.error('[PUT /api/systems/:id] unexpected error', err);
    return res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

const deleteSystem = async (req, res) => {
  const rawId = req.params?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(id)) {
    return res.status(404).json(notFoundEnvelope);
  }

  try {
    const result = await systemService.deleteSystem(id);
    if (result === null) {
      return res.status(404).json(notFoundEnvelope);
    }
    return res.status(200).json({ data: { id: result }, error: null, meta: null });
  } catch (err) {
    if (err?.code === 'SYSTEM_HAS_LINKS') {
      return res.status(409).json({
        data: null,
        error: {
          message: (() => {
            const n = err.linkedOrganisationCount;
            const orgWord = n === 1 ? 'organisation' : 'organisations';
            return `This system is linked to ${n} ${orgWord}. Remove all organisation links before deleting.`;
          })(),
          linkedOrganisationCount: err.linkedOrganisationCount,
        },
        meta: null,
      });
    }
    console.error('[DELETE /api/systems/:id] unexpected error', err);
    return res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

module.exports = { listSystems, getSystemById, createSystem, updateSystem, deleteSystem };
