import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { useSystems } from '../hooks/useSystems.js'
import {
  SYSTEM_CATEGORY_LABELS,
  DEPLOYMENT_MODEL_LABELS,
  PRICING_MODEL_LABELS,
  SYSTEM_MORE_CAPABILITY_FILTER_ROWS,
  clearAllSystemListFiltersInSearchParams,
  countActiveExtendedCapabilityFilters,
  hasActiveExtendedCapabilityFilters,
  hasActiveSystemListFilters,
  parseSystemListInputsFromSearchParams,
} from '../lib/system-list-filter-params.js'
import { SYSTEM_GEOGRAPHIC_FOCUS } from '../lib/system-geographic-focus.js'
import { SystemActiveFilterChips } from '../components/SystemActiveFilterChips.jsx'
import { CompareSelectionBar } from '../components/CompareSelectionBar.jsx'
import { Button } from '../components/ui/button.jsx'
import { CapabilityBadge } from '../components/CapabilityBadge.jsx'
import { useSystemSelection } from '../hooks/useSystemSelection.js'
import SortDropdown from '../components/SortDropdown.jsx'
import { SYSTEM_SORT_OPTIONS, normaliseSystemSortFromUrl } from '../lib/sort-options.js'

const LIMIT = 20

const CATEGORY_CHIPS = [
  { value: 'INTEGRATED', label: 'Integrated' },
  { value: 'TICKETING', label: 'Ticketing' },
  { value: 'AUDIENCE_MANAGEMENT', label: 'Audience management' },
]

const DEPLOYMENT_OPTIONS = [
  { value: 'SAAS', label: 'SaaS' },
  { value: 'SELF_HOSTED', label: 'Self-hosted' },
  { value: 'HYBRID', label: 'Hybrid' },
]

const PRICING_OPTIONS = [
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TRANSACTION_FEE', label: 'Transaction fee' },
  { value: 'LICENCE', label: 'Licence' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

function SystemCategoryBadge({ category }) {
  const config = {
    INTEGRATED: {
      label: 'Integrated',
      cls: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    TICKETING: {
      label: 'Ticketing',
      cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    AUDIENCE_MANAGEMENT: {
      label: 'Audience management',
      cls: 'bg-purple-50 text-purple-700 border border-purple-200',
    },
  }
  const { label, cls } = config[category] ?? {
    label: category,
    cls: 'bg-slate-50 text-slate-700 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function formatUpdated(iso) {
  if (!iso) return '–'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '–'
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day')
  }
  const diffWeeks = Math.round(diffDays / 7)
  if (Math.abs(diffWeeks) < 5) {
    return rtf.format(diffWeeks, 'week')
  }
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month')
  }
  const diffYears = Math.round(diffDays / 365)
  return rtf.format(diffYears, 'year')
}

/** @returns {({ type: 'page'; n: number } | { type: 'ellipsis' })[]} */
function pageItems(page, totalPages) {
  if (totalPages <= 15) {
    return Array.from({ length: totalPages }, (_, i) => ({ type: 'page', n: i + 1 }))
  }
  const nums = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages)
  )
  const sorted = [...nums].sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push({ type: 'ellipsis' })
    out.push({ type: 'page', n: sorted[i] })
  }
  return out
}

