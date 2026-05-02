import { useQueries } from '@tanstack/react-query'
import { fetchSystem, SystemNotFoundError } from '../api/systems.js'
import { MAX_SYSTEM_COMPARE_IDS } from '../lib/compare-url-params.js'

/**
 * Parallel fetches for system compare columns; same cache keys as `useSystem`.
 * @param {string[]} ids
 */
export function useCompareSystems(ids) {
  const capped = ids.slice(0, MAX_SYSTEM_COMPARE_IDS)
  return useQueries({
    queries: capped.map((id) => ({
      queryKey: ['systems', id],
      queryFn: () => fetchSystem(id),
      enabled: Boolean(id),
      retry: (_failureCount, err) => !(err instanceof SystemNotFoundError),
    })),
  })
}
