/**
 * Mirrors `backend/src/lib/field-source-keys.js`. When either side changes, update the other in the same change-set (see docs/decisions.md ADR-025).
 */

/** @readonly */
export const SYSTEM_FIELD_SOURCE_KEYS = Object.freeze([
  'category',
  'vendor',
  'deploymentModel',
  'pricingModel',
  'geographicFocus',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'seasonSubscriptionsCapability',
  'dynamicPricingCapability',
  'multiVenueSupportCapability',
  'marketingAutomationCapability',
  'accessibilityFeaturesCapability',
])

/** @readonly */
export const ORGANISATION_FIELD_SOURCE_KEYS = Object.freeze([
  'country',
  'city',
  'organisationType',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'capacity',
])

/**
 * Static compare rows map 1:1 to indices 0–(n−1) before provenance; provenance and union rows use null.
 * @see SYSTEM_COMPARE_ROW_LABEL_PREFIX in system-compare-union-labels.js
 */
const SYSTEM_COMPARE_STATIC_ROW_SOURCE_KEYS = Object.freeze([
  null,
  'vendor',
  'category',
  'deploymentModel',
  'pricingModel',
  'geographicFocus',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'seasonSubscriptionsCapability',
  'dynamicPricingCapability',
  'multiVenueSupportCapability',
  'marketingAutomationCapability',
  'accessibilityFeaturesCapability',
  null,
])

/** Matches ComparePage ROW_LABELS order. */
export const ORGANISATION_COMPARE_ROW_SOURCE_KEYS = Object.freeze([
  'country',
  'organisationType',
  null,
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  null,
  null,
])

/**
 * @param {unknown} fieldSources
 * @param {string} fieldKey
 * @returns {string | null}
 */
export function pickFieldSourceUrl(fieldSources, fieldKey) {
  if (fieldSources == null || typeof fieldSources !== 'object' || Array.isArray(fieldSources)) {
    return null
  }
  const raw = /** @type {Record<string, unknown>} */ (fieldSources)[fieldKey]
  if (raw == null || String(raw).trim() === '') return null
  return String(raw)
}

/**
 * Field-source key for a system compare body row, or null when this row is not in the allow-list.
 * @param {number} rowIndex Row index within SystemCard body (0 = first data row under header).
 * @param {number} unionLabelCount
 * @returns {string | null}
 */
export function systemCompareRowFieldSourceKey(rowIndex, unionLabelCount) {
  const L = Math.max(0, unionLabelCount)
  const provenanceRows = 2
  const staticCount = SYSTEM_COMPARE_STATIC_ROW_SOURCE_KEYS.length
  const unionStart = staticCount + provenanceRows
  const adoptedRow = unionStart + L
  if (rowIndex < staticCount) return SYSTEM_COMPARE_STATIC_ROW_SOURCE_KEYS[rowIndex]
  if (rowIndex < unionStart) return null
  if (rowIndex < adoptedRow) return null
  if (rowIndex === adoptedRow) return null
  return null
}
