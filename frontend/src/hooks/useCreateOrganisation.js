import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrganisation } from '../api/organisations.js'

export function useCreateOrganisation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => createOrganisation(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
    },
  })
}
