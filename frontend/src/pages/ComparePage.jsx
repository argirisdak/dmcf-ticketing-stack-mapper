import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { OrganisationCard } from '../components/OrganisationCard.jsx'
import { parseCompareIds } from '../lib/compare-url-params.js'
import { useCompareOrganisations } from '../hooks/useCompareOrganisations.js'

const ROW_LABELS = [
  'Country',
  'Type',
  'Ticketing Provider',
  'CRM Platform',
  'Membership Capability',
  'Donation Capability',
  'Reserved Seating Capability',
  'Source Reference',
  'Last Updated',
]

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const idsParam = searchParams.get('ids')
  const ids = useMemo(() => parseCompareIds(idsParam), [idsParam])
  const queries = useCompareOrganisations(ids)

  const removeId = useCallback(
    (idToRemove) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const remaining = parseCompareIds(next.get('ids')).filter((id) => id !== idToRemove)
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
        <Link to="/organisations" className="mb-4 inline-block text-sm text-blue-600">
          ← Back to organisations
        </Link>
        <p className="mt-2 text-slate-600">Select organisations from the list to compare them here.</p>
        <Link
          to="/organisations"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Go to organisations
        </Link>
      </div>
    )
  }

  return (
    <div className="py-8">
      <Link to="/organisations" className="mb-4 inline-block text-sm text-blue-600">
        ← Back to organisations
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800">Compare organisations</h1>

      <div className="mt-6 min-w-0 overflow-x-auto pb-1 xl:overflow-visible">
        <div
          className="inline-grid min-w-full gap-x-4"
          style={{
            gridTemplateColumns: `12rem repeat(${ids.length}, 18rem)`,
            gridTemplateRows: 'auto repeat(9, auto)',
          }}
        >
          <div className="sticky left-0 z-20 col-start-1 row-span-full grid min-w-0 grid-rows-subgrid border-r border-slate-200 bg-slate-50">
            <div
              className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50"
              aria-hidden
            />
            {ROW_LABELS.map((label) => (
              <div
                key={label}
                className="flex items-center border-b border-slate-200 px-3 py-3 text-sm font-medium text-slate-600 last:border-b-0"
              >
                {label}
              </div>
            ))}
          </div>

          {ids.map((id, index) => (
            <OrganisationCard
              key={id}
              compareGridColumn={index + 2}
              organisationId={id}
              query={queries[index]}
              onRemove={() => removeId(id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
