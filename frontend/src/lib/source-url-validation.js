const HTTP_URL_PREFIX = /^https?:\/\//

/**
 * @param {unknown} value
 * @returns {boolean} true if empty (after trim) or starts with http:// or https://
 */
export function isValidSourceUrl(value) {
  if (value == null) return true
  const t = String(value).trim()
  if (t === '') return true
  return HTTP_URL_PREFIX.test(t)
}

export const SOURCE_URL_CLIENT_ERROR = 'Source URL must start with http:// or https://'
