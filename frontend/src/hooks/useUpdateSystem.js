import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateSystem } from '../api/systems.js'

/**
 * @param {string | undefined} id
 */
export function useUpdateSystem(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => updateSystem(/** @type {string} */ (id), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systems'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['systems', id] })
      }
    },
  })
}
