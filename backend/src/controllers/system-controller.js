const systemService = require('../services/system-service');
const { SYSTEM_SORT_KEYS } = require('../lib/sort-allowlists');
const { SYSTEM_GEOGRAPHIC_FOCUS } = require('../lib/system-geographic-focus');
const { stripClientControlledSystemWriteKeys } = require('../lib/strip-client-controlled-write-keys');
const { SYSTEM_FIELD_SOURCE_KEYS } = require('../lib/field-source-keys');
const { validateFieldSources } = require('../lib/validate-field-sources');
const { validateCustomAttributes } = require('../lib/validate-custom-attributes');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_Q_LENGTH = 200;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidParam(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

const SYSTEM_SORT_SET = new Set(SYSTEM_SORT_KEYS);
const SYSTEM_CATEGORY_SET = new Set(['INTEGRATED', 'TICKETING', 'AUDIENCE_MANAGEMENT']);
const DEPLOYMENT_MODEL_SET = new Set(['SAAS', 'SELF_HOSTED', 'HYBRID']);
const PRICING_MODEL_SET = new Set(['SUBSCRIPTION', 'TRANSACTION_FEE', 'LICENCE', 'HYBRID', 'UNKNOWN']);
const CAPABILITY_SET = new Set(['YES', 'NO', 'UNKNOWN']);
const GEOGRAPHIC_FOCUS_SET = new Set(SYSTEM_GEOGRAPHIC_FOCUS);

/** Five v3 system capabilities: API camelCase, optional snake_case body alias, Prisma column (for service filters). */
const SYSTEM_EXTENDED_CAPABILITY_FIELDS = [
  { apiField: 'seasonSubscriptionsCapability', camelKey: 'seasonSubscriptionsCapability', snakeKey: 'season_subscriptions_capability' },
  { apiField: 'dynamicPricingCapability', camelKey: 'dynamicPricingCapability', snakeKey: 'dynamic_pricing_capability' },
  { apiField: 'multiVenueSupportCapability', camelKey: 'multiVenueSupportCapability', snakeKey: 'multi_venue_support_capability' },
  { apiField: 'marketingAutomationCapability', camelKey: 'marketingAutomationCapability', snakeKey: 'marketing_automation_capability' },
  { apiField: 'accessibilityFeaturesCapability', camelKey: 'accessibilityFeaturesCapability', snakeKey: 'accessibility_features_capability' },
];

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

  const extendedCapabilityFilters = {};
  for (const def of SYSTEM_EXTENDED_CAPABILITY_FIELDS) {
    const rawCap = asQueryString(req.query[def.apiField]);
    if (rawCap === undefined) continue;
    const v = rawCap.trim().toUpperCase();
    if (!CAPABILITY_SET.has(v)) {
      fields.push({ field: def.apiField, message: 'Select a valid option' });
    } else {
      extendedCapabilityFilters[def.camelKey] = v;
    }
  }

  const sortRaw = asQueryString(req.query.sort);
  const orderRaw = asQueryString(req.query.order);
  let listSort = 'name';
  let listOrder = 'asc';
  if (sortRaw !== undefined && sortRaw.trim() !== '') {
    const s = sortRaw.trim();
    if (!SYSTEM_SORT_SET.has(s)) {
      fields.push({
        field: 'sort',
        message: `Sort field must be one of: ${SYSTEM_SORT_KEYS.join(', ')}`,
      });
    } else {
      listSort = s;
    }
  }
  if (orderRaw !== undefined && orderRaw.trim() !== '') {
    const o = orderRaw.trim().toLowerCase();
    if (o !== 'asc' && o !== 'desc') {
      fields.push({ field: 'order', message: 'Order must be asc or desc' });
    } else {
      listOrder = o;
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
      sort: listSort,
      order: listOrder,
      q: qTrimmedEarly ?? undefined,
      categories,
      deploymentModel,
      pricingModel,
      geographicFocus,
      membership,
      donation,
      seating,
      ...extendedCapabilityFilters,
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

  const extCapabilityPayload = {};
  for (const def of SYSTEM_EXTENDED_CAPABILITY_FIELDS) {
    if (!(def.snakeKey in raw || def.camelKey in raw)) continue;
    const rawCap = def.snakeKey in raw ? raw[def.snakeKey] : raw[def.camelKey];
    const v = normaliseOptionalEnum(rawCap, CAPABILITY_SET);
    if (v === '__invalid__') {
      fields.push({ field: def.apiField, message: 'Must be YES, NO, or UNKNOWN' });
    } else {
      extCapabilityPayload[def.camelKey] = v === null ? 'UNKNOWN' : v;
    }
  }

  const description = 'description' in raw ? normaliseOptionalString(raw.description) : undefined;
  const sourceReferenceRaw = 'source_reference' in raw ? raw.source_reference : ('sourceReference' in raw ? raw.sourceReference : undefined);
  const sourceReference = sourceReferenceRaw !== undefined ? normaliseOptionalString(sourceReferenceRaw) : undefined;

  const fieldSourcesRaw =
    'fieldSources' in raw ? raw.fieldSources : 'field_sources' in raw ? raw.field_sources : undefined;
  let fieldSources;
  if (fieldSourcesRaw !== undefined) {
    const vr = validateFieldSources(fieldSourcesRaw, SYSTEM_FIELD_SOURCE_KEYS);
    if (!vr.ok) {
      fields.push(...vr.errors);
    } else {
      fieldSources = vr.value;
    }
  }

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
      ...extCapabilityPayload,
      sourceReference,
      ...(fieldSourcesRaw !== undefined ? { fieldSources } : {}),
    },
  };
}

function stripAndSanitise(body) {
  const stripped = stripClientControlledSystemWriteKeys(body);
  delete stripped.customAttributes;
  delete stripped.custom_attributes;
  return stripped;
}

function customAttributesKeyPresent(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return false;
  return (
    Object.prototype.hasOwnProperty.call(body, 'customAttributes')
    || Object.prototype.hasOwnProperty.call(body, 'custom_attributes')
  );
}

function rawCustomAttributesFromBody(body) {
  if (Object.prototype.hasOwnProperty.call(body, 'customAttributes')) return body.customAttributes;
  return body.custom_attributes;
}

/**
 * When `customAttributes` / `custom_attributes` is present on the original body, validates and sets
 * `payload.customAttributes` to `null` (clear) or a cleaned array. Omits the key when the field is absent (PUT preserve).
 */
function mergeCustomAttributesWrite(originalBody, fields, payload) {
  if (!customAttributesKeyPresent(originalBody)) return;
  if (
    Object.prototype.hasOwnProperty.call(originalBody, 'customAttributes')
    && Object.prototype.hasOwnProperty.call(originalBody, 'custom_attributes')
  ) {
    fields.push({
      field: 'customAttributes',
      message: 'Cannot provide both customAttributes and custom_attributes.',
    });
    return;
  }
  const vr = validateCustomAttributes(rawCustomAttributesFromBody(originalBody));
  if (!vr.ok) {
    fields.push(...vr.errors);
    return;
  }
  if (payload == null) return;
  payload.customAttributes = vr.value.length === 0 ? null : vr.value;
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
  mergeCustomAttributesWrite(req.body, fields, payload);

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
  mergeCustomAttributesWrite(req.body, fields, payload);

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
