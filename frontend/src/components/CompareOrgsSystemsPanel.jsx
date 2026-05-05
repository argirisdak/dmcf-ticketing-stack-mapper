import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils.js'
import { encodeCompareIdsForQuery, MAX_SYSTEM_COMPARE_IDS } from '../lib/compare-url-params.js'

/**
 * @param {{ systems: import('../lib/compare-organisations-system-union.js').CompareSystemDetail[] }} props
 */
export function CompareOrgsSystemsPanel({ systems }) {
  const navigate = useNavigate()

  const [selected, setSelected] = useState(() =>
    new Set(
      systems.length <= MAX_SYSTEM_COMPARE_IDS ? systems.map((s) => s.id) : [],
    ),
  )

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SYSTEM_COMPARE_IDS) {
        next.add(id)
      }
      return next
    })
  }

  const orderedSelected = systems.map((s) => s.id).filter((id) => selected.has(id))
  const canCompare = orderedSelected.length >= 2
  const atMax = selected.size >= MAX_SYSTEM_COMPARE_IDS

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Systems in comparison</h2>
        <span className="text-sm text-slate-500">
          {selected.size}&thinsp;/&thinsp;{MAX_SYSTEM_COMPARE_IDS} selected
        </span>
      </div>

      <ul className="space-y-2">
        {systems.map((system) => {
          const isSelected = selected.has(system.id)
          const isDisabled = !isSelected && atMax
          return (
            <li key={system.id}>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors',
                  isSelected
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                  isDisabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggle(system.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{system.name}</span>
                    {system.category && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {system.category}
                      </span>
                    )}
                  </div>
                  {system.vendor && (
                    <p className="mt-0.5 text-sm text-slate-500">{system.vendor}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Used by: {system.usedByOrgNames.join(', ')}
                  </p>
                </div>
              </label>
            </li>
          )
        })}
      </ul>

      {atMax && (
        <p className="mt-3 text-sm text-amber-700">
          Maximum {MAX_SYSTEM_COMPARE_IDS} systems selected — deselect one to choose another.
        </p>
      )}

      <button
        onClick={() =>
          navigate(`/compare/systems?ids=${encodeCompareIdsForQuery(orderedSelected)}`)
        }
        disabled={!canCompare}
        className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Compare selected systems
      </button>
    </div>
  )
}
