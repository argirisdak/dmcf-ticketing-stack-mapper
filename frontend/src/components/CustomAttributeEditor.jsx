import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button.jsx'
import { customAttributesEditorHasErrors } from '../lib/custom-attributes-form.js'
import { isValidSourceUrl } from '../lib/source-url-validation.js'

/** @typedef {{ _key: string; label: string; value: string; sourceReference: string }} CustomAttribute */

const LABEL_MAX = 200
const VALUE_MAX = 200
const URL_MAX = 500
const LIMITS = { labelMax: LABEL_MAX, valueMax: VALUE_MAX, urlMax: URL_MAX }

const LABEL_COUNTER_THRESHOLD = Math.floor(LABEL_MAX * 0.8)
const VALUE_COUNTER_THRESHOLD = Math.floor(VALUE_MAX * 0.8)
const URL_COUNTER_THRESHOLD = Math.floor(URL_MAX * 0.8)

const URL_SCHEME_ERROR = 'Source URL must start with http:// or https://'

/**
 * @param {{
 *   value: CustomAttribute[]
 *   onChange: (next: CustomAttribute[]) => void
 *   onValidationChange?: (hasErrors: boolean) => void
 * }} props
 */
export default function CustomAttributeEditor({ value = [], onChange, onValidationChange }) {
  const hasErrors = customAttributesEditorHasErrors(value, LIMITS)

  useEffect(() => {
    onValidationChange?.(hasErrors)
  }, [hasErrors, onValidationChange])

  const updateRow = (key, patch) => {
    onChange(value.map((row) => (row._key === key ? { ...row, ...patch } : row)))
  }

  const removeRow = (key) => {
    onChange(value.filter((row) => row._key !== key))
  }

  const addRow = () => {
    onChange([
      ...value,
      { _key: crypto.randomUUID(), label: '', value: '', sourceReference: '' },
    ])
  }

  return (
    <div className="space-y-3">
      {value.map((row) => {
        const labelLen = row.label.length
        const valueLen = row.value.length
        const urlLen = row.sourceReference.length
        const labelOver = labelLen > LABEL_MAX
        const valueOver = valueLen > VALUE_MAX
        const urlOver = urlLen > URL_MAX
        const urlTrimmed = row.sourceReference.trim()
        const urlSchemeInvalid = urlTrimmed !== '' && !isValidSourceUrl(row.sourceReference)
        const showLabelCounter = labelOver || labelLen >= LABEL_COUNTER_THRESHOLD
        const showValueCounter = valueOver || valueLen >= VALUE_COUNTER_THRESHOLD
        const showUrlCounter = urlOver || urlLen >= URL_COUNTER_THRESHOLD

        return (
          <div
            key={row._key}
            className="flex flex-wrap items-end gap-2 border-b border-slate-100 pb-3 last:border-b-0"
          >
            <div className="min-w-[140px] flex-1">
              <label htmlFor={`ca-label-${row._key}`} className="mb-1 block text-xs font-medium text-slate-700">
                Label
              </label>
              <input
                id={`ca-label-${row._key}`}
                type="text"
                maxLength={LABEL_MAX}
                placeholder="e.g. B Corp certified"
                value={row.label}
                onChange={(e) => updateRow(row._key, { label: e.target.value })}
                aria-invalid={labelOver}
                className={`w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  labelOver ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {showLabelCounter && (
                <p className={`mt-0.5 text-xs ${labelOver ? 'text-red-600' : 'text-slate-500'}`}>
                  {labelLen} / {LABEL_MAX}
                </p>
              )}
            </div>
            <div className="min-w-[140px] flex-1">
              <label htmlFor={`ca-value-${row._key}`} className="mb-1 block text-xs font-medium text-slate-700">
                Value
              </label>
              <input
                id={`ca-value-${row._key}`}
                type="text"
                maxLength={VALUE_MAX}
                placeholder="e.g. Yes (since 2024)"
                value={row.value}
                onChange={(e) => updateRow(row._key, { value: e.target.value })}
                aria-invalid={valueOver}
                className={`w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  valueOver ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {showValueCounter && (
                <p className={`mt-0.5 text-xs ${valueOver ? 'text-red-600' : 'text-slate-500'}`}>
                  {valueLen} / {VALUE_MAX}
                </p>
              )}
            </div>
            <div className="min-w-[180px] flex-[2]">
              <label htmlFor={`ca-url-${row._key}`} className="mb-1 block text-xs font-medium text-slate-700">
                Source URL
              </label>
              <input
                id={`ca-url-${row._key}`}
                type="text"
                maxLength={URL_MAX}
                placeholder="Source URL (optional)"
                value={row.sourceReference}
                onChange={(e) => updateRow(row._key, { sourceReference: e.target.value })}
                aria-invalid={urlOver || urlSchemeInvalid}
                aria-describedby={urlSchemeInvalid ? `ca-url-err-${row._key}` : undefined}
                className={`w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  urlOver || urlSchemeInvalid ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {showUrlCounter && (
                <p className={`mt-0.5 text-xs ${urlOver ? 'text-red-600' : 'text-slate-500'}`}>
                  {urlLen} / {URL_MAX}
                </p>
              )}
              {urlSchemeInvalid && (
                <p id={`ca-url-err-${row._key}`} className="mt-0.5 text-xs text-red-600" role="alert">
                  {URL_SCHEME_ERROR}
                </p>
              )}
            </div>
            <div className="ml-auto flex shrink-0 pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-600"
                aria-label="Remove custom attribute"
                onClick={() => removeRow(row._key)}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )
      })}

      <Button type="button" variant="secondary" className="mt-1" onClick={addRow}>
        + Add custom attribute
      </Button>
    </div>
  )
}
