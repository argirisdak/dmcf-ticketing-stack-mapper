import {
  SYSTEM_LIST_FILTER_PARAM_KEYS,
  SYSTEM_FILTER_DIMENSION_LABELS,
  SYSTEM_CAPABILITY_FILTER_PARAM_KEYS,
  SYSTEM_CATEGORY_LABELS,
  normaliseCapabilityParam,
  clearAllSystemListFiltersInSearchParams,
} from '../lib/system-list-filter-params.js'
import { Button } from './ui/button.jsx'

const CHIP_CLASSES =
  'inline-flex items-center gap-1 bg-blue-50 border border-blue-300 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full'

/**
 * @param {{
 *   searchParams: URLSearchParams
 *   setSearchParams: import('react-router-dom').SetURLSearchParams
 * }} props
 */
export function SystemActiveFilterChips({ searchParams, setSearchParams }) {
  const catChips = searchParams
    .getAll('category')
    .filter((v) => SYSTEM_CATEGORY_LABELS[v])
    .map((v) => ({ key: `category:${v}`, type: 'category', value: v, text: `Category: ${SYSTEM_CATEGORY_LABELS[v]}` }))

  const qRaw = searchParams.get('q')
  const qChip =
    qRaw && qRaw.trim() !== ''
      ? [{ key: 'q', type: 'q', value: qRaw.trim(), text: `Search: ${qRaw.trim()}` }]
      : []

  const filterChips = SYSTEM_LIST_FILTER_PARAM_KEYS.map((key) => {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') return null
    let display = raw
    if (SYSTEM_CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      const n = normaliseCapabilityParam(raw)
      if (!n) return null
      display = n.charAt(0) + n.slice(1).toLowerCase()
    }
    const dim = SYSTEM_FILTER_DIMENSION_LABELS[key]
    return { key, type: 'filter', value: raw, text: `${dim}: ${display}` }
  }).filter(Boolean)

  const chips = [...catChips, ...qChip, ...filterChips]

  if (chips.length === 0) return null

  const removeCategory = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('category')
      prev.getAll('category').filter((v) => v !== value).forEach((v) => next.append('category', v))
      next.set('page', '1')
      return next
    })
  }

  const removeFilter = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(key)
      next.set('page', '1')
      return next
    })
  }

  const clearAll = () => {
    setSearchParams((prev) => clearAllSystemListFiltersInSearchParams(prev))
  }

  return (
    <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip.key} className={CHIP_CLASSES}>
            <span>{chip.text}</span>
            <button
              type="button"
              className="-mr-1 rounded-full px-1 leading-none text-blue-800 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label={`Remove ${chip.text} filter`}
              onClick={() => {
                if (chip.type === 'category') removeCategory(chip.value)
                else removeFilter(chip.key)
              }}
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
