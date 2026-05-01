function dateTimeToIso(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

function toLinkDto(link) {
  return {
    id: link.id,
    role: link.role,
    sourceReference: link.source_reference ?? null,
    note: link.note ?? null,
    lastUpdated: dateTimeToIso(link.last_updated),
    system: link.system
      ? { id: link.system.id, name: link.system.name, vendor: link.system.vendor, category: link.system.category }
      : null,
  };
}

module.exports = { toLinkDto };
