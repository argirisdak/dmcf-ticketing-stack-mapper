import { Link } from 'react-router-dom'

/** Legacy `/compare` (without `/organisations` or `/systems`) — bookmarks should use explicit paths. */
export default function CompareLegacyPathPage() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-semibold text-slate-800">Compare has moved</h1>
      <p className="mt-3 max-w-md mx-auto text-sm text-slate-600">
        Organisation and system compare live at dedicated URLs. Use the links below.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          to="/organisations"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Go to organisations
        </Link>
        <Link
          to="/systems"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Go to systems
        </Link>
      </div>
    </div>
  )
}
