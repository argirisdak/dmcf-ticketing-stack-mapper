/**
 * Stable capability order for form, detail, compare label column, and SystemCard rows (Story 12.3).
 * ticketingOnly: true — concept applies only to TICKETING and INTEGRATED categories (seats, events,
 * venues). These rows are hidden for AUDIENCE_MANAGEMENT systems on detail/form pages and shown as
 * N/A on the compare grid.
 * @readonly
 */
export const CAPABILITY_ROWS = Object.freeze([
  { key: 'membershipCapability', label: 'Membership' },
  { key: 'donationCapability', label: 'Donation' },
  { key: 'reservedSeatingCapability', label: 'Reserved seating', ticketingOnly: true },
  { key: 'seasonSubscriptionsCapability', label: 'Season subscriptions', ticketingOnly: true },
  { key: 'dynamicPricingCapability', label: 'Dynamic pricing', ticketingOnly: true },
  { key: 'multiVenueSupportCapability', label: 'Multi-venue support', ticketingOnly: true },
  { key: 'marketingAutomationCapability', label: 'Marketing automation' },
  { key: 'accessibilityFeaturesCapability', label: 'Accessibility features', ticketingOnly: true },
])

/**
 * Returns capability rows visible for a given system category.
 * AUDIENCE_MANAGEMENT systems omit ticketing-only rows entirely.
 * @param {string | null | undefined} category
 */
export function getVisibleCapabilityRows(category) {
  if (category === 'AUDIENCE_MANAGEMENT') {
    return CAPABILITY_ROWS.filter((r) => !r.ticketingOnly)
  }
  return CAPABILITY_ROWS
}
