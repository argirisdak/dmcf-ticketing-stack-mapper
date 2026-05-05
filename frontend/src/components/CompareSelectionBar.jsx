import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button.jsx'

function CompareSelectionBarImpl({ entityLabel, useSelectionHook }) {
  const navigate = useNavigate()
  const { selectedIds, clearSelection } = useSelectionHook()
  const n = selectedIds.length

  if (n === 0) return null

  const tooMany = n >= 5
  const canCompare = n >= 1 && n <= 4
  const entitySingular = entityLabel.slice(0, -1)

  const handleCompare = () => {
    if (!canCompare) return
    navigate(`/compare/${entityLabel}?ids=${selectedIds.join(',')}`)
  }

  return (
    <div
      role="region"
      aria-label="Compare selection"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 shadow-lg"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-200">
          <span className="font-medium text-white">{n}</span>{' '}
          {n === 1 ? entitySingular : entityLabel} selected
        </p>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {tooMany ? (
            <p className="text-sm text-amber-200" id="compare-selection-limit-hint">
              Select up to 4 {entityLabel} to compare
            </p>
          ) : null}
          <Button
            type="button"
            variant="default"
            disabled={tooMany}
            aria-describedby={tooMany ? 'compare-selection-limit-hint' : undefined}
            onClick={handleCompare}
          >
            Compare selected ({n}) →
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-slate-200 hover:bg-slate-700 hover:text-white"
            onClick={clearSelection}
          >
            Clear selection
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CompareSelectionBar({ entityLabel, useSelectionHook }) {
  const label = typeof entityLabel === 'string' ? entityLabel.trim() : ''
  if (!label || typeof useSelectionHook !== 'function') {
    throw new Error(
      'CompareSelectionBar expects entityLabel to be a non-empty string (e.g. "organisations") and useSelectionHook to be the selection hook function (e.g. useOrganisationSelection).',
    )
  }

  return (
    <CompareSelectionBarImpl entityLabel={label} useSelectionHook={useSelectionHook} />
  )
}
