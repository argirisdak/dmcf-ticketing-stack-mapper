import { useQuery } from '@tanstack/react-query'
import { checkSimilarOrganisations } from '../api/organisations.js'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * @param {string} name
 * @param {{ excludeId?: string }} [options]
 */
export function useSimilarOrganisations(name, options = {}) {
  const { excludeId } = options
  const debouncedName = useDebouncedValue(name, 300)
  const excludeKey = excludeId ?? null
  const trimmed = debouncedName.trim()
  const enabled = trimmed.length >= 3

  const q = useQuery({
    // Debounced name is the value sent to the API; cache key matches that lookup.
    queryKey: ['similarOrganisations', debouncedName, excludeKey],
    queryFn: () => checkSimilarOrganisations(debouncedName, excludeId),
    enabled,
  })

  return {
    matches: q.data?.data ?? [],
    isLoading: q.isLoading,
    error: q.error ?? null,
  }
}
