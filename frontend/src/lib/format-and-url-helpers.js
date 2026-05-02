/** True if the string is an http(s) URL (same rule as SourceReferenceDisplay). */
export function isHttpOrHttpsUrl(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

/** Relative + absolute updated time for system compare / detail (shared formatting). */
export function formatLastUpdated(iso) {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
    if (!Number.isFinite(date.getTime())) return '—'
    const diffMs = date.getTime() - Date.now()
    const diffSec = Math.round(diffMs / 1000)
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const abs = Math.abs(diffSec)
    let relative
    if (abs < 60) relative = rtf.format(diffSec, 'second')
    else if (abs < 3600) relative = rtf.format(Math.round(diffSec / 60), 'minute')
    else if (abs < 86400) relative = rtf.format(Math.round(diffSec / 3600), 'hour')
    else if (abs < 2592000) relative = rtf.format(Math.round(diffSec / 86400), 'day')
    else if (abs < 31536000) relative = rtf.format(Math.round(diffSec / 2592000), 'month')
    else relative = rtf.format(Math.round(diffSec / 31536000), 'year')
    const absolute = date.toLocaleDateString(undefined, { dateStyle: 'medium' })
    return `${absolute} (${relative})`
  } catch {
    return '—'
  }
}
