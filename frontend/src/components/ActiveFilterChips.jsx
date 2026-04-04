import {
  LIST_FILTER_PARAM_KEYS,
  FILTER_DIMENSION_LABELS,
  CAPABILITY_FILTER_PARAM_KEYS,
  normaliseCapabilityParam,
  clearAllListFiltersInSearchParams,
} from '../lib/organisation-list-filter-params.js'
import { Button } from './ui/button.jsx'

const CHIP_CLASSES =
  'inline-flex items-center gap-1 bg-blue-50 border border-blue-300 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full'

/**
 * @param {{
 *   searchParams: URLSearchParams
 *   setSearchParams: import('react-router-dom').SetURLSearchParams
 * }} props
 */
export function ActiveFilterChips({ searchParams, setSearchParams }) {
  const chips = LIST_FILTER_PARAM_KEYS.map((key) => {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') return null
    let display = raw
    if (CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      const n = normaliseCapabilityParam(raw)
      if (!n) return null
      display = n
    }
    const dim = FILTER_DIMENSION_LABELS[key]
    return { key, dim, text: `${dim}: ${display}` }
  }).filter(Boolean)

  if (chips.length === 0) return null

  const remove = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(key)
      next.set('page', '1')
      return next
    })
  }

  const clearAll = () => {
    setSearchParams((prev) => clearAllListFiltersInSearchParams(prev))
  }

  return (
    <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {chips.map(({ key, dim, text }) => (
          <span key={key} className={CHIP_CLASSES}>
            <span>{text}</span>
            <button
              type="button"
              className="-mr-1 rounded-full px-1 leading-none text-blue-800 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label={`Remove ${dim} filter`}
              onClick={() => remove(key)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={clearAll}>
        Clear all
      </Button>
    </div>
  )
}
