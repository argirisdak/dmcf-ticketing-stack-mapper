/**
 * @param {{
 *   fieldName: string
 *   label: string
 *   children: import('react').ReactNode
 *   sourceValue: string
 *   onSourceChange: (fieldName: string, newValue: string) => void
 *   sourceError?: string
 *   onSourceBlur?: (fieldName: string, value: string) => void
 * }} props
 */
export default function FieldWithSource({
  fieldName,
  label,
  children,
  sourceValue,
  onSourceChange,
  sourceError,
  onSourceBlur,
}) {
  const showError = Boolean(sourceError)

  return (
    <div className="space-y-2">
      {children}
      <div className="max-w-md">
        <label
          htmlFor={`field-src-${fieldName}`}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Source URL <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id={`field-src-${fieldName}`}
          type="text"
          value={sourceValue}
          onChange={(e) => onSourceChange(fieldName, e.target.value)}
          onBlur={onSourceBlur ? (e) => onSourceBlur(fieldName, e.target.value) : undefined}
          placeholder="Source URL (optional)"
          aria-label={`Source URL for ${label}`}
          aria-invalid={showError}
          aria-describedby={showError ? `field-src-${fieldName}-error` : undefined}
          className={`w-full max-w-md rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            showError ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'
          }`}
        />
        {showError ? (
          <p id={`field-src-${fieldName}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {sourceError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
