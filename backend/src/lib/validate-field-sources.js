/** Matches scheme case-insensitively (RFC 3986); stored value normalises to lowercase. */
const HTTP_URL_PREFIX = /^https?:\/\//i;

/**
 * Validates and copies allowed `fieldSources` entries (plain object of URL strings).
 * Values are trimmed and the scheme is normalised to lowercase before storage.
 *
 * @param {unknown} value
 * @param {readonly string[]} allowList
 * @returns {{ ok: true, value: Record<string, string> } | { ok: false, errors: { field: string; message: string }[] }}
 */
function validateFieldSources(value, allowList) {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      errors: [{ field: 'fieldSources', message: 'Must be an object.' }],
    };
  }

  const allowedCsv = allowList.join(', ');
  const allowSet = new Set(allowList);
  /** @type {Record<string, string>} */
  const out = {};
  /** @type {{ field: string; message: string }[]} */
  const errors = [];

  for (const key of Object.keys(value)) {
    if (!allowSet.has(key)) {
      errors.push({
        field: `fieldSources.${key}`,
        message: `Unknown field source key. Allowed: ${allowedCsv}`,
      });
      continue;
    }
    const v = value[key];
    if (typeof v !== 'string') {
      errors.push({
        field: `fieldSources.${key}`,
        message: 'Must be a string.',
      });
      continue;
    }
    const trimmed = v.trim();
    if (!HTTP_URL_PREFIX.test(trimmed)) {
      errors.push({
        field: `fieldSources.${key}`,
        message: 'Source URL must start with http:// or https://',
      });
      continue;
    }
    out[key] = trimmed.replace(HTTP_URL_PREFIX, (m) => m.toLowerCase());
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: out };
}

module.exports = { validateFieldSources };
