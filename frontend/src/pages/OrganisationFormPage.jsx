import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { COUNTRIES } from '../lib/countries.js'
import { Button } from '../components/ui/button.jsx'
import { useCreateOrganisation } from '../hooks/useCreateOrganisation.js'
import { useUpdateOrganisation } from '../hooks/useUpdateOrganisation.js'
import { useOrganisation } from '../hooks/useOrganisation.js'
import { OrganisationNotFoundError } from '../api/organisations.js'
import {
  useOrganisationTypesQuery,
  useTicketingProvidersQuery,
  useCrmPlatformsQuery,
} from '../hooks/useMetaReferenceData.js'

/** Match server `MAX_CAPACITY` in `organisation-controller.js` */
const MAX_CAPACITY = 2_147_483_647

const FIELD_IDS = {
  name: 'field-name',
  country: 'field-country',
  city: 'field-city',
  organisationTypeId: 'field-organisation-type',
  ticketingProviderId: 'field-ticketing-provider',
  crmPlatformId: 'field-crm-platform',
  membershipCapability: 'field-membership-capability',
  donationCapability: 'field-donation-capability',
  reservedSeatingCapability: 'field-reserved-seating-capability',
  sourceReference: 'field-source-reference',
  notes: 'field-notes',
  capacity: 'field-capacity',
}

/** @param {{ field: string; message: string }[]} fields */
function mapServerFieldsToSummary(fields) {
  return fields.map((f) => ({
    field: f.field,
    message: f.message,
    anchorId: FIELD_IDS[f.field] ?? `field-${f.field}`,
  }))
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
    ticketingProviderId: '',
    crmPlatformId: '',
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
    ticketingProviderId: dto.ticketingProvider?.id ?? '',
    crmPlatformId: dto.crmPlatform?.id ?? '',
    membershipCapability: String(dto.membershipCapability ?? 'UNKNOWN').toUpperCase(),
    donationCapability: String(dto.donationCapability ?? 'UNKNOWN').toUpperCase(),
    reservedSeatingCapability: String(dto.reservedSeatingCapability ?? 'UNKNOWN').toUpperCase(),
    sourceReference: dto.sourceReference ?? '',
    notes: dto.notes ?? '',
    capacity: cap != null && cap !== '' ? String(cap) : '',
  }
}

function buildSubmitBody(form) {
  const body = {
    name: form.name.trim(),
    country: form.country,
    organisationTypeId: form.organisationTypeId,
    membershipCapability: form.membershipCapability,
    donationCapability: form.donationCapability,
    reservedSeatingCapability: form.reservedSeatingCapability,
  }
  const cityTrim = form.city.trim()
  if (cityTrim) body.city = cityTrim
  if (form.ticketingProviderId) body.ticketingProviderId = form.ticketingProviderId
  if (form.crmPlatformId) body.crmPlatformId = form.crmPlatformId
  const sr = form.sourceReference.trim()
  if (sr) body.sourceReference = sr
  const notes = form.notes.trim()
  if (notes) body.notes = notes
  const capTrim = form.capacity.trim()
  if (capTrim !== '') body.capacity = Number(capTrim)
  return body
}

