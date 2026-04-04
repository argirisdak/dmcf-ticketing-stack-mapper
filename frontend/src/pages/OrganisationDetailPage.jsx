import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useOrganisation } from '../hooks/useOrganisation.js'
import { useDeleteOrganisation } from '../hooks/useDeleteOrganisation.js'
import { OrganisationNotFoundError } from '../api/organisations.js'
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
import { CapabilityBadge } from '../components/CapabilityBadge.jsx'
import { SourceReferenceDisplay } from '../components/SourceReferenceDisplay.jsx'

const BANNER_MS = 5000

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function displayText(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-4 w-48 rounded bg-slate-200" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="h-9 w-64 max-w-full rounded bg-slate-200" />
        <div className="h-10 w-28 rounded-md bg-slate-200" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-32 rounded bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-4 rounded bg-slate-100" />
          <div className="h-4 rounded bg-slate-100" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-40 rounded bg-slate-200" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-3/4 rounded bg-slate-100" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-36 rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-6 rounded bg-slate-100" />
          <div className="h-6 rounded bg-slate-100" />
          <div className="h-6 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:gap-4 sm:items-baseline">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  )
}

export default function OrganisationDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, isSuccess } = useOrganisation(id)
  const deleteMutation = useDeleteOrganisation()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [showSavedBanner, setShowSavedBanner] = useState(
    () => Boolean(location.state?.organisationSaved),
  )

  const clearBannerState = useCallback(() => {
    setShowSavedBanner(false)
    const s = location.state
    const nextState =
      s && typeof s === 'object' && !Array.isArray(s)
        ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'organisationSaved'))
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

  const notFound = error instanceof OrganisationNotFoundError
  const missingId = !id

  return (
    <div className="py-8">
      {showSavedBanner && (
        <div
          className="mb-6 flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
        >
          <p className="text-sm font-medium">Organisation saved.</p>
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

      <Link to="/organisations" className="mb-4 inline-block text-sm text-blue-600">
        ← Back to organisations
      </Link>

      {missingId && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">Organisation not found</h1>
          <p className="mt-2 text-sm text-slate-600">This page needs a valid organisation link.</p>
          <Link
            to="/organisations"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to organisations
          </Link>
        </div>
      )}

      {!missingId && isLoading && <DetailSkeleton />}

      {!missingId && notFound && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">Organisation not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not find an organisation for this address. It may have been removed or the link
            may be incorrect.
          </p>
          <Link
            to="/organisations"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to organisations
          </Link>
        </div>
      )}

      {!missingId && isError && !notFound && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm">
            {error instanceof Error ? error.message : 'Unable to load this organisation.'}
          </p>
          <Link
            to="/organisations"
            className="mt-4 inline-block text-sm font-medium text-red-800 underline hover:text-red-900"
          >
            Back to organisations
          </Link>
        </div>
      )}

      {!missingId && isSuccess && data && (
        <>
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <h1 className="text-2xl font-semibold text-slate-800">{data.name}</h1>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  if (deleteMutation.isPending) return
                  setDeleteDialogOpen(open)
                  if (open) deleteMutation.reset()
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto justify-center"
                  >
                    Delete organisation
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
                    <DialogTitle>Delete organisation</DialogTitle>
                    <DialogDescription asChild>
                      <div className="space-y-3 text-left text-sm text-slate-600">
                        <p>
                          <strong className="font-semibold text-slate-900">{data.name}</strong>
                        </p>
                        <p>This cannot be undone.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  {deleteMutation.isError && (
                    <p className="text-sm text-red-700" role="alert">
                      {deleteMutation.error instanceof Error
                        ? deleteMutation.error.message
                        : 'Could not delete this organisation.'}
                    </p>
                  )}
                  <DialogFooter>
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
                      onClick={() => {
                        if (!id) return
                        deleteMutation.mutate(id, {
                          onSuccess: () => {
                            setDeleteDialogOpen(false)
                            navigate('/organisations', {
                              replace: false,
                              state: { organisationDeleted: true },
                            })
                          },
                        })
                      }}
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
                        'Delete organisation'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                asChild
                className="w-full shrink-0 bg-blue-600 hover:bg-blue-700 sm:w-auto justify-center"
              >
                <Link to={`/organisations/${id}/edit`}>Edit</Link>
              </Button>
            </div>
          </header>

          <section
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm"
            aria-labelledby="provenance-heading"
          >
            <h2 id="provenance-heading" className="text-sm font-semibold text-amber-950">
              Provenance
            </h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-900/80">
                  Source reference
                </dt>
                <dd className="mt-1 text-base font-medium text-amber-950">
                  <SourceReferenceDisplay value={data.sourceReference} inheritPlainTextColor />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-900/80">
                  Last updated
                </dt>
                <dd className="mt-1 text-base font-medium text-amber-950">
                  {formatDateTime(data.lastUpdated)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Details</h2>
            <dl className="space-y-3">
              <DetailRow label="Name">{data.name}</DetailRow>
              <DetailRow label="Country">{data.country}</DetailRow>
              <DetailRow label="City">{displayText(data.city)}</DetailRow>
              <DetailRow label="Type">
                {data.organisationType?.name ?? '—'}
              </DetailRow>
              <DetailRow label="Ticketing provider">
                {data.ticketingProvider?.name ?? '—'}
              </DetailRow>
              <DetailRow label="CRM platform">{data.crmPlatform?.name ?? '—'}</DetailRow>
              <DetailRow label="Notes">{displayText(data.notes)}</DetailRow>
              <DetailRow label="Capacity">
                {data.capacity != null ? String(data.capacity) : '—'}
              </DetailRow>
              <DetailRow label="Created at">{formatDateTime(data.createdAt)}</DetailRow>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Capabilities</h2>
            <dl className="space-y-3">
              <DetailRow label="Membership">
                <CapabilityBadge value={data.membershipCapability} variant="labelled" />
              </DetailRow>
              <DetailRow label="Donation">
                <CapabilityBadge value={data.donationCapability} variant="labelled" />
              </DetailRow>
              <DetailRow label="Reserved seating">
                <CapabilityBadge value={data.reservedSeatingCapability} variant="labelled" />
              </DetailRow>
            </dl>
          </section>
        </>
      )}
    </div>
  )
}
