const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const base = String(rawBase).replace(/\/$/, '')

function assertListResponse(body) {
  if (body == null || typeof body !== 'object') {
    throw new Error('Invalid response from organisations API')
  }
  if (!Array.isArray(body.data)) {
    throw new Error('Invalid response from organisations API: data is not an array')
  }
  if (body.error !== null && body.error !== undefined) {
    throw new Error('Invalid response from organisations API: error must be null on success')
  }
  const m = body.meta
  if (m == null || typeof m !== 'object') {
    throw new Error('Invalid response from organisations API: missing meta')
  }
  const { page, limit, total, totalPages } = m
  if (
    typeof page !== 'number' ||
    typeof limit !== 'number' ||
    typeof total !== 'number' ||
    typeof totalPages !== 'number'
  ) {
    throw new Error('Invalid response from organisations API: meta pagination fields')
  }
}

/**
 * @param {{
 *   page?: number
 *   limit?: number
 *   q?: string
 *   country?: string
 *   type?: string
 *   system?: string
 *   system_role?: string
 *   membership?: string
 *   donation?: string
 *   seating?: string
 *   sort?: string
 *   order?: string
 * }} params
 * @returns {Promise<{ data: unknown[]; error: null; meta: { page: number; limit: number; total: number; totalPages: number } }>}
 */
export async function fetchOrganisations(params = {}) {
  const {
    page = 1,
    limit = 20,
    q,
    country,
    type,
    system,
    system_role,
    membership,
    donation,
    seating,
    sort,
    order,
  } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  const trimmed = typeof q === 'string' ? q.trim() : ''
  if (trimmed !== '') qs.set('q', trimmed)
  if (country) qs.set('country', country)
  if (type) qs.set('type', type)
  if (system) qs.set('system', system)
  if (system_role) qs.set('system_role', system_role)
  if (membership) qs.set('membership', membership)
  if (donation) qs.set('donation', donation)
  if (seating) qs.set('seating', seating)
  if (sort) qs.set('sort', sort)
  if (order) qs.set('order', order)
  const res = await fetch(`${base}/api/organisations?${qs}`)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  }
  assertListResponse(body)
  return body
}

/**
 * @param {Record<string, unknown>} body camelCase organisation payload
 * @returns {Promise<object>} created organisation DTO
 */
export async function createOrganisation(body) {
  const res = await fetch(`${base}/api/organisations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 201) {
    if (envelope == null || typeof envelope !== 'object') {
      throw new Error('Invalid response from organisations API')
    }
    if (envelope.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from organisations API: missing data')
    }
    if (envelope.error !== null) {
      throw new Error('Invalid response from organisations API: error must be null on success')
    }
    if (envelope.meta !== null) {
      throw new Error('Invalid response from organisations API: meta must be null on create')
    }
    return envelope.data
  }
  if (res.status === 400) {
    const err = new Error(envelope?.error?.message ?? 'Validation failed')
    err.fields = Array.isArray(envelope?.error?.fields) ? envelope.error.fields : []
    throw err
  }
  if (res.status === 409) {
    const err = new Error(envelope?.error?.message ?? 'Conflict')
    err.fields = Array.isArray(envelope?.error?.fields) ? envelope.error.fields : []
    err.statusCode = 409
    throw err
  }
  throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
}

export class OrganisationNotFoundError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Organisation not found') {
    super(message)
    this.name = 'OrganisationNotFoundError'
    /** @type {404} */
    this.statusCode = 404
  }
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body camelCase organisation payload
 * @returns {Promise<object>} updated organisation DTO
 */
export async function updateOrganisation(id, body) {
  const res = await fetch(`${base}/api/organisations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 200) {
    if (envelope == null || typeof envelope !== 'object') {
      throw new Error('Invalid response from organisations API')
    }
    if (envelope.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from organisations API: missing data')
    }
    if (envelope.error !== null) {
      throw new Error('Invalid response from organisations API: error must be null on success')
    }
    if (envelope.meta !== null) {
      throw new Error('Invalid response from organisations API: meta must be null on update')
    }
    return envelope.data
  }
  if (res.status === 400) {
    const err = new Error(envelope?.error?.message ?? 'Validation failed')
    err.fields = Array.isArray(envelope?.error?.fields) ? envelope.error.fields : []
    throw err
  }
  if (res.status === 409) {
    const err = new Error(envelope?.error?.message ?? 'Conflict')
    err.fields = Array.isArray(envelope?.error?.fields) ? envelope.error.fields : []
    err.statusCode = 409
    throw err
  }
  if (res.status === 404) {
    throw new OrganisationNotFoundError(
      typeof envelope?.error?.message === 'string' ? envelope.error.message : undefined,
    )
  }
  throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
}

