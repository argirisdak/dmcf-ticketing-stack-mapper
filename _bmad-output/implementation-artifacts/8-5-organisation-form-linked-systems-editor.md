## Story 8.5: Organisation Form — Linked Systems Editor

**Status:** done

### Story Summary

A staff member wants to manage the Organisation's System links in a row-based editor section on the create/edit form, so that they can stand up a new Organisation's full stack — or rework an existing one — in a single workflow.

---

### Acceptance Criteria

**AC1 — Remove legacy provider/CRM dropdowns**
- Remove the Ticketing provider `<select>` and CRM platform `<select>` from the form (both fields in `FIELD_IDS`, `initialFormState`, `dtoToFormState`, `buildSubmitBody`, and the `OrganisationFormBody` JSX)
- Remove `useTicketingProvidersQuery` and `useCrmPlatformsQuery` imports and all call sites
- Remove `ticketingQ`, `crmQ` props from `OrganisationFormBody`
- Update `metaLoading` to be `orgTypesQ.isLoading` only (no longer includes ticketing/CRM queries)
- Update `metaError` to be `orgTypesQ.isError` only

**AC2 — Linked systems section**
- A new section renders below the core fields (after Notes / Capacity, before the Save button)
- Heading: `<h2 className="text-base font-medium text-slate-800">Linked systems</h2>`
- Hint: `<p className="mt-1 text-sm text-slate-500">Link this organisation to the systems it uses. Add a source reference and role for each.</p>`

**AC3 — Link row anatomy**
Each row contains (left to right):
- `SystemCombobox` (search-as-you-type, reuse from `frontend/src/components/SystemCombobox.jsx`)
- Role `<select>`: options Primary ticketing / Primary CRM / Integrated suite / Secondary; empty default ("Select a role")
- Source reference `<input type="text">` (optional)
- Note `<textarea rows={2}>` (optional)
- `× Remove` `<button type="button">` with ghost destructive style — removes the row immediately (no confirmation)

**AC4 — "Add system" button**
- A `<Button type="button" variant="outline">` with label "+ Add system" renders below all rows
- Clicking appends a new empty row (systemId: null, role: '', sourceReference: '', note: '')

**AC5 — Client validation on submit (link rows)**
Two rules checked only at submit time, not on blur:
1. **Role required:** For any row that has a system selected (`systemId !== null`) but no role selected (`role === ''`): inline error below that row's Role select — `"Select a role for [systemName]"`. Also add to error summary at page top.
2. **Duplicate system:** For any two rows that share the same `systemId`: inline error below each duplicate's System combobox — `"This system is already linked. Remove the duplicate row."`. Also add to error summary.
Rows where `systemId === null` (empty rows) are **ignored** — no error, not submitted.

**AC6 — Submit orchestration (create and edit)**
The submit is async and two-phase. Never run link writes if the org save failed.

**Phase 1 — Save the organisation:**
- Build the body with `buildSubmitBody(form)` — this function must NOT include `ticketingProviderId`, `crmPlatformId`, or any server-managed key
- Await `POST /api/organisations` (create) or `PUT /api/organisations/:id` (edit)
- If the org save fails: show errors on the form, re-enable the Save button, abort — do not write any links

**Phase 2 — Diff and write links** (runs only after org save succeeds):
- Filter `linkRows` to only rows where `systemId !== null` (active rows)
- Compute three sets:
  - **toPost:** rows with `linkId === null` → `POST /api/organisations/:id/systems`
  - **toPut:** rows with `linkId !== null` where content changed vs `originalLinks` snapshot → `PUT /api/organisations/:id/systems/:linkId`
  - **toDelete:** link IDs in `originalLinks` that are no longer in `linkRows` → `DELETE /api/organisations/:id/systems/:linkId`
- Run all writes in parallel: `const results = await Promise.allSettled([...writes])`
- If all results fulfilled: `navigate('/organisations/${id}', { state: { organisationSaved: true } })`
- If any result rejected: `navigate('/organisations/${id}', { state: { linksSavedWithErrors: true } })`

