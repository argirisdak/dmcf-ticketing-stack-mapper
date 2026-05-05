const organisationService = require('../services/organisation-service');
const prisma = require('../lib/prisma');
const { ORGANISATION_SORT_KEYS } = require('../lib/sort-allowlists');
const { COUNTRIES } = require('../lib/countries');
const { ORGANISATION_FIELD_SOURCE_KEYS } = require('../lib/field-source-keys');
const { validateFieldSources } = require('../lib/validate-field-sources');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/** Reject malformed ids before Prisma so invalid UUID strings do not throw. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidParam(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

const ORGANISATION_SORT_SET = new Set(ORGANISATION_SORT_KEYS);
const COUNTRY_SET = new Set(COUNTRIES);
const CAPABILITY_SET = new Set(['YES', 'NO', 'UNKNOWN']);
const VALID_ROLES = new Set(['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY']);
const MIN_CAPACITY = 0;
const MAX_CAPACITY = 2_147_483_647;

function normaliseCapability(value, field) {
  if (value === undefined || value === null || value === '') return { ok: true, value: 'UNKNOWN' };
  if (typeof value !== 'string') {
    return { ok: false, field, message: 'Select a valid option' };
  }
  const v = value.trim().toUpperCase();
  if (v === '') return { ok: true, value: 'UNKNOWN' };
  if (!CAPABILITY_SET.has(v)) {
    return { ok: false, field, message: 'Select a valid option' };
  }
  return { ok: true, value: v };
}

function normaliseOptionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return String(value);
  const t = value.trim();
  return t === '' ? null : t;
}

function normaliseCapacity(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      return { ok: false, message: 'Enter a whole number for capacity' };
    }
    if (value < MIN_CAPACITY || value > MAX_CAPACITY) {
      return { ok: false, message: 'Enter a capacity between 0 and 2,147,483,647' };
    }
    return { ok: true, value };
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.trim());
    if (!Number.isInteger(n)) {
      return { ok: false, message: 'Enter a whole number for capacity' };
    }
    if (n < MIN_CAPACITY || n > MAX_CAPACITY) {
      return { ok: false, message: 'Enter a capacity between 0 and 2,147,483,647' };
    }
    return { ok: true, value: n };
  }
  return { ok: false, message: 'Enter a whole number for capacity' };
}

/** Express `req.query` values are string or string[] when keys repeat — normalise to a single string. */
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

/**
 * Checks the (already-stripped) body for v1 legacy FK keys that must be rejected.
 * Returns a fields[] array with one entry per forbidden key present.
 * @param {Record<string, unknown>} body
 */
function checkForbiddenOrganisationBodyKeys(body) {
  const forbidden = [];
  for (const key of ['ticketing_provider_id', 'crm_platform_id', 'ticketingProviderId', 'crmPlatformId', 'systems']) {
    if (key in body) {
      forbidden.push({
        field: key,
        message: 'Use POST /api/organisations/:id/systems instead',
      });
    }
  }
  return forbidden;
}

