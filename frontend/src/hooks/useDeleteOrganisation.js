import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteOrganisation } from '../api/organisations.js'

export function useDeleteOrganisation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (/** @type {string} */ orgId) => deleteOrganisation(orgId),
    onSuccess: (_data, orgId) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
      queryClient.invalidateQueries({ queryKey: ['organisations', orgId] })
    },
  })
}
