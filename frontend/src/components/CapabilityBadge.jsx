import { Check, Minus, X } from 'lucide-react'

/** @typedef {'YES' | 'NO' | 'UNKNOWN'} CapabilityValue */

/**
 * Compact icon-only capability indicator (Story 2.1).
 * @param {{ value: CapabilityValue }} props
 */
export function CapabilityBadge({ value }) {
  if (value === 'YES') {
    return (
      <span className="inline-flex text-emerald-600" aria-label="Yes" title="Yes">
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  if (value === 'NO') {
    return (
      <span className="inline-flex text-slate-500" aria-label="No" title="No">
        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  return (
    <span className="inline-flex text-slate-300" aria-label="Not recorded" title="Not recorded">
      <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </span>
  )
}
