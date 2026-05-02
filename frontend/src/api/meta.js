const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const base = String(rawBase).replace(/\/$/, '')

/**
 * @param {string} path e.g. '/api/meta/organisation-types'
 * @returns {Promise<{ id: string; name: string }[]>}
 */
async function fetchMetaOptions(path) {
  const res = await fetch(`${base}${path}`)
  let body
  try {
    body = await res.json()
  } catch {
    throw new Error(`Request failed (${res.status})`)
  }
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  }
  if (body == null || typeof body !== 'object' || !Array.isArray(body.data)) {
    throw new Error('Invalid response from meta API')
  }
  return body.data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
  }))
}

export function fetchOrganisationTypes() {
  return fetchMetaOptions('/api/meta/organisation-types')
}