/**
 * @param {{
 *   backLink: import('react').ReactNode
 *   title: string
 *   subtitle: string | null
 *   form: ReturnType<typeof initialFormState>
 *   setField: (key: string, value: string) => void
 *   summaryErrors: { field: string; message: string; anchorId: string }[]
 *   submitError: string | null
 *   metaLoading: boolean
 *   metaError: boolean
 *   orgTypesQ: import('@tanstack/react-query').UseQueryResult
 *   ticketingQ: import('@tanstack/react-query').UseQueryResult
 *   crmQ: import('@tanstack/react-query').UseQueryResult
 *   mutation: { isPending: boolean }
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
function OrganisationFormBody({
  backLink,
  title,
  subtitle,
  form,
  setField,
  summaryErrors,
  submitError,
  metaLoading,
  metaError,
  orgTypesQ,
  ticketingQ,
  crmQ,
  mutation,
  onSubmit,
}) {
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
            aria-invalid={invalidFields.has('name')}
            aria-describedby={controlDescribedBy(FIELD_IDS.name, 'name')}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('name')}`}
          />
          <FieldInlineError id={`${FIELD_IDS.name}-error`} message={fieldMessages.get('name')} />
        </div>

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

        <div>
          <label htmlFor={FIELD_IDS.city} className="mb-1 block text-sm font-medium text-slate-800">
            City <span className="font-normal text-slate-500">(optional)</span>
          </label>
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

        <div>
          <label htmlFor={FIELD_IDS.ticketingProviderId} className="mb-1 block text-sm font-medium text-slate-800">
            Ticketing provider{' '}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <select
            id={FIELD_IDS.ticketingProviderId}
            name="ticketingProviderId"
            value={form.ticketingProviderId}
            onChange={(e) => setField('ticketingProviderId', e.target.value)}
            disabled={metaLoading}
            aria-invalid={invalidFields.has('ticketingProviderId')}
            aria-describedby={controlDescribedBy(FIELD_IDS.ticketingProviderId, 'ticketingProviderId')}
            className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('ticketingProviderId')}`}
          >
            <option value="">—</option>
            {(ticketingQ.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <FieldInlineError
            id={`${FIELD_IDS.ticketingProviderId}-error`}
            message={fieldMessages.get('ticketingProviderId')}
          />
        </div>

        <div>
          <label htmlFor={FIELD_IDS.crmPlatformId} className="mb-1 block text-sm font-medium text-slate-800">
            CRM platform <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <select
            id={FIELD_IDS.crmPlatformId}
            name="crmPlatformId"
            value={form.crmPlatformId}
            onChange={(e) => setField('crmPlatformId', e.target.value)}
            disabled={metaLoading}
            aria-invalid={invalidFields.has('crmPlatformId')}
            aria-describedby={controlDescribedBy(FIELD_IDS.crmPlatformId, 'crmPlatformId')}
            className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('crmPlatformId')}`}
          >
            <option value="">—</option>
            {(crmQ.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <FieldInlineError
            id={`${FIELD_IDS.crmPlatformId}-error`}
            message={fieldMessages.get('crmPlatformId')}
          />
        </div>

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

        <div>
          <label htmlFor={FIELD_IDS.sourceReference} className="mb-1 block text-sm font-medium text-slate-800">
            Source reference <span className="font-normal text-slate-500">(optional)</span>
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

        <div className="pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending || metaLoading || metaError}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending ? (
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
  const [summaryErrors, setSummaryErrors] = useState([])
  const [submitError, setSubmitError] = useState(null)
  const mutation = useCreateOrganisation()

  const orgTypesQ = useOrganisationTypesQuery()
  const ticketingQ = useTicketingProvidersQuery()
  const crmQ = useCrmPlatformsQuery()

  const metaLoading = orgTypesQ.isLoading || ticketingQ.isLoading || crmQ.isLoading
  const metaError = orgTypesQ.isError || ticketingQ.isError || crmQ.isError

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSummaryErrors([])
    setSubmitError(null)

    const clientErrs = validateClient(form)
    if (clientErrs.length > 0) {
      setSummaryErrors(clientErrs)
      return
    }

    const body = buildSubmitBody(form)

    mutation.mutate(body, {
      onSuccess: (data) => {
        navigate(`/organisations/${data.id}`, { state: { organisationSaved: true } })
      },
      onError: (err) => {
        if (Array.isArray(err.fields) && err.fields.length > 0) {
          setSubmitError(null)
          setSummaryErrors(mapServerFieldsToSummary(err.fields))
        } else {
          setSubmitError(err?.message ?? 'Could not save the organisation. Try again.')
        }
      },
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
      summaryErrors={summaryErrors}
      submitError={submitError}
      metaLoading={metaLoading}
      metaError={metaError}
      orgTypesQ={orgTypesQ}
      ticketingQ={ticketingQ}
      crmQ={crmQ}
      mutation={mutation}
      onSubmit={handleSubmit}
    />
  )
}

/** @param {{ id: string | undefined }} props */
function OrganisationEditForm({ id }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialFormState)
  const [summaryErrors, setSummaryErrors] = useState([])
  const [submitError, setSubmitError] = useState(null)

  const { data, isLoading, isError, error, isSuccess } = useOrganisation(id)
  const mutation = useUpdateOrganisation(id)

  const orgTypesQ = useOrganisationTypesQuery()
  const ticketingQ = useTicketingProvidersQuery()
  const crmQ = useCrmPlatformsQuery()

  const metaLoading = orgTypesQ.isLoading || ticketingQ.isLoading || crmQ.isLoading
  const metaError = orgTypesQ.isError || ticketingQ.isError || crmQ.isError

  const notFound = error instanceof OrganisationNotFoundError
  const missingId = !id
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!data || hydratedRef.current) return
    hydratedRef.current = true
    startTransition(() => {
      setForm(dtoToFormState(data))
    })
  }, [data])

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!id) return
    setSummaryErrors([])
    setSubmitError(null)

    const clientErrs = validateClient(form)
    if (clientErrs.length > 0) {
      setSummaryErrors(clientErrs)
      return
    }

    const body = buildSubmitBody(form)

    mutation.mutate(body, {
      onSuccess: () => {
        navigate(`/organisations/${id}`, { state: { organisationSaved: true } })
      },
      onError: (err) => {
        if (Array.isArray(err.fields) && err.fields.length > 0) {
          setSubmitError(null)
          setSummaryErrors(mapServerFieldsToSummary(err.fields))
        } else {
          setSubmitError(err?.message ?? 'Could not save the organisation. Try again.')
        }
      },
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
      summaryErrors={summaryErrors}
      submitError={submitError}
      metaLoading={metaLoading}
      metaError={metaError}
      orgTypesQ={orgTypesQ}
      ticketingQ={ticketingQ}
      crmQ={crmQ}
      mutation={mutation}
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
