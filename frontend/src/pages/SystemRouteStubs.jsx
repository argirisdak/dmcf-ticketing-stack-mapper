import { Link, useParams } from 'react-router-dom'

/** Story 7.6 — create-system form replaces this stub. */
export function SystemNewStubPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-800">Add system</h1>
      <p className="mt-3 text-slate-600">The create-system form arrives in Story 7.6.</p>
      <Link
        to="/systems"
        className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← Back to systems
      </Link>
    </div>
  )
}

/** Story 7.5 — system detail page replaces this stub. */
export function SystemDetailStubPage() {
  const { id } = useParams()
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-800">System</h1>
      <p className="mt-3 text-sm text-slate-500 font-mono break-all">{id}</p>
      <p className="mt-3 text-slate-600">
        The system detail page arrives in Story 7.5. Use the navigation link below to return to the
        list.
      </p>
      <Link
        to="/systems"
        className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← Back to systems
      </Link>
    </div>
  )
}
