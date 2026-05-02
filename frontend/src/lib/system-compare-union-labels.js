import { buildUnionCustomAttributeLabels } from './system-compare-custom-attributes.js'

/** Static compare row labels before custom-attribute union rows (Epic 9.3 order). */
export const SYSTEM_COMPARE_ROW_LABEL_PREFIX = [
  'Name',
  'Vendor',
  'Category',
  'Deployment model',
  'Pricing model',
  'Geographic focus',
  'Membership capability',
  'Donation capability',
  'Reserved seating capability',
  'Description',
]

const PROVENANCE_ROW_LABELS = ['Source reference', 'Last updated']

const ADOPTED_BY_LABEL = 'Adopted by'

/** Count of static label rows before provenance (Identity + Capabilities + Description). */
export const SYSTEM_COMPARE_STATIC_PREFIX_ROW_COUNT = SYSTEM_COMPARE_ROW_LABEL_PREFIX.length

/**
 * 0-based row indexes in the compare label column that start a new section (Epic 9.3 dividers).
 * @param {number} unionLabelCount
 * @returns {Set<number>}
 */
export function systemCompareSectionDividerRowIndexes(unionLabelCount) {
  const L = Math.max(0, unionLabelCount)
  const provenanceStart = SYSTEM_COMPARE_STATIC_PREFIX_ROW_COUNT
  const unionStart = provenanceStart + PROVENANCE_ROW_LABELS.length
  const adoptedStart = unionStart + L
  const set = new Set([6, 9])
  set.add(provenanceStart)
  if (L > 0) set.add(unionStart)
  set.add(adoptedStart)
  return set
}

/**
 * @param {string[]} unionCustomAttributeLabels
 * @returns {string[]}
 */
export function buildSystemCompareRowLabels(unionCustomAttributeLabels) {
  const union = Array.isArray(unionCustomAttributeLabels) ? unionCustomAttributeLabels : []
  return [
    ...SYSTEM_COMPARE_ROW_LABEL_PREFIX,
    ...PROVENANCE_ROW_LABELS,
    ...union,
    ADOPTED_BY_LABEL,
  ]
}

/**
 * Ordered union of custom attribute labels: left-to-right column order, first-seen wins, case-insensitive dedupe.
 * @param {string[]} ids
 * @param {import('@tanstack/react-query').UseQueryResult<unknown, Error>[]} queries
 * @returns {string[]}
 */
export function mergeCustomAttributeUnionLabels(ids, queries) {
  for (let i = 0; i < ids.length; i++) {
    const q = queries[i]
    if (!q || q.isPending) return []
  }

  /** @type {Array<Record<string, unknown> | null>} */
  const dtosInColumnOrder = []
  for (let i = 0; i < ids.length; i++) {
    const q = queries[i]
    if (!q?.isSuccess || q.data == null || typeof q.data !== 'object') {
      dtosInColumnOrder.push(null)
      continue
    }
    const envelope = /** @type {{ data?: unknown }} */ (q.data)
    if (envelope.data == null || typeof envelope.data !== 'object') {
      dtosInColumnOrder.push(null)
      continue
    }
    dtosInColumnOrder.push(
      /** @type {Record<string, unknown>} */ (envelope.data),
    )
  }
  return buildUnionCustomAttributeLabels(dtosInColumnOrder)
}

/**
 * @param {unknown[] | null | undefined} customAttributes
 * @param {string} unionLabel
 * @returns {{ label?: string; value?: unknown; sourceReference?: string | null } | undefined}
 */
export function findCustomAttributeByLabel(customAttributes, unionLabel) {
  if (!Array.isArray(customAttributes) || unionLabel == null || String(unionLabel).trim() === '') {
    return undefined
  }
  const key = String(unionLabel).trim().toLowerCase()
  const found = customAttributes.find((a) => {
    if (a == null || typeof a !== 'object') return false
    const lab = /** @type {{ label?: unknown }} */ (a).label
    if (lab == null || String(lab).trim() === '') return false
    return String(lab).trim().toLowerCase() === key
  })
  return found && typeof found === 'object'
    ? /** @type {{ label?: string; value?: unknown; sourceReference?: string | null }} */ (found)
    : undefined
}
