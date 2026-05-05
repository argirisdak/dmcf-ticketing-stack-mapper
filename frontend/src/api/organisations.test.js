import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkSimilarOrganisations, createOrganisation } from './organisations.js'

describe('checkSimilarOrganisations', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns envelope data array on success', async () => {
    const rows = [{ id: 'a', name: 'Royal', city: 'London', country: 'United Kingdom' }]
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: rows, error: null, meta: null }),
    })
    const out = await checkSimilarOrganisations('Royal')
    expect(out.data).toEqual(rows)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/organisations/check-similar?name=Royal'),
    )
  })

  it('appends excludeId when provided', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], error: null, meta: null }),
    })
    await checkSimilarOrganisations('Theatre', '11111111-1111-1111-1111-111111111111')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/check-similar\?name=Theatre&excludeId=11111111-1111-1111-1111-111111111111/),
    )
  })
})

describe('createOrganisation', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('throws with statusCode 409 and fields for composite unique conflict', async () => {
    const msg = 'An organisation called "X" already exists in (no city), France.'
    const fields = [{ field: 'name', message: 'Conflicts with existing organisation in this city and country.' }]
    globalThis.fetch.mockResolvedValue({
      status: 409,
      json: async () => ({ data: null, error: { message: msg, fields }, meta: null }),
    })
    try {
      await createOrganisation({ name: 'X', country: 'France', organisationTypeId: 't' })
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(/** @type {{ statusCode?: number }} */ (e).statusCode).toBe(409)
      expect(/** @type {{ fields: typeof fields }} */ (e).fields).toEqual(fields)
      expect(e.message).toContain('already exists in')
    }
  })
})
