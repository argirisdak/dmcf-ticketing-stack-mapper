import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { COUNTRIES } from '../lib/countries.js'
import { Button } from '../components/ui/button.jsx'
import { useOrganisation } from '../hooks/useOrganisation.js'
import { useSimilarOrganisations } from '../hooks/useSimilarOrganisations.js'
import { useOrganisationTypesQuery } from '../hooks/useMetaReferenceData.js'
import SimilarOrganisationsWarning from '../components/SimilarOrganisationsWarning.jsx'
import { OrganisationNotFoundError, createOrganisation, updateOrganisation } from '../api/organisations.js'
import {
  createOrganisationSystemLink,
  updateOrganisationSystemLink,
  deleteOrganisationSystemLink,
} from '../api/organisation-systems.js'
import { SystemCombobox } from '../components/SystemCombobox.jsx'
import FieldWithSource from '../components/FieldWithSource.jsx'
import {
  buildFieldSourcesPayload,
  mapServerFieldErrorsToSummaryAndSources,
  normaliseFieldSourcesFromDto,
} from '../lib/field-sources-form.js'
import { SOURCE_URL_CLIENT_ERROR, isValidSourceUrl } from '../lib/source-url-validation.js'

/** Match server `MAX_CAPACITY` in `organisation-controller.js` */
const MAX_CAPACITY = 2_147_483_647

const FIELD_IDS = {
  name: 'field-name',
  country: 'field-country',
  city: 'field-city',
  organisationTypeId: 'field-organisation-type',
  membershipCapability: 'field-membership-capability',
  donationCapability: 'field-donation-capability',
  reservedSeatingCapability: 'field-reserved-seating-capability',
  sourceReference: 'field-source-reference',
  notes: 'field-notes',
  capacity: 'field-capacity',
}

const SYSTEM_ROLES = [
  { value: 'PRIMARY_TICKETING', label: 'Primary ticketing' },
  { value: 'PRIMARY_CRM', label: 'Primary CRM' },
  { value: 'INTEGRATED_SUITE', label: 'Integrated suite' },
  { value: 'SECONDARY', label: 'Secondary' },
]
const KNOWN_ROLE_VALUES = SYSTEM_ROLES.map((r) => r.value)

/** @param {{ field: string; message: string }[]} fields */
function mapServerFieldsToSummary(fields) {
  return fields.map((f) => ({
    field: f.field,
    message: f.message,
    anchorId: FIELD_IDS[f.field] ?? `field-${f.field}`,
  }))
}

/** Use full server message for composite unique conflicts on the name field (AC7). */
function mergeCompositeConflictNameMessage(err, summary) {
  if (
    err?.statusCode === 409 &&
    typeof err.message === 'string' &&
    err.message.includes('already exists in')
  ) {
    const hasName = summary.some((item) => item.field === 'name')
    const base = hasName
      ? summary
      : [
          ...summary,
          {
            field: 'name',
            message: err.message,
            anchorId: FIELD_IDS.name,
          },
        ]
    return base.map((item) =>
      item.field === 'name' ? { ...item, message: err.message, anchorId: FIELD_IDS.name } : item,
    )
  }
  return summary
}

function validateClient(values) {
  /** @type {{ field: string; message: string; anchorId: string }[]} */
  const out = []
  if (!values.name.trim()) {
    out.push({ field: 'name', message: 'Enter the organisation name', anchorId: FIELD_IDS.name })
  }
  if (!values.country) {
    out.push({ field: 'country', message: 'Select a country', anchorId: FIELD_IDS.country })
  }
  if (!values.organisationTypeId) {
    out.push({
      field: 'organisationTypeId',
      message: 'Select an organisation type',
      anchorId: FIELD_IDS.organisationTypeId,
    })
  }
  const capTrim = values.capacity.trim()
  if (capTrim !== '') {
    const n = Number(capTrim)
    if (!Number.isInteger(n) || n < 0) {
      out.push({
        field: 'capacity',
        message: 'Enter a whole number for capacity',
        anchorId: FIELD_IDS.capacity,
      })
    } else if (n > MAX_CAPACITY) {
      out.push({
        field: 'capacity',
        message: 'Enter a capacity between 0 and 2,147,483,647',
        anchorId: FIELD_IDS.capacity,
      })
    }
  }
  return out
}

