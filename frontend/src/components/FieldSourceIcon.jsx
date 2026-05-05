import { Info } from 'lucide-react'

/**
 * @param {{ url: string | null | undefined, fieldLabel: string }} props
 */
export default function FieldSourceIcon({ url, fieldLabel }) {
  if (url == null || String(url).trim() === '') return null

  const href = String(url)
  const labelText = String(fieldLabel ?? '').trim() || 'field'
  const ariaLabel = `View source for ${labelText}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      aria-label={ariaLabel}
      className="inline-flex shrink-0 text-slate-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm"
    >
      <Info className="size-3.5" aria-hidden />
    </a>
  )
}
