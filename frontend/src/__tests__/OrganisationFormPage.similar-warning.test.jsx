// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrganisationFormPage from '../pages/OrganisationFormPage.jsx'

function renderNewOrgForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/organisations/new']}>
        <OrganisationFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OrganisationFormPage create — similar organisations', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        const u = String(url)
        if (u.includes('/api/meta/organisation-types')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              data: [{ id: '00000000-0000-0000-0000-000000000001', name: 'Venue' }],
              error: null,
              meta: null,
            }),
          })
        }
        if (u.includes('check-similar')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                  name: 'Royal Opera House',
                  city: 'London',
                  country: 'United Kingdom',
                },
              ],
              error: null,
              meta: null,
            }),
          })
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ data: null, error: { message: 'unexpected' }, meta: null }),
        })
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows warning after blur and hides after Continue; re-shows after name change and blur', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      renderNewOrgForm()
      await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy())

      const nameInput = screen.getByLabelText('Name')
      fireEvent.change(nameInput, { target: { value: 'Royal Opera' } })
      fireEvent.blur(nameInput)

      await vi.advanceTimersByTimeAsync(350)
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: /similar name already exists/i })).toBeTruthy(),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(screen.queryByRole('heading', { name: /similar name already exists/i })).toBeNull()

      fireEvent.change(nameInput, { target: { value: 'Royal Opera X' } })
      fireEvent.blur(nameInput)
      await vi.advanceTimersByTimeAsync(350)
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: /similar name already exists/i })).toBeTruthy(),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('maps 409 composite conflict to inline name error with full server message', async () => {
    const fetchMock = /** @type {ReturnType<typeof vi.fn>} */ (globalThis.fetch)
    fetchMock.mockImplementation((url, init) => {
      const u = String(url)
      if (u.includes('/api/meta/organisation-types')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: '00000000-0000-0000-0000-000000000001', name: 'Venue' }],
            error: null,
            meta: null,
          }),
        })
      }
      if (u.includes('check-similar')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [], error: null, meta: null }),
        })
      }
      if (u.includes('/api/organisations') && init && init.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            data: null,
            error: {
              message: 'An organisation called "Dup" already exists in (no city), France.',
              fields: [
                {
                  field: 'name',
                  message: 'Conflicts with existing organisation in this city and country.',
                },
              ],
            },
            meta: null,
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    })

    renderNewOrgForm()
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dup' } })
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'France' } })
    fireEvent.change(screen.getByLabelText('Organisation type'), {
      target: { value: '00000000-0000-0000-0000-000000000001' },
    })

    const form = document.querySelector('form')
    expect(form).toBeTruthy()
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }))

    const msg = /An organisation called "Dup" already exists in \(no city\), France\./
    await waitFor(() => {
      const inline = document.getElementById('field-name-error')
      expect(inline?.textContent ?? '').toMatch(msg)
    })
    const summary = screen.getAllByRole('alert').find((el) => el.textContent?.includes('There is a problem'))
    expect(summary).toBeTruthy()
    expect(within(summary).getByRole('link', { name: msg })).toBeTruthy()
  })
})
