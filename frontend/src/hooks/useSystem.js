import { useQuery } from '@tanstack/react-query'
import { fetchSystem } from '../api/systems.js'

/**
 * @param {string | undefined} id
 */
export function useSystem(id) {
  return useQuery({
    queryKey: ['systems', id],
    queryFn: () => fetchSystem(/** @type {string} */ (id)),
    enabled: Boolean(id),
  })
}
