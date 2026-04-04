import { useQueries } from '@tanstack/react-query'
import { fetchOrganisation, OrganisationNotFoundError } from '../api/organisations.js'

/**
 * Parallel fetches for compare columns; same cache keys as `useOrganisation`.
 * @param {string[]} ids
 */
export function useCompareOrganisations(ids) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['organisations', id],
      queryFn: () => fetchOrganisation(id),
      enabled: Boolean(id),
      retry: (_failureCount, err) => !(err instanceof OrganisationNotFoundError),
    })),
  })
}
