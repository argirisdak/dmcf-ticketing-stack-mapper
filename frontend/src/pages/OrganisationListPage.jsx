import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrganisations } from '../hooks/useOrganisations.js'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { CapabilityBadge } from '../components/CapabilityBadge.jsx'

const LIMIT = 20

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

export default function OrganisationListPage() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useOrganisations({ page, limit: LIMIT })

  const organisations = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 0

  const showPagination = total > LIMIT || totalPages > 1
  const startIdx = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const endIdx = Math.min(page * LIMIT, total)

  const handleRowActivate = (id) => {
    navigate(`/organisations/${id}`)
  }

  return (
    <div className="py-2">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 bg-white -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Organisations</h1>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center">
          <Link to="/organisations/new">Add organisation</Link>
        </Button>
      </header>

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error?.message ?? 'Could not load organisations.'}
        </div>
      )}

      {!isError && !isLoading && total === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-slate-600">No organisations yet. Add the first one to get started.</p>
          <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
            <Link to="/organisations/new">Add organisation</Link>
          </Button>
        </div>
      )}

      {isLoading || total > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[960px] text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  )
}
