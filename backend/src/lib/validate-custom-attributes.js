/** Scheme prefix is matched case-insensitively (RFC 3986); stored value normalises `http`/`https` to lowercase. */
const HTTP_URL_PREFIX = /^https?:\/\//i;

const MAX_LABEL_LEN = 200;
const MAX_VALUE_LEN = 200;
const MAX_SOURCE_REF_LEN = 500;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Validates `customAttributes` write payloads (Story 13.1).
 *
 * @param {unknown} value
 * @returns {{ ok: true, value: Array<{ label: string; value: string; sourceReference?: string }> } | { ok: false, errors: { field: string; message: string }[] }}
 */
function validateCustomAttributes(value) {
  if (!Array.isArray(value)) {
    return {
      ok: false,
      errors: [{ field: 'customAttributes', message: 'Must be an array.' }],
    };
  }

  /** @type {{ field: string; message: string }[]} */
  const errors = [];
  /** @type {Array<{ label: string; value: string; sourceReference?: string }>} */
  const cleaned = [];

  for (let i = 0; i < value.length; i += 1) {
    const el = value[i];
    const base = `customAttributes[${i}]`;

    if (!isPlainObject(el)) {
      errors.push({ field: base, message: 'Must be a plain object.' });
      continue;
    }

    const rawLabel = el.label;
    const rawValue = el.value;
    const rawRef = el.sourceReference;

    let labelTrimmed = '';
    if (rawLabel === undefined || rawLabel === null) {
      labelTrimmed = '';
    } else if (typeof rawLabel !== 'string') {
      errors.push({ field: `${base}.label`, message: 'Must be a string.' });
      continue;
    } else {
      labelTrimmed = rawLabel.trim();
    }

    let valueTrimmed = '';
    if (rawValue === undefined || rawValue === null) {
      valueTrimmed = '';
    } else if (typeof rawValue !== 'string') {
      errors.push({ field: `${base}.value`, message: 'Must be a string.' });
      continue;
    } else {
      valueTrimmed = rawValue.trim();
    }

    if (labelTrimmed === '' && valueTrimmed === '') {
      continue;
    }

    if (labelTrimmed === '' && valueTrimmed !== '') {
      errors.push({ field: `${base}.label`, message: 'Label is required when value is set.' });
      continue;
    }
    if (valueTrimmed === '' && labelTrimmed !== '') {
      errors.push({ field: `${base}.value`, message: 'Value is required when label is set.' });
      continue;
    }

    if (labelTrimmed.length > MAX_LABEL_LEN) {
      errors.push({
        field: `${base}.label`,
        message: `Must not exceed ${MAX_LABEL_LEN} characters.`,
      });
      continue;
    }
    if (valueTrimmed.length > MAX_VALUE_LEN) {
      errors.push({
        field: `${base}.value`,
        message: `Must not exceed ${MAX_VALUE_LEN} characters.`,
      });
      continue;
    }

    let sourceReference;
    if (rawRef !== undefined && rawRef !== null) {
      if (typeof rawRef !== 'string') {
        errors.push({ field: `${base}.sourceReference`, message: 'Must be a string.' });
        continue;
      }
      const refTrim = rawRef.trim();
      if (refTrim !== '') {
        if (refTrim.length > MAX_SOURCE_REF_LEN) {
          errors.push({
            field: `${base}.sourceReference`,
            message: `Must not exceed ${MAX_SOURCE_REF_LEN} characters.`,
          });
          continue;
        }
        if (!HTTP_URL_PREFIX.test(refTrim)) {
          errors.push({
            field: `${base}.sourceReference`,
            message: 'Source URL must start with http:// or https://',
          });
          continue;
        }
        sourceReference = refTrim.replace(HTTP_URL_PREFIX, (m) => m.toLowerCase());
      }
    }

    /** @type {{ label: string; value: string; sourceReference?: string }} */
    const row = { label: labelTrimmed, value: valueTrimmed };
    if (sourceReference !== undefined) row.sourceReference = sourceReference;
    cleaned.push(row);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: cleaned };
}

module.exports = { validateCustomAttributes };
