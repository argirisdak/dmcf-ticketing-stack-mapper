import { useQuery } from '@tanstack/react-query'
import { fetchOrganisations } from '../api/organisations.js'

/**
 * @param {{ page?: number; limit?: number }} params
 */
export function useOrganisations({ page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['organisations', { page, limit }],
    queryFn: () => fetchOrganisations({ page, limit }),
  })
}
