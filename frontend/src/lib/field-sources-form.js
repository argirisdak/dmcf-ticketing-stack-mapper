/**
 * @param {unknown} fieldSources
 * @returns {Record<string, string>}
 */
export function normaliseFieldSourcesFromDto(fieldSources) {
  if (fieldSources == null || typeof fieldSources !== 'object' || Array.isArray(fieldSources)) {
    return {}
  }
  /** @type {Record<string, string>} */
  const out = {}
  for (const [k, v] of Object.entries(fieldSources)) {
    if (v == null) continue
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (t !== '') out[k] = t
  }
  return out
}

/**
 * @param {Record<string, string>} fieldSources
 * @returns {Record<string, string>}
 */
export function buildFieldSourcesPayload(fieldSources) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const [k, v] of Object.entries(fieldSources)) {
    const t = String(v ?? '').trim()
    if (t !== '') out[k] = t
  }
  return out
}

/**
 * @param {{ field: string; message: string }[]} fields
 * @param {(batch: { field: string; message: string }[]) => { field: string; message: string; anchorId: string }[]} mapNonSourceBatch
 * @returns {{ summary: { field: string; message: string; anchorId: string }[]; sourceErrors: Record<string, string> }}
 */
export function mapServerFieldErrorsToSummaryAndSources(fields, mapNonSourceBatch) {
  /** @type {{ field: string; message: string; anchorId: string }[]} */
  const summary = []
  /** @type {Record<string, string>} */
  const sourceErrors = {}
  for (const f of fields) {
    const m = /^fieldSources\.(.+)$/.exec(f.field)
    if (m) {
      const key = m[1]
      sourceErrors[key] = f.message
      summary.push({
        field: f.field,
        message: f.message,
        anchorId: `field-src-${key}`,
      })
      continue
    }
    summary.push(...mapNonSourceBatch([f]))
  }
  return { summary, sourceErrors }
}
