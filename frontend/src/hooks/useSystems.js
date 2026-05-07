import { useQuery } from '@tanstack/react-query'
import { fetchSystems } from '../api/systems.js'

/**
 * @param {{
 *   page?: number
 *   limit?: number
 *   q?: string
 *   categories?: string[]
 *   deployment_model?: string
 *   pricing_model?: string
 *   geographic_focus?: string[]
 *   membership?: string
 *   donation?: string
 *   seating?: string
 *   seasonSubscriptionsCapability?: string
 *   dynamicPricingCapability?: string
 *   multiVenueSupportCapability?: string
 *   marketingAutomationCapability?: string
 *   accessibilityFeaturesCapability?: string
 *   sort?: string
 *   order?: string
 * }} params
 */
export function useSystems(params = {}) {
  const keyPart = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    sort: params.sort ?? 'name',
    order: params.order ?? 'asc',
  }

  if (params.q !== undefined) keyPart.q = params.q

  if (params.categories?.length) {
    keyPart.categories = [...params.categories].sort()
  }

  if (params.deployment_model !== undefined) keyPart.deployment_model = params.deployment_model
  if (params.pricing_model !== undefined) keyPart.pricing_model = params.pricing_model
  if (params.geographic_focus?.length) {
    keyPart.geographic_focus = [...params.geographic_focus].sort()
  }
  if (params.membership !== undefined) keyPart.membership = params.membership
  if (params.donation !== undefined) keyPart.donation = params.donation
  if (params.seating !== undefined) keyPart.seating = params.seating
  if (params.seasonSubscriptionsCapability !== undefined) {
    keyPart.seasonSubscriptionsCapability = params.seasonSubscriptionsCapability
  }
  if (params.dynamicPricingCapability !== undefined) {
    keyPart.dynamicPricingCapability = params.dynamicPricingCapability
  }
  if (params.multiVenueSupportCapability !== undefined) {
    keyPart.multiVenueSupportCapability = params.multiVenueSupportCapability
  }
  if (params.marketingAutomationCapability !== undefined) {
    keyPart.marketingAutomationCapability = params.marketingAutomationCapability
  }
  if (params.accessibilityFeaturesCapability !== undefined) {
    keyPart.accessibilityFeaturesCapability = params.accessibilityFeaturesCapability
  }

  return useQuery({
    queryKey: ['systems', keyPart],
    queryFn: () => fetchSystems(params),
  })
}
