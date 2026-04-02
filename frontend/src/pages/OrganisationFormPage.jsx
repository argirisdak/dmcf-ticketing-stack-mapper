// OrganisationFormPage handles both create (/organisations/new) and edit (/organisations/:id/edit).
// The mode is determined in Epic 2 by the presence of the :id route param via useParams().
export default function OrganisationFormPage() {
  return (
    <div className="py-8">
      <p className="text-sm text-blue-600 mb-4">← Back to organisations</p>
      <h1 className="text-2xl font-semibold text-slate-800">Organisation Form</h1>
      <p className="mt-2 text-slate-500">Create / edit form — implemented in Epic 2.</p>
    </div>
  )
}
