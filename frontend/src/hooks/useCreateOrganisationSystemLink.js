import { useMutation } from '@tanstack/react-query'
import { createOrganisationSystemLink } from '../api/organisation-systems.js'

export function useCreateOrganisationSystemLink() {
  return useMutation({
    mutationFn: ({ orgId, body }) => createOrganisationSystemLink(orgId, body),
  })
}
