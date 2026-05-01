import { useMutation } from '@tanstack/react-query'
import { deleteOrganisationSystemLink } from '../api/organisation-systems.js'

export function useDeleteOrganisationSystemLink() {
  return useMutation({
    mutationFn: ({ orgId, linkId }) => deleteOrganisationSystemLink(orgId, linkId),
  })
}
