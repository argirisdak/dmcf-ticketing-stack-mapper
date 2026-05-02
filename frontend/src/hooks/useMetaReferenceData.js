import { useQuery } from '@tanstack/react-query'
import { fetchOrganisationTypes } from '../api/meta.js'

export function useOrganisationTypesQuery() {
  return useQuery({
    queryKey: ['meta', 'organisation-types'],
    queryFn: fetchOrganisationTypes,
  })
}
