/**
 * Frontend mirror of `backend/src/lib/sort-allowlists.js` — keep keys in sync on every change.
 * Human labels for list sort dropdowns (Story 14.2).
 */

/** @readonly {string[]} */
export const ORGANISATION_SORT_KEYS = Object.freeze([
  'name',
  'country',
  'lastUpdated',
  'capacity',
  'organisationType',
])

/** @readonly {string[]} */
export const SYSTEM_SORT_KEYS = Object.freeze([
  'name',
  'lastUpdated',
])

/** @type {{ value: string; label: string }[]} */
export const ORGANISATION_SORT_OPTIONS = Object.freeze([
  { value: 'name:asc', label: 'Name (A→Z)' },
  { value: 'name:desc', label: 'Name (Z→A)' },
  { value: 'country:asc', label: 'Country (A→Z)' },
  { value: 'country:desc', label: 'Country (Z→A)' },
  { value: 'lastUpdated:desc', label: 'Last updated (newest first)' },
  { value: 'lastUpdated:asc', label: 'Last updated (oldest first)' },
  { value: 'capacity:desc', label: 'Capacity (largest first)' },
  { value: 'capacity:asc', label: 'Capacity (smallest first)' },
  { value: 'organisationType:asc', label: 'Type (A→Z)' },
  { value: 'organisationType:desc', label: 'Type (Z→A)' },
])

/** @type {{ value: string; label: string }[]} */
export const SYSTEM_SORT_OPTIONS = Object.freeze([
  { value: 'name:asc', label: 'Name (A→Z)' },
  { value: 'name:desc', label: 'Name (Z→A)' },
  { value: 'lastUpdated:desc', label: 'Last updated (newest first)' },
  { value: 'lastUpdated:asc', label: 'Last updated (oldest first)' },
])

const ORG_SORT_COMBINED = new Set(ORGANISATION_SORT_OPTIONS.map((o) => o.value))
const SYS_SORT_COMBINED = new Set(SYSTEM_SORT_OPTIONS.map((o) => o.value))

/**
 * @param {string} combined `"field:asc"` / `"field:desc"`
 * @returns {{ sort: string; order: 'asc' | 'desc' }}
 */
export function parseSortOrderCombined(combined) {
  const i = combined.lastIndexOf(':')
  const sort = i >= 0 ? combined.slice(0, i) : combined
  const orderRaw = i >= 0 ? combined.slice(i + 1) : 'asc'
  const order = orderRaw.toLowerCase() === 'desc' ? 'desc' : 'asc'
  return { sort, order }
}

/**
 * @param {string | null | undefined} sortRaw
 * @param {string | null | undefined} orderRaw
 * @returns {{ sort: string; order: 'asc' | 'desc' }}
 */
export function normaliseOrganisationSortFromUrl(sortRaw, orderRaw) {
  const o = orderRaw != null && orderRaw.trim() !== '' ? orderRaw.trim().toLowerCase() : 'asc'
  const order = o === 'desc' ? 'desc' : 'asc'
  const sort = sortRaw != null && sortRaw.trim() !== '' ? sortRaw.trim() : 'name'
  const combined = `${sort}:${order}`
  if (ORG_SORT_COMBINED.has(combined)) return { sort, order }
  return { sort: 'name', order: 'asc' }
}

/**
 * @param {string | null | undefined} sortRaw
 * @param {string | null | undefined} orderRaw
 * @returns {{ sort: string; order: 'asc' | 'desc' }}
 */
export function normaliseSystemSortFromUrl(sortRaw, orderRaw) {
  const o = orderRaw != null && orderRaw.trim() !== '' ? orderRaw.trim().toLowerCase() : 'asc'
  const order = o === 'desc' ? 'desc' : 'asc'
  const sort = sortRaw != null && sortRaw.trim() !== '' ? sortRaw.trim() : 'name'
  const combined = `${sort}:${order}`
  if (SYS_SORT_COMBINED.has(combined)) return { sort, order }
  return { sort: 'name', order: 'asc' }
}
