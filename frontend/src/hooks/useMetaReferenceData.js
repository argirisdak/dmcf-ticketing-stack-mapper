import { useQuery } from '@tanstack/react-query'
import {
  fetchOrganisationTypes,
  fetchTicketingProviders,
  fetchCrmPlatforms,
} from '../api/meta.js'

export function useOrganisationTypesQuery() {
  return useQuery({
    queryKey: ['meta', 'organisation-types'],
    queryFn: fetchOrganisationTypes,
  })
}

export function useTicketingProvidersQuery() {
  return useQuery({
    queryKey: ['meta', 'ticketing-providers'],
    queryFn: fetchTicketingProviders,
  })
}

export function useCrmPlatformsQuery() {
  return useQuery({
    queryKey: ['meta', 'crm-platforms'],
    queryFn: fetchCrmPlatforms,
  })
}
