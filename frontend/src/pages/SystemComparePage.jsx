import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SystemCard } from '../components/SystemCard.jsx'
import {
  buildSystemCompareRowLabels,
  mergeCustomAttributeUnionLabels,
  systemCompareSectionDividerRowIndexes,
} from '../lib/system-compare-union-labels.js'
import { MAX_SYSTEM_COMPARE_IDS, parseCompareIds } from '../lib/compare-url-params.js'
import { useCompareSystems } from '../hooks/useCompareSystems.js'
import { cn } from '../lib/utils.js'

export default function SystemComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const idsParam = searchParams.get('ids')
  const ids = useMemo(
    () => parseCompareIds(idsParam).slice(0, MAX_SYSTEM_COMPARE_IDS),
    [idsParam],
  )
  const queries = useCompareSystems(ids)
  const unionLabels = mergeCustomAttributeUnionLabels(ids, queries)

  const rowLabels = useMemo(() => buildSystemCompareRowLabels(unionLabels), [unionLabels])

  const sectionDividerRows = useMemo(
    () => systemCompareSectionDividerRowIndexes(unionLabels.length),
    [unionLabels.length],
  )

  const removeId = useCallback(
    (idToRemove) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const remaining = parseCompareIds(next.get('ids'))
            .slice(0, MAX_SYSTEM_COMPARE_IDS)
            .filter((id) => id !== idToRemove)
          if (remaining.length === 0) {
            next.delete('ids')
          } else {
            next.set('ids', remaining.join(','))
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  if (ids.length === 0) {
    return (
      <div className="py-8">
        <Link to="/systems" className="mb-4 inline-block text-sm text-blue-600">
          ← Back to systems
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Compare systems</h1>
        <p className="mt-2 text-slate-600">Select systems from the list to compare them here.</p>
        <Link
          to="/systems"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Go to systems →
        </Link>
      </div>
    )
  }

  return (
    <div className="py-8">
      <Link to="/systems" className="mb-4 inline-block text-sm text-blue-600">
        ← Back to systems
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800">Compare systems</h1>

      <div className="mt-6 min-w-0 overflow-x-auto pb-1 xl:overflow-visible">
        <div
          className="inline-grid min-w-full gap-x-4"
          style={{
            gridTemplateColumns: `12rem repeat(${ids.length}, 18rem)`,
            gridTemplateRows: `auto repeat(${rowLabels.length}, auto)`,
          }}
        >
          <div className="sticky left-0 z-20 col-start-1 row-span-full grid min-w-0 grid-rows-subgrid border-r border-slate-200 bg-slate-50">
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50" aria-hidden />
            {rowLabels.map((label, rowIndex) => (
              <div
                key={`${rowIndex}-${label}`}
                className={cn(
                  'flex items-center border-b border-slate-200 px-3 py-3 text-sm font-medium text-slate-600 last:border-b-0',
                  sectionDividerRows.has(rowIndex) && 'border-t border-slate-200',
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {ids.map((id, index) => (
            <SystemCard
              key={id}
              systemId={id}
              compareGridColumn={index + 2}
              unionCustomAttributeLabels={unionLabels}
              query={queries[index]}
              onRemove={() => removeId(id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
