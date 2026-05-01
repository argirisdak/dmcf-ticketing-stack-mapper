/** Order matches filter bar and clear-all behaviour. */
export const LIST_FILTER_PARAM_KEYS = Object.freeze([
  'country',
  'type',
  'system',
  'system_role',
  'membership',
  'donation',
  'seating',
])

/** URL param keys that must use YES | NO | UNKNOWN. */
export const CAPABILITY_FILTER_PARAM_KEYS = new Set(['membership', 'donation', 'seating'])

const CAPABILITY_URL_VALUES = ['YES', 'NO', 'UNKNOWN']

/** @param {string | null | undefined} raw */
export function normaliseCapabilityParam(raw) {
  if (raw == null || raw === '') return ''
  const t = raw.trim()
  if (t === '') return ''
  return CAPABILITY_URL_VALUES.includes(t) ? t : ''
}

export const FILTER_DIMENSION_LABELS = Object.freeze({
  country: 'Country',
  type: 'Type',
  system: 'Adopted system',
  system_role: 'Role',
  membership: 'Membership',
  donation: 'Donation',
  seating: 'Reserved Seating',
})

/**
 * @param {URLSearchParams} searchParams
 * @param {number} [limit]
 * @returns {{ page: number; limit: number; q?: string } & Partial<Record<(typeof LIST_FILTER_PARAM_KEYS)[number], string>>}
 */
export function parseOrganisationListInputsFromSearchParams(searchParams, limit = 20) {
  const pageRaw = searchParams.get('page')
  let page = 1
  if (pageRaw != null && pageRaw !== '') {
    const n = Number(pageRaw)
    if (Number.isInteger(n) && n >= 1) page = n
  }

  /** @type {{ page: number; limit: number; q?: string } & Partial<Record<string, string>>} */
  const out = { page, limit }

  const qRaw = searchParams.get('q')
  if (qRaw != null && qRaw.trim() !== '') {
    out.q = qRaw.trim()
  }

  for (const key of LIST_FILTER_PARAM_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') continue
    if (CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      const n = normaliseCapabilityParam(raw)
      if (n) out[key] = n
    } else {
      const t = raw.trim()
      if (t === '') continue
      out[key] = t
    }
  }

  return out
}

/** @param {URLSearchParams} searchParams */
export function hasActiveListFilters(searchParams) {
  for (const key of LIST_FILTER_PARAM_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') continue
    if (CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      if (normaliseCapabilityParam(raw)) return true
    } else if (raw.trim() !== '') {
      return true
    }
  }
  return false
}

/**
 * Removes only the filter keys and sets page=1.
 * @param {URLSearchParams} prev
 */
export function clearAllListFiltersInSearchParams(prev) {
  const next = new URLSearchParams(prev)
  for (const k of LIST_FILTER_PARAM_KEYS) {
    next.delete(k)
  }
  next.set('page', '1')
  return next
}
