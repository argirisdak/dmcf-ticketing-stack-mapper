// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SystemDetailPage from './SystemDetailPage.jsx'
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

vi.mock('../hooks/useSystem.js', () => ({
  useSystem: () => ({
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    data: { data: SYSTEM_DTO },
  }),
}))

vi.mock('../hooks/useDeleteSystem.js', () => ({
  useDeleteSystem: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}))

describe('SystemDetailPage', () => {
  it('renders eight capability rows in stable order', () => {
    render(
      <MemoryRouter initialEntries={['/systems/sys-1']}>
        <Routes>
          <Route path="/systems/:id" element={<SystemDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const dts = screen.getAllByRole('term')
    const labelsInOrder = CAPABILITY_ROWS.map(({ label }) => label)
    const capabilityTerms = dts.filter((el) => labelsInOrder.includes(el.textContent))
    expect(capabilityTerms.map((el) => el.textContent)).toEqual(labelsInOrder)

    expect(screen.getAllByLabelText('Not recorded')).toHaveLength(CAPABILITY_ROWS.length)
  })
})
