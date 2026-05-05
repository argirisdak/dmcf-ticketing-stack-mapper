// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SystemCard } from './SystemCard.jsx'
import { CAPABILITY_ROWS } from '../lib/system-capabilities.js'

const UNK = 'UNKNOWN'

const SYSTEM_DTO = {
  id: 'sys-1',
  name: 'Test System',
  vendor: 'Vendor Co',
  category: 'TICKETING',
  deploymentModel: null,
  pricingModel: null,
  geographicFocus: null,
  description: null,
  membershipCapability: UNK,
  donationCapability: UNK,
  reservedSeatingCapability: UNK,
  seasonSubscriptionsCapability: UNK,
  dynamicPricingCapability: UNK,
  multiVenueSupportCapability: UNK,
  marketingAutomationCapability: UNK,
  accessibilityFeaturesCapability: UNK,
  sourceReference: null,
  lastUpdated: '2026-01-01T00:00:00.000Z',
  fieldSources: {},
  organisations: [],
  customAttributes: [],
}

describe('SystemCard', () => {
  it('renders eight labelled capability values for compare', () => {
    const query = {
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      data: { data: SYSTEM_DTO },
    }

    render(
      <MemoryRouter>
        <SystemCard
          systemId="sys-1"
          query={query}
          onRemove={() => {}}
          unionCustomAttributeLabels={[]}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByLabelText('Not recorded')).toHaveLength(CAPABILITY_ROWS.length)
  })
})
