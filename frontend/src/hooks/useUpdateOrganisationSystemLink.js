import { useMutation } from '@tanstack/react-query'
import { updateOrganisationSystemLink } from '../api/organisation-systems.js'

export function useUpdateOrganisationSystemLink() {
  return useMutation({
    mutationFn: ({ orgId, linkId, body }) => updateOrganisationSystemLink(orgId, linkId, body),
  })
}
