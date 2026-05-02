import { encodeCompareIdsForQuery } from './compare-url-params.js'

/**
 * @param {Array<{ role?: string; system?: { id?: string }; id?: string; lastUpdated?: string | null }>} systems
 * @param {string[]} roleOrder
 * @returns {string[]}
 */
export function distinctSystemIdsInRoleDisplayOrder(systems, roleOrder) {
  if (!Array.isArray(systems) || !Array.isArray(roleOrder)) return []
  const grouped = roleOrder.reduce((acc, role) => {
    acc[role] = systems.filter((l) => l && l.role === role)
    return acc
  }, {})
  const seen = new Set()
  const ordered = []
  for (const role of roleOrder) {
    for (const link of grouped[role] ?? []) {
      const sid = link.system?.id
      if (sid && !seen.has(sid)) {
        seen.add(sid)
        ordered.push(String(sid))
      }
    }
  }
  return ordered
}

/**
 * @param {Array<{ system?: { id?: string }; id?: string; lastUpdated?: string | null }>} systems
 * @returns {string[]}
 */
export function topFourSystemIdsByJunctionLastUpdated(systems) {
  if (!Array.isArray(systems)) return []
  const sorted = [...systems].sort((a, b) => {
    const ta = a.lastUpdated ? Date.parse(String(a.lastUpdated)) : NaN
    const tb = b.lastUpdated ? Date.parse(String(b.lastUpdated)) : NaN
    const na = Number.isNaN(ta) ? 0 : ta
    const nb = Number.isNaN(tb) ? 0 : tb
    if (nb !== na) return nb - na
    const sa = String(a.id ?? '')
    const sb = String(b.id ?? '')
    if (sa < sb) return -1
    if (sa > sb) return 1
    return 0
  })
  const out = []
  const seen = new Set()
  for (const link of sorted) {
    const sid = link.system?.id
    if (!sid || seen.has(sid)) continue
    seen.add(sid)
    out.push(String(sid))
    if (out.length === 4) break
  }
  return out
}

/**
 * @param {Array<{ role?: string; system?: { id?: string }; id?: string; lastUpdated?: string | null }>} systems
 * @param {string[]} roleOrder
 * @returns {{ to: string; label: string } | null}
 */
export function buildOrganisationContextualSystemCompare(systems, roleOrder) {
  if (!Array.isArray(systems) || systems.length < 2) return null
  const ordered = distinctSystemIdsInRoleDisplayOrder(systems, roleOrder)
  if (ordered.length < 2) return null
  if (ordered.length <= 4) {
    return {
      to: `/compare/systems?ids=${encodeCompareIdsForQuery(ordered)}`,
      label: 'Compare these systems →',
    }
  }
  const top = topFourSystemIdsByJunctionLastUpdated(systems)
  return {
    to: `/compare/systems?ids=${encodeCompareIdsForQuery(top)}`,
    label: 'Compare the 4 most recently updated systems →',
  }
}
