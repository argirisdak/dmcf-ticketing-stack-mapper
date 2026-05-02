import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrganisation } from '../hooks/useOrganisation.js'
import { useDeleteOrganisation } from '../hooks/useDeleteOrganisation.js'
import { useCreateOrganisationSystemLink } from '../hooks/useCreateOrganisationSystemLink.js'
import { useUpdateOrganisationSystemLink } from '../hooks/useUpdateOrganisationSystemLink.js'
import { useDeleteOrganisationSystemLink } from '../hooks/useDeleteOrganisationSystemLink.js'
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
import { SystemCombobox } from '../components/SystemCombobox.jsx'
import { buildOrganisationContextualSystemCompare } from '../lib/organisation-linked-systems-compare.js'

const BANNER_MS = 5000

const ROLE_ORDER = ['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY']
const ROLE_LABELS = {
  PRIMARY_TICKETING: 'Primary ticketing',
  PRIMARY_CRM: 'Primary CRM',
  INTEGRATED_SUITE: 'Integrated suite',
  SECONDARY: 'Secondary',
}
const KNOWN_ROLES = Object.keys(ROLE_LABELS)
const NO_LINKED_SYSTEMS = []

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
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, isSuccess } = useOrganisation(id)
  const deleteMutation = useDeleteOrganisation()
  const createLinkMutation = useCreateOrganisationSystemLink()
  const updateLinkMutation = useUpdateOrganisationSystemLink()
  const deleteLinkMutation = useDeleteOrganisationSystemLink()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [showSavedBanner, setShowSavedBanner] = useState(
    () => Boolean(location.state?.organisationSaved),
  )

  const [showLinkWarningBanner, setShowLinkWarningBanner] = useState(
    () => Boolean(location.state?.linksSavedWithErrors),
  )

  // Link CRUD state
  const [linkRemovedBanner, setLinkRemovedBanner] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editLink, setEditLink] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  // Edit dialog form state
  const [editFormSystemId, setEditFormSystemId] = useState(null)
  const [editFormRole, setEditFormRole] = useState('')
  const [editFormSourceRef, setEditFormSourceRef] = useState('')
  const [editFormNote, setEditFormNote] = useState('')

  // Add dialog form state
  const [addFormSystemId, setAddFormSystemId] = useState(null)
  const [addFormRole, setAddFormRole] = useState('')
  const [addFormSourceRef, setAddFormSourceRef] = useState('')
  const [addFormNote, setAddFormNote] = useState('')
  const [addComboboxError, setAddComboboxError] = useState('')

  // Sync edit form from the link being edited.
  // editLink is external interaction state (user clicking Edit) — same pattern as SystemCombobox mode sync.
  useEffect(() => {
    if (editLink?.system?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- editLink is external interaction state
      setEditFormSystemId(editLink.system.id)
      setEditFormRole(KNOWN_ROLES.includes(editLink.role) ? editLink.role : '')
      setEditFormSourceRef(editLink.sourceReference ?? '')
      setEditFormNote(editLink.note ?? '')
    }
  }, [editLink])

  const clearBannerState = useCallback(() => {
    setShowSavedBanner(false)
    const s = location.state
    const nextState =
      s && typeof s === 'object' && !Array.isArray(s)
        ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'organisationSaved'))
        : {}
    navigate(location.pathname, { replace: true, state: nextState })
  }, [navigate, location.pathname, location.state])

  const clearLinkWarningBanner = useCallback(() => {
    setShowLinkWarningBanner(false)
    const s = location.state
    const nextState =
      s && typeof s === 'object' && !Array.isArray(s)
        ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'linksSavedWithErrors'))
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

  useEffect(() => {
    if (!linkRemovedBanner) return undefined
    const t = window.setTimeout(() => setLinkRemovedBanner(false), BANNER_MS)
    return () => window.clearTimeout(t)
  }, [linkRemovedBanner])

  const resetAddForm = () => {
    setAddFormSystemId(null)
    setAddFormRole('')
    setAddFormSourceRef('')
    setAddFormNote('')
    setAddComboboxError('')
  }

  const notFound = error instanceof OrganisationNotFoundError
  const missingId = !id

  // Group systems by role in display order
  const systems =
    isSuccess && Array.isArray(data?.systems) ? data.systems : NO_LINKED_SYSTEMS
  const grouped = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = systems.filter((l) => l.role === role)
    return acc
  }, {})

  const contextualSystemCompare = useMemo(
    () => buildOrganisationContextualSystemCompare(systems, ROLE_ORDER),
    [systems],
  )

  const handleSaveEdit = () => {
    if (!editLink?.system?.id || !id) return
    const body = {}
    if (editFormSystemId !== editLink.system.id) body.systemId = editFormSystemId
    if (editFormRole !== editLink.role) body.role = editFormRole
    const newSrcRef = editFormSourceRef.trim() || null
    if (newSrcRef !== (editLink.sourceReference ?? null)) body.sourceReference = newSrcRef
    const newNote = editFormNote.trim() || null
    if (newNote !== (editLink.note ?? null)) body.note = newNote
    if (Object.keys(body).length === 0) {
      setEditLink(null)
      return
    }
    updateLinkMutation.mutate(
      { orgId: id, linkId: editLink.id, body },
      {
        onSuccess: () => {
          setEditLink(null)
          queryClient.invalidateQueries({ queryKey: ['organisations'] })
        },
      },
    )
  }

  const handleConfirmRemove = () => {
    if (!removeTarget?.linkId || !id) return
    deleteLinkMutation.mutate(
      { orgId: id, linkId: removeTarget.linkId },
      {
        onSuccess: () => {
          setRemoveTarget(null)
          queryClient.invalidateQueries({ queryKey: ['organisations'] })
          setLinkRemovedBanner(true)
        },
      },
    )
  }

  const handleAddLink = () => {
    if (!addFormSystemId || !addFormRole || !id) return
    createLinkMutation.mutate(
      {
        orgId: id,
        body: {
          systemId: addFormSystemId,
          role: addFormRole,
          sourceReference: addFormSourceRef.trim() || null,
          note: addFormNote.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false)
          resetAddForm()
          queryClient.invalidateQueries({ queryKey: ['organisations'] })
        },
        onError: (err) => {
          if (/** @type {any} */ (err).isConflict) {
            setAddComboboxError('This system is already linked to this organisation')
          }
        },
      },
    )
  }

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

      {showLinkWarningBanner && (
        <div
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start justify-between gap-4"
          role="alert"
        >
          <span>Organisation saved, but one or more system links could not be updated. Check the linked systems panel.</span>
          <button
            type="button"
            onClick={clearLinkWarningBanner}
            className="shrink-0 text-amber-600 hover:text-amber-800"
            aria-label="Dismiss"
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
              <DetailRow label="Notes">{displayText(data.notes)}</DetailRow>
              <DetailRow label="Capacity">
                {data.capacity != null ? String(data.capacity) : '—'}
              </DetailRow>
              <DetailRow label="Created at">{formatDateTime(data.createdAt)}</DetailRow>
            </dl>
          </section>

          {/* Link removed banner — above the Linked systems panel */}
          {linkRemovedBanner && (
            <div
              className="mb-4 flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
              role="status"
            >
              <p className="text-sm font-medium">Link removed.</p>
              <button
                type="button"
                onClick={() => setLinkRemovedBanner(false)}
                className="shrink-0 rounded px-2 text-lg leading-none text-emerald-900 hover:bg-emerald-100"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}

          <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Linked systems</h2>

            {systems.length === 0 ? (
              <p className="text-sm text-slate-600">
                No systems linked yet.{' '}
                <button
                  type="button"
                  onClick={() => setAddDialogOpen(true)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Add system →
                </button>
              </p>
            ) : (
              <>
                <div className="space-y-4">
                  {ROLE_ORDER.filter((role) => grouped[role]?.length > 0).map((role) => (
                    <div key={role}>
                      <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {ROLE_LABELS[role]}
                      </p>
                      <div className="space-y-1">
                        {grouped[role].map((link) => (
                          <div
                            key={link.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md py-1.5 px-2 hover:bg-slate-50"
                          >
                            {link.system?.id ? (
                              <Link
                                to={`/systems/${link.system.id}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {link.system.name}
                              </Link>
                            ) : (
                              <span className="font-medium text-slate-600">Unknown system</span>
                            )}
                            <span className="text-sm text-slate-500">
                              {link.system?.vendor ?? '—'}
                            </span>
                            <span className="text-sm">
                              <SourceReferenceDisplay
                                value={link.sourceReference}
                                emptyLabel="—"
                              />
                            </span>
                            <span
                              title={link.note}
                              className="max-w-xs truncate text-sm text-slate-600"
                            >
                              {link.note || '—'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(link.lastUpdated)}
                            </span>
                            <div className="ml-auto flex shrink-0 items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setEditLink(link)}
                                disabled={!link.system?.id}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRemoveTarget({
                                    linkId: link.id,
                                    systemName: link.system?.name ?? 'Unknown system',
                                  })
                                }
                                className="text-sm font-medium text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    Add system
                  </Button>
                  {contextualSystemCompare != null && (
                    <div>
                      <Link
                        to={contextualSystemCompare.to}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {contextualSystemCompare.label}
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Edit link dialog */}
            <Dialog
              open={editLink !== null}
              onOpenChange={(o) => {
                if (updateLinkMutation.isPending) return
                if (!o) {
                  setEditLink(null)
                  updateLinkMutation.reset()
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit linked system</DialogTitle>
                  <DialogDescription className="sr-only">
                    Update the role, source reference, or note for this system link.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="edit-link-system"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      System
                    </label>
                    <SystemCombobox
                      selectedId={editFormSystemId}
                      onSelect={(sys) => setEditFormSystemId(sys ? sys.id : null)}
                      placeholder="Search for a system…"
                      inputId="edit-link-system"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-link-role"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Role
                    </label>
                    <select
                      id="edit-link-role"
                      value={editFormRole}
                      onChange={(e) => setEditFormRole(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select a role</option>
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="edit-link-source-ref"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Source reference
                    </label>
                    <input
                      id="edit-link-source-ref"
                      type="text"
                      value={editFormSourceRef}
                      onChange={(e) => setEditFormSourceRef(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="URL or identifier"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-link-note"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Note
                    </label>
                    <textarea
                      id="edit-link-note"
                      value={editFormNote}
                      onChange={(e) => setEditFormNote(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Optional note"
                    />
                  </div>
                  {updateLinkMutation.isError && (
                    <p className="text-sm text-red-700" role="alert">
                      {updateLinkMutation.error instanceof Error
                        ? updateLinkMutation.error.message
                        : 'Could not save changes.'}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={updateLinkMutation.isPending}
                    onClick={() => {
                      setEditLink(null)
                      updateLinkMutation.reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={updateLinkMutation.isPending || !editFormSystemId || !editFormRole}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleSaveEdit}
                  >
                    {updateLinkMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                          aria-hidden
                        />
                        Saving…
                      </span>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Remove link dialog */}
            <Dialog
              open={removeTarget !== null}
              onOpenChange={(o) => {
                if (deleteLinkMutation.isPending) return
                if (!o) setRemoveTarget(null)
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove linked system</DialogTitle>
                  <DialogDescription asChild>
                    <div className="space-y-2 text-left text-sm text-slate-600">
                      <p>
                        <strong className="font-semibold text-slate-900">
                          {removeTarget?.systemName}
                        </strong>{' '}
                        will be unlinked from{' '}
                        <strong className="font-semibold text-slate-900">{data.name}</strong>. This
                        cannot be undone.
                      </p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                {deleteLinkMutation.isError && (
                  <p className="text-sm text-red-700" role="alert">
                    {deleteLinkMutation.error instanceof Error
                      ? deleteLinkMutation.error.message
                      : 'Could not remove link.'}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={deleteLinkMutation.isPending}
                    onClick={() => setRemoveTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={deleteLinkMutation.isPending}
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={handleConfirmRemove}
                  >
                    {deleteLinkMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                          aria-hidden
                        />
                        Removing…
                      </span>
                    ) : (
                      'Remove link'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add system dialog */}
            <Dialog
              open={addDialogOpen}
              onOpenChange={(open) => {
                if (createLinkMutation.isPending) return
                setAddDialogOpen(open)
                if (!open) {
                  resetAddForm()
                }
                if (open) createLinkMutation.reset()
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add linked system</DialogTitle>
                  <DialogDescription className="sr-only">
                    Link a system to this organisation with a role and optional provenance.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="add-link-system"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      System
                    </label>
                    <SystemCombobox
                      selectedId={addFormSystemId}
                      onSelect={(sys) => {
                        setAddFormSystemId(sys ? sys.id : null)
                        if (addComboboxError) setAddComboboxError('')
                      }}
                      placeholder="Search for a system…"
                      inputId="add-link-system"
                    />
                    {addComboboxError && (
                      <p className="mt-1 text-xs text-red-600">{addComboboxError}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="add-link-role"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Role
                    </label>
                    <select
                      id="add-link-role"
                      value={addFormRole}
                      onChange={(e) => setAddFormRole(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select a role</option>
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="add-link-source-ref"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Source reference
                    </label>
                    <input
                      id="add-link-source-ref"
                      type="text"
                      value={addFormSourceRef}
                      onChange={(e) => setAddFormSourceRef(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="URL or identifier"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="add-link-note"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Note
                    </label>
                    <textarea
                      id="add-link-note"
                      value={addFormNote}
                      onChange={(e) => setAddFormNote(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Optional note"
                    />
                  </div>
                  {createLinkMutation.isError && !/** @type {any} */ (createLinkMutation.error)?.isConflict && (
                    <p className="text-sm text-red-700" role="alert">
                      {createLinkMutation.error instanceof Error
                        ? createLinkMutation.error.message
                        : 'Could not add system link.'}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={createLinkMutation.isPending}
                    onClick={() => {
                      setAddDialogOpen(false)
                      resetAddForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={createLinkMutation.isPending || !addFormSystemId || !addFormRole}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleAddLink}
                  >
                    {createLinkMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                          aria-hidden
                        />
                        Adding…
                      </span>
                    ) : (
                      'Add system'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
