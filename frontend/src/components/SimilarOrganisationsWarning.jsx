import { Link } from 'react-router-dom'
import { Button } from './ui/button.jsx'

/**
 * @param {{
 *   matches: { id: string; name: string; city?: string | null; country?: string }[]
 *   currentName: string
 *   onContinue: () => void
 *   onCancel: () => void
 * }} props
 */
export default function SimilarOrganisationsWarning({ matches, currentName, onContinue, onCancel }) {
  const display = (m) => {
    const city = m.city != null && String(m.city).trim() !== '' ? String(m.city).trim() : null
    const country = m.country != null ? String(m.country) : ''
    const place = city ? `${city}, ${country}` : country || '(no city)'
    return `${m.name} — ${place}`
  }

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-slate-800 shadow-sm"
      aria-live="polite"
    >
      <h2 className="font-semibold text-amber-900">
        ⚠ An organisation with a similar name already exists:
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {matches.slice(0, 5).map((m) => (
          <li key={m.id}>
            <Link
              to={`/organisations/${m.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline hover:text-blue-800"
            >
              {display(m)}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-slate-800">
        Continue creating &quot;{currentName}&quot; anyway?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={onContinue}>
          Continue
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel and amend
        </Button>
      </div>
    </div>
  )
}