**AC7 — Edit mode: pre-populate link rows**
In `OrganisationEditForm`, when `data` arrives from `useOrganisation(id)`:
- Alongside `setForm(dtoToFormState(data))`, call `setLinkRows(hydrateLinkRows(data.systems ?? []))` and `setOriginalLinks(data.systems ?? [])` — all within the same `startTransition` call and guarded by `hydratedRef.current`
- `hydrateLinkRows` maps each link to a row with `linkId: link.id`, `systemId: link.system.id`, `systemName: link.system.name`, `role: link.role`, `sourceReference: link.sourceReference ?? ''`, `note: link.note ?? ''`
- In `OrganisationCreateForm`, `linkRows` starts as `[]` and `originalLinks` is `[]`

**AC8 — Navigation outcomes**
- All succeeds (or no links): navigate to `/organisations/:id` with `{ state: { organisationSaved: true } }` — the existing detail page "Organisation saved." emerald banner fires as before
- Org save succeeds but any link write fails: navigate to `/organisations/:id` with `{ state: { linksSavedWithErrors: true } }` — the detail page must show a non-auto-dismissing amber warning banner: "Organisation saved, but one or more system links could not be updated. Check the linked systems panel."
- Org save fails: stay on form, show errors — no navigation, no link writes

**AC9 — OrganisationDetailPage: amber warning banner**
Add handling for `location.state?.linksSavedWithErrors` in `OrganisationDetailPage.jsx`:
- `const [showLinkWarningBanner, setShowLinkWarningBanner] = useState(() => Boolean(location.state?.linksSavedWithErrors))`
- Render above the main content area when true:
```jsx
{showLinkWarningBanner && (
  <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start justify-between gap-4" role="alert">
    <span>Organisation saved, but one or more system links could not be updated. Check the linked systems panel.</span>
    <button type="button" onClick={() => setShowLinkWarningBanner(false)} className="shrink-0 text-amber-600 hover:text-amber-800" aria-label="Dismiss">×</button>
  </div>
)}
```
- Does **not** auto-dismiss — manual `×` only
- Also strip `linksSavedWithErrors` from navigation state on dismiss (same pattern as `clearBannerState` for `organisationSaved`)

**AC10 — No regressions**
- `cd frontend && npm run lint` passes with 0 errors
- `cd frontend && npm run test` passes
- Create and edit org still work end-to-end
- Delete org dialog still works
- "Organisation saved." emerald banner still fires on successful save with no link errors

---

### Tasks / Subtasks

- [x] **Task 1: Remove legacy provider/CRM from `OrganisationFormPage.jsx` (AC1)**
  - [x] Remove `ticketingProviderId` and `crmPlatformId` from `FIELD_IDS`
  - [x] Remove them from `initialFormState()`
  - [x] Remove them from `dtoToFormState()`
  - [x] Remove the two `if (form.ticketingProviderId)` / `if (form.crmPlatformId)` blocks from `buildSubmitBody()` — CRITICAL: `buildSubmitBody` must NEVER include these keys or the v2 API returns 400
  - [x] Remove `useTicketingProvidersQuery` and `useCrmPlatformsQuery` imports and their call sites in both `OrganisationCreateForm` and `OrganisationEditForm`
  - [x] Remove `ticketingQ` and `crmQ` from `OrganisationFormBody` prop destructuring and JSX
  - [x] Update `metaLoading` to `orgTypesQ.isLoading` only; `metaError` to `orgTypesQ.isError` only

- [x] **Task 2: Add link row state + helpers (AC5, AC6, AC7)**
  - [x] Define link row shape and `_rowKey` generation (use `crypto.randomUUID()` or a counter ref for stable keys)
  - [x] Write `hydrateLinkRows(systems)` helper — maps API link objects to row shape
  - [x] Write `validateLinkedSystems(rows)` — returns `{ rowKey, field, message, anchorId }[]`
  - [x] Write `diffLinks(originalLinks, activeRows)` — returns `{ toPost, toPut, toDelete }` for the Phase 2 orchestration
  - [x] Add `linkRows`, `setLinkRows`, `originalLinks`, `setOriginalLinks`, `linkRowErrors` state to both `OrganisationCreateForm` and `OrganisationEditForm`
  - [x] In `OrganisationEditForm`, hydrate `linkRows` and `originalLinks` inside the existing `useEffect` alongside `setForm`