/**
 * Similar-name lookup for organisation create/edit guardrails.
 * @param {string} name
 * @param {string} [excludeId] UUID of current org when editing (optional)
 * @returns {Promise<{ data: { id: string; name: string; city: string | null; country: string }[]; error: null; meta: null }>}
 */
export async function checkSimilarOrganisations(name, excludeId) {
  const trimmed = String(name ?? '').trim()
  const qs = new URLSearchParams({ name: trimmed })
  if (excludeId) qs.set('excludeId', String(excludeId).trim())
  const res = await fetch(`${base}/api/organisations/check-similar?${qs}`)
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 400) {
    const err = new Error(envelope?.error?.message ?? 'Validation failed')
    err.fields = Array.isArray(envelope?.error?.fields) ? envelope.error.fields : []
    throw err
  }
  if (!res.ok) {
    throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
  }
  if (envelope == null || typeof envelope !== 'object') {
    throw new Error('Invalid response from organisations API')
  }
  if (!Array.isArray(envelope.data)) {
    throw new Error('Invalid response from organisations API: data must be an array')
  }
  if (envelope.error !== null && envelope.error !== undefined) {
    throw new Error('Invalid response from organisations API: error must be null on success')
  }
  if (envelope.meta !== null && envelope.meta !== undefined) {
    throw new Error('Invalid response from organisations API: meta must be null')
  }
  return envelope
}

/**
 * @param {string} id
 * @returns {Promise<{ id: string }>} deleted id envelope payload
 */
export async function deleteOrganisation(id) {
  const res = await fetch(`${base}/api/organisations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 200) {
    if (envelope == null || typeof envelope !== 'object') {
      throw new Error('Invalid response from organisations API')
    }
    if (envelope.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from organisations API: missing data')
    }
    if (typeof envelope.data.id !== 'string') {
      throw new Error('Invalid response from organisations API: missing id')
    }
    if (envelope.error !== null) {
      throw new Error('Invalid response from organisations API: error must be null on success')
    }
    if (envelope.meta !== null) {
      throw new Error('Invalid response from organisations API: meta must be null on delete')
    }
    return envelope.data
  }
  if (res.status === 404) {
    throw new OrganisationNotFoundError(
      typeof envelope?.error?.message === 'string' ? envelope.error.message : undefined,
    )
  }
  throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
}

/**
 * @param {string} id
 * @returns {Promise<object>} organisation DTO
 */
export async function fetchOrganisation(id) {
  const res = await fetch(`${base}/api/organisations/${encodeURIComponent(id)}`)
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 404) {
    throw new OrganisationNotFoundError(
      typeof envelope?.error?.message === 'string' ? envelope.error.message : undefined,
    )
  }
  if (!res.ok) {
    throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
  }
  if (envelope == null || typeof envelope !== 'object') {
    throw new Error('Invalid response from organisations API')
  }
  if (envelope.data == null || typeof envelope.data !== 'object') {
    throw new Error('Invalid response from organisations API: missing data')
  }
  if (envelope.error !== null) {
    throw new Error('Invalid response from organisations API: error must be null on success')
  }
  if (envelope.meta !== null) {
    throw new Error('Invalid response from organisations API: meta must be null')
  }
  return envelope.data
}
