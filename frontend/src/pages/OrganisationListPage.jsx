import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  NavigationType,
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { useOrganisations } from '../hooks/useOrganisations.js'
import {
  clearAllListFiltersInSearchParams,
  hasActiveListFilters,
  normaliseCapabilityParam,
  parseOrganisationListInputsFromSearchParams,
} from '../lib/organisation-list-filter-params.js'
import {
  useCrmPlatformsQuery,
  useOrganisationTypesQuery,
  useTicketingProvidersQuery,
} from '../hooks/useMetaReferenceData.js'
import { COUNTRIES } from '../lib/countries.js'
import { ActiveFilterChips } from '../components/ActiveFilterChips.jsx'
import { CompareSelectionBar } from '../components/CompareSelectionBar.jsx'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { CapabilityBadge } from '../components/CapabilityBadge.jsx'
import { useSelection } from '../hooks/useSelection.js'

const LIMIT = 20
const BANNER_MS = 5000

/**
 * Filter bar + active chips; URL state only (Story 3.2). List fetch reads the full URL via
 * `parseOrganisationListInputsFromSearchParams` (Story 3.3).
 */
function OrganisationListFilterSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const providersQuery = useTicketingProvidersQuery()
  const typesQuery = useOrganisationTypesQuery()
  const crmsQuery = useCrmPlatformsQuery()

  const providerOptions = providersQuery.data ?? []
  const typeOptions = typesQuery.data ?? []
  const crmOptions = crmsQuery.data ?? []

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

  const countryVal = searchParams.get('country') ?? ''
  const providerVal = searchParams.get('provider') ?? ''
  const typeVal = searchParams.get('type') ?? ''
  const crmVal = searchParams.get('crm') ?? ''
  const membershipVal = normaliseCapabilityParam(searchParams.get('membership'))
  const donationVal = normaliseCapabilityParam(searchParams.get('donation'))
  const seatingVal = normaliseCapabilityParam(searchParams.get('seating'))

  const providerNames = providerOptions.map((o) => o.name)
  const typeNames = typeOptions.map((o) => o.name)
  const crmNames = crmOptions.map((o) => o.name)
  const providerOrphan = Boolean(providerVal && !providerNames.includes(providerVal))
  const typeOrphan = Boolean(typeVal && !typeNames.includes(typeVal))
  const crmOrphan = Boolean(crmVal && !crmNames.includes(crmVal))
  const countryOrphan = Boolean(countryVal && !COUNTRIES.includes(countryVal))

  const metaErrors = [
    providersQuery.isError ? providersQuery.error : null,
    typesQuery.isError ? typesQuery.error : null,
    crmsQuery.isError ? crmsQuery.error : null,
  ].filter(Boolean)

  return (
    <>
      {metaErrors.length > 0 ? (
        <div
          className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {metaErrors.map((err, i) => (
            <p key={i}>{err?.message ?? String(err)}</p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-country" className="text-sm font-medium text-slate-700">
            Country
          </label>
          <select
            id="filter-country"
            className={selectClass}
            value={countryVal}
            onChange={(e) => updateParam('country', e.target.value)}
          >
            <option value="">All countries</option>
            {countryOrphan ? <option value={countryVal}>{countryVal}</option> : null}
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-provider" className="text-sm font-medium text-slate-700">
            Provider
          </label>
          <select
            id="filter-provider"
            className={selectClass}
            value={providerVal}
            onChange={(e) => updateParam('provider', e.target.value)}
            aria-busy={providersQuery.isFetching || undefined}
          >
            <option value="">All providers</option>
            {providerOrphan ? (
              <option value={providerVal}>
                {providerVal}
              </option>
            ) : null}
            {providerOptions.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-type" className="text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            id="filter-type"
            className={selectClass}
            value={typeVal}
            onChange={(e) => updateParam('type', e.target.value)}
            aria-busy={typesQuery.isFetching || undefined}
          >
            <option value="">All types</option>
            {typeOrphan ? <option value={typeVal}>{typeVal}</option> : null}
            {typeOptions.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-crm" className="text-sm font-medium text-slate-700">
            CRM
          </label>
          <select
            id="filter-crm"
            className={selectClass}
            value={crmVal}
            onChange={(e) => updateParam('crm', e.target.value)}
            aria-busy={crmsQuery.isFetching || undefined}
          >
            <option value="">All CRM platforms</option>
            {crmOrphan ? <option value={crmVal}>{crmVal}</option> : null}
            {crmOptions.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-membership" className="text-sm font-medium text-slate-700">
            Membership
          </label>
          <select
            id="filter-membership"
            className={selectClass}
            value={membershipVal}
            onChange={(e) => updateParam('membership', e.target.value)}
          >
            <option value="">All memberships</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="UNKNOWN">Not recorded</option>
          </select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-donation" className="text-sm font-medium text-slate-700">
            Donation
          </label>
          <select
            id="filter-donation"
            className={selectClass}
            value={donationVal}
            onChange={(e) => updateParam('donation', e.target.value)}
          >
            <option value="">All donations</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="UNKNOWN">Not recorded</option>
          </select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <label htmlFor="filter-seating" className="text-sm font-medium text-slate-700">
            Reserved Seating
          </label>
          <select
            id="filter-seating"
            className={selectClass}
            value={seatingVal}
            onChange={(e) => updateParam('seating', e.target.value)}
          >
            <option value="">All reserved seating</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="UNKNOWN">Not recorded</option>
          </select>
        </div>
      </div>

      <ActiveFilterChips searchParams={searchParams} setSearchParams={setSearchParams} />
    </>
  )
}

function formatUpdated(iso) {
  if (!iso) return '–'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return '–'
  }
}

/** @returns {{ type: 'page'; n: number } | { type: 'ellipsis' }}[] */
function pageItems(page, totalPages) {
  if (totalPages <= 15) {
    return Array.from({ length: totalPages }, (_, i) => ({ type: 'page', n: i + 1 }))
  }
  const nums = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages)
  )
  const sorted = [...nums].sort((a, b) => a - b)
  /** @type ({ type: 'page'; n: number } | { type: 'ellipsis' })[] */
  const out = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push({ type: 'ellipsis' })
    out.push({ type: 'page', n: sorted[i] })
  }
  return out
}

function TableSkeleton() {
  const cols = 10
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

/**
 * List query and pagination are driven from URL search params (Story 3.3).
 * @param {{ onClearSearch: () => void }} props
 */
function OrganisationListResults({ onClearSearch }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { selectedIds, toggleSelection } = useSelection()
  const listInputs = parseOrganisationListInputsFromSearchParams(searchParams, LIMIT)
  const page = listInputs.page
  const hasFilters = hasActiveListFilters(searchParams)
  const hasQ = listInputs.q !== undefined

  const { data, isLoading, isError, error } = useOrganisations(listInputs)

  const organisations = data?.data ?? []
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

  const handleRowActivate = (id) => {
    navigate(`/organisations/${id}`)
  }

  return (
    <>
      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error?.message ?? 'Could not load organisations.'}
        </div>
      )}

      {!isError && !isLoading && total === 0 && !hasQ && !hasFilters && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-slate-600">No organisations yet. Add the first one to get started.</p>
          <Button
            type="button"
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/organisations/new')}
          >
            Add organisation
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
                  <th className="px-3 py-3 min-w-[120px]">Type</th>
                  <th className="px-3 py-3 min-w-[100px]">Country</th>
                  <th className="px-3 py-3 min-w-[140px]">Ticketing Provider</th>
                  <th className="px-3 py-3 min-w-[120px]">CRM Platform</th>
                  <th className="px-3 py-3 min-w-[80px] text-center">Membership</th>
                  <th className="px-3 py-3 min-w-[80px] text-center">Donation</th>
                  <th className="px-3 py-3 min-w-[80px] text-center">Reserved Seating</th>
                  <th className="px-3 py-3 min-w-[120px]">Last Updated</th>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-2 py-2" />
                  <th colSpan={6} className="px-3 py-2 text-left text-xs font-normal normal-case text-slate-500">
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
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-600">
                      <p>
                        No organisations found for &apos;{listInputs.q}&apos;. Try a shorter search or check
                        the spelling.
                      </p>
                      <Button type="button" variant="secondary" className="mt-4" onClick={onClearSearch}>
                        Clear search
                      </Button>
                    </td>
                  </tr>
                ) : !isLoading && total === 0 && hasFilters ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-600">
                      <p>No organisations match these filters. Try removing a filter or clearing all.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={() => setSearchParams((prev) => clearAllListFiltersInSearchParams(prev))}
                      >
                        Clear all filters
                      </Button>
                    </td>
                  </tr>
                ) : (
                  organisations.map((org) => (
                    <tr
                      key={org.id}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      onClick={() => handleRowActivate(org.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowActivate(org.id)
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
                          checked={selectedIds.includes(org.id)}
                          onChange={() => toggleSelection(org.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${(org.name ?? '').trim() || 'Unnamed organisation'} for compare`}
                        />
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 min-w-[200px]">{org.name}</td>
                      <td className="px-3 py-3 min-w-[120px]">
                        {org.organisationType ? (
                          <Badge tone="type">{org.organisationType.name}</Badge>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 min-w-[100px]">{org.country}</td>
                      <td className="px-3 py-3 min-w-[140px]">
                        {org.ticketingProvider ? (
                          <Badge tone="ticketing">{org.ticketingProvider.name}</Badge>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 min-w-[120px]">
                        {org.crmPlatform ? (
                          <Badge tone="crm">{org.crmPlatform.name}</Badge>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center min-w-[80px]">
                        <CapabilityBadge value={org.membershipCapability} />
                      </td>
                      <td className="px-3 py-3 text-center min-w-[80px]">
                        <CapabilityBadge value={org.donationCapability} />
                      </td>
                      <td className="px-3 py-3 text-center min-w-[80px]">
                        <CapabilityBadge value={org.reservedSeatingCapability} />
                      </td>
                      <td className="px-3 py-3 text-slate-600 min-w-[120px] whitespace-nowrap">
                        {formatUpdated(org.lastUpdated)}
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
                Showing {startIdx}–{endIdx} of {total} organisations
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
                      className={
                        item.n === page
                          ? 'min-w-[2.25rem] bg-blue-600 hover:bg-blue-700'
                          : 'min-w-[2.25rem]'
                      }
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

          {!isLoading && total > 0 && !showPagination && (
            <p className="mt-4 text-sm text-slate-600">
              Showing {startIdx}–{endIdx} of {total} organisations
            </p>
          )}
        </>
      ) : null}
    </>
  )
}

/**
 * Debounced `q` uses `setSearchParams(..., { replace: true })`, which assigns a new `location.key`
 * on every sync. Do not key this subtree by `location.key` — that remounts on every keystroke and
 * breaks filters, search, and navigation. Sync from the URL when navigation is not that replace.
 *
 * @param {{ onProvideClearSearch: (fn: () => void) => void }} props
 */
function OrganisationListSearchInput({ onProvideClearSearch }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigationType = useNavigationType()
  const qFromUrl = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(() => qFromUrl)
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  useEffect(() => {
    if (navigationType === NavigationType.Replace) return
    // Sync local draft with the URL on POP/PUSH; skip REPLACE (our debounced search writes).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- router URL is external state
    setSearchInput(qFromUrl)
  }, [navigationType, qFromUrl])

  useEffect(() => {
    const trimmed = debouncedSearch.trim()
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        let changed = false
        if (trimmed === '') {
          if (prev.has('q')) {
            next.delete('q')
            changed = true
          }
        } else if (prev.get('q') !== trimmed) {
          next.set('q', trimmed)
          changed = true
        }
        if (changed && prev.get('page') !== '1') {
          next.set('page', '1')
        }
        return changed ? next : prev
      },
      { replace: true },
    )
  }, [debouncedSearch, setSearchParams])

  const clearSearch = useCallback(() => {
    setSearchInput('')
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        let changed = false
        if (prev.has('q')) {
          next.delete('q')
          changed = true
        }
        if (changed && prev.get('page') !== '1') {
          next.set('page', '1')
        }
        return changed ? next : prev
      },
      { replace: true },
    )
  }, [setSearchParams])

  useLayoutEffect(() => {
    onProvideClearSearch(clearSearch)
  }, [clearSearch, onProvideClearSearch])

  return (
    <div className="flex flex-col gap-2 sm:max-w-xl">
      <label htmlFor="organisation-search" className="text-sm font-medium text-slate-700">
        Search
      </label>
      <input
        id="organisation-search"
        type="search"
        name="organisation-search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search organisations…"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        autoComplete="off"
        aria-label="Search organisations by name, city, notes, or ticketing provider"
      />
    </div>
  )
}

export default function OrganisationListPage() {
  const { selectedIds } = useSelection()
  const location = useLocation()
  const clearSearchRef = useRef(() => {})
  const handleProvideClearSearch = useCallback((fn) => {
    clearSearchRef.current = fn
  }, [])

  const navigate = useNavigate()

  const [showDeletedBanner, setShowDeletedBanner] = useState(
    () => Boolean(location.state?.organisationDeleted),
  )

  const clearDeletedBannerState = useCallback(() => {
    setShowDeletedBanner(false)
    const s = location.state
    const nextState =
      s && typeof s === 'object' && !Array.isArray(s)
        ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'organisationDeleted'))
        : {}
    navigate(location.pathname + location.search, { replace: true, state: nextState })
  }, [navigate, location.pathname, location.search, location.state])

  useEffect(() => {
    if (!showDeletedBanner) return undefined
    const t = window.setTimeout(() => {
      clearDeletedBannerState()
    }, BANNER_MS)
    return () => window.clearTimeout(t)
  }, [showDeletedBanner, clearDeletedBannerState])

  return (
    <div className={selectedIds.length > 0 ? 'py-2 pb-28' : 'py-2'}>
      {showDeletedBanner && (
        <div
          className="mb-6 flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
        >
          <p className="text-sm font-medium">Organisation deleted.</p>
          <button
            type="button"
            onClick={clearDeletedBannerState}
            className="shrink-0 rounded px-2 text-lg leading-none text-emerald-900 hover:bg-emerald-100"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 bg-white -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Organisations</h1>
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center"
          onClick={() => navigate('/organisations/new')}
        >
          Add organisation
        </Button>
      </header>

      <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
        <OrganisationListSearchInput onProvideClearSearch={handleProvideClearSearch} />
        <OrganisationListFilterSection />
      </div>

      <OrganisationListResults onClearSearch={() => clearSearchRef.current()} />

      {selectedIds.length > 0 ? <CompareSelectionBar /> : null}
    </div>
  )
}
