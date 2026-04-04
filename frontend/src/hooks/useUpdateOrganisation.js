import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateOrganisation } from '../api/organisations.js'

/**
 * @param {string | undefined} id
 */
export function useUpdateOrganisation(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => updateOrganisation(/** @type {string} */ (id), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['organisations', id] })
      }
    },
  })
}
