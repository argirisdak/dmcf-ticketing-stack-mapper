import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchOrganisationSystemLinks,
  createOrganisationSystemLink,
  updateOrganisationSystemLink,
  deleteOrganisationSystemLink,
} from './organisation-systems.js'

const LINK = {
  id: 'link-1',
  role: 'PRIMARY_TICKETING',
  sourceReference: 'https://example.com',
  note: 'test note',
  lastUpdated: '2026-01-01T00:00:00Z',
  system: { id: 'sys-1', name: 'Tessitura', vendor: 'TN', category: 'TICKETING' },
}

describe('fetchOrganisationSystemLinks', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns data array on 200', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [LINK], error: null, meta: null }),
    })
    await expect(fetchOrganisationSystemLinks('org-1')).resolves.toEqual([LINK])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when body.data is not an array', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: null, error: null, meta: null }),
    })
    await expect(fetchOrganisationSystemLinks('org-1')).resolves.toEqual([])
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ data: null, error: { message: 'Server error' }, meta: null }),
    })
    await expect(fetchOrganisationSystemLinks('org-1')).rejects.toThrow('Server error')
  })
})

describe('createOrganisationSystemLink', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns data on 201', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 201,
      json: async () => ({ data: LINK, error: null, meta: null }),
    })
    await expect(
      createOrganisationSystemLink('org-1', { systemId: 'sys-1', role: 'PRIMARY_TICKETING' }),
    ).resolves.toEqual(LINK)
  })

  it('throws with isConflict=true on 409', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 409,
      json: async () => ({ data: null, error: { message: 'Already linked' }, meta: null }),
    })
    try {
      await createOrganisationSystemLink('org-1', { systemId: 'sys-1', role: 'SECONDARY' })
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(/** @type {{ isConflict?: boolean }} */ (e).isConflict).toBe(true)
    }
  })

  it('throws with .fields array on 400', async () => {
    const fields = [{ field: 'role', message: 'Role is required' }]
    globalThis.fetch.mockResolvedValue({
      status: 400,
      json: async () => ({
        data: null,
        error: { message: 'Validation failed', fields },
        meta: null,
      }),
    })
    try {
      await createOrganisationSystemLink('org-1', {})
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(/** @type {{ fields?: unknown[] }} */ (e).fields).toEqual(fields)
    }
  })
})

describe('updateOrganisationSystemLink', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns data on 200', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ data: LINK, error: null, meta: null }),
    })
    await expect(
      updateOrganisationSystemLink('org-1', 'link-1', { role: 'SECONDARY' }),
    ).resolves.toEqual(LINK)
  })

  it('throws on error status', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 500,
      json: async () => ({ data: null, error: { message: 'Server error' }, meta: null }),
    })
    await expect(updateOrganisationSystemLink('org-1', 'link-1', {})).rejects.toThrow(
      'Server error',
    )
  })
})

describe('deleteOrganisationSystemLink', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns the deleted link id on 200', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ data: { id: 'link-1' }, error: null, meta: null }),
    })
    await expect(deleteOrganisationSystemLink('org-1', 'link-1')).resolves.toBe('link-1')
  })

  it('throws on error status', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 404,
      json: async () => ({ data: null, error: { message: 'Link not found' }, meta: null }),
    })
    await expect(deleteOrganisationSystemLink('org-1', 'link-1')).rejects.toThrow('Link not found')
  })
})