const checkSimilarOrganisations = async (req, res) => {
  const fields = [];

  const nameRaw = asQueryString(req.query.name);
  const name = nameRaw === undefined ? '' : String(nameRaw).trim();
  if (name.length < 2) {
    fields.push({ field: 'name', message: 'Name must be at least 2 characters.' });
  }

  const excludeRaw = asQueryString(req.query.excludeId);
  let excludeId = null;
  if (excludeRaw !== undefined) {
    const trimmed = excludeRaw.trim();
    if (trimmed === '') {
      excludeId = null;
    } else if (!isUuidParam(trimmed)) {
      fields.push({ field: 'excludeId', message: 'Must be a valid UUID.' });
    } else {
      excludeId = trimmed;
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
    const data = await organisationService.findSimilarOrganisations(name, excludeId);
    return res.json({ data, error: null, meta: null });
  } catch (err) {
    console.error('[GET /api/organisations/check-similar] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

const listOrganisations = async (req, res) => {
  const fields = [];

  let page = 1;
  const pageStr = asQueryString(req.query.page);
  if (pageStr !== undefined) {
    const p = Number(pageStr);
    if (!Number.isInteger(p) || p < 1) {
      fields.push({ field: 'page', message: 'page must be a positive integer' });
    } else {
      page = p;
    }
  }

  let limit = DEFAULT_LIMIT;
  const limitStr = asQueryString(req.query.limit);
  if (limitStr !== undefined) {
    const l = Number(limitStr);
    if (!Number.isInteger(l) || l < 1) {
      fields.push({ field: 'limit', message: 'limit must be a positive integer' });
    } else if (l > MAX_LIMIT) {
      fields.push({ field: 'limit', message: `limit must not exceed ${MAX_LIMIT}` });
    } else {
      limit = l;
    }
  }

  // Reject deprecated v1 filter params explicitly
  const providerRaw = asQueryString(req.query.provider);
  if (providerRaw !== undefined) {
    fields.push({ field: 'provider', message: 'Unknown filter' });
  }
  const crmRaw = asQueryString(req.query.crm);
  if (crmRaw !== undefined) {
    fields.push({ field: 'crm', message: 'Unknown filter' });
  }

  // v2 system filter
  const systemRaw = asQueryString(req.query.system);
  const systemRoleRaw = asQueryString(req.query.system_role);
  let systemUuid;
  let systemRole;

  if (systemRaw !== undefined) {
    const trimmed = systemRaw.trim();
    if (!isUuidParam(trimmed)) {
      fields.push({ field: 'system', message: 'Provide a valid system UUID' });
    } else {
      systemUuid = trimmed;
    }
  }

  if (systemRoleRaw !== undefined) {
    if (systemUuid === undefined && systemRaw === undefined) {
      // system_role without any system param
      fields.push({ field: 'system_role', message: 'Provide a system filter to use a role sub-filter' });
    } else if (systemUuid !== undefined) {
      // system is valid UUID — validate the role
      const r = systemRoleRaw.trim().toUpperCase();
      if (!VALID_ROLES.has(r)) {
        fields.push({ field: 'system_role', message: 'Select a valid role' });
      } else {
        systemRole = r;
      }
    } else {
      // system param was present but failed UUID validation — only report the system UUID error
      // (system_role dependency error would be confusing on top of an invalid UUID)
    }
  }

  const qRaw = asQueryString(req.query.q);
  const countryRaw = asQueryString(req.query.country);
  const typeRaw = asQueryString(req.query.type);
  const membershipRaw = asQueryString(req.query.membership);
  const donationRaw = asQueryString(req.query.donation);
  const seatingRaw = asQueryString(req.query.seating);

  if (countryRaw !== undefined && countryRaw.trim() !== '') {
    const c = countryRaw.trim();
    if (!COUNTRY_SET.has(c)) {
      fields.push({ field: 'country', message: 'Select a country' });
    }
  }

  const memQ = normaliseCapability(membershipRaw, 'membership');
  if (!memQ.ok) fields.push({ field: memQ.field, message: memQ.message });
  const donQ = normaliseCapability(donationRaw, 'donation');
  if (!donQ.ok) fields.push({ field: donQ.field, message: donQ.message });
  const seatQ = normaliseCapability(seatingRaw, 'seating');
  if (!seatQ.ok) fields.push({ field: seatQ.field, message: seatQ.message });

  const sortRaw = asQueryString(req.query.sort);
  const orderRaw = asQueryString(req.query.order);
  let listSort = 'name';
  let listOrder = 'asc';
  if (sortRaw !== undefined && sortRaw.trim() !== '') {
    const s = sortRaw.trim();
    if (!ORGANISATION_SORT_SET.has(s)) {
      fields.push({
        field: 'sort',
        message: `Sort field must be one of: ${ORGANISATION_SORT_KEYS.join(', ')}`,
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

  const listParams = { page, limit, sort: listSort, order: listOrder };

  if (qRaw !== undefined && qRaw.trim() !== '') {
    listParams.q = qRaw.trim();
  }
  if (countryRaw !== undefined && countryRaw.trim() !== '') {
    listParams.country = countryRaw.trim();
  }
  const typeTrimmed = typeRaw !== undefined && typeof typeRaw === 'string' ? typeRaw.trim() : '';
  if (typeTrimmed !== '') {
    listParams.type = typeTrimmed;
  }
  if (systemUuid !== undefined) {
    listParams.system = systemUuid;
  }
  if (systemRole !== undefined) {
    listParams.system_role = systemRole;
  }
  if (membershipRaw !== undefined && membershipRaw !== null && String(membershipRaw).trim() !== '') {
    listParams.membership = memQ.value;
  }
  if (donationRaw !== undefined && donationRaw !== null && String(donationRaw).trim() !== '') {
    listParams.donation = donQ.value;
  }
  if (seatingRaw !== undefined && seatingRaw !== null && String(seatingRaw).trim() !== '') {
    listParams.seating = seatQ.value;
  }

  try {
    const { data, total, totalPages } = await organisationService.listOrganisations(listParams);
    return res.json({
      data,
      error: null,
      meta: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error('[GET /api/organisations] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

const notFoundEnvelope = {
  data: null,
  error: { message: 'Organisation not found', fields: [] },
  meta: null,
};

const getOrganisationById = async (req, res) => {
  const rawId = req.params?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(id)) {
    return res.status(404).json(notFoundEnvelope);
  }

  try {
    const data = await organisationService.getOrganisationById(id);
    if (!data) {
      return res.status(404).json(notFoundEnvelope);
    }
    return res.json({ data, error: null, meta: null });
  } catch (err) {
    console.error('[GET /api/organisations/:id] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

function stripClientControlledOrganisationKeys(body) {
  const raw = { ...body };
  delete raw.id;
  delete raw.lastUpdated;
  delete raw.createdAt;
  delete raw.updatedAt;
  delete raw.last_updated;
  delete raw.created_at;
  delete raw.updated_at;
  return raw;
}

/**
 * Validates a write payload (create/update) after client-controlled keys are stripped
 * and forbidden legacy keys are rejected.
 * @returns {{ fields: { field: string; message: string }[]; payload: object | null }}
 */
function parseOrganisationWritePayload(raw) {
  const fields = [];

  const name =
    typeof raw.name === 'string'
      ? raw.name.trim()
      : raw.name === undefined || raw.name === null
        ? ''
        : String(raw.name).trim();
  if (!name) {
    fields.push({ field: 'name', message: 'Enter the organisation name' });
  }

  const countryRaw =
    typeof raw.country === 'string'
      ? raw.country.trim()
      : raw.country === undefined || raw.country === null
        ? ''
        : String(raw.country).trim();
  if (!countryRaw) {
    fields.push({ field: 'country', message: 'Select a country' });
  } else if (!COUNTRY_SET.has(countryRaw)) {
    fields.push({ field: 'country', message: 'Select a country' });
  }

  const orgTypeRaw = raw.organisationTypeId;
  const organisationTypeId =
    typeof orgTypeRaw === 'string'
      ? orgTypeRaw.trim()
      : orgTypeRaw === undefined || orgTypeRaw === null
        ? ''
        : String(orgTypeRaw).trim();
  if (!organisationTypeId) {
    fields.push({ field: 'organisationTypeId', message: 'Select an organisation type' });
  }

  const mem = normaliseCapability(raw.membershipCapability, 'membershipCapability');
  if (!mem.ok) fields.push({ field: mem.field, message: mem.message });
  const don = normaliseCapability(raw.donationCapability, 'donationCapability');
  if (!don.ok) fields.push({ field: don.field, message: don.message });
  const rs = normaliseCapability(raw.reservedSeatingCapability, 'reservedSeatingCapability');
  if (!rs.ok) fields.push({ field: rs.field, message: rs.message });

  const cap = normaliseCapacity(raw.capacity);
  if (!cap.ok) {
    fields.push({ field: 'capacity', message: cap.message });
  }

  const fieldSourcesRaw =
    'fieldSources' in raw ? raw.fieldSources : 'field_sources' in raw ? raw.field_sources : undefined;
  let fieldSources;
  if (fieldSourcesRaw !== undefined) {
    const vr = validateFieldSources(fieldSourcesRaw, ORGANISATION_FIELD_SOURCE_KEYS);
    if (!vr.ok) {
      fields.push(...vr.errors);
    } else {
      fieldSources = vr.value;
    }
  }

  const sourceReference = normaliseOptionalString(raw.sourceReference);
  const notes = normaliseOptionalString(raw.notes);
  const city = normaliseOptionalString(raw.city);

  if (fields.length > 0) {
    return { fields, payload: null };
  }

  const payload = {
    name,
    city,
    country: countryRaw,
    organisationTypeId,
    membershipCapability: mem.value,
    donationCapability: don.value,
    reservedSeatingCapability: rs.value,
    sourceReference,
    notes,
    capacity: cap.value,
    ...(fieldSourcesRaw !== undefined ? { fieldSources } : {}),
  };

  return { fields: [], payload };
}

async function validateOrganisationForeignKeys(payload) {
  const { organisationTypeId } = payload;

  if (organisationTypeId) {
    const typeRow = await prisma.organisationType.findUnique({ where: { id: organisationTypeId } });
    if (!typeRow) {
      return {
        response: {
          status: 400,
          body: {
            data: null,
            error: {
              message: 'Validation failed',
              fields: [{ field: 'organisationTypeId', message: 'Select an organisation type' }],
            },
            meta: null,
          },
        },
      };
    }
  }

  return { response: null };
}

/** Prisma P2002 meta.target may list columns or the DB constraint name. */
function isOrganisationNameCityCountryUniqueViolation(err) {
  if (err?.code !== 'P2002') return false;
  const target = err.meta?.target;
  if (typeof target === 'string') {
    return target.includes('name_city_country');
  }
  if (Array.isArray(target)) {
    if (target.some((x) => typeof x === 'string' && String(x).includes('name_city_country'))) {
      return true;
    }
    const set = new Set(target);
    return set.has('name') && set.has('city') && set.has('country');
  }
  return false;
}

function organisationCompositeUniqueConflictEnvelope(req) {
  const raw = stripClientControlledOrganisationKeys(req.body);
  const parsed = parseOrganisationWritePayload(raw);
  const name =
    parsed.payload?.name ??
    (typeof raw.name === 'string' ? raw.name.trim() : raw.name != null ? String(raw.name).trim() : '');
  const country =
    parsed.payload?.country ??
    (typeof raw.country === 'string'
      ? raw.country.trim()
      : raw.country != null
        ? String(raw.country).trim()
        : '');
  const cityRaw = parsed.payload?.city;
  const cityLabel = cityRaw == null || cityRaw === '' ? '(no city)' : cityRaw;

  return {
    data: null,
    error: {
      message: `An organisation called "${name}" already exists in ${cityLabel}, ${country}.`,
      fields: [{ field: 'name', message: 'Conflicts with existing organisation in this city and country.' }],
    },
    meta: null,
  };
}

function genericUniqueConflictEnvelope() {
  return {
    data: null,
    error: { message: 'A record with this value already exists', fields: [] },
    meta: null,
  };
}

function handleOrganisationWritePrismaError(err, req, res, logLabel) {
  if (err?.code === 'P2002') {
    if (isOrganisationNameCityCountryUniqueViolation(err)) {
      return res.status(409).json(organisationCompositeUniqueConflictEnvelope(req));
    }
    return res.status(409).json(genericUniqueConflictEnvelope());
  }
  console.error(logLabel, err);
  return res.status(500).json({
    data: null,
    error: { message: 'An unexpected error occurred', fields: [] },
    meta: null,
  });
}

const createOrganisation = async (req, res) => {
  if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      data: null,
      error: {
        message: 'Validation failed',
        fields: [{ field: 'body', message: 'Request body must be a JSON object' }],
      },
      meta: null,
    });
  }

  const raw = stripClientControlledOrganisationKeys(req.body);

  const forbiddenFields = checkForbiddenOrganisationBodyKeys(raw);
  if (forbiddenFields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields: forbiddenFields },
      meta: null,
    });
  }

  const { fields, payload } = parseOrganisationWritePayload(raw);

  if (fields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields },
      meta: null,
    });
  }

  const fk = await validateOrganisationForeignKeys(payload);
  if (fk.response) {
    return res.status(fk.response.status).json(fk.response.body);
  }

  try {
    const data = await organisationService.createOrganisation(payload);
    return res.status(201).json({ data, error: null, meta: null });
  } catch (err) {
    return handleOrganisationWritePrismaError(err, req, res, '[POST /api/organisations] unexpected error');
  }
};

const updateOrganisation = async (req, res) => {
  const rawId = req.params?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(id)) {
    return res.status(404).json(notFoundEnvelope);
  }

  if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      data: null,
      error: {
        message: 'Validation failed',
        fields: [{ field: 'body', message: 'Request body must be a JSON object' }],
      },
      meta: null,
    });
  }

  const raw = stripClientControlledOrganisationKeys(req.body);

  const forbiddenFields = checkForbiddenOrganisationBodyKeys(raw);
  if (forbiddenFields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields: forbiddenFields },
      meta: null,
    });
  }

  const { fields, payload } = parseOrganisationWritePayload(raw);

  if (fields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields },
      meta: null,
    });
  }

  const fk = await validateOrganisationForeignKeys(payload);
  if (fk.response) {
    return res.status(fk.response.status).json(fk.response.body);
  }

  try {
    const data = await organisationService.updateOrganisation(id, payload);
    if (!data) {
      return res.status(404).json(notFoundEnvelope);
    }
    return res.status(200).json({ data, error: null, meta: null });
  } catch (err) {
    return handleOrganisationWritePrismaError(err, req, res, '[PUT /api/organisations/:id] unexpected error');
  }
};

const deleteOrganisation = async (req, res) => {
  const rawId = req.params?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(id)) {
    return res.status(404).json(notFoundEnvelope);
  }

  try {
    const deletedId = await organisationService.deleteOrganisation(id);
    if (!deletedId) {
      return res.status(404).json(notFoundEnvelope);
    }
    return res.status(200).json({ data: { id: deletedId }, error: null, meta: null });
  } catch (err) {
    console.error('[DELETE /api/organisations/:id] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

module.exports = {
  listOrganisations,
  checkSimilarOrganisations,
  getOrganisationById,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
};
