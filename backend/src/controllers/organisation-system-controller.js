const organisationSystemService = require('../services/organisation-system-service');
const prisma = require('../lib/prisma');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidParam(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

const VALID_ROLES = new Set(['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY']);

function stripLinkWriteKeys(body) {
  const raw = { ...body };
  delete raw.id;
  delete raw.lastUpdated;
  delete raw.createdAt;
  delete raw.last_updated;
  delete raw.created_at;
  delete raw.updatedAt;
  delete raw.updated_at;
  return raw;
}

function normaliseOptionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return String(value);
  const t = value.trim();
  return t === '' ? null : t;
}

const orgNotFoundEnvelope = {
  data: null,
  error: { message: 'Organisation not found', fields: [] },
  meta: null,
};

const linkNotFoundEnvelope = {
  data: null,
  error: { message: 'Link not found', fields: [] },
  meta: null,
};

const listLinks = async (req, res) => {
  const rawId = req.params?.id;
  const orgId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(orgId)) {
    return res.status(404).json(orgNotFoundEnvelope);
  }

  try {
    const data = await organisationSystemService.listLinks(orgId);
    if (data === null) {
      return res.status(404).json(orgNotFoundEnvelope);
    }
    return res.json({ data, error: null, meta: null });
  } catch (err) {
    console.error('[GET /api/organisations/:id/systems] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

const createLink = async (req, res) => {
  const rawId = req.params?.id;
  const orgId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(orgId)) {
    return res.status(404).json(orgNotFoundEnvelope);
  }

  if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields: [{ field: 'body', message: 'Request body must be a JSON object' }] },
      meta: null,
    });
  }

  const raw = stripLinkWriteKeys(req.body);
  const fields = [];

  const systemIdRaw = typeof raw.systemId === 'string' ? raw.systemId.trim() : '';
  if (!systemIdRaw) {
    fields.push({ field: 'systemId', message: 'Select a system' });
  } else if (!isUuidParam(systemIdRaw)) {
    fields.push({ field: 'systemId', message: 'Select a valid system' });
  }

  const roleRaw = typeof raw.role === 'string' ? raw.role.trim().toUpperCase() : '';
  if (!roleRaw) {
    fields.push({ field: 'role', message: 'Select a role' });
  } else if (!VALID_ROLES.has(roleRaw)) {
    fields.push({ field: 'role', message: 'Select a role' });
  }

  if (fields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields },
      meta: null,
    });
  }

  const org = await prisma.organisation.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) {
    return res.status(404).json(orgNotFoundEnvelope);
  }

  const system = await prisma.system.findUnique({ where: { id: systemIdRaw }, select: { id: true } });
  if (!system) {
    return res.status(404).json({
      data: null,
      error: { message: 'System not found', fields: [] },
      meta: null,
    });
  }

  try {
    const sourceReference = normaliseOptionalString(raw.sourceReference);
    const note = normaliseOptionalString(raw.note);
    const data = await organisationSystemService.createLink(orgId, {
      systemId: systemIdRaw,
      role: roleRaw,
      sourceReference,
      note,
    });
    return res.status(201).json({ data, error: null, meta: null });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        data: null,
        error: {
          message: 'This organisation is already linked to that system',
          fields: [{ field: 'systemId', message: 'Already linked' }],
        },
        meta: null,
      });
    }
    console.error('[POST /api/organisations/:id/systems] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

const updateLink = async (req, res) => {
  const rawId = req.params?.id;
  const orgId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(orgId)) {
    return res.status(404).json(orgNotFoundEnvelope);
  }

  const rawLinkId = req.params?.linkId;
  const linkId = typeof rawLinkId === 'string' ? rawLinkId.trim() : '';
  if (!isUuidParam(linkId)) {
    return res.status(404).json(linkNotFoundEnvelope);
  }

  if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields: [{ field: 'body', message: 'Request body must be a JSON object' }] },
      meta: null,
    });
  }

  const raw = stripLinkWriteKeys(req.body);
  const fields = [];

  if (raw.role !== undefined) {
    const roleRaw = typeof raw.role === 'string' ? raw.role.trim().toUpperCase() : '';
    if (!roleRaw || !VALID_ROLES.has(roleRaw)) {
      fields.push({ field: 'role', message: 'Select a role' });
    } else {
      raw.role = roleRaw;
    }
  }

  if (raw.systemId !== undefined) {
    const systemIdRaw = typeof raw.systemId === 'string' ? raw.systemId.trim() : '';
    if (!isUuidParam(systemIdRaw)) {
      fields.push({ field: 'systemId', message: 'Select a valid system' });
    } else {
      raw.systemId = systemIdRaw;
    }
  }

  if (fields.length > 0) {
    return res.status(400).json({
      data: null,
      error: { message: 'Validation failed', fields },
      meta: null,
    });
  }

  if (raw.systemId !== undefined) {
    const system = await prisma.system.findUnique({ where: { id: raw.systemId }, select: { id: true } });
    if (!system) {
      return res.status(404).json({
        data: null,
        error: { message: 'System not found', fields: [] },
        meta: null,
      });
    }
  }

  const patch = {};
  if (raw.role !== undefined)          patch.role = raw.role;
  if (raw.systemId !== undefined)      patch.systemId = raw.systemId;
  if ('sourceReference' in raw)        patch.sourceReference = normaliseOptionalString(raw.sourceReference);
  if ('note' in raw)                   patch.note = normaliseOptionalString(raw.note);

  try {
    const data = await organisationSystemService.updateLink(orgId, linkId, patch);
    if (data === null) {
      return res.status(404).json(linkNotFoundEnvelope);
    }
    return res.status(200).json({ data, error: null, meta: null });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        data: null,
        error: {
          message: 'This organisation is already linked to that system',
          fields: [{ field: 'systemId', message: 'Already linked' }],
        },
        meta: null,
      });
    }
    console.error('[PUT /api/organisations/:id/systems/:linkId] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

const deleteLink = async (req, res) => {
  const rawId = req.params?.id;
  const orgId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!isUuidParam(orgId)) {
    return res.status(404).json(orgNotFoundEnvelope);
  }

  const rawLinkId = req.params?.linkId;
  const linkId = typeof rawLinkId === 'string' ? rawLinkId.trim() : '';
  if (!isUuidParam(linkId)) {
    return res.status(404).json(linkNotFoundEnvelope);
  }

  try {
    const result = await organisationSystemService.deleteLink(orgId, linkId);
    if (result === null) {
      return res.status(404).json(linkNotFoundEnvelope);
    }
    return res.status(200).json({ data: { id: result.id }, error: null, meta: null });
  } catch (err) {
    console.error('[DELETE /api/organisations/:id/systems/:linkId] unexpected error', err);
    return res.status(500).json({
      data: null,
      error: { message: 'An unexpected error occurred', fields: [] },
      meta: null,
    });
  }
};

module.exports = { listLinks, createLink, updateLink, deleteLink };
