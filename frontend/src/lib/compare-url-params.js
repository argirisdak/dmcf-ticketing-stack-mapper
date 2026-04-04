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