function validateLinkedSystems(rows) {
  const errors = []
  /** @type {Map<string, object[]>} */
  const bySystemId = new Map()
  for (const row of rows) {
    if (!row.systemId) continue
    if (!bySystemId.has(row.systemId)) bySystemId.set(row.systemId, [])
    bySystemId.get(row.systemId).push(row)
  }

  for (const row of rows) {
    if (!row.systemId) continue
    if (!row.role) {
      errors.push({
        rowKey: row._rowKey,
        field: `link-role-${row._rowKey}`,
        message: `Select a role for ${row.systemName || 'the selected system'}`,
        anchorId: `field-link-role-${row._rowKey}`,
      })
    }
  }

  for (const [, group] of bySystemId) {
    if (group.length <= 1) continue
    for (const row of group) {
      errors.push({
        rowKey: row._rowKey,
        field: `link-system-${row._rowKey}`,
        message: 'This system is already linked. Remove the duplicate row.',
        anchorId: `field-link-system-${row._rowKey}`,
      })
    }
  }

  return errors
}

function diffLinks(originalLinks, activeRows) {
  const originalById = new Map(originalLinks.map((l) => [l.id, l]))
  const activeRowIds = new Set(activeRows.filter((r) => r.linkId).map((r) => r.linkId))

  const toPost = activeRows.filter((r) => r.linkId === null)
  const toDelete = originalLinks.filter((l) => !activeRowIds.has(l.id))
  const toPut = activeRows.filter((r) => {
    if (!r.linkId) return false
    const orig = originalById.get(r.linkId)
    if (!orig) return false
    return (
      r.systemId !== orig.system.id ||
      r.role !== orig.role ||
      r.sourceReference !== (orig.sourceReference ?? '') ||
      r.note !== (orig.note ?? '')
    )
  })
  return { toPost, toPut, toDelete }
}

function hydrateLinkRows(systems) {
  return systems.map((link) => ({
    _rowKey: link.id,
    linkId: link.id,
    systemId: link.system.id,
    systemName: link.system.name,
    role: link.role ?? '',
    sourceReference: link.sourceReference ?? '',
    note: link.note ?? '',
  }))
}

function newEmptyRow() {
  return {
    _rowKey: crypto.randomUUID(),
    linkId: null,
    systemId: null,
    systemName: '',
    role: '',
    sourceReference: '',
    note: '',
  }
}

function focusFormControl(anchorId) {
  const el = document.getElementById(anchorId)
  if (el && typeof el.focus === 'function') {
    el.focus()
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

function FieldInlineError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-sm text-red-600" role="alert">
      {message}
    </p>
  )
}

function initialFormState() {
  return {
    name: '',
    country: '',
    city: '',
    organisationTypeId: '',
    membershipCapability: 'UNKNOWN',
    donationCapability: 'UNKNOWN',
    reservedSeatingCapability: 'UNKNOWN',
    sourceReference: '',
    notes: '',
    capacity: '',
  }
}

/** @param {object} dto organisation DTO from API */
function dtoToFormState(dto) {
  const cap = dto.capacity
  return {
    name: dto.name ?? '',
    country: dto.country ?? '',
    city: dto.city ?? '',
    organisationTypeId: dto.organisationType?.id ?? '',
    membershipCapability: String(dto.membershipCapability ?? 'UNKNOWN').toUpperCase(),
    donationCapability: String(dto.donationCapability ?? 'UNKNOWN').toUpperCase(),
    reservedSeatingCapability: String(dto.reservedSeatingCapability ?? 'UNKNOWN').toUpperCase(),
    sourceReference: dto.sourceReference ?? '',
    notes: dto.notes ?? '',
    capacity: cap != null && cap !== '' ? String(cap) : '',
  }
}

function buildSubmitBody(form, fieldSources) {
  const body = {
    name: form.name.trim(),
    country: form.country,
    organisationTypeId: form.organisationTypeId,
    membershipCapability: form.membershipCapability,
    donationCapability: form.donationCapability,
    reservedSeatingCapability: form.reservedSeatingCapability,
    fieldSources: buildFieldSourcesPayload(fieldSources),
  }
  const cityTrim = form.city.trim()
  if (cityTrim) body.city = cityTrim
  const sr = form.sourceReference.trim()
  if (sr) body.sourceReference = sr
  const notes = form.notes.trim()
  if (notes) body.notes = notes
  const capTrim = form.capacity.trim()
  if (capTrim !== '') body.capacity = Number(capTrim)
  return body
}