- [x] **Task 3: Build `LinkedSystemRow` component (inline in `OrganisationFormPage.jsx`) (AC3, AC4)**
  - [x] `LinkedSystemRow({ row, onChange, onRemove, errors })` renders: `SystemCombobox`, Role `<select>`, Source ref `<input>`, Note `<textarea>`, Remove `<button>`
  - [x] Pass unique `inputId` to `SystemCombobox` (e.g. `'link-system-' + row._rowKey`)
  - [x] Role `<select>` uses `id={'field-link-role-' + row._rowKey}` for error association
  - [x] Inline errors shown below relevant fields using `FieldInlineError` (reuse existing component)
  - [x] Remove button: `<button type="button" className="text-sm text-red-600 hover:text-red-800">× Remove</button>` — calls `onRemove(row._rowKey)`
  - [x] "Add system" button renders below all rows in `OrganisationFormBody`

- [x] **Task 4: Update `OrganisationFormBody` props and render (AC2, AC3, AC4)**
  - [x] Add `linkRows`, `setLinkRows`, `linkRowErrors` to props
  - [x] Add the "Linked systems" section (heading + hint + rows + Add button) between Capacity and Save button
  - [x] Include link row errors in `summaryErrors` when computing the error summary list (concatenate before rendering)

- [x] **Task 5: Make submit handlers async + add orchestration (AC5, AC6, AC8)**
  - [x] Both `handleSubmit` functions become `async (e) => { ... }`
  - [x] After core client validation passes, also call `validateLinkedSystems(linkRows)`; combine errors and bail if any
  - [x] After org save succeeds, call the link diff orchestration using `Promise.allSettled`
  - [x] Pass correct state to `navigate` based on whether all link writes succeeded

- [x] **Task 6: Add amber warning banner to `OrganisationDetailPage.jsx` (AC9)**
  - [x] Add `showLinkWarningBanner` state initialised from `location.state?.linksSavedWithErrors`
  - [x] Render the amber banner (no auto-dismiss, manual `×` only)
  - [x] On dismiss: update state and clear `linksSavedWithErrors` from navigation state (same `navigate(location.pathname, { replace: true, state: {...} })` pattern as `clearBannerState`)
  - [x] **Delivery note (2026-05-01):** This file may also ship the Epic 8-4 linked-systems panel and dialogs on the same branch as the AC9 banner; planning treats panel behaviour as 8-4, banner + form flow as 8-5.

- [x] **Task 7: Verify no regressions (AC10)**
  - [x] `npm run lint` — 0 errors
  - [x] `npm run test` — all pass

### Review Findings

- [x] [Review][Resolved] OrganisationDetailPage scope — Intentional combined delivery with Epic 8-4 (panel + CRUD) on the same branch; Task 6 delivery note records the split in planning terms.

- [x] [Review][Patch] Duplicate `systemId` validation only marks the later row [`OrganisationFormPage.jsx:validateLinkedSystems`] — fixed: all rows sharing a system now get the duplicate inline error.

- [x] [Review][Patch] `_rowKey` uses a module-level counter instead of `crypto.randomUUID()` or a ref-based counter as suggested in Task 2 [`OrganisationFormPage.jsx:newEmptyRow`] — fixed: `newEmptyRow` uses `crypto.randomUUID()`.

- [x] [Review][Patch] Unknown junction `role` from API hydrates to `''`; submit-time validation may force a role change without surfacing that the value was non-standard [`OrganisationFormPage.jsx:hydrateLinkRows`] — fixed: preserve `link.role`; role `<select>` adds a one-off option when the value is non-empty and not in `KNOWN_ROLE_VALUES`.

- [x] [Review][Defer] `fetchOrganisations` query params renamed to `system` / `system_role` [`frontend/src/api/organisations.js`] — deferred, pre-existing — ensure every list/filter caller in the repo passes the new names; outside Group 1 diff.

