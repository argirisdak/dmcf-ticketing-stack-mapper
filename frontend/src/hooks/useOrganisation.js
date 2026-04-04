import { useQuery } from '@tanstack/react-query'
import { fetchOrganisation } from '../api/organisations.js'

/**
 * @param {string | undefined} id
 */
export function useOrganisation(id) {
  return useQuery({
    queryKey: ['organisations', id],
    queryFn: () => fetchOrganisation(/** @type {string} */ (id)),
    enabled: Boolean(id),
  })
}
