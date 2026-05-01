import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSystem } from '../hooks/useSystem.js'
import { useDeleteSystem } from '../hooks/useDeleteSystem.js'
import { SystemNotFoundError } from '../api/systems.js'
import { CapabilityBadge } from '../components/CapabilityBadge.jsx'
import { SourceReferenceDisplay } from '../components/SourceReferenceDisplay.jsx'
import { Button } from '../components/ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog.jsx'

const BANNER_MS = 5000

const ROLE_LABELS = {
  PRIMARY_TICKETING: 'Primary ticketing',
  PRIMARY_CRM: 'Primary CRM',
  INTEGRATED_SUITE: 'Integrated suite',
  SECONDARY: 'Secondary',
}

const CATEGORY_CONFIG = {
  INTEGRATED: { label: 'Integrated', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  TICKETING: { label: 'Ticketing', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  AUDIENCE_MANAGEMENT: {
    label: 'Audience management',
    cls: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
}

function SystemCategoryBadge({ category }) {
  const { label, cls } = CATEGORY_CONFIG[category] ?? {
    label: category ?? '—',
    cls: 'bg-slate-50 text-slate-700 border border-slate-200',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}

function displayText(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

/** True if the string is an http(s) URL (same rule as SourceReferenceDisplay). */
function isHttpOrHttpsUrl(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

function displayNullable(value) {
  if (value == null || value === '') {
    return <span className="text-slate-400">Not recorded</span>
  }
  return String(value)
}

function formatLastUpdated(iso) {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
    const diffMs = date.getTime() - Date.now()
    const diffSec = Math.round(diffMs / 1000)
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const abs = Math.abs(diffSec)
    let relative
    if (abs < 60) relative = rtf.format(diffSec, 'second')
    else if (abs < 3600) relative = rtf.format(Math.round(diffSec / 60), 'minute')
    else if (abs < 86400) relative = rtf.format(Math.round(diffSec / 3600), 'hour')
    else if (abs < 2592000) relative = rtf.format(Math.round(diffSec / 86400), 'day')
    else if (abs < 31536000) relative = rtf.format(Math.round(diffSec / 2592000), 'month')
    else relative = rtf.format(Math.round(diffSec / 31536000), 'year')
    const absolute = date.toLocaleDateString(undefined, { dateStyle: 'medium' })
    return `${absolute} (${relative})`
  } catch {
    return '—'
  }
}

function FactRow({ label, children }) {
  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 items-baseline">
      <dt className="text-sm font-medium text-slate-500 whitespace-nowrap">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="flex flex-col gap-3">
        <div className="h-9 w-64 rounded bg-slate-200" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-6 w-[4.5rem] rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[8rem_1fr] gap-4">
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-2">
        <div className="h-5 w-56 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-3/4 rounded bg-slate-100" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <div className="h-5 w-48 rounded bg-slate-200" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-4 rounded bg-slate-100" />
          <div className="h-4 rounded bg-slate-100" />
          <div className="h-4 rounded bg-slate-100" />
        </div>
        <div className="h-4 w-full rounded bg-slate-100" />
      </div>
    </div>
  )
}

function AdoptionPanel({ organisations, panelRef }) {
  if (!organisations || organisations.length === 0) {
    return (
      <section
        ref={panelRef}
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        aria-labelledby="adoption-heading"
      >
        <h2 id="adoption-heading" className="mb-4 text-base font-semibold text-slate-800">
          Organisations using this system (0)
        </h2>
        <p className="text-sm text-slate-500">
          No organisations have linked to this system yet.
        </p>
      </section>
    )
  }

  // Group by role preserving backend order (role asc, org name asc)
  const groups = []
  let currentRole = null
  for (const link of organisations) {
    if (link.role !== currentRole) {
      currentRole = link.role
      groups.push({ role: link.role, links: [] })
    }
    groups[groups.length - 1].links.push(link)
  }

  return (
    <section
      ref={panelRef}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="adoption-heading"
    >
      <h2 id="adoption-heading" className="mb-4 text-base font-semibold text-slate-800">
        Organisations using this system ({organisations.length})
      </h2>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.role}>
            <div className="mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {ROLE_LABELS[group.role] ?? group.role}
              </span>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden">
              {group.links.map((link) => (
                <div
                  key={link.id}
                  className="grid gap-x-4 gap-y-1 px-4 py-3 bg-white text-sm"
                  style={{
                    gridTemplateColumns:
                      'minmax(160px, 1fr) minmax(80px, auto) minmax(80px, auto) minmax(120px, 1fr) minmax(120px, 1fr) minmax(100px, auto)',
                  }}
                >
                  <span className="font-medium">
                    <Link
                      to={`/organisations/${link.organisation.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {link.organisation.name}
                    </Link>
                  </span>
                  <span>
                    {link.organisation.type ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {link.organisation.type}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                  <span className="text-slate-600">{displayText(link.organisation.country)}</span>
                  <span className="text-slate-600 truncate">
                    {link.sourceReference ? (
                      isHttpOrHttpsUrl(link.sourceReference) ? (
                        <a
                          href={link.sourceReference}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                        >
                          {link.sourceReference}
                        </a>
                      ) : (
                        link.sourceReference
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                  <span className="text-slate-600 truncate" title={link.note ?? undefined}>
                    {link.note ? (
                      <span className="truncate block">{link.note}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatLastUpdated(link.lastUpdated)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CustomAttributesPanel({ customAttributes }) {
  if (!customAttributes || customAttributes.length === 0) return null

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="custom-attrs-heading"
    >
      <h2 id="custom-attrs-heading" className="mb-4 text-base font-semibold text-slate-800">
        Additional attributes
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <th className="pb-2 pr-4 font-medium">Label</th>
            <th className="pb-2 pr-4 font-medium">Value</th>
            <th className="pb-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {customAttributes.map((attr, i) => (
            <tr key={i}>
              <td className="py-2 pr-4 text-slate-700 align-top">{attr.label}</td>
              <td className="py-2 pr-4 text-slate-800 align-top">{displayText(attr.value)}</td>
              <td className="py-2 text-slate-600 align-top">
                {attr.sourceReference ? (
                  isHttpOrHttpsUrl(attr.sourceReference) ? (
                    <a
                      href={attr.sourceReference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {attr.sourceReference}
                    </a>
                  ) : (
                    attr.sourceReference
                  )
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default function SystemDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: envelope, isLoading, isError, error, isSuccess } = useSystem(id)
  const deleteMutation = useDeleteSystem()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConflict, setDeleteConflict] = useState(null) // null | { count: number }
  const adoptionPanelRef = useRef(null)

  const [showSavedBanner, setShowSavedBanner] = useState(
    () => Boolean(location.state?.systemSaved),
  )

  const [savedBannerHeadline] = useState(() => {
    if (!location.state?.systemSaved) return 'System saved.'
    return location.state?.systemSaveKind === 'create' ? 'System added.' : 'System saved.'
  })

  const clearBannerState = useCallback(() => {
    setShowSavedBanner(false)
    const s = location.state
    const nextState =
      s && typeof s === 'object' && !Array.isArray(s)
        ? Object.fromEntries(
            Object.entries(s).filter(([k]) => k !== 'systemSaved' && k !== 'systemSaveKind'),
          )
        : {}
    navigate(location.pathname, { replace: true, state: nextState })
  }, [navigate, location.pathname, location.state])

  useEffect(() => {
    if (!showSavedBanner) return undefined
    const t = window.setTimeout(() => {
      clearBannerState()
    }, BANNER_MS)
    return () => window.clearTimeout(t)
  }, [showSavedBanner, clearBannerState])

  const data = isSuccess ? envelope?.data : null
  const notFound = error instanceof SystemNotFoundError
  const missingId = !id

  const handleDeleteConfirm = () => {
    if (!id) return
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        navigate('/systems', { state: { systemDeleted: true } })
      },
      onError: (err) => {
        if (err.status === 409) {
          setDeleteConflict({ count: err.linkedOrganisationCount ?? 0 })
        }
      },
    })
  }

  const handleViewLinked = () => {
    setDeleteDialogOpen(false)
    setDeleteConflict(null)
    deleteMutation.reset()
    setTimeout(() => {
      adoptionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <div className="py-8">
      {showSavedBanner && (
        <div
          className="mb-6 flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
        >
          <p className="text-sm font-medium">{savedBannerHeadline}</p>
          <button
            type="button"
            onClick={clearBannerState}
            className="shrink-0 rounded px-2 text-lg leading-none text-emerald-900 hover:bg-emerald-100"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <Link to="/systems" className="mb-4 inline-block text-sm text-blue-600">
        ← Back to systems
      </Link>

      {missingId && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">System not found</h1>
          <p className="mt-2 text-sm text-slate-600">This page needs a valid system link.</p>
          <Link
            to="/systems"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to systems
          </Link>
        </div>
      )}

      {!missingId && isLoading && <DetailSkeleton />}

      {!missingId && notFound && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">System not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not find a system for this address. It may have been removed or the link may be
            incorrect.
          </p>
          <Link
            to="/systems"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to systems
          </Link>
        </div>
      )}

      {!missingId && isError && !notFound && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm">Unable to load this system. Please try again.</p>
          <Link
            to="/systems"
            className="mt-4 inline-block text-sm font-medium text-red-800 underline hover:text-red-900"
          >
            ← Back to systems
          </Link>
        </div>
      )}

      {!missingId && isSuccess && data && (
        <div className="space-y-6">
          {/* Page header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-slate-800">{data.name}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-base text-slate-500">{data.vendor}</p>
                <SystemCategoryBadge category={data.category} />
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <Button
                asChild
                variant="secondary"
                className="w-full sm:w-auto justify-center"
              >
                <Link to={`/systems/${id}/edit`}>Edit system</Link>
              </Button>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  if (deleteMutation.isPending) return
                  setDeleteDialogOpen(open)
                  if (!open) {
                    setDeleteConflict(null)
                    deleteMutation.reset()
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto justify-center"
                  >
                    Delete system
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onEscapeKeyDown={(e) => {
                    if (deleteMutation.isPending) e.preventDefault()
                  }}
                  onPointerDownOutside={(e) => {
                    if (deleteMutation.isPending) e.preventDefault()
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Delete system</DialogTitle>
                    <DialogDescription asChild>
                      <div className="space-y-3 text-left text-sm text-slate-600">
                        {deleteConflict ? (
                          <p>
                            This system is linked to{' '}
                            <strong className="font-semibold text-slate-900">
                              {deleteConflict.count}{' '}
                              {deleteConflict.count === 1 ? 'organisation' : 'organisations'}
                            </strong>
                            . Remove all organisation links before deleting.
                          </p>
                        ) : (
                          <>
                            <p>
                              <strong className="font-semibold text-slate-900">{data.name}</strong>
                            </p>
                            <p>
                              This cannot be undone. Any organisations linked to this system must be
                              unlinked first.
                            </p>
                          </>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  {deleteMutation.isError && !deleteConflict && (
                    <p className="text-sm text-red-700" role="alert">
                      {deleteMutation.error instanceof Error
                        ? deleteMutation.error.message
                        : 'Could not delete this system.'}
                    </p>
                  )}
                  <DialogFooter>
                    {deleteConflict ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleViewLinked}
                        >
                          View linked organisations
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setDeleteDialogOpen(false)
                            setDeleteConflict(null)
                            deleteMutation.reset()
                          }}
                        >
                          Close
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={deleteMutation.isPending}
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={handleDeleteConfirm}
                        >
                          {deleteMutation.isPending ? (
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                aria-hidden
                              />
                              Deleting…
                            </span>
                          ) : (
                            'Delete system'
                          )}
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Facts panel */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">System details</h2>
            <dl className="space-y-3">
              <FactRow label="Vendor">{displayText(data.vendor)}</FactRow>
              <FactRow label="Category">
                <SystemCategoryBadge category={data.category} />
              </FactRow>
              <FactRow label="Deployment">{displayNullable(data.deploymentModel)}</FactRow>
              <FactRow label="Pricing model">{displayNullable(data.pricingModel)}</FactRow>
              <FactRow label="Geographic focus">{displayNullable(data.geographicFocus)}</FactRow>
              {data.description != null && (
                <FactRow label="Description">
                  <span className="text-sm text-slate-700">{data.description}</span>
                </FactRow>
              )}
              <FactRow label="Membership">
                <CapabilityBadge value={data.membershipCapability} variant="labelled" />
              </FactRow>
              <FactRow label="Donation">
                <CapabilityBadge value={data.donationCapability} variant="labelled" />
              </FactRow>
              <FactRow label="Reserved seating">
                <CapabilityBadge value={data.reservedSeatingCapability} variant="labelled" />
              </FactRow>
              <FactRow label="Source reference">
                <SourceReferenceDisplay value={data.sourceReference} />
              </FactRow>
              <FactRow label="Last updated">
                <span className="text-xs text-slate-500">{formatLastUpdated(data.lastUpdated)}</span>
              </FactRow>
            </dl>
          </section>

          {/* Adoption evidence panel */}
          <AdoptionPanel organisations={data.organisations} panelRef={adoptionPanelRef} />

          {/* Custom attributes panel */}
          <CustomAttributesPanel customAttributes={data.customAttributes} />
        </div>
      )}
    </div>
  )
}
