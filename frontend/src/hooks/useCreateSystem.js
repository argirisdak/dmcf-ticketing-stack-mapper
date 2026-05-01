import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSystem } from '../api/systems.js'

export function useCreateSystem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => createSystem(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}
