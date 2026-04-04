import { useQuery } from '@tanstack/react-query'
import { LIST_FILTER_PARAM_KEYS } from '../lib/organisation-list-filter-params.js'
import { fetchOrganisations } from '../api/organisations.js'

/**
 * @param {{
 *   page?: number
 *   limit?: number
 *   q?: string
 *   country?: string
 *   provider?: string
 *   type?: string
 *   crm?: string
 *   membership?: string
 *   donation?: string
 *   seating?: string
 * }} params
 */
export function useOrganisations(params = {}) {
  const keyPart = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  }
  if (params.q !== undefined) keyPart.q = params.q
  for (const k of LIST_FILTER_PARAM_KEYS) {
    if (params[k] !== undefined) keyPart[k] = params[k]
  }

  return useQuery({
    queryKey: ['organisations', keyPart],
    queryFn: () => fetchOrganisations(params),
  })
}
