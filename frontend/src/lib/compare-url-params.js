/** Maximum parallel compare columns for system compare (Story 9.1 — selection bar targets 2–4). */
export const MAX_SYSTEM_COMPARE_IDS = 4

/** Comma-separated ids for `/compare/systems?ids=` (each segment encoded). */
export function encodeCompareIdsForQuery(ids) {
  if (!Array.isArray(ids)) return ''
  return ids.map((id) => encodeURIComponent(String(id))).join(',')
}

/**
 * Parse comma-separated compare `ids` from the URL (trim, drop empties, dedupe for stable order).
 * @param {string | null} raw
 * @returns {string[]}
 */
export function parseCompareIds(raw) {
  if (raw == null || typeof raw !== 'string' || raw.trim() === '') return []
  const seen = new Set()
  const out = []
  for (const segment of raw.split(',')) {
    const id = segment.trim()
    if (id === '') continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}