function LinkedSystemRow({ row, onChange, onRemove, errors }) {
  const roleError = errors.find((e) => e.rowKey === row._rowKey && e.field === `link-role-${row._rowKey}`)
  const systemError = errors.find((e) => e.rowKey === row._rowKey && e.field === `link-system-${row._rowKey}`)

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <label htmlFor={`field-link-system-${row._rowKey}`} className="mb-1 block text-xs font-medium text-slate-700">
            System
          </label>
          <SystemCombobox
            selectedId={row.systemId}
            onSelect={(sys) => {
              if (sys) {
                onChange(row._rowKey, { systemId: sys.id, systemName: sys.name })
              } else {
                onChange(row._rowKey, { systemId: null, systemName: '' })
              }
            }}
            placeholder="Search for a system…"
            inputId={`field-link-system-${row._rowKey}`}
          />
          <FieldInlineError
            id={`field-link-system-${row._rowKey}-error`}
            message={systemError?.message}
          />
        </div>

        <div className="sm:w-44 shrink-0">
          <label htmlFor={`field-link-role-${row._rowKey}`} className="mb-1 block text-xs font-medium text-slate-700">
            Role
          </label>
          <select
            id={`field-link-role-${row._rowKey}`}
            value={row.role}
            onChange={(e) => onChange(row._rowKey, { role: e.target.value })}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Select a role</option>
            {row.role !== '' && !KNOWN_ROLE_VALUES.includes(row.role) ? (
              <option value={row.role}>{`${row.role} (unspecified role)`}</option>
            ) : null}
            {SYSTEM_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <FieldInlineError
            id={`field-link-role-${row._rowKey}-error`}
            message={roleError?.message}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`field-link-src-${row._rowKey}`} className="mb-1 block text-xs font-medium text-slate-700">
          Source reference <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id={`field-link-src-${row._rowKey}`}
          type="text"
          value={row.sourceReference}
          onChange={(e) => onChange(row._rowKey, { sourceReference: e.target.value })}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="URL or identifier"
        />
      </div>

      <div>
        <label htmlFor={`field-link-note-${row._rowKey}`} className="mb-1 block text-xs font-medium text-slate-700">
          Note <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id={`field-link-note-${row._rowKey}`}
          rows={2}
          value={row.note}
          onChange={(e) => onChange(row._rowKey, { note: e.target.value })}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Optional note"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onRemove(row._rowKey)}
          className="text-sm text-red-600 hover:text-red-800"
        >
          × Remove
        </button>
      </div>
    </div>
  )
}

