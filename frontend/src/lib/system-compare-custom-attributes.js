/**
 * Union of custom-attribute labels across system compare columns (Epic 9.3).
 * Column order is preserved; within each column, API array order applies.
 * Dedupe is case-insensitive; first-seen casing wins.
 *
 * @param {Array<{ customAttributes?: unknown } | null | undefined>} systemDtosInColumnOrder
 * @returns {string[]}
 */
export function buildUnionCustomAttributeLabels(systemDtosInColumnOrder) {
  if (!Array.isArray(systemDtosInColumnOrder)) return []
  const seen = new Set()
  const union = []
  for (const dto of systemDtosInColumnOrder) {
    if (dto == null || typeof dto !== 'object') continue
    const attrs = /** @type {{ customAttributes?: unknown }} */ (dto).customAttributes
    if (!Array.isArray(attrs)) continue
    for (const attr of attrs) {
      if (attr == null || typeof attr !== 'object') continue
      const raw = /** @type {{ label?: unknown }} */ (attr).label
      if (raw == null || String(raw).trim() === '') continue
      const label = String(raw).trim()
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      union.push(label)
    }
  }
  return union
}
