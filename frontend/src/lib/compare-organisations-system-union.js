import { MAX_SYSTEM_COMPARE_IDS } from './compare-url-params.js'

/**
 * @typedef {{ id: string; name: string; vendor: string | null; category: string | null; usedByOrgNames: string[] }} CompareSystemDetail
 */

/**
 * Rich union of systems from organisation compare column data — includes name, vendor, category,
 * and which org names use each system. Stable order: left-to-right orgs, then each org's systems array.
 *
 * @param {string[]} organisationIds
 * @param {import('@tanstack/react-query').UseQueryResult<unknown, Error>[]} queries
 * @returns {{ kind: 'pending' } | { kind: 'ready'; systems: CompareSystemDetail[] } | { kind: 'incomplete' }}
 */
export function deriveCompareOrgsSystemDetails(organisationIds, queries) {
  if (!Array.isArray(organisationIds) || organisationIds.length < 2) {
    return { kind: 'incomplete' }
  }
  if (queries.length !== organisationIds.length) {
    return { kind: 'incomplete' }
  }
  for (const q of queries) {
    if (!q || q.isPending) return { kind: 'pending' }
    if (!q.isSuccess || q.data == null || typeof q.data !== 'object') return { kind: 'incomplete' }
  }

  /** @type {Map<string, CompareSystemDetail>} */
  const systemMap = new Map()
  const systemOrder = []

  for (let i = 0; i < organisationIds.length; i++) {
    const org = /** @type {{ name?: unknown; systems?: unknown }} */ (queries[i].data)
    const orgName = typeof org.name === 'string' && org.name ? org.name : organisationIds[i]
    const systems = Array.isArray(org.systems) ? org.systems : []

    for (const link of systems) {
      if (link == null || typeof link !== 'object') continue
      const sys = /** @type {{ system?: { id?: unknown; name?: unknown; vendor?: unknown; category?: unknown } }} */ (link).system
      if (sys?.id == null) continue
      const sid = String(sys.id)
      if (!systemMap.has(sid)) {
        systemMap.set(sid, {
          id: sid,
          name: typeof sys.name === 'string' ? sys.name : '',
          vendor: typeof sys.vendor === 'string' ? sys.vendor : null,
          category: typeof sys.category === 'string' ? sys.category : null,
          usedByOrgNames: [],
        })
        systemOrder.push(sid)
      }
      systemMap.get(sid).usedByOrgNames.push(orgName)
    }
  }

  return { kind: 'ready', systems: systemOrder.map((id) => systemMap.get(id)) }
}

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
    if (!q.isSuccess || q.data == null || typeof q.data !== 'object') return { kind: 'incomplete' }
  }

  const seen = new Set()
  const ordered = []
  for (let i = 0; i < organisationIds.length; i++) {
    const org = /** @type {{ systems?: unknown }} */ (queries[i].data)
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