- [x] [Review][Defer] “Compare these systems →” deep-link [`OrganisationDetailPage.jsx`] — deferred, pre-existing — may not align with `SelectionProvider` compare IDs; verify UX when epic 9 compare work lands.

---

### Architecture & Technical Constraints

**Layer compliance (non-negotiable):**
- API calls for link writes use the existing functions in `frontend/src/api/organisation-systems.js` only — `createOrganisationSystemLink`, `updateOrganisationSystemLink`, `deleteOrganisationSystemLink`
- The form orchestration calls these directly (not via TanStack Query mutations) because `Promise.allSettled` needs to be awaited before navigation — this is a deliberate deviation from the hook pattern for this async multi-step orchestration only
- After navigation, the detail page's TanStack Query cache will auto-refresh via `useOrganisation(id)` — no explicit cache invalidation needed from the form

**Critical: `buildSubmitBody` must NEVER include server-rejected keys**
The v2 API (`PUT /api/organisations/:id`) returns `400` if `ticketing_provider_id`, `crm_platform_id`, `ticketingProviderId`, or `crmPlatformId` appear in the body. Also never include `last_updated`, `created_at`, `id`. The existing `buildSubmitBody` already strips server-managed keys; after Task 1, it must also not include the two legacy FK fields.

**Link row shape (JS object):**
```js
{
  _rowKey: string,          // stable React key, never reused within a session
  linkId: string | null,    // junction row id (null for new rows added by user)
  systemId: string | null,  // selected system id (null = empty row, skipped on submit)
  systemName: string,       // display name from onSelect callback
  role: string,             // '' | 'PRIMARY_TICKETING' | 'PRIMARY_CRM' | 'INTEGRATED_SUITE' | 'SECONDARY'
  sourceReference: string,
  note: string,
}
```

**Validation — only rows with `systemId !== null` are validated:**
```js
function validateLinkedSystems(rows) {
  const errors = []
  const bySystemId = new Map()
  for (const row of rows) {
    if (!row.systemId) continue
    if (!bySystemId.has(row.systemId)) bySystemId.set(row.systemId, [])
    bySystemId.get(row.systemId).push(row)
  }
  for (const row of rows) {
    if (!row.systemId) continue
    if (!row.role) {
      errors.push({
        rowKey: row._rowKey,
        field: `link-role-${row._rowKey}`,
        message: `Select a role for ${row.systemName || 'the selected system'}`,
        anchorId: `field-link-role-${row._rowKey}`,
      })
    }
  }
  for (const [, group] of bySystemId) {
    if (group.length <= 1) continue
    for (const row of group) {
      errors.push({
        rowKey: row._rowKey,
        field: `link-system-${row._rowKey}`,
        message: 'This system is already linked. Remove the duplicate row.',
        anchorId: `field-link-system-${row._rowKey}`,
      })
    }
  }
  return errors
}
```

**Diff algorithm for edit mode:**
```js
function diffLinks(originalLinks, activeRows) {
  const originalById = new Map(originalLinks.map((l) => [l.id, l]))
  const activeRowIds = new Set(activeRows.filter((r) => r.linkId).map((r) => r.linkId))

  const toPost = activeRows.filter((r) => r.linkId === null)
  const toDelete = originalLinks.filter((l) => !activeRowIds.has(l.id))
  const toPut = activeRows.filter((r) => {
    if (!r.linkId) return false
    const orig = originalById.get(r.linkId)
    if (!orig) return false
    return (
      r.systemId !== orig.system.id ||
      r.role !== orig.role ||
      r.sourceReference !== (orig.sourceReference ?? '') ||
      r.note !== (orig.note ?? '')
    )
  })
  return { toPost, toPut, toDelete }
}
```