function TableSkeleton() {
  const cols = 9
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-3 align-middle">
              <div className="h-4 rounded bg-slate-100 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function SystemListFilterSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { sort, order } = normaliseSystemSortFromUrl(
    searchParams.get('sort'),
    searchParams.get('order'),
  )
  const [moreCapabilitiesOpen, setMoreCapabilitiesOpen] = useState(() =>
    hasActiveExtendedCapabilityFilters(searchParams)
  )
  const activeExtendedFilterCount = countActiveExtendedCapabilityFilters(searchParams)

  const activeCategories = searchParams.getAll('category')

  const handleSortChange = (next) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set('sort', next.sort)
      nextParams.set('order', next.order)
      nextParams.set('page', '1')
      return nextParams
    })
  }

  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch.trim() === '') {
        next.delete('q')
      } else {
        next.set('q', debouncedSearch.trim())
      }
      next.set('page', '1')
      return next
    })
  }, [debouncedSearch, setSearchParams])

  const toggleCategory = useCallback(
    (value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('category')
        const current = prev.getAll('category')
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        updated.forEach((v) => next.append('category', v))
        next.set('page', '1')
        return next
      })
    },
    [setSearchParams]
  )

  const toggleGeographicFocus = useCallback(
    (value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('geographic_focus')
        const current = prev.getAll('geographic_focus')
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        updated.forEach((v) => next.append('geographic_focus', v))
        next.set('page', '1')
        return next
      })
    },
    [setSearchParams]
  )

  const updateParam = (key, rawValue) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (rawValue === '' || rawValue == null) {
        next.delete(key)
      } else {
        next.set(key, rawValue)
      }
      next.set('page', '1')
      return next
    })
  }

  const selectClass =
    'w-full min-w-[140px] max-w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

  const deploymentVal = searchParams.get('deployment_model') ?? ''
  const pricingVal = searchParams.get('pricing_model') ?? ''
  const activeGeographicFocus = searchParams.getAll('geographic_focus')
  const membershipVal = searchParams.get('membership') ?? ''
  const donationVal = searchParams.get('donation') ?? ''
  const seatingVal = searchParams.get('seating') ?? ''

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label htmlFor="filter-search" className="text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              id="filter-search"
              type="search"
              placeholder="Search systems…"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="inline-flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <label
              htmlFor="system-list-sort"
              className="whitespace-nowrap text-sm font-medium text-slate-700"
            >
              Sort by
            </label>
            <SortDropdown
              id="system-list-sort"
              options={[...SYSTEM_SORT_OPTIONS]}
              sort={sort}
              order={order}
              onChange={handleSortChange}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <div className="flex flex-wrap gap-2 pt-1">
            {CATEGORY_CHIPS.map(({ value, label }) => {
              const isActive = activeCategories.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCategory(value)}
                  className={
                    isActive
                      ? 'rounded-full px-3 py-1.5 text-sm font-medium border border-transparent bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                      : 'rounded-full px-3 py-1.5 text-sm font-medium border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                  }
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[200px]">
          <label htmlFor="filter-deployment" className="text-sm font-medium text-slate-700">
            Deployment
          </label>
          <select
            id="filter-deployment"
            className={selectClass}
            value={deploymentVal}
            onChange={(e) => updateParam('deployment_model', e.target.value)}
          >
            <option value="">All deployments</option>
            {DEPLOYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[200px]">
          <label htmlFor="filter-pricing" className="text-sm font-medium text-slate-700">
            Pricing
          </label>
          <select
            id="filter-pricing"
            className={selectClass}
            value={pricingVal}
            onChange={(e) => updateParam('pricing_model', e.target.value)}
          >
            <option value="">All pricing</option>
            {PRICING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[140px] flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Geographic focus</span>
          <div className="flex flex-wrap gap-2 pt-1">
            {SYSTEM_GEOGRAPHIC_FOCUS.map((f) => {
              const isActive = activeGeographicFocus.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleGeographicFocus(f)}
                  className={
                    isActive
                      ? 'rounded-full px-3 py-1.5 text-sm font-medium border border-transparent bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                      : 'rounded-full px-3 py-1.5 text-sm font-medium border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                  }
                  aria-pressed={isActive}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[180px]">
          <label htmlFor="filter-membership" className="text-sm font-medium text-slate-700">
            Membership
          </label>
          <select
            id="filter-membership"
            className={selectClass}
            value={membershipVal}
            onChange={(e) => updateParam('membership', e.target.value)}
          >
            <option value="">Any</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[180px]">
          <label htmlFor="filter-donation" className="text-sm font-medium text-slate-700">
            Donation
          </label>
          <select
            id="filter-donation"
            className={selectClass}
            value={donationVal}
            onChange={(e) => updateParam('donation', e.target.value)}
          >
            <option value="">Any</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[180px]">
          <label htmlFor="filter-seating" className="text-sm font-medium text-slate-700">
            Reserved seating
          </label>
          <select
            id="filter-seating"
            className={selectClass}
            value={seatingVal}
            onChange={(e) => updateParam('seating', e.target.value)}
          >
            <option value="">Any</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>
      </div>

      <details
        className="group mt-3 w-full max-w-full"
        open={moreCapabilitiesOpen}
        onToggle={(e) => setMoreCapabilitiesOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-baseline gap-2 text-xs font-medium text-slate-600 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="select-none text-slate-400 group-open:rotate-90 transition-transform">
            ▸
          </span>
          <span>
            More capabilities ({SYSTEM_MORE_CAPABILITY_FILTER_ROWS.length})
            {!moreCapabilitiesOpen && activeExtendedFilterCount > 0 ? (
              <span className="ml-1.5 font-normal text-slate-500">
                · {activeExtendedFilterCount} active
              </span>
            ) : null}
          </span>
        </summary>
        <div className="mt-2 space-y-3 pl-5 sm:pl-6">
          {SYSTEM_MORE_CAPABILITY_FILTER_ROWS.map(({ key, label }) => (
            <div key={key} className="flex min-w-[140px] max-w-[220px] flex-col gap-1">
              <label htmlFor={`filter-${key}`} className="text-xs font-medium text-slate-600">
                {label}
              </label>
              <select
                id={`filter-${key}`}
                className={selectClass}
                value={searchParams.get(key) ?? ''}
                onChange={(e) => updateParam(key, e.target.value)}
              >
                <option value="">Any</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
          ))}
        </div>
      </details>

      <SystemActiveFilterChips searchParams={searchParams} setSearchParams={setSearchParams} />
    </>
  )
}

/**
 * @param {{ onClearSearch: () => void }} props
 */
function SystemListResults({ onClearSearch }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { selectedIds, toggleSelection } = useSystemSelection()
  const listInputs = parseSystemListInputsFromSearchParams(searchParams, LIMIT)
  const page = listInputs.page
  const hasFilters = hasActiveSystemListFilters(searchParams)
  const hasQ = listInputs.q !== undefined

  const { data, isLoading, isError, error } = useSystems(listInputs)

  const systems = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 0

  const showPagination = total > LIMIT || totalPages > 1
  const startIdx = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const endIdx = Math.min(page * LIMIT, total)

  const showResultsTable = isLoading || total > 0 || hasQ || hasFilters

  const setPage = (n) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(n))
      return next
    })
  }

  return (
    <>
      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error?.message ?? 'Could not load systems.'}
        </div>
      )}

      {!isError && !isLoading && total === 0 && !hasQ && !hasFilters && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-slate-600">No systems yet. Add the first one to get started.</p>
          <Button
            type="button"
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/systems/new')}
          >
            Add system
          </Button>
        </div>
      )}

      {!isError && showResultsTable ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-12 px-2 py-3" scope="col">
                    <span className="sr-only">Select for compare</span>
                  </th>
                  <th className="px-3 py-3 min-w-[200px]">Name</th>
                  <th className="px-3 py-3 min-w-[140px]">Category</th>
                  <th className="px-3 py-3 min-w-[120px]">Deployment</th>
                  <th className="px-3 py-3 min-w-[120px]">Pricing</th>
                  <th className="px-3 py-3 min-w-[80px] text-center">Membership</th>
                  <th className="px-3 py-3 min-w-[80px] text-center">Donation</th>
                  <th className="px-3 py-3 min-w-[80px] text-center">Reserved seating</th>
                  <th className="px-3 py-3 min-w-[120px]">Last updated</th>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-2 py-2" />
                  <th colSpan={5} className="px-3 py-2 text-left text-xs font-normal normal-case text-slate-500">
                    Capabilities: <span className="text-emerald-600 font-medium">✓</span> = Yes,{' '}
                    <span className="text-slate-500 font-medium">✕</span> = No,{' '}
                    <span className="text-slate-400 font-medium">–</span> = Not recorded
                  </th>
                  <th colSpan={3} />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton />
                ) : !isLoading && total === 0 && hasQ && !hasFilters ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-600">
                      <p>
                        No systems found for &apos;{listInputs.q}&apos;. Try a shorter search or check
                        the spelling.
                      </p>
                      <Button type="button" variant="secondary" className="mt-4" onClick={onClearSearch}>
                        Clear search
                      </Button>
                    </td>
                  </tr>
                ) : !isLoading && total === 0 && hasFilters ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-600">
                      <p>No systems match these filters. Try removing a filter or clearing all.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={() =>
                          setSearchParams((prev) => clearAllSystemListFiltersInSearchParams(prev))
                        }
                      >
                        Clear all filters
                      </Button>
                    </td>
                  </tr>
                ) : (
                  systems.map((sys) => (
                    <tr
                      key={sys.id}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      onClick={() => navigate(`/systems/${sys.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/systems/${sys.id}`)
                        }
                      }}
                    >
                      <td
                        className="w-12 px-2 py-3 align-middle"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.includes(sys.id)}
                          onChange={() => toggleSelection(sys.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${(sys.name ?? '').trim() || 'Unnamed system'} for compare`}
                        />
                      </td>
                      <td className="px-3 py-3 min-w-[200px]">
                        <div className="font-medium text-slate-800">{sys.name}</div>
                        {sys.vendor ? (
                          <div className="text-sm text-slate-500">{sys.vendor}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 min-w-[140px]">
                        <SystemCategoryBadge category={sys.category} />
                      </td>
                      <td className="px-3 py-3 min-w-[120px] text-sm text-slate-600">
                        {sys.deploymentModel ? (
                          DEPLOYMENT_MODEL_LABELS[sys.deploymentModel] ?? sys.deploymentModel
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 min-w-[120px] text-sm text-slate-600">
                        {sys.pricingModel ? (
                          PRICING_MODEL_LABELS[sys.pricingModel] ?? sys.pricingModel
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center min-w-[80px]">
                        <CapabilityBadge value={sys.membershipCapability} />
                      </td>
                      <td className="px-3 py-3 text-center min-w-[80px]">
                        <CapabilityBadge value={sys.donationCapability} />
                      </td>
                      <td className="px-3 py-3 text-center min-w-[80px]">
                        <CapabilityBadge value={sys.reservedSeatingCapability} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 min-w-[120px] whitespace-nowrap">
                        {formatUpdated(sys.lastUpdated)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && total > 0 && showPagination && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing {startIdx}–{endIdx} of {total} systems
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                {pageItems(page, totalPages).map((item, i) =>
                  item.type === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item.n}
                      type="button"
                      variant={item.n === page ? 'default' : 'secondary'}
                      size="sm"
                      disabled={item.n === page}
                      onClick={() => setPage(item.n)}
                    >
                      {item.n}
                    </Button>
                  )
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </>
  )
}

export default function SystemListPage() {
  const [, setSearchParams] = useSearchParams()

  const clearSearch = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      next.set('page', '1')
      return next
    })
  }, [setSearchParams])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Systems</h1>
        <Link
          to="/systems/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add system
        </Link>
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SystemListFilterSection />
      </div>

      <CompareSelectionBar entityLabel="systems" useSelectionHook={useSystemSelection} />

      <SystemListResults onClearSearch={clearSearch} />
    </div>
  )
}
