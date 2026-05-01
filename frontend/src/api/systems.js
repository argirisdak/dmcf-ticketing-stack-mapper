const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const base = String(rawBase).replace(/\/$/, '')

export class SystemNotFoundError extends Error {
  /** @param {string} [id] */
  constructor(id) {
    super(id ? `System not found: ${id}` : 'System not found')
    this.name = 'SystemNotFoundError'
    /** @type {404} */
    this.statusCode = 404
  }
}

function assertListResponse(body) {
  if (body == null || typeof body !== 'object') {
    throw new Error('Invalid response from systems API')
  }
  if (!Array.isArray(body.data)) {
    throw new Error('Invalid response from systems API: data is not an array')
  }
  if (body.error !== null && body.error !== undefined) {
    throw new Error('Invalid response from systems API: error must be null on success')
  }
  const m = body.meta
  if (m == null || typeof m !== 'object') {
    throw new Error('Invalid response from systems API: missing meta')
  }
  const { page, limit, total, totalPages } = m
  if (
    typeof page !== 'number' ||
    typeof limit !== 'number' ||
    typeof total !== 'number' ||
    typeof totalPages !== 'number'
  ) {
    throw new Error('Invalid response from systems API: meta pagination fields')
  }
}

/**
 * @param {{
 *   page?: number
 *   limit?: number
 *   q?: string
 *   categories?: string[]
 *   deployment_model?: string
 *   pricing_model?: string
 *   geographic_focus?: string
 *   membership?: string
 *   donation?: string
 *   seating?: string
 * }} params
 * @returns {Promise<{ data: unknown[]; error: null; meta: { page: number; limit: number; total: number; totalPages: number } }>}
 */
export async function fetchSystems(params = {}) {
  const {
    page = 1,
    limit = 20,
    q,
    categories = [],
    deployment_model,
    pricing_model,
    geographic_focus,
    membership,
    donation,
    seating,
  } = params

  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })

  const trimmed = typeof q === 'string' ? q.trim() : ''
  if (trimmed !== '') qs.set('q', trimmed)

  for (const cat of categories) {
    qs.append('category', cat)
  }

  if (deployment_model) qs.set('deployment_model', deployment_model)
  if (pricing_model) qs.set('pricing_model', pricing_model)
  if (geographic_focus) qs.set('geographic_focus', geographic_focus)
  if (membership) qs.set('membership', membership)
  if (donation) qs.set('donation', donation)
  if (seating) qs.set('seating', seating)

  const res = await fetch(`${base}/api/systems?${qs}`)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  }
  assertListResponse(body)
  return body
}

/**
 * @param {string} id
 * @returns {Promise<{ data: object; error: null; meta: null }>}
 */
export async function fetchSystem(id) {
  const res = await fetch(`${base}/api/systems/${encodeURIComponent(id)}`)
  const body = await res.json().catch(() => ({}))
  if (res.status === 404) throw new SystemNotFoundError(id)
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  if (body == null || typeof body !== 'object') {
    throw new Error('Invalid response from systems API')
  }
  if (body.data == null || typeof body.data !== 'object') {
    throw new Error('Invalid response from systems API: missing data')
  }
  if (body.error !== null) {
    throw new Error('Invalid response from systems API: error must be null on success')
  }
  if (body.meta !== null) {
    throw new Error('Invalid response from systems API: meta must be null')
  }
  return body
}

/**
 * @param {string} id
 * @returns {Promise<{ id: string }>}
 */
export async function deleteSystem(id) {
  const res = await fetch(`${base}/api/systems/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const body = await res.json().catch(() => ({}))
  if (res.status === 404) throw new SystemNotFoundError(id)
  if (!res.ok) {
    const err = new Error(body?.error?.message ?? `Request failed (${res.status})`)
    err.status = res.status
    err.linkedOrganisationCount = body?.error?.linkedOrganisationCount ?? null
    throw err
  }
  return body.data
}

/**
 * @param {Record<string, unknown>} body camelCase system write payload
 * @returns {Promise<object>} created system DTO
 */
export async function createSystem(body) {
  const res = await fetch(`${base}/api/systems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 201) {
    if (envelope?.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from systems API')
    }
    if (envelope.error !== null) throw new Error('Invalid response from systems API: error must be null on success')
    if (envelope.meta !== null) throw new Error('Invalid response from systems API: meta must be null on create')
    return envelope.data
  }
  const err = new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
  if (Array.isArray(envelope?.error?.fields)) {
    err.fields = envelope.error.fields
  }
  throw err
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body camelCase system write payload
 * @returns {Promise<object>} updated system DTO
 */
export async function updateSystem(id, body) {
  const res = await fetch(`${base}/api/systems/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 200) {
    if (envelope?.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from systems API')
    }
    if (envelope.error !== null) throw new Error('Invalid response from systems API: error must be null on success')
    if (envelope.meta !== null) throw new Error('Invalid response from systems API: meta must be null on update')
    return envelope.data
  }
  if (res.status === 404) throw new SystemNotFoundError(id)
  const err = new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
  if (Array.isArray(envelope?.error?.fields)) {
    err.fields = envelope.error.fields
  }
  throw err
}