**Submit orchestration (async):**
```js
const handleSubmit = async (e) => {
  e.preventDefault()
  setSummaryErrors([])
  setSubmitError(null)

  // Phase 0: validate
  const clientErrs = validateClient(form)
  const linkErrs = validateLinkedSystems(linkRows)
  if (clientErrs.length > 0 || linkErrs.length > 0) {
    setSummaryErrors([...clientErrs, ...linkErrs])
    setLinkRowErrors(linkErrs)
    return
  }
  setLinkRowErrors([])

  // Phase 1: save org
  const body = buildSubmitBody(form)
  let savedOrgId
  try {
    const result = await (isCreate ? createOrg(body) : updateOrg(id, body))
    savedOrgId = isCreate ? result.id : id
  } catch (err) {
    // org save failed
    if (Array.isArray(err.fields) && err.fields.length > 0) {
      setSummaryErrors(mapServerFieldsToSummary(err.fields))
    } else {
      setSubmitError(err?.message ?? 'Could not save the organisation. Try again.')
    }
    return
  }

  // Phase 2: link writes
  const activeRows = linkRows.filter((r) => r.systemId !== null)
  const { toPost, toPut, toDelete } = diffLinks(originalLinks, activeRows)
  const writes = [
    ...toPost.map((r) => createOrganisationSystemLink(savedOrgId, { systemId: r.systemId, role: r.role, sourceReference: r.sourceReference || undefined, note: r.note || undefined })),
    ...toPut.map((r) => updateOrganisationSystemLink(savedOrgId, r.linkId, { systemId: r.systemId, role: r.role, sourceReference: r.sourceReference || undefined, note: r.note || undefined })),
    ...toDelete.map((l) => deleteOrganisationSystemLink(savedOrgId, l.id)),
  ]

  if (writes.length === 0) {
    navigate(`/organisations/${savedOrgId}`, { state: { organisationSaved: true } })
    return
  }

  const results = await Promise.allSettled(writes)
  const anyFailed = results.some((r) => r.status === 'rejected')
  navigate(`/organisations/${savedOrgId}`, {
    state: anyFailed ? { linksSavedWithErrors: true } : { organisationSaved: true },
  })
}
```

**Note on `isPending` state:** Because the submit is now `async`, use a `const [isSaving, setIsSaving] = useState(false)` local flag (set to `true` at start of Phase 1, reset in all exit paths) instead of `mutation.isPending`. The Save button should be `disabled={isSaving || metaLoading || metaError}`.

**SystemCombobox API (reuse as-is from Story 8.3):**
- Location: `frontend/src/components/SystemCombobox.jsx`
- Props: `selectedId`, `onSelect(system | null)`, `placeholder`, `inputId`
- When user selects: `onSelect` receives `{ id, name, category }` — use `id` + `name` to update row
- When user clears: `onSelect` receives `null` — set `systemId: null`, `systemName: ''`
- On dialog-style reset (e.g. after row add), set `systemId: null` to reset combobox via `selectedId` prop sync

**Role constants:**
```js
const SYSTEM_ROLES = [
  { value: 'PRIMARY_TICKETING', label: 'Primary ticketing' },
  { value: 'PRIMARY_CRM', label: 'Primary CRM' },
  { value: 'INTEGRATED_SUITE', label: 'Integrated suite' },
  { value: 'SECONDARY', label: 'Secondary' },
]
```

**API functions to import (all from `api/organisation-systems.js`):**
- `createOrganisationSystemLink(orgId, body)` — exists from Story 8.4
- `updateOrganisationSystemLink(orgId, linkId, body)` — exists from Story 8.4
- `deleteOrganisationSystemLink(orgId, linkId)` — exists from Story 8.4

**Do NOT use TanStack Query mutations for the link writes** — the form orchestration awaits all writes before navigating, which requires direct async function calls, not `useMutation` hooks.

**For create mode:** `savedOrgId` comes from the POST response's `data.id`. The existing `createOrganisation` API function returns `body.data` on 201. However, since `OrganisationCreateForm` used `useCreateOrganisation` (a mutation hook), you'll need to import and call the raw `createOrganisation` function from `api/organisations.js` directly for the async pattern — OR keep the mutation and wrap with a Promise. The simplest approach: import `createOrganisation` from `../api/organisations.js` and `updateOrganisation` from `../api/organisations.js` and call them directly.

