import { useQuery } from '@tanstack/react-query'
import { fetchSystems } from '../api/systems.js'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * Debounced system search hook — uses a separate query key from the System list page
 * cache to avoid mutual invalidation.
 * @param {string} term — raw input value (debouncing applied internally)
 */
export function useSystemSearch(term) {
  const debounced = useDebouncedValue(term, 300)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['system-search', debounced],
    queryFn: () => fetchSystems({ q: debounced, limit: 20 }),
    enabled: debounced.trim().length > 0,
  })

  return { systems: data?.data ?? [], isLoading, isError }
}
