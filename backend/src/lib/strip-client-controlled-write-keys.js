/**
 * Strip client-supplied timestamps and ids from write payloads (ADR-011 extension for System / organisation_system).
 */

function stripClientControlledTimestampKeys(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const raw = { ...body };
  delete raw.lastUpdated;
  delete raw.last_updated;
  delete raw.createdAt;
  delete raw.created_at;
  delete raw.updatedAt;
  delete raw.updated_at;
  return raw;
}

function stripClientControlledSystemWriteKeys(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const raw = stripClientControlledTimestampKeys({ ...body });
  delete raw.id;
  return raw;
}

/** Junction writes: same timestamp strip + id; route params supply organisation / system ids in Epic 8+. */
function stripClientControlledOrganisationSystemWriteKeys(body) {
  return stripClientControlledSystemWriteKeys(body);
}

module.exports = {
  stripClientControlledTimestampKeys,
  stripClientControlledSystemWriteKeys,
  stripClientControlledOrganisationSystemWriteKeys,
};
