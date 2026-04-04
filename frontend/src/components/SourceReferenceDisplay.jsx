import { cn } from '../lib/utils.js'

/**
 * @param {{ value: string | null | undefined, inheritPlainTextColor?: boolean }} props
 */
export function SourceReferenceDisplay({ value, inheritPlainTextColor = false }) {
  if (value == null || value === '') {
    return <span className="text-slate-500">Not recorded</span>
  }
  const s = String(value)
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return (
      <a
        href={s}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-all"
      >
        {s}
      </a>
    )
  }
  return (
    <span className={cn(!inheritPlainTextColor && 'text-slate-800', 'break-all')}>{s}</span>
  )
}