function OrganisationFormBody({
  backLink,
  title,
  subtitle,
  form,
  setField,
  fieldSources,
  onFieldSourceChange,
  onFieldSourceBlur,
  sourceErrors,
  summaryErrors,
  submitError,
  metaLoading,
  metaError,
  orgTypesQ,
  isSaving,
  linkRows,
  setLinkRows,
  linkRowErrors,
  onSubmit,
  nameInputOnBlur,
  beforeSubmitSlot,
}) {
  const hasSourceUrlErrors = useMemo(
    () => Object.values(sourceErrors).some(Boolean),
    [sourceErrors],
  )
  const invalidFields = useMemo(() => new Set(summaryErrors.map((e) => e.field)), [summaryErrors])

  const fieldMessages = useMemo(() => {
    const m = new Map()
    for (const e of summaryErrors) {
      if (!m.has(e.field)) m.set(e.field, e.message)
    }
    return m
  }, [summaryErrors])

  const inputError = (field) =>
    invalidFields.has(field) ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'

  const controlDescribedBy = (fieldId, fieldKey) => {
    const msg = fieldMessages.get(fieldKey)
    return msg ? `${fieldId}-error` : undefined
  }

  const handleRowChange = useCallback((rowKey, patch) => {
    setLinkRows((prev) => prev.map((r) => r._rowKey === rowKey ? { ...r, ...patch } : r))
  }, [setLinkRows])

  const handleRowRemove = useCallback((rowKey) => {
    setLinkRows((prev) => prev.filter((r) => r._rowKey !== rowKey))
  }, [setLinkRows])

  const handleAddRow = () => {
    setLinkRows((prev) => [...prev, newEmptyRow()])
  }

  // Merge link row errors into summary for display (already done by caller, but render from summaryErrors)
  // All errors (core + link) are already in summaryErrors when passed in.

  return (
    <div className="py-8">
      {backLink}

      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}

      {metaError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load reference data. Refresh the page or try again later.
        </div>
      )}

      {submitError && (
        <div
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {summaryErrors.length > 0 && (
        <div
          className="mt-6 rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-slate-900"
          role="alert"
          tabIndex={-1}
        >
          <h2 className="text-lg font-semibold text-red-800">There is a problem.</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {summaryErrors.map((item) => (
              <li key={`${item.field}-${item.message}`}>
                <a
                  href={`#${item.anchorId}`}
                  className="text-blue-700 underline"
                  onClick={(e) => {
                    e.preventDefault()
                    focusFormControl(item.anchorId)
                  }}
                >
                  {item.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-6" noValidate>
        <div>
          <label htmlFor={FIELD_IDS.name} className="mb-1 block text-sm font-medium text-slate-800">
            Name
          </label>
          <input
            id={FIELD_IDS.name}
            name="name"
            type="text"
            autoComplete="organization"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={(e) => nameInputOnBlur?.(e)}
            aria-invalid={invalidFields.has('name')}
            aria-describedby={controlDescribedBy(FIELD_IDS.name, 'name')}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('name')}`}
          />
          <FieldInlineError id={`${FIELD_IDS.name}-error`} message={fieldMessages.get('name')} />
        </div>

        <FieldWithSource
          fieldName="country"
          label="Country"
          sourceValue={fieldSources.country ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.country}
        >
          <div>
            <label htmlFor={FIELD_IDS.country} className="mb-1 block text-sm font-medium text-slate-800">
              Country
            </label>
            <select
              id={FIELD_IDS.country}
              name="country"
              value={form.country}
              onChange={(e) => setField('country', e.target.value)}
              aria-invalid={invalidFields.has('country')}
              aria-describedby={controlDescribedBy(FIELD_IDS.country, 'country')}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('country')}`}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <FieldInlineError id={`${FIELD_IDS.country}-error`} message={fieldMessages.get('country')} />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="city"
          label="City"
          sourceValue={fieldSources.city ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.city}
        >
          <div>
            <label htmlFor={FIELD_IDS.city} className="mb-1 block text-sm font-medium text-slate-800">
              City <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <p className="mb-1 text-sm text-slate-500">
              Recommended — helps distinguish organisations with the same name in different cities.
            </p>
            <input
              id={FIELD_IDS.city}
              name="city"
              type="text"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              aria-invalid={invalidFields.has('city')}
              aria-describedby={controlDescribedBy(FIELD_IDS.city, 'city')}
              className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('city')}`}
            />
            <FieldInlineError id={`${FIELD_IDS.city}-error`} message={fieldMessages.get('city')} />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="organisationType"
          label="Organisation type"
          sourceValue={fieldSources.organisationType ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.organisationType}
        >
          <div>
            <label htmlFor={FIELD_IDS.organisationTypeId} className="mb-1 block text-sm font-medium text-slate-800">
              Organisation type
            </label>
            <select
              id={FIELD_IDS.organisationTypeId}
              name="organisationTypeId"
              value={form.organisationTypeId}
              onChange={(e) => setField('organisationTypeId', e.target.value)}
              disabled={metaLoading}
              aria-invalid={invalidFields.has('organisationTypeId')}
              aria-describedby={controlDescribedBy(FIELD_IDS.organisationTypeId, 'organisationTypeId')}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('organisationTypeId')}`}
            >
              <option value="">Select an organisation type</option>
              {(orgTypesQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.organisationTypeId}-error`}
              message={fieldMessages.get('organisationTypeId')}
            />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="membershipCapability"
          label="Membership capability"
          sourceValue={fieldSources.membershipCapability ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.membershipCapability}
        >
          <div>
            <label htmlFor={FIELD_IDS.membershipCapability} className="mb-1 block text-sm font-medium text-slate-800">
              Membership capability
            </label>
            <select
              id={FIELD_IDS.membershipCapability}
              name="membershipCapability"
              value={form.membershipCapability}
              onChange={(e) => setField('membershipCapability', e.target.value)}
              aria-invalid={invalidFields.has('membershipCapability')}
              aria-describedby={controlDescribedBy(FIELD_IDS.membershipCapability, 'membershipCapability')}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('membershipCapability')}`}
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.membershipCapability}-error`}
              message={fieldMessages.get('membershipCapability')}
            />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="donationCapability"
          label="Donation capability"
          sourceValue={fieldSources.donationCapability ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.donationCapability}
        >
          <div>
            <label htmlFor={FIELD_IDS.donationCapability} className="mb-1 block text-sm font-medium text-slate-800">
              Donation capability
            </label>
            <select
              id={FIELD_IDS.donationCapability}
              name="donationCapability"
              value={form.donationCapability}
              onChange={(e) => setField('donationCapability', e.target.value)}
              aria-invalid={invalidFields.has('donationCapability')}
              aria-describedby={controlDescribedBy(FIELD_IDS.donationCapability, 'donationCapability')}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('donationCapability')}`}
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.donationCapability}-error`}
              message={fieldMessages.get('donationCapability')}
            />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="reservedSeatingCapability"
          label="Reserved seating capability"
          sourceValue={fieldSources.reservedSeatingCapability ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.reservedSeatingCapability}
        >
          <div>
            <label
              htmlFor={FIELD_IDS.reservedSeatingCapability}
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Reserved seating capability
            </label>
            <select
              id={FIELD_IDS.reservedSeatingCapability}
              name="reservedSeatingCapability"
              value={form.reservedSeatingCapability}
              onChange={(e) => setField('reservedSeatingCapability', e.target.value)}
              aria-invalid={invalidFields.has('reservedSeatingCapability')}
              aria-describedby={controlDescribedBy(
                FIELD_IDS.reservedSeatingCapability,
                'reservedSeatingCapability',
              )}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('reservedSeatingCapability')}`}
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.reservedSeatingCapability}-error`}
              message={fieldMessages.get('reservedSeatingCapability')}
            />
          </div>
        </FieldWithSource>

        <div>
          <label htmlFor={FIELD_IDS.sourceReference} className="mb-1 block text-sm font-medium text-slate-800">
            General source <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id={FIELD_IDS.sourceReference}
            name="sourceReference"
            type="text"
            value={form.sourceReference}
            onChange={(e) => setField('sourceReference', e.target.value)}
            aria-invalid={invalidFields.has('sourceReference')}
            aria-describedby={controlDescribedBy(FIELD_IDS.sourceReference, 'sourceReference')}
            className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('sourceReference')}`}
          />
          <FieldInlineError
            id={`${FIELD_IDS.sourceReference}-error`}
            message={fieldMessages.get('sourceReference')}
          />
        </div>

        <div>
          <label htmlFor={FIELD_IDS.notes} className="mb-1 block text-sm font-medium text-slate-800">
            Notes <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id={FIELD_IDS.notes}
            name="notes"
            rows={4}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            aria-invalid={invalidFields.has('notes')}
            aria-describedby={controlDescribedBy(FIELD_IDS.notes, 'notes')}
            className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('notes')}`}
          />
          <FieldInlineError id={`${FIELD_IDS.notes}-error`} message={fieldMessages.get('notes')} />
        </div>

        <FieldWithSource
          fieldName="capacity"
          label="Capacity"
          sourceValue={fieldSources.capacity ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.capacity}
        >
          <div>
            <label htmlFor={FIELD_IDS.capacity} className="mb-1 block text-sm font-medium text-slate-800">
              Capacity <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id={FIELD_IDS.capacity}
              name="capacity"
              type="text"
              inputMode="numeric"
              value={form.capacity}
              onChange={(e) => setField('capacity', e.target.value)}
              aria-invalid={invalidFields.has('capacity')}
              aria-describedby={controlDescribedBy(FIELD_IDS.capacity, 'capacity')}
              className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('capacity')}`}
            />
            <FieldInlineError id={`${FIELD_IDS.capacity}-error`} message={fieldMessages.get('capacity')} />
          </div>
        </FieldWithSource>

        {/* Linked systems section */}
        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-base font-medium text-slate-800">Linked systems</h2>
          <p className="mt-1 text-sm text-slate-500">
            Link this organisation to the systems it uses. Add a source reference and role for each.
          </p>
          <div className="mt-4 space-y-3">
            {linkRows.map((row) => (
              <LinkedSystemRow
                key={row._rowKey}
                row={row}
                onChange={handleRowChange}
                onRemove={handleRowRemove}
                errors={linkRowErrors}
              />
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={handleAddRow}>
              + Add system
            </Button>
          </div>
        </div>

        {beforeSubmitSlot ? <div className="pt-2">{beforeSubmitSlot}</div> : null}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSaving || metaLoading || metaError || hasSourceUrlErrors}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
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
        </div>
      </form>
    </div>
  )
}

function OrganisationCreateForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialFormState)
  const [fieldSources, setFieldSources] = useState({})
  const [sourceErrors, setSourceErrors] = useState({})
  const [summaryErrors, setSummaryErrors] = useState([])
  const [submitError, setSubmitError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [linkRows, setLinkRows] = useState([])
  const [linkRowErrors, setLinkRowErrors] = useState([])
  const [userAcknowledgedDuplicates, setUserAcknowledgedDuplicates] = useState(false)
  const [nameForSimilarCheck, setNameForSimilarCheck] = useState('')

  const orgTypesQ = useOrganisationTypesQuery()
  const metaLoading = orgTypesQ.isLoading
  const metaError = orgTypesQ.isError

  const {
    matches: similarMatches,
    isLoading: similarLoading,
    error: similarLookupError,
  } = useSimilarOrganisations(nameForSimilarCheck)

  const setField = useCallback((key, value) => {
    if (key === 'name') {
      setUserAcknowledgedDuplicates(false)
      setNameForSimilarCheck('')
    }
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleNameBlurSimilar = useCallback(() => {
    const t = form.name.trim()
    if (t.length >= 3) {
      setNameForSimilarCheck(form.name)
    }
  }, [form.name])

  const showSimilarWarning =
    similarMatches.length > 0 && !userAcknowledgedDuplicates && !similarLoading

  const similarCheckFailed =
    Boolean(similarLookupError) && nameForSimilarCheck.trim().length >= 3

  const beforeSubmitSlot =
    similarCheckFailed || showSimilarWarning ? (
      <>
        {similarCheckFailed ? (
          <div
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm"
            role="status"
          >
            <p className="font-medium text-slate-900">Could not check for similar names</p>
            <p className="mt-1 text-slate-700">
              You can still save. The server will reject an exact duplicate in the same city and
              country.
            </p>
          </div>
        ) : null}
        {showSimilarWarning ? (
          <SimilarOrganisationsWarning
            matches={similarMatches}
            currentName={form.name.trim() || form.name}
            onContinue={() => setUserAcknowledgedDuplicates(true)}
            onCancel={() => {
              setField('name', '')
              focusFormControl(FIELD_IDS.name)
            }}
          />
        ) : null}
      </>
    ) : null

  const onFieldSourceChange = useCallback((fieldName, value) => {
    setFieldSources((prev) => ({ ...prev, [fieldName]: value }))
    if (isValidSourceUrl(value)) {
      setSourceErrors((prev) => {
        if (!(fieldName in prev)) return prev
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
  }, [])

  const onFieldSourceBlur = useCallback((fieldName, value) => {
    if (isValidSourceUrl(value)) {
      setSourceErrors((prev) => {
        if (!(fieldName in prev)) return prev
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    } else {
      setSourceErrors((prev) => ({ ...prev, [fieldName]: SOURCE_URL_CLIENT_ERROR }))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSummaryErrors([])
    setSubmitError(null)

    const clientErrs = validateClient(form)
    const linkErrs = validateLinkedSystems(linkRows)
    if (clientErrs.length > 0 || linkErrs.length > 0) {
      setSummaryErrors([...clientErrs, ...linkErrs])
      setLinkRowErrors(linkErrs)
      return
    }
    setLinkRowErrors([])

    /** @type {Record<string, string>} */
    const urlErrs = {}
    for (const [k, v] of Object.entries(fieldSources)) {
      if (!isValidSourceUrl(v)) urlErrs[k] = SOURCE_URL_CLIENT_ERROR
    }
    if (Object.keys(urlErrs).length > 0) {
      setSourceErrors((prev) => ({ ...prev, ...urlErrs }))
      return
    }

    setIsSaving(true)
    const body = buildSubmitBody(form, fieldSources)
    let savedOrgId
    try {
      const result = await createOrganisation(body)
      savedOrgId = result.id
    } catch (err) {
      let summary = []
      let se = {}
      if (Array.isArray(err.fields) && err.fields.length > 0) {
        const mapped = mapServerFieldErrorsToSummaryAndSources(err.fields, mapServerFieldsToSummary)
        summary = mapped.summary
        se = mapped.sourceErrors
      }
      summary = mergeCompositeConflictNameMessage(err, summary)
      if (summary.length > 0) {
        setSourceErrors(se)
        setSummaryErrors(summary)
      } else {
        setSubmitError(err?.message ?? 'Could not save the organisation. Try again.')
      }
      setIsSaving(false)
      return
    }

    const activeRows = linkRows.filter((r) => r.systemId !== null)
    const { toPost, toPut, toDelete } = diffLinks([], activeRows)
    const writes = [
      ...toPost.map((r) =>
        createOrganisationSystemLink(savedOrgId, {
          systemId: r.systemId,
          role: r.role,
          sourceReference: r.sourceReference || undefined,
          note: r.note || undefined,
        }),
      ),
      ...toPut.map((r) =>
        updateOrganisationSystemLink(savedOrgId, r.linkId, {
          systemId: r.systemId,
          role: r.role,
          sourceReference: r.sourceReference || undefined,
          note: r.note || undefined,
        }),
      ),
      ...toDelete.map((l) => deleteOrganisationSystemLink(savedOrgId, l.id)),
    ]

    if (writes.length === 0) {
      navigate(`/organisations/${savedOrgId}`, { state: { organisationSaved: true } })
      return
    }

    const results = await Promise.allSettled(writes)
    const anyFailed = results.some((r) => r.status === 'rejected')
    navigate(`/organisations/${savedOrgId}`, {
      state: anyFailed ? { linksSavedWithErrors: true } : { organisationSaved: true },
    })
  }

  return (
    <OrganisationFormBody
      backLink={
        <Link to="/organisations" className="mb-6 inline-block text-sm text-blue-600">
          ← Back to organisations
        </Link>
      }
      title="Add organisation"
      subtitle="Create a new catalogue entry with full provenance."
      form={form}
      setField={setField}
      fieldSources={fieldSources}
      onFieldSourceChange={onFieldSourceChange}
      onFieldSourceBlur={onFieldSourceBlur}
      sourceErrors={sourceErrors}
      summaryErrors={summaryErrors}
      submitError={submitError}
      metaLoading={metaLoading}
      metaError={metaError}
      orgTypesQ={orgTypesQ}
      isSaving={isSaving}
      linkRows={linkRows}
      setLinkRows={setLinkRows}
      linkRowErrors={linkRowErrors}
      onSubmit={handleSubmit}
      nameInputOnBlur={handleNameBlurSimilar}
      beforeSubmitSlot={beforeSubmitSlot}
    />
  )
}

/** @param {{ id: string | undefined }} props */
function OrganisationEditForm({ id }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialFormState)
  const [fieldSources, setFieldSources] = useState({})
  const [sourceErrors, setSourceErrors] = useState({})
  const [summaryErrors, setSummaryErrors] = useState([])
  const [submitError, setSubmitError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [linkRows, setLinkRows] = useState([])
  const [originalLinks, setOriginalLinks] = useState([])
  const [linkRowErrors, setLinkRowErrors] = useState([])

  const { data, isLoading, isError, error, isSuccess } = useOrganisation(id)

  const orgTypesQ = useOrganisationTypesQuery()
  const metaLoading = orgTypesQ.isLoading
  const metaError = orgTypesQ.isError

  const notFound = error instanceof OrganisationNotFoundError
  const missingId = !id
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!data || hydratedRef.current) return
    hydratedRef.current = true
    startTransition(() => {
      setForm(dtoToFormState(data))
      setFieldSources(normaliseFieldSourcesFromDto(data.fieldSources))
      setSourceErrors({})
      setLinkRows(hydrateLinkRows(data.systems ?? []))
      setOriginalLinks(data.systems ?? [])
    })
  }, [data])

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const onFieldSourceChange = useCallback((fieldName, value) => {
    setFieldSources((prev) => ({ ...prev, [fieldName]: value }))
    if (isValidSourceUrl(value)) {
      setSourceErrors((prev) => {
        if (!(fieldName in prev)) return prev
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
  }, [])

  const onFieldSourceBlur = useCallback((fieldName, value) => {
    if (isValidSourceUrl(value)) {
      setSourceErrors((prev) => {
        if (!(fieldName in prev)) return prev
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    } else {
      setSourceErrors((prev) => ({ ...prev, [fieldName]: SOURCE_URL_CLIENT_ERROR }))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!id) return
    setSummaryErrors([])
    setSubmitError(null)

    const clientErrs = validateClient(form)
    const linkErrs = validateLinkedSystems(linkRows)
    if (clientErrs.length > 0 || linkErrs.length > 0) {
      setSummaryErrors([...clientErrs, ...linkErrs])
      setLinkRowErrors(linkErrs)
      return
    }
    setLinkRowErrors([])

    /** @type {Record<string, string>} */
    const urlErrs = {}
    for (const [k, v] of Object.entries(fieldSources)) {
      if (!isValidSourceUrl(v)) urlErrs[k] = SOURCE_URL_CLIENT_ERROR
    }
    if (Object.keys(urlErrs).length > 0) {
      setSourceErrors((prev) => ({ ...prev, ...urlErrs }))
      return
    }

    setIsSaving(true)
    const body = buildSubmitBody(form, fieldSources)
    try {
      await updateOrganisation(id, body)
    } catch (err) {
      let summary = []
      let se = {}
      if (Array.isArray(err.fields) && err.fields.length > 0) {
        const mapped = mapServerFieldErrorsToSummaryAndSources(err.fields, mapServerFieldsToSummary)
        summary = mapped.summary
        se = mapped.sourceErrors
      }
      summary = mergeCompositeConflictNameMessage(err, summary)
      if (summary.length > 0) {
        setSourceErrors(se)
        setSummaryErrors(summary)
      } else {
        setSubmitError(err?.message ?? 'Could not save the organisation. Try again.')
      }
      setIsSaving(false)
      return
    }

    const activeRows = linkRows.filter((r) => r.systemId !== null)
    const { toPost, toPut, toDelete } = diffLinks(originalLinks, activeRows)
    const writes = [
      ...toPost.map((r) =>
        createOrganisationSystemLink(id, {
          systemId: r.systemId,
          role: r.role,
          sourceReference: r.sourceReference || undefined,
          note: r.note || undefined,
        }),
      ),
      ...toPut.map((r) =>
        updateOrganisationSystemLink(id, r.linkId, {
          systemId: r.systemId,
          role: r.role,
          sourceReference: r.sourceReference || undefined,
          note: r.note || undefined,
        }),
      ),
      ...toDelete.map((l) => deleteOrganisationSystemLink(id, l.id)),
    ]

    if (writes.length === 0) {
      navigate(`/organisations/${id}`, { state: { organisationSaved: true } })
      return
    }

    const results = await Promise.allSettled(writes)
    const anyFailed = results.some((r) => r.status === 'rejected')
    navigate(`/organisations/${id}`, {
      state: anyFailed ? { linksSavedWithErrors: true } : { organisationSaved: true },
    })
  }

  if (missingId) {
    return (
      <div className="py-8">
        <Link to="/organisations" className="mb-4 inline-block text-sm text-blue-600">
          ← Back to organisations
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">Organisation not found</h1>
          <p className="mt-2 text-sm text-slate-600">This page needs a valid organisation link.</p>
        </div>
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="py-8">
        <Link to={`/organisations/${id}`} className="mb-6 inline-block text-sm text-blue-600">
          ← Back to organisations detail
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Edit organisation</h1>
        <p className="mt-4 text-sm text-slate-600">Loading organisation…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="py-8">
        <Link to="/organisations" className="mb-4 inline-block text-sm text-blue-600">
          ← Back to organisations
        </Link>
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
      </div>
    )
  }

  if (isError && !notFound) {
    return (
      <div className="py-8">
        <Link to={`/organisations/${id}`} className="mb-4 inline-block text-sm text-blue-600">
          ← Back to organisations detail
        </Link>
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm">
            {error instanceof Error ? error.message : 'Unable to load this organisation.'}
          </p>
        </div>
      </div>
    )
  }

  if (!isSuccess || !data) {
    return null
  }

  return (
    <OrganisationFormBody
      backLink={
        <Link to={`/organisations/${id}`} className="mb-6 inline-block text-sm text-blue-600">
          ← Back to organisations detail
        </Link>
      }
      title="Edit organisation"
      subtitle={null}
      form={form}
      setField={setField}
      fieldSources={fieldSources}
      onFieldSourceChange={onFieldSourceChange}
      onFieldSourceBlur={onFieldSourceBlur}
      sourceErrors={sourceErrors}
      summaryErrors={summaryErrors}
      submitError={submitError}
      metaLoading={metaLoading}
      metaError={metaError}
      orgTypesQ={orgTypesQ}
      isSaving={isSaving}
      linkRows={linkRows}
      setLinkRows={setLinkRows}
      linkRowErrors={linkRowErrors}
      onSubmit={handleSubmit}
    />
  )
}

export default function OrganisationFormPage() {
  const editMatch = useMatch({ path: '/organisations/:id/edit', end: true })
  const { id } = useParams()
  if (editMatch) {
    return <OrganisationEditForm key={id ?? 'edit'} id={id} />
  }
  return <OrganisationCreateForm />
}
