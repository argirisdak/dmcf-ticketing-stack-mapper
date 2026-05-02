import { MAX_SYSTEM_COMPARE_IDS } from './compare-url-params.js'

/**
 * Stable union of system ids from organisation compare column data (left-to-right orgs,
 * then each org's `systems` array order).
 *
 * @param {string[]} organisationIds
 * @param {import('@tanstack/react-query').UseQueryResult<unknown, Error>[]} queries
 * @returns {{ kind: 'pending' } | { kind: 'ready'; orderedSystemIds: string[] } | { kind: 'incomplete' }}
 */
export function deriveCompareOrganisationsSystemUnion(organisationIds, queries) {
  if (!Array.isArray(organisationIds) || organisationIds.length === 0) {
    return { kind: 'incomplete' }
  }
  if (organisationIds.length < 2 || organisationIds.length > MAX_SYSTEM_COMPARE_IDS) {
    return { kind: 'incomplete' }
  }
  if (queries.length !== organisationIds.length) {
    return { kind: 'incomplete' }
  }
  for (let i = 0; i < organisationIds.length; i++) {
    const q = queries[i]
    if (!q || q.isPending) return { kind: 'pending' }
  }
  for (let i = 0; i < organisationIds.length; i++) {
    const q = queries[i]
    if (!q.isSuccess || q.data == null || typeof q.data !== 'object') {
      return { kind: 'incomplete' }
    }
    const envelope = /** @type {{ data?: unknown }} */ (q.data)
    if (envelope.data == null || typeof envelope.data !== 'object') {
      return { kind: 'incomplete' }
    }
  }

  const seen = new Set()
  const ordered = []
  for (let i = 0; i < organisationIds.length; i++) {
    const q = queries[i]
    const envelope = /** @type {{ data: { systems?: unknown } }} */ (q.data)
    const org = envelope.data
    const systems = org.systems
    if (!Array.isArray(systems)) continue
    for (const link of systems) {
      if (link == null || typeof link !== 'object') continue
      const sys = /** @type {{ system?: { id?: unknown } } } */ (link).system
      const sid = sys?.id != null ? String(sys.id) : ''
      if (!sid || seen.has(sid)) continue
      seen.add(sid)
      ordered.push(sid)
    }
  }
  return { kind: 'ready', orderedSystemIds: ordered }
}
