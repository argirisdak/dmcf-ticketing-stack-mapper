import { parseSortOrderCombined } from '../lib/sort-options.js'

const selectClass =
  'min-w-[200px] max-w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

/**
 * @param {{
 *   options: { value: string; label: string }[]
 *   sort: string
 *   order: 'asc' | 'desc'
 *   onChange: (next: { sort: string; order: 'asc' | 'desc' }) => void
 *   id?: string
 * }} props
 */
export default function SortDropdown({ options, sort, order, onChange, id = 'list-sort' }) {
  const combined = `${sort}:${order}`
  const validValues = new Set(options.map((o) => o.value))
  const selectValue = validValues.has(combined) ? combined : options[0]?.value ?? 'name:asc'

  return (
    <select
      id={id}
      className={selectClass}
      value={selectValue}
      onChange={(e) => {
        const next = parseSortOrderCombined(e.target.value)
        onChange(next)
      }}
      aria-label="Sort list"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
