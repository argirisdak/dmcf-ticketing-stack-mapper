import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import FieldWithSource from '../components/FieldWithSource.jsx'
import { useCreateSystem } from '../hooks/useCreateSystem.js'
import { useUpdateSystem } from '../hooks/useUpdateSystem.js'
import { useSystem } from '../hooks/useSystem.js'
import { SystemNotFoundError } from '../api/systems.js'
import { SYSTEM_GEOGRAPHIC_FOCUS } from '../lib/system-geographic-focus.js'
import {
  buildFieldSourcesPayload,
  mapServerFieldErrorsToSummaryAndSources,
  normaliseFieldSourcesFromDto,
} from '../lib/field-sources-form.js'
import { SOURCE_URL_CLIENT_ERROR, isValidSourceUrl } from '../lib/source-url-validation.js'
import { CAPABILITY_ROWS } from '../lib/system-capabilities.js'
import CustomAttributeEditor from '../components/CustomAttributeEditor.jsx'
import { buildCustomAttributesPayload } from '../lib/custom-attributes-form.js'

const FIELD_IDS = {
  name: 'field-sys-name',
  vendor: 'field-sys-vendor',
  category: 'field-sys-category',
  deploymentModel: 'field-sys-deployment',
  pricingModel: 'field-sys-pricing',
  geographicFocus: 'field-sys-geo-focus',
  description: 'field-sys-description',
  membershipCapability: 'field-sys-membership',
  donationCapability: 'field-sys-donation',
  reservedSeatingCapability: 'field-sys-seating',
  seasonSubscriptionsCapability: 'field-sys-season-subscriptions',
  dynamicPricingCapability: 'field-sys-dynamic-pricing',
  multiVenueSupportCapability: 'field-sys-multi-venue',
  marketingAutomationCapability: 'field-sys-marketing-automation',
  accessibilityFeaturesCapability: 'field-sys-accessibility',
  sourceReference: 'field-sys-source',
}

/** Backend error fields are often snake_case — map to form keys used in FIELD_IDS. */
const API_ERROR_FIELD_TO_FORM = {
  deployment_model: 'deploymentModel',
  pricing_model: 'pricingModel',
  geographic_focus: 'geographicFocus',
  membership_capability: 'membershipCapability',
  donation_capability: 'donationCapability',
  reserved_seating_capability: 'reservedSeatingCapability',
  season_subscriptions_capability: 'seasonSubscriptionsCapability',
  dynamic_pricing_capability: 'dynamicPricingCapability',
  multi_venue_support_capability: 'multiVenueSupportCapability',
  marketing_automation_capability: 'marketingAutomationCapability',
  accessibility_features_capability: 'accessibilityFeaturesCapability',
  source_reference: 'sourceReference',
}