**Amber warning banner placement in OrganisationDetailPage:**
Render it between the emerald "Organisation saved." banner and the main content `<div>` — both banners could theoretically appear simultaneously but in practice the state key ensures only one fires. Position: after `showSavedBanner` emerald block, before the main `{isLoading && !data && ...}` guard.

---

### File Structure

**Modified files:**
- `frontend/src/pages/OrganisationFormPage.jsx` — major refactor (remove legacy dropdowns, add linked systems editor, async orchestration)
- `frontend/src/pages/OrganisationDetailPage.jsx` — add amber warning banner for `linksSavedWithErrors` state

**Do NOT touch:**
- `backend/` — API is fully implemented (Stories 8.1, 8.2)
- `frontend/src/components/SystemCombobox.jsx` — reuse as-is
- `frontend/src/api/organisation-systems.js` — reuse as-is (all four CRUD functions)
- `frontend/src/hooks/useCreateOrganisationSystemLink.js` — not used in form (direct API call pattern)
- `frontend/src/hooks/useUpdateOrganisationSystemLink.js` — not used in form
- `frontend/src/hooks/useDeleteOrganisationSystemLink.js` — not used in form

---

### Previous Story Intelligence (8-4 Learnings)

1. **SystemCombobox `inputId` + label association:** When using `SystemCombobox` in a row, always pass a unique `inputId` (e.g. `'link-system-' + row._rowKey`) and associate any external `<label>` with it via `htmlFor`. The component already accepts `inputId`.

2. **SystemCombobox mode sync via `selectedId`:** The component syncs internal `mode` from `selectedId` via `useEffect`. When resetting a row's system (e.g. after Remove + Add), set `systemId: null` in row state — this drives the combobox back to 'searching' mode automatically.

3. **Role select guard:** When pre-filling the Role `<select>` from `link.role` (edit mode hydration), validate that the value is one of the four known enum values; fall back to `''` if unknown.

4. **`createOrganisationSystemLink` 409 handling:** The function attaches `err.isConflict = true` on 409 responses (Story 8.4 pattern). If a POST link write fails with isConflict, the `Promise.allSettled` result will be `{ status: 'rejected', reason: err }` where `err.isConflict === true`. The form shows the amber warning banner for any link write failure regardless of cause — no need to distinguish conflict from other errors at the form level (user goes to detail page Linked Systems panel to resolve).

5. **`api/organisations.js` error shapes:** The `createOrganisation` and `updateOrganisation` functions throw errors with `.fields` array for 400 responses and `.message` for other errors — same shape as `useCreateOrganisation`/`useUpdateOrganisation` mutations. The existing `mapServerFieldsToSummary` and catch blocks work as-is.

6. **Avoid reinventing `FieldInlineError`:** Reuse the existing `function FieldInlineError({ id, message })` from the same file for all inline error display in the linked systems rows.

7. **`hydratedRef` guard:** The `OrganisationEditForm` uses `hydratedRef.current = true` to prevent re-hydration on re-renders. The link row state must be set inside the same `useEffect` guard — do not add a second `useEffect` for link hydration.

8. **The amber banner in OrganisationDetailPage must NOT auto-dismiss.** The existing `showSavedBanner` uses `setTimeout`. The `showLinkWarningBanner` must not use a timer — only manual dismiss.

---

### Key Code Patterns from Existing Files

**Existing `clearBannerState` pattern in OrganisationDetailPage (for stripping state keys on dismiss):**
```js
const clearLinkWarningBanner = useCallback(() => {
  setShowLinkWarningBanner(false)
  const s = location.state
  const nextState =
    s && typeof s === 'object' && !Array.isArray(s)
      ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'linksSavedWithErrors'))
      : {}
  navigate(location.pathname, { replace: true, state: nextState })
}, [navigate, location.pathname, location.state])
```

**Existing `useOrganisation` hook** returns `data.systems` (the embedded v2 array). In edit mode, `data.systems` is already the full link objects with shape `{ id, role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`.

