import { Check, Minus, X } from 'lucide-react'

/** @typedef {'YES' | 'NO' | 'UNKNOWN'} CapabilityValue */

function normaliseCapability(value) {
  if (value == null || value === '') return 'UNKNOWN'
  const u = String(value).toUpperCase()
  if (u === 'YES' || u === 'NO' || u === 'UNKNOWN') return u
  return 'UNKNOWN'
}

const LABELS = { YES: 'Yes', NO: 'No', UNKNOWN: 'Not recorded' }

/**
 * @param {{
 *   value: CapabilityValue | string | null | undefined
 *   variant?: 'compact' | 'labelled'
 * }} props
 */
export function CapabilityBadge({ value, variant = 'compact' }) {
  const v = normaliseCapability(value)
  const label = LABELS[v]

  if (variant === 'labelled') {
    if (v === 'YES') {
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-700" aria-label={label}>
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="text-sm font-medium">{label}</span>
        </span>
      )
    }
    if (v === 'NO') {
      return (
        <span className="inline-flex items-center gap-1.5 text-slate-600" aria-label={label}>
          <X className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="text-sm font-medium">{label}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400" aria-label={label}>
        <Minus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
        <span className="text-sm font-medium">{label}</span>
      </span>
    )
  }

  if (v === 'YES') {
    return (
      <span className="inline-flex text-emerald-600" aria-label={label} title={label}>
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  if (v === 'NO') {
    return (
      <span className="inline-flex text-slate-500" aria-label={label} title={label}>
        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  return (
    <span className="inline-flex text-slate-300" aria-label={label} title={label}>
      <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </span>
  )
}
