const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const base = String(rawBase).replace(/\/$/, '')

/**
 * @param {{ page?: number; limit?: number }} params
 * @returns {Promise<{ data: unknown[]; error: { message: string; fields?: unknown[] } | null; meta: { page: number; limit: number; total: number; totalPages: number } | null }>}
 */
export async function fetchOrganisations({ page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  const res = await fetch(`${base}/api/organisations?${qs}`)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  }
  return body
}
