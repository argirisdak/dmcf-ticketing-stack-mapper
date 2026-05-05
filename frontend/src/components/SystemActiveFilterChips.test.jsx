// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { SystemActiveFilterChips } from './SystemActiveFilterChips.jsx'

function ChipsHarness() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { search } = useLocation()
  return (
    <>
      <div data-testid="loc-search">{search}</div>
      <SystemActiveFilterChips searchParams={searchParams} setSearchParams={setSearchParams} />
    </>
  )
}

function renderWithSearch(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/systems" element={<ChipsHarness />} />
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
})

describe('SystemActiveFilterChips', () => {
  it('renders a chip for seasonSubscriptionsCapability with label from capability catalogue', () => {
    renderWithSearch('/systems?seasonSubscriptionsCapability=YES')

    expect(screen.getByText('Season subscriptions: Yes').textContent).toBe('Season subscriptions: Yes')

    fireEvent.click(screen.getByRole('button', { name: /Remove Season subscriptions: Yes filter/i }))
    const search = screen.getByTestId('loc-search').textContent ?? ''
    expect(search).not.toContain('seasonSubscriptionsCapability')
    expect(search).toMatch(/page=1/)
  })

  it('renders chips for all five extended capability URL params', () => {
    renderWithSearch(
      '/systems?seasonSubscriptionsCapability=YES&dynamicPricingCapability=NO&multiVenueSupportCapability=UNKNOWN&marketingAutomationCapability=YES&accessibilityFeaturesCapability=NO'
    )

    expect(screen.getByText('Season subscriptions: Yes').textContent).toBe('Season subscriptions: Yes')
    expect(screen.getByText('Dynamic pricing: No').textContent).toBe('Dynamic pricing: No')
    expect(screen.getByText('Multi-venue support: Unknown').textContent).toBe(
      'Multi-venue support: Unknown'
    )
    expect(screen.getByText('Marketing automation: Yes').textContent).toBe('Marketing automation: Yes')
    expect(screen.getByText('Accessibility features: No').textContent).toBe('Accessibility features: No')
  })
})
