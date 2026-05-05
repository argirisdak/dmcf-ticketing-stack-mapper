// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useSimilarOrganisations } from '../hooks/useSimilarOrganisations.js'

const mocks = vi.hoisted(() => ({
  checkSimilarOrganisations: vi.fn(async () => ({
    data: [],
    error: null,
    meta: null,
  })),
}))

vi.mock('../api/organisations.js', () => ({
  checkSimilarOrganisations: (...args) => mocks.checkSimilarOrganisations(...args),
}))

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => createElement(QueryClientProvider, { client }, children)
}

describe('useSimilarOrganisations', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mocks.checkSimilarOrganisations.mockClear()
    mocks.checkSimilarOrganisations.mockResolvedValue({ data: [], error: null, meta: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call API when trimmed name length < 3', async () => {
    renderHook(() => useSimilarOrganisations('ab'), { wrapper: createWrapper() })
    await vi.advanceTimersByTimeAsync(400)
    expect(mocks.checkSimilarOrganisations).not.toHaveBeenCalled()
  })

  it('calls API only after debounce when name length >= 3', async () => {
    const { rerender } = renderHook(({ name }) => useSimilarOrganisations(name), {
      wrapper: createWrapper(),
      initialProps: { name: '' },
    })
    rerender({ name: 'abc' })
    await vi.advanceTimersByTimeAsync(299)
    expect(mocks.checkSimilarOrganisations).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await waitFor(() => expect(mocks.checkSimilarOrganisations).toHaveBeenCalledTimes(1))
    expect(mocks.checkSimilarOrganisations).toHaveBeenCalledWith('abc', undefined)
  })

  it('debounces rapid name updates into a single request', async () => {
    const { rerender } = renderHook(({ name }) => useSimilarOrganisations(name), {
      wrapper: createWrapper(),
      initialProps: { name: '' },
    })
    rerender({ name: 'a' })
    await vi.advanceTimersByTimeAsync(100)
    rerender({ name: 'ab' })
    await vi.advanceTimersByTimeAsync(100)
    rerender({ name: 'abc' })
    await vi.advanceTimersByTimeAsync(250)
    expect(mocks.checkSimilarOrganisations).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(50)
    await waitFor(() => expect(mocks.checkSimilarOrganisations).toHaveBeenCalledTimes(1))
    expect(mocks.checkSimilarOrganisations).toHaveBeenCalledWith('abc', undefined)
  })
})
