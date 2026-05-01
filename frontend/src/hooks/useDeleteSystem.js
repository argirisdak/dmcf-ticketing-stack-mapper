import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSystem } from '../api/systems.js'

export function useDeleteSystem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (/** @type {string} */ id) => deleteSystem(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['systems'] })
      queryClient.invalidateQueries({ queryKey: ['systems', id] })
    },
  })
}
