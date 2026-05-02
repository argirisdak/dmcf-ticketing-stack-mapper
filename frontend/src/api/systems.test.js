import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSystem, updateSystem, SystemNotFoundError } from './systems.js'

describe('createSystem', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns data on 201 when envelope valid', async () => {
    const dto = { id: 'uuid-1', name: 'Tessitura', vendor: 'TN', category: 'TICKETING' }
    globalThis.fetch.mockResolvedValue({
      status: 201,
      json: async () => ({ data: dto, error: null, meta: null }),
    })
    await expect(createSystem({ name: 'x' })).resolves.toEqual(dto)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws with .fields array on validation error', async () => {
    const fields = [{ field: 'name', message: 'Enter the system name' }]
    globalThis.fetch.mockResolvedValue({
      status: 400,
      json: async () => ({ data: null, error: { message: 'Validation failed', fields }, meta: null }),
    })
    try {
      await createSystem({ name: '' })
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(Array.isArray(/** @type {{ fields?: unknown[] }} */ (e).fields)).toBe(true)
      expect(/** @type {{ fields: typeof fields }} */ (e).fields).toEqual(fields)
    }
  })

  it('throws with .fields array on 409 duplicate name', async () => {
    const fields = [{ field: 'name', message: 'A system with this name already exists' }]
    globalThis.fetch.mockResolvedValue({
      status: 409,
      json: async () => ({ data: null, error: { message: 'A system with this name already exists', fields }, meta: null }),
    })
    try {
      await createSystem({ name: 'Tessitura' })
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(/** @type {{ fields?: unknown[] }} */ (e).fields).toEqual(fields)
    }
  })
})

describe('updateSystem', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('throws SystemNotFoundError on 404', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 404,
      json: async () => ({ data: null, error: { message: 'System not found', fields: [] }, meta: null }),
    })
    await expect(updateSystem('bad-id', { name: 'x' })).rejects.toBeInstanceOf(SystemNotFoundError)
  })

  it('returns data on 200 when envelope valid', async () => {
    const dto = { id: 'bad-id', name: 'x', vendor: 'v', category: 'TICKETING' }
    globalThis.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ data: dto, error: null, meta: null }),
    })
    await expect(updateSystem('bad-id', dto)).resolves.toEqual(dto)
  })
})