const CATEGORY_OPTIONS = [
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

/** @param {{ field: string; message: string }[]} fields */
function mapServerFieldsToSummary(fields) {
  return fields.map((f) => {
    const formKey = /** @type {keyof typeof FIELD_IDS} */ (
      API_ERROR_FIELD_TO_FORM[f.field] ?? f.field
    )
    return {
      field: formKey,
      message: f.message,
      anchorId:
        FIELD_IDS[formKey] != null ? FIELD_IDS[formKey] : `field-${String(f.field)}`,
    }
  })
}

function validateClient(values) {
  /** @type {{ field: keyof typeof FIELD_IDS; message: string; anchorId: string }[]} */
  const out = []
  if (!values.name.trim()) {
    out.push({ field: 'name', message: 'Enter the system name', anchorId: FIELD_IDS.name })
  }
  if (!values.vendor.trim()) {
    out.push({ field: 'vendor', message: 'Enter the vendor name', anchorId: FIELD_IDS.vendor })
  }
  if (!values.category) {
    out.push({
      field: 'category',
      message: 'Select a category',
      anchorId: FIELD_IDS.category,
    })
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
    vendor: '',
    category: '',
    deploymentModel: '',
    pricingModel: '',
    geographicFocus: '',
    description: '',
    membershipCapability: 'UNKNOWN',
    donationCapability: 'UNKNOWN',
    reservedSeatingCapability: 'UNKNOWN',
    seasonSubscriptionsCapability: 'UNKNOWN',
    dynamicPricingCapability: 'UNKNOWN',
    multiVenueSupportCapability: 'UNKNOWN',
    marketingAutomationCapability: 'UNKNOWN',
    accessibilityFeaturesCapability: 'UNKNOWN',
    sourceReference: '',
  }
}

const CAPABILITY_STATE_VALUES = new Set(['YES', 'NO', 'UNKNOWN'])

/** @param {unknown} raw */
function normaliseCapabilityState(raw) {
  const u = String(raw ?? 'UNKNOWN').toUpperCase()
  return CAPABILITY_STATE_VALUES.has(u) ? u : 'UNKNOWN'
}

/** @param {Record<string, unknown>} dto system DTO from API */
/** @param {string} s */
function shortContentHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** @param {unknown} dto system DTO from API */
function dtoToCustomAttributeRows(dto) {
  const raw = /** @type {{ customAttributes?: unknown }} */ (dto).customAttributes
  if (!Array.isArray(raw)) return []
  return raw.map((entry, index) => {
    const o = /** @type {Record<string, unknown>} */ (entry && typeof entry === 'object' ? entry : {})
    const label = o.label != null ? String(o.label) : ''
    const value = o.value != null ? String(o.value) : ''
    const rawRef = o.sourceReference ?? o.source_reference
    const sourceReference = rawRef != null ? String(rawRef) : ''
    const h = shortContentHash(`${label}\0${value}\0${sourceReference}`)
    return {
      _key: `existing-${index}-${h}`,
      label,
      value,
      sourceReference,
    }
  })
}

function dtoToFormState(dto) {
  return {
    name: dto.name != null ? String(dto.name) : '',
    vendor: dto.vendor != null ? String(dto.vendor) : '',
    category: dto.category != null ? String(dto.category) : '',
    deploymentModel: dto.deploymentModel != null ? String(dto.deploymentModel) : '',
    pricingModel: dto.pricingModel != null ? String(dto.pricingModel) : '',
    geographicFocus: dto.geographicFocus != null ? String(dto.geographicFocus) : '',
    description: dto.description != null ? String(dto.description) : '',
    membershipCapability: normaliseCapabilityState(dto.membershipCapability),
    donationCapability: normaliseCapabilityState(dto.donationCapability),
    reservedSeatingCapability: normaliseCapabilityState(dto.reservedSeatingCapability),
    seasonSubscriptionsCapability: normaliseCapabilityState(dto.seasonSubscriptionsCapability),
    dynamicPricingCapability: normaliseCapabilityState(dto.dynamicPricingCapability),
    multiVenueSupportCapability: normaliseCapabilityState(dto.multiVenueSupportCapability),
    marketingAutomationCapability: normaliseCapabilityState(dto.marketingAutomationCapability),
    accessibilityFeaturesCapability: normaliseCapabilityState(dto.accessibilityFeaturesCapability),
    sourceReference: dto.sourceReference != null ? String(dto.sourceReference) : '',
  }
}

function buildSubmitBody(form, fieldSources, customAttributeRows) {
  const body = {
    name: form.name.trim(),
    vendor: form.vendor.trim(),
    category: form.category,
    membershipCapability: form.membershipCapability,
    donationCapability: form.donationCapability,
    reservedSeatingCapability: form.reservedSeatingCapability,
    seasonSubscriptionsCapability: form.seasonSubscriptionsCapability,
    dynamicPricingCapability: form.dynamicPricingCapability,
    multiVenueSupportCapability: form.multiVenueSupportCapability,
    marketingAutomationCapability: form.marketingAutomationCapability,
    accessibilityFeaturesCapability: form.accessibilityFeaturesCapability,
    fieldSources: buildFieldSourcesPayload(fieldSources),
  }
  if (form.deploymentModel) body.deploymentModel = form.deploymentModel
  if (form.pricingModel) body.pricingModel = form.pricingModel
  if (form.geographicFocus) body.geographicFocus = form.geographicFocus
  const desc = form.description.trim()
  if (desc) body.description = desc
  const sr = form.sourceReference.trim()
  if (sr) body.sourceReference = sr
  body.customAttributes = buildCustomAttributesPayload(customAttributeRows ?? [])
  return body
}

/**
 * @param {{
 *   backLink: import('react').ReactNode
 *   title: string
 *   form: ReturnType<typeof initialFormState>
 *   setField: (key: string, value: string) => void
 *   summaryErrors: { field: string; message: string; anchorId: string }[]
 *   submitError: string | null
 *   mutation: { isPending: boolean }
 *   onSubmit: (e: import('react').FormEvent) => void
 *   customAttributes: { _key: string; label: string; value: string; sourceReference: string }[]
 *   onCustomAttributesChange: (next: { _key: string; label: string; value: string; sourceReference: string }[]) => void
 * }} props
 */
function SystemFormBody({
  backLink,
  title,
  form,
  setField,
  fieldSources,
  onFieldSourceChange,
  onFieldSourceBlur,
  sourceErrors,
  summaryErrors,
  submitError,
  mutation,
  onSubmit,
  customAttributes,
  onCustomAttributesChange,
}) {
  const hasSourceUrlErrors = useMemo(
    () => Object.values(sourceErrors).some(Boolean),
    [sourceErrors],
  )
  const [customAttributesInvalid, setCustomAttributesInvalid] = useState(false)
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

  const controlDescribedBy = (fieldId, fieldKey, hintId) => {
    const ids = []
    if (hintId) ids.push(hintId)
    const msg = fieldMessages.get(fieldKey)
    if (msg) ids.push(`${fieldId}-error`)
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  return (
    <div className="py-8">
      {backLink}

      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>

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

      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        <div className="max-w-md">
          <label htmlFor={FIELD_IDS.name} className="mb-1 block text-sm font-medium text-slate-800">
            Name
          </label>
          <p id={`${FIELD_IDS.name}-hint`} className="mt-1 text-sm text-slate-600">
            Must be unique. Use the canonical product name (e.g. &quot;Tessitura&quot;, not
            &quot;Tess&quot;).
          </p>
          <input
            id={FIELD_IDS.name}
            name="name"
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            aria-invalid={invalidFields.has('name')}
            aria-describedby={controlDescribedBy(FIELD_IDS.name, 'name', `${FIELD_IDS.name}-hint`)}
            className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('name')}`}
          />
          <FieldInlineError id={`${FIELD_IDS.name}-error`} message={fieldMessages.get('name')} />
        </div>

        <FieldWithSource
          fieldName="vendor"
          label="Vendor"
          sourceValue={fieldSources.vendor ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.vendor}
        >
          <div className="max-w-md">
            <label htmlFor={FIELD_IDS.vendor} className="mb-1 block text-sm font-medium text-slate-800">
              Vendor
            </label>
            <p id={`${FIELD_IDS.vendor}-hint`} className="mt-1 text-sm text-slate-600">
              The supplier organisation (e.g. &quot;Tessitura Network&quot;).
            </p>
            <input
              id={FIELD_IDS.vendor}
              name="vendor"
              type="text"
              value={form.vendor}
              onChange={(e) => setField('vendor', e.target.value)}
              aria-invalid={invalidFields.has('vendor')}
              aria-describedby={controlDescribedBy(
                FIELD_IDS.vendor,
                'vendor',
                `${FIELD_IDS.vendor}-hint`,
              )}
              className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('vendor')}`}
            />
            <FieldInlineError id={`${FIELD_IDS.vendor}-error`} message={fieldMessages.get('vendor')} />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="category"
          label="Category"
          sourceValue={fieldSources.category ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.category}
        >
          <div className="max-w-xs">
            <label htmlFor={FIELD_IDS.category} className="mb-1 block text-sm font-medium text-slate-800">
              Category
            </label>
            <select
              id={FIELD_IDS.category}
              name="category"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              aria-invalid={invalidFields.has('category')}
              aria-describedby={controlDescribedBy(FIELD_IDS.category, 'category')}
              className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('category')}`}
            >
              <option value="">Select a category</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.category}-error`}
              message={fieldMessages.get('category')}
            />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="deploymentModel"
          label="Deployment model"
          sourceValue={fieldSources.deploymentModel ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.deploymentModel}
        >
          <div className="max-w-xs">
            <label
              htmlFor={FIELD_IDS.deploymentModel}
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Deployment model{' '}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <select
              id={FIELD_IDS.deploymentModel}
              name="deploymentModel"
              value={form.deploymentModel}
              onChange={(e) => setField('deploymentModel', e.target.value)}
              aria-invalid={invalidFields.has('deploymentModel')}
              aria-describedby={controlDescribedBy(FIELD_IDS.deploymentModel, 'deploymentModel')}
              className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('deploymentModel')}`}
            >
              <option value="">Select deployment model (optional)</option>
              {DEPLOYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.deploymentModel}-error`}
              message={fieldMessages.get('deploymentModel')}
            />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="pricingModel"
          label="Pricing model"
          sourceValue={fieldSources.pricingModel ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.pricingModel}
        >
          <div className="max-w-xs">
            <label htmlFor={FIELD_IDS.pricingModel} className="mb-1 block text-sm font-medium text-slate-800">
              Pricing model <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <select
              id={FIELD_IDS.pricingModel}
              name="pricingModel"
              value={form.pricingModel}
              onChange={(e) => setField('pricingModel', e.target.value)}
              aria-invalid={invalidFields.has('pricingModel')}
              aria-describedby={controlDescribedBy(FIELD_IDS.pricingModel, 'pricingModel')}
              className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('pricingModel')}`}
            >
              <option value="">—</option>
              {PRICING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.pricingModel}-error`}
              message={fieldMessages.get('pricingModel')}
            />
          </div>
        </FieldWithSource>

        <FieldWithSource
          fieldName="geographicFocus"
          label="Geographic focus"
          sourceValue={fieldSources.geographicFocus ?? ''}
          onSourceChange={onFieldSourceChange}
          onSourceBlur={onFieldSourceBlur}
          sourceError={sourceErrors.geographicFocus}
        >
          <div className="max-w-xs">
            <label
              htmlFor={FIELD_IDS.geographicFocus}
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Geographic focus <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <select
              id={FIELD_IDS.geographicFocus}
              name="geographicFocus"
              value={form.geographicFocus}
              onChange={(e) => setField('geographicFocus', e.target.value)}
              aria-invalid={invalidFields.has('geographicFocus')}
              aria-describedby={controlDescribedBy(FIELD_IDS.geographicFocus, 'geographicFocus')}
              className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('geographicFocus')}`}
            >
              <option value="">—</option>
              {SYSTEM_GEOGRAPHIC_FOCUS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <FieldInlineError
              id={`${FIELD_IDS.geographicFocus}-error`}
              message={fieldMessages.get('geographicFocus')}
            />
          </div>
        </FieldWithSource>

        <div className="w-full max-w-none">
          <label
            htmlFor={FIELD_IDS.description}
            className="mb-1 block text-sm font-medium text-slate-800"
          >
            Description <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <p id={`${FIELD_IDS.description}-hint`} className="mt-1 text-sm text-slate-600">
            Include typical audience size and sector specialisation.
          </p>
          <textarea
            id={FIELD_IDS.description}
            name="description"
            rows={4}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            aria-invalid={invalidFields.has('description')}
            aria-describedby={controlDescribedBy(
              FIELD_IDS.description,
              'description',
              `${FIELD_IDS.description}-hint`,
            )}
            className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('description')}`}
          />
          <FieldInlineError
            id={`${FIELD_IDS.description}-error`}
            message={fieldMessages.get('description')}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Capabilities</h2>
          {CAPABILITY_ROWS.map(({ key, label }) => {
            const fid = FIELD_IDS[key]
            return (
              <FieldWithSource
                key={fid}
                fieldName={key}
                label={label}
                sourceValue={fieldSources[key] ?? ''}
                onSourceChange={onFieldSourceChange}
                onSourceBlur={onFieldSourceBlur}
                sourceError={sourceErrors[key]}
              >
                <div className="max-w-xs">
                  <label htmlFor={fid} className="mb-1 block text-sm font-medium text-slate-800">
                    {label}
                  </label>
                  <select
                    id={fid}
                    name={key}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    aria-invalid={invalidFields.has(key)}
                    aria-describedby={controlDescribedBy(fid, key)}
                    className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError(key)}`}
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                  <FieldInlineError id={`${fid}-error`} message={fieldMessages.get(key)} />
                </div>
              </FieldWithSource>
            )
          })}
        </div>

        <div className="w-full max-w-none">
          <label
            htmlFor={FIELD_IDS.sourceReference}
            className="mb-1 block text-sm font-medium text-slate-800"
          >
            General source <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <p id={`${FIELD_IDS.sourceReference}-hint`} className="mt-1 text-sm text-slate-600">
            URL or citation for this record.
          </p>
          <input
            id={FIELD_IDS.sourceReference}
            name="sourceReference"
            type="text"
            value={form.sourceReference}
            onChange={(e) => setField('sourceReference', e.target.value)}
            aria-invalid={invalidFields.has('sourceReference')}
            aria-describedby={controlDescribedBy(
              FIELD_IDS.sourceReference,
              'sourceReference',
              `${FIELD_IDS.sourceReference}-hint`,
            )}
            className={`mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${inputError('sourceReference')}`}
          />
          <FieldInlineError
            id={`${FIELD_IDS.sourceReference}-error`}
            message={fieldMessages.get('sourceReference')}
          />
        </div>

        <div className="w-full max-w-none space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Custom attributes</h2>
          <CustomAttributeEditor
            value={customAttributes}
            onChange={onCustomAttributesChange}
            onValidationChange={setCustomAttributesInvalid}
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending || hasSourceUrlErrors || customAttributesInvalid}
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

function SystemCreateForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialFormState)
  const [fieldSources, setFieldSources] = useState({})
  const [customAttributes, setCustomAttributes] = useState(
    /** @type {{ _key: string; label: string; value: string; sourceReference: string }[]} */ ([]),
  )
  const [sourceErrors, setSourceErrors] = useState({})
  const [summaryErrors, setSummaryErrors] = useState([])
  const [submitError, setSubmitError] = useState(null)
  const mutation = useCreateSystem()

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

  const handleSubmit = (e) => {
    e.preventDefault()
    setSummaryErrors([])
    setSubmitError(null)

    const clientErrs = validateClient(form)
    if (clientErrs.length > 0) {
      setSummaryErrors(clientErrs)
      return
    }

    /** @type {Record<string, string>} */
    const blurErrs = {}
    for (const [k, v] of Object.entries(fieldSources)) {
      if (!isValidSourceUrl(v)) blurErrs[k] = SOURCE_URL_CLIENT_ERROR
    }
    if (Object.keys(blurErrs).length > 0) {
      setSourceErrors((prev) => ({ ...prev, ...blurErrs }))
      return
    }

    const body = buildSubmitBody(form, fieldSources, customAttributes)

    mutation.mutate(body, {
      onSuccess: (data) => {
        navigate(`/systems/${data.id}`, {
          state: { systemSaved: true, systemSaveKind: 'create' },
        })
      },
      onError: (err) => {
        if (Array.isArray(err.fields) && err.fields.length > 0) {
          setSubmitError(null)
          const { summary, sourceErrors: se } = mapServerFieldErrorsToSummaryAndSources(
            err.fields,
            mapServerFieldsToSummary,
          )
          setSourceErrors(se)
          setSummaryErrors(summary)
        } else {
          setSubmitError(err?.message ?? 'Could not save the system. Try again.')
        }
      },
    })
  }

  return (
    <SystemFormBody
      backLink={
        <Link to="/systems" className="mb-6 inline-block text-sm text-blue-600">
          ← Back to systems
        </Link>
      }
      title="Add system"
      form={form}
      setField={setField}
      fieldSources={fieldSources}
      onFieldSourceChange={onFieldSourceChange}
      onFieldSourceBlur={onFieldSourceBlur}
      sourceErrors={sourceErrors}
      summaryErrors={summaryErrors}
      submitError={submitError}
      mutation={mutation}
      onSubmit={handleSubmit}
      customAttributes={customAttributes}
      onCustomAttributesChange={setCustomAttributes}
    />
  )
}

/** @param {{ id: string | undefined }} props */
function SystemEditForm({ id }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialFormState)
  const [fieldSources, setFieldSources] = useState({})
  const [customAttributes, setCustomAttributes] = useState(
    /** @type {{ _key: string; label: string; value: string; sourceReference: string }[]} */ ([]),
  )
  const [sourceErrors, setSourceErrors] = useState({})
  const [summaryErrors, setSummaryErrors] = useState([])
  const [submitError, setSubmitError] = useState(null)

  const {
    data: envelope,
    isLoading,
    isError,
    error,
    isSuccess,
  } = useSystem(id)
  const mutation = useUpdateSystem(id)

  const systemDto = envelope?.data
  const notFound = error instanceof SystemNotFoundError
  const missingId = !id
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!systemDto || hydratedRef.current) return
    hydratedRef.current = true
    startTransition(() => {
      setForm(dtoToFormState(systemDto))
      setFieldSources(normaliseFieldSourcesFromDto(systemDto.fieldSources))
      setCustomAttributes(dtoToCustomAttributeRows(systemDto))
      setSourceErrors({})
    })
  }, [systemDto])

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

    /** @type {Record<string, string>} */
    const blurErrs = {}
    for (const [k, v] of Object.entries(fieldSources)) {
      if (!isValidSourceUrl(v)) blurErrs[k] = SOURCE_URL_CLIENT_ERROR
    }
    if (Object.keys(blurErrs).length > 0) {
      setSourceErrors((prev) => ({ ...prev, ...blurErrs }))
      return
    }

    const body = buildSubmitBody(form, fieldSources, customAttributes)

    mutation.mutate(body, {
      onSuccess: () => {
        navigate(`/systems/${id}`, {
          state: { systemSaved: true, systemSaveKind: 'edit' },
        })
      },
      onError: (err) => {
        if (Array.isArray(err.fields) && err.fields.length > 0) {
          setSubmitError(null)
          const { summary, sourceErrors: se } = mapServerFieldErrorsToSummaryAndSources(
            err.fields,
            mapServerFieldsToSummary,
          )
          setSourceErrors(se)
          setSummaryErrors(summary)
        } else {
          setSubmitError(err?.message ?? 'Could not save the system. Try again.')
        }
      },
    })
  }

  if (missingId) {
    return (
      <div className="py-8">
        <Link to="/systems" className="mb-4 inline-block text-sm text-blue-600">
          ← Back to systems
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">System not found</h1>
          <p className="mt-2 text-sm text-slate-600">This page needs a valid system link.</p>
        </div>
      </div>
    )
  }

  if (isLoading && !systemDto) {
    return (
      <div className="py-8">
        <Link to={`/systems/${id}`} className="mb-6 inline-block text-sm text-blue-600">
          ← Back to system detail
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Edit system</h1>
        <p className="mt-4 text-sm text-slate-600">Loading system…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="py-8">
        <Link to="/systems" className="mb-4 inline-block text-sm text-blue-600">
          ← Back to systems
        </Link>
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
            Back to systems
          </Link>
        </div>
      </div>
    )
  }

  if (isError && !notFound) {
    return (
      <div className="py-8">
        <Link to={`/systems/${id}`} className="mb-4 inline-block text-sm text-blue-600">
          ← Back to system detail
        </Link>
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm">
            {error instanceof Error ? error.message : 'Unable to load this system.'}
          </p>
        </div>
      </div>
    )
  }

  if (!isSuccess || !systemDto) {
    return null
  }

  return (
    <SystemFormBody
      backLink={
        <Link to={`/systems/${id}`} className="mb-6 inline-block text-sm text-blue-600">
          ← Back to {systemDto?.name ?? 'system'}
        </Link>
      }
      title="Edit system"
      form={form}
      setField={setField}
      fieldSources={fieldSources}
      onFieldSourceChange={onFieldSourceChange}
      onFieldSourceBlur={onFieldSourceBlur}
      sourceErrors={sourceErrors}
      summaryErrors={summaryErrors}
      submitError={submitError}
      mutation={mutation}
      onSubmit={handleSubmit}
      customAttributes={customAttributes}
      onCustomAttributesChange={setCustomAttributes}
    />
  )
}

export default function SystemFormPage() {
  const editMatch = useMatch({ path: '/systems/:id/edit', end: true })
  const { id } = useParams()
  if (editMatch) {
    return <SystemEditForm key={id ?? 'edit'} id={id} />
  }
  return <SystemCreateForm />
}
