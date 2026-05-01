const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const base = String(rawBase).replace(/\/$/, '')

/**
 * @param {string} orgId
 * @returns {Promise<unknown[]>}
 */
export async function fetchOrganisationSystemLinks(orgId) {
  const res = await fetch(`${base}/api/organisations/${encodeURIComponent(orgId)}/systems`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  }
  const list = body?.data
  return Array.isArray(list) ? list : []
}

/**
 * @param {string} orgId
 * @param {{ systemId: string; role: string; sourceReference?: string | null; note?: string | null }} body
 * @returns {Promise<object>} created link DTO
 */
export async function createOrganisationSystemLink(orgId, body) {
  const res = await fetch(`${base}/api/organisations/${encodeURIComponent(orgId)}/systems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 201) {
    return envelope.data
  }
  if (res.status === 409) {
    throw Object.assign(
      new Error(envelope?.error?.message ?? 'This system is already linked'),
      { isConflict: true },
    )
  }
  if (res.status === 400) {
    throw Object.assign(
      new Error(envelope?.error?.message ?? 'Validation failed'),
      { fields: Array.isArray(envelope?.error?.fields) ? envelope.error.fields : [] },
    )
  }
  throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
}

/**
 * @param {string} orgId
 * @param {string} linkId
 * @param {Partial<{ systemId: string; role: string; sourceReference: string | null; note: string | null }>} body
 * @returns {Promise<object>} updated link DTO
 */
export async function updateOrganisationSystemLink(orgId, linkId, body) {
  const res = await fetch(
    `${base}/api/organisations/${encodeURIComponent(orgId)}/systems/${encodeURIComponent(linkId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 200) {
    return envelope.data
  }
  if (res.status === 400) {
    throw Object.assign(
      new Error(envelope?.error?.message ?? 'Validation failed'),
      { fields: Array.isArray(envelope?.error?.fields) ? envelope.error.fields : [] },
    )
  }
  throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
}

/**
 * @param {string} orgId
 * @param {string} linkId
 * @returns {Promise<string>} deleted link id
 */
export async function deleteOrganisationSystemLink(orgId, linkId) {
  const res = await fetch(
    `${base}/api/organisations/${encodeURIComponent(orgId)}/systems/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' },
  )
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 200) {
    return envelope.data.id
  }
  throw new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
}
