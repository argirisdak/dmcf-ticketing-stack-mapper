/** Order matches filter bar and clear-all behaviour. */
export const SYSTEM_LIST_FILTER_PARAM_KEYS = Object.freeze([
  'deployment_model',
  'pricing_model',
  'geographic_focus',
  'membership',
  'donation',
  'seating',
])

export const SYSTEM_CAPABILITY_FILTER_PARAM_KEYS = new Set(['membership', 'donation', 'seating'])

export const SYSTEM_CATEGORY_PARAM_KEY = 'category'

export const VALID_SYSTEM_CATEGORIES = Object.freeze(['INTEGRATED', 'TICKETING', 'AUDIENCE_MANAGEMENT'])

export const SYSTEM_CATEGORY_LABELS = Object.freeze({
  INTEGRATED: 'Integrated',
  TICKETING: 'Ticketing',
  AUDIENCE_MANAGEMENT: 'Audience management',
})

export const SYSTEM_FILTER_DIMENSION_LABELS = Object.freeze({
  deployment_model: 'Deployment',
  pricing_model: 'Pricing',
  geographic_focus: 'Region',
  membership: 'Membership',
  donation: 'Donation',
  seating: 'Reserved Seating',
})

export const DEPLOYMENT_MODEL_LABELS = Object.freeze({
  SAAS: 'SaaS',
  SELF_HOSTED: 'Self-hosted',
  HYBRID: 'Hybrid',
})

export const PRICING_MODEL_LABELS = Object.freeze({
  SUBSCRIPTION: 'Subscription',
  TRANSACTION_FEE: 'Transaction fee',
  LICENCE: 'Licence',
  HYBRID: 'Hybrid',
  UNKNOWN: 'Unknown',
})

const CAPABILITY_URL_VALUES = ['YES', 'NO', 'UNKNOWN']

/** @param {string | null | undefined} raw */
export function normaliseCapabilityParam(raw) {
  if (raw == null || raw === '') return ''
  const t = raw.trim()
  if (t === '') return ''
  return CAPABILITY_URL_VALUES.includes(t) ? t : ''
}

/**
 * @param {URLSearchParams} searchParams
 * @param {number} [limit]
 */
export function parseSystemListInputsFromSearchParams(searchParams, limit = 20) {
  const pageRaw = searchParams.get('page')
  let page = 1
  if (pageRaw != null && pageRaw !== '') {
    const n = Number(pageRaw)
    if (Number.isInteger(n) && n >= 1) page = n
  }

  const out = { page, limit }

  const qRaw = searchParams.get('q')
  if (qRaw != null && qRaw.trim() !== '') {
    out.q = qRaw.trim()
  }

  const cats = searchParams.getAll(SYSTEM_CATEGORY_PARAM_KEY).filter((v) =>
    VALID_SYSTEM_CATEGORIES.includes(v)
  )
  if (cats.length > 0) out.categories = cats

  for (const key of SYSTEM_LIST_FILTER_PARAM_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') continue
    if (SYSTEM_CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      const n = normaliseCapabilityParam(raw)
      if (n) out[key] = n
    } else {
      const t = raw.trim()
      if (t) out[key] = t
    }
  }

  return out
}

/** @param {URLSearchParams} searchParams */
export function hasActiveSystemListFilters(searchParams) {
  if (searchParams.get('q')?.trim()) return true
  if (searchParams.getAll(SYSTEM_CATEGORY_PARAM_KEY).some((v) => VALID_SYSTEM_CATEGORIES.includes(v)))
    return true
  for (const key of SYSTEM_LIST_FILTER_PARAM_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') continue
    if (SYSTEM_CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      if (normaliseCapabilityParam(raw)) return true
    } else if (raw.trim() !== '') {
      return true
    }
  }
  return false
}

/**
 * Removes q, all category params, and all filter keys; resets page=1.
 * @param {URLSearchParams} prev
 */
export function clearAllSystemListFiltersInSearchParams(prev) {
  const next = new URLSearchParams(prev)
  next.delete('q')
  next.delete(SYSTEM_CATEGORY_PARAM_KEY)
  for (const k of SYSTEM_LIST_FILTER_PARAM_KEYS) {
    next.delete(k)
  }
  next.set('page', '1')
  return next
}
