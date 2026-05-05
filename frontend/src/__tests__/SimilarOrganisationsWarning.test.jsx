// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SimilarOrganisationsWarning from '../components/SimilarOrganisationsWarning.jsx'

describe('SimilarOrganisationsWarning', () => {
  it('renders matches and fires onContinue / onCancel', () => {
    const onContinue = vi.fn()
    const onCancel = vi.fn()
    render(
      <MemoryRouter>
        <SimilarOrganisationsWarning
          matches={[{ id: 'u1', name: 'Royal Hall', city: 'London', country: 'United Kingdom' }]}
          currentName="Royal Opera"
          onContinue={onContinue}
          onCancel={onCancel}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /similar name already exists/i }),
    ).toBeTruthy()
    const rowLink = screen.getByRole('link', { name: /Royal Hall — London, United Kingdom/ })
    expect(rowLink.getAttribute('href')).toBe('/organisations/u1')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and amend' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('formats city-less rows with country only', () => {
    render(
      <MemoryRouter>
        <SimilarOrganisationsWarning
          matches={[{ id: 'u2', name: 'Venue', city: '', country: 'France' }]}
          currentName="Venue"
          onContinue={() => {}}
          onCancel={() => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Venue — France/ })).toBeTruthy()
  })
})