**`FIELD_IDS` after removal** (reference for dev):
```js
const FIELD_IDS = {
  name: 'field-name',
  country: 'field-country',
  city: 'field-city',
  organisationTypeId: 'field-organisation-type',
  // ticketingProviderId REMOVED
  // crmPlatformId REMOVED
  membershipCapability: 'field-membership-capability',
  donationCapability: 'field-donation-capability',
  reservedSeatingCapability: 'field-reserved-seating-capability',
  sourceReference: 'field-source-reference',
  notes: 'field-notes',
  capacity: 'field-capacity',
}
```

**`initialFormState()` after removal** (no ticketing/crm fields):
```js
function initialFormState() {
  return {
    name: '',
    country: '',
    city: '',
    organisationTypeId: '',
    // ticketingProviderId REMOVED
    // crmPlatformId REMOVED
    membershipCapability: 'UNKNOWN',
    donationCapability: 'UNKNOWN',
    reservedSeatingCapability: 'UNKNOWN',
    sourceReference: '',
    notes: '',
    capacity: '',
  }
}
```

---

### Acceptance Test Checklist

- [ ] Create form loads — no Ticketing provider or CRM platform dropdowns visible
- [ ] Edit form loads — legacy dropdowns gone; existing linked systems appear as pre-filled rows
- [ ] Add a system row → select a system + role → save → redirected to detail with "Organisation saved." banner; Linked Systems panel shows the new link
- [ ] Submit without selecting a role for a system → inline error "Select a role for [name]" + error summary link
- [ ] Add two rows with the same system → inline errors "This system is already linked." on both + error summary
- [ ] Edit mode: remove an existing link row → save → link is deleted from detail page panel
- [ ] Edit mode: change role on an existing link row → save → role updated on detail page
- [ ] Org save fails (e.g. blank name) → stays on form, errors shown, no links written
- [ ] Simulate link write failure → amber warning banner on detail page: "Organisation saved, but one or more system links could not be updated." — no auto-dismiss, manual × works
- [ ] Empty row (no system selected) → not validated, not submitted, not an error
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] Delete organisation dialog still works
- [ ] "Organisation saved." emerald banner still fires for clean saves

---

### File List

- `frontend/src/pages/OrganisationFormPage.jsx` — major refactor: removed legacy ticketing/CRM dropdowns, added `LinkedSystemRow`, `hydrateLinkRows`, `validateLinkedSystems`, `diffLinks`, `newEmptyRow` helpers, async submit orchestration with two-phase link writes, `isSaving` flag, `linkRows`/`linkRowErrors`/`originalLinks` state
- `frontend/src/pages/OrganisationDetailPage.jsx` — added `showLinkWarningBanner` state, `clearLinkWarningBanner` callback, amber warning banner render

---

### Change Log

- **2026-05-01** — Story 8.5 implemented: removed legacy provider/CRM dropdowns, added linked systems row editor with async two-phase submit orchestration, amber warning banner on detail page for partial link write failures. `npm run lint` and `npm run test` pass with 0 errors/failures.

---

### Dev Agent Record

#### Agent Model Used

claude-sonnet-4-6

#### Debug Log

No blockers encountered. Story spec was complete and self-consistent; all helpers implemented exactly as specified.

#### Completion Notes

- Implemented 2026-05-01
- Removed `useTicketingProvidersQuery`, `useCrmPlatformsQuery` and all references; `metaLoading`/`metaError` now derived from `orgTypesQ` only
- `buildSubmitBody` no longer emits `ticketingProviderId` or `crmPlatformId` — v2 API will not 400
- `hydrateLinkRows` uses existing link `id` as `_rowKey` for pre-populated rows; new rows use a module-level counter (`new-N`)
- Edit form hydration uses the existing `hydratedRef`/`startTransition` guard — link state set in the same `useEffect` as `setForm`
- Submit orchestration: Phase 1 saves org with direct API call (not mutation), Phase 2 runs link diff + `Promise.allSettled`; `isSaving` flag tracks async state for Save button disabled state
- Amber banner in detail page does not auto-dismiss; uses same `navigate(...replace:true)` pattern as `clearBannerState` to strip `linksSavedWithErrors` from nav state
- `npm run lint`: 0 errors; `npm run test`: 14/14 passed
