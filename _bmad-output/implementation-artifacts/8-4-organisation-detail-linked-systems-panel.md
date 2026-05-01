## Story 8.4: Organisation Detail — Linked Systems Panel

**Status:** done

### Story Summary

A staff member wants the Organisation detail page to surface the Organisation's linked Systems grouped by role, with per-link provenance and the ability to add, edit, and remove links inline — so they can curate the Organisation's stack in the same place they read its facts.

---

### Acceptance Criteria

**AC1 — Remove legacy provider rows**
- Remove "Ticketing provider" and "CRM platform" `<DetailRow>` entries from the Details `<section>` in `OrganisationDetailPage.jsx`
- Remove `data.ticketingProvider` and `data.crmPlatform` references; they are absent from the v2 response

**AC2 — Linked systems panel structure**
- A new `<section>` with heading "Linked systems" renders below the Details section (above Capabilities or as final section)
- Uses `data.systems` (the embedded array already present in the v2 detail response from Story 8.2) — no separate fetch required
- Rows are grouped by `role`; only roles with ≥1 link appear
- Role group heading: `<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">` with humanised label
  - `PRIMARY_TICKETING` → "Primary ticketing"
  - `PRIMARY_CRM` → "Primary CRM"
  - `INTEGRATED_SUITE` → "Integrated suite"
  - `SECONDARY` → "Secondary"
- Role display order: `PRIMARY_TICKETING`, `PRIMARY_CRM`, `INTEGRATED_SUITE`, `SECONDARY`

**AC3 — Link row anatomy**
Each link row within a group shows (left to right):
- System name as `<Link to={'/systems/' + link.system.id} className="font-medium text-blue-600 hover:underline">`
- Vendor: `<span className="text-sm text-slate-500">{link.system.vendor}</span>`
- Source reference: rendered via `<SourceReferenceDisplay value={link.sourceReference} />` (same component used elsewhere in the page); display "—" if null
- Note: truncated to one line, full text in a `title` tooltip — `<span title={link.note} className="max-w-xs truncate text-sm text-slate-600">{link.note || '—'}</span>`
- Last updated: `<span className="text-xs text-slate-500">{formatDateTime(link.lastUpdated)}</span>` using the existing `formatDateTime` helper
- Right-aligned actions: "Edit" (secondary text link / ghost button) and "Remove" (ghost destructive)

**AC4 — Edit link dialog**
- Clicking "Edit" on a link row opens a controlled shadcn/ui `Dialog` (follow exact same controlled pattern as the existing delete dialog in the page: `open` state + `onOpenChange`)
- Dialog pre-fills: `SystemCombobox` with `selectedId={link.system.id}`, Role `<select>` with current role, Source reference `<input>` with current value, Note `<textarea>` with current value
- Dialog actions: "Save" (primary, `bg-blue-600`) and "Cancel"
- Save calls `PUT /api/organisations/:id/systems/:linkId` with only the fields that changed
- On success: close dialog, invalidate `['organisations', id]` via `queryClient.invalidateQueries({ queryKey: ['organisations'] })`; this refreshes the panel from the updated detail response
- Cancel and Escape dismiss without saving

**AC5 — Remove link dialog**
- Clicking "Remove" opens a confirmation `Dialog` (separate controlled state per link — manage via a single `removeLinkId` state in the page)
- Dialog body: "[System name] will be unlinked from [Organisation name]. This cannot be undone."
- Destructive button: "Remove link" `className="bg-red-600 text-white hover:bg-red-700"` — follows pattern of existing delete button
- Secondary button: "Cancel"
- Escape and overlay click dismiss without action (Radix default; do not call `preventDefault`)
- On confirm: calls `DELETE /api/organisations/:id/systems/:linkId`
- On success: close dialog, invalidate `['organisations']`, show 5-second "Link removed." banner above the Linked systems panel (use the same `useState` + `useEffect`/`setTimeout` pattern as `showSavedBanner`)

**AC6 — Add system dialog**
- An "Add system" `<Button variant="secondary">` renders below all role groups
- Clicking opens the same inline dialog with empty/null fields
- On `409 Conflict` from `POST /api/organisations/:id/systems`: surface inline error below the SystemCombobox: `<p className="text-xs text-red-600 mt-1">This system is already linked to this organisation</p>`
- On success: close dialog, invalidate `['organisations']`

**AC7 — Empty state**
- When `data.systems` is an empty array: render `<p>No systems linked yet. <button>Add system →</button></p>` that opens the Add dialog

**AC8 — Compare shortcut**
- When `data.systems.length >= 2`: render a ghost link below all role groups: `<Link to="/compare/organisations" className="text-sm text-slate-500 hover:text-slate-700">Compare these systems →</Link>`
- Story 9.3 will wire up the full compare route; for now the link navigates to `/compare/organisations` without query params — this is intentional and acceptable

**AC9 — No regressions**
- `cd frontend && npm run lint` passes with 0 errors
- `cd frontend && npm run test` passes (all Vitest tests)
- Delete organisation dialog still works
- "Organisation saved." banner still appears on redirect from edit/create

---

### Tasks / Subtasks

**[x] Task 1: Create `frontend/src/api/organisation-systems.js`**

New API module for the junction CRUD endpoints. All four operations, following the same shape as `api/organisations.js`:

```js
const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const base = String(rawBase).replace(/\/$/, '')

export async function fetchOrganisationSystemLinks(orgId) { ... }
// GET /api/organisations/:orgId/systems
// Returns body.data (array of links)

export async function createOrganisationSystemLink(orgId, body) { ... }
// POST /api/organisations/:orgId/systems
// body: { systemId, role, sourceReference?, note? }
// Returns body.data on 201
// Throws with err.status = 409 on conflict (for combobox error handling)

export async function updateOrganisationSystemLink(orgId, linkId, body) { ... }
// PUT /api/organisations/:orgId/systems/:linkId
// body: partial { systemId?, role?, sourceReference?, note? }
// Returns body.data on 200

export async function deleteOrganisationSystemLink(orgId, linkId) { ... }
// DELETE /api/organisations/:orgId/systems/:linkId
// Returns body.data.id on 200
```

For `createOrganisationSystemLink`, when the response is `409`, attach `err.isConflict = true` on the thrown error so the Add dialog can detect it.

**[x] Task 2: Create three mutation hooks**

- `frontend/src/hooks/useCreateOrganisationSystemLink.js`
- `frontend/src/hooks/useUpdateOrganisationSystemLink.js`
- `frontend/src/hooks/useDeleteOrganisationSystemLink.js`

Follow the exact same pattern as `useDeleteOrganisation.js`. Each hook:
- Uses `useMutation` from `@tanstack/react-query`
- `mutationFn` calls the corresponding API function
- Does NOT auto-invalidate inside the hook — invalidation is handled in `onSuccess` callbacks at the call site (same pattern as `useDeleteOrganisation`)

**[x] Task 3: Build the Linked Systems panel in `OrganisationDetailPage.jsx`**

Within the `isSuccess && data` block:

1. Remove the two legacy `<DetailRow>` entries (`ticketingProvider`, `crmPlatform`) from the Details section
2. Add state:
   - `const [linkRemovedBanner, setLinkRemovedBanner] = useState(false)` — for the 5s "Link removed." banner
   - `const [addDialogOpen, setAddDialogOpen] = useState(false)` — for the Add dialog
   - `const [editLink, setEditLink] = useState(null)` — holds the link object being edited (null = closed)
   - `const [removeLinkId, setRemoveLinkId] = useState(null)` — holds the linkId being removed (null = closed)
3. Add `useEffect` for `linkRemovedBanner` auto-dismiss (same pattern as `showSavedBanner`)
4. Render the `<section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">` panel

**[x] Task 4: Reuse `SystemCombobox` for dialogs**

Import `SystemCombobox` from `../components/SystemCombobox.jsx`. The component API:
- `selectedId` — the currently selected system ID (or `null`)
- `onSelect(system)` — called with `{ id, name, vendor, category }` when a system is chosen, or `null` when cleared
- `placeholder` — pass `"Search for a system…"` in dialogs (not the filter placeholder)
- `inputId` — pass a unique string (e.g. `"edit-link-system"` or `"add-link-system"`)

In dialogs, manage local form state with `useState` for `selectedSystemId`, `role`, `sourceReference`, `note`. Pre-fill from `editLink` in the Edit dialog.

**[x] Task 5: Role group rendering**

Group `data.systems` by role in this order: `PRIMARY_TICKETING`, `PRIMARY_CRM`, `INTEGRATED_SUITE`, `SECONDARY`. Use:

```js
const ROLE_ORDER = ['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY']
const ROLE_LABELS = {
  PRIMARY_TICKETING: 'Primary ticketing',
  PRIMARY_CRM: 'Primary CRM',
  INTEGRATED_SUITE: 'Integrated suite',
  SECONDARY: 'Secondary',
}
// group systems array, then render in ROLE_ORDER, skipping empty groups
```

---

### Architecture & Technical Constraints

**Layer compliance (non-negotiable):**
- All API calls live in `api/organisation-systems.js` only
- All data fetching uses TanStack Query hooks — no raw `fetch` in components
- `OrganisationDetailPage.jsx` consumes `data.systems` from `useOrganisation(id)` — the embedded array is already present in the v2 response (Story 8.2); do NOT add a separate `GET /api/organisations/:id/systems` call

**Response envelope shape for all endpoints:**
```
{ data: ..., error: null, meta: null }
```
- Link objects have shape: `{ id, role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`

**TanStack Query invalidation:**
- On every mutation success: `queryClient.invalidateQueries({ queryKey: ['organisations'] })`
- This single call invalidates both the list cache and the detail cache — matching the v1 pattern from `useDeleteOrganisation`
- To access `queryClient` in a component: `const queryClient = useQueryClient()` from `@tanstack/react-query`

**shadcn/ui Dialog usage:**
- `Dialog` is already installed at `frontend/src/components/ui/dialog.jsx`
- Uses radix-ui (unified package, not individual `@radix-ui/react-*`)
- Imported components: `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle` (no `DialogTrigger` needed — use controlled `open` prop)
- Follow controlled pattern: `<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>` — same as delete dialog
- For Edit dialog: `<Dialog open={editLink !== null} onOpenChange={(o) => { if (!o) setEditLink(null) }}>` 
- For Remove dialog: `<Dialog open={removeLinkId !== null} onOpenChange={(o) => { if (!o) setRemoveLinkId(null) }}>`

**SystemCombobox reuse:**
- Already built in Story 8-3 at `frontend/src/components/SystemCombobox.jsx`
- Do NOT rebuild; import directly
- Component uses `useSystem(selectedId)` internally to resolve name when in 'displaying' mode — no need to pass system name separately
- `onSelect` receives the full system object `{ id, name, category }` (may also include `vendor` from search results) or `null` on clear

**SourceReferenceDisplay:**
- Already available at `frontend/src/components/SourceReferenceDisplay.jsx`
- Renders as a hyperlink when value starts with `http`, plain text otherwise
- Pass `value={link.sourceReference}` — the component handles `null`/empty

**Naming conventions:**
- British English: `organisation`, not `organization` everywhere
- `linkId` (camelCase) for the junction row id in JS; the API path param is `:linkId`

---

### File Structure

**New files (create):**
- `frontend/src/api/organisation-systems.js`
- `frontend/src/hooks/useCreateOrganisationSystemLink.js`
- `frontend/src/hooks/useUpdateOrganisationSystemLink.js`
- `frontend/src/hooks/useDeleteOrganisationSystemLink.js`

**Modified files:**
- `frontend/src/pages/OrganisationDetailPage.jsx` — remove legacy rows, add Linked Systems panel + dialogs

**Do NOT touch:**
- `backend/` — the API is fully implemented (Stories 8-1, 8-2)
- `frontend/src/components/SystemCombobox.jsx` — reuse as-is
- `frontend/src/hooks/useOrganisation.js` — reuse as-is
- `frontend/src/components/SourceReferenceDisplay.jsx` — reuse as-is

---

### Previous Story Intelligence (8-3 Learnings)

From the 8-3 review and patch notes:

1. **SystemCombobox label association**: When using `SystemCombobox` inside a dialog, always pass a unique `inputId` and associate any external `<label>` with it via `htmlFor`. The component already accepts `inputId`.

2. **SystemCombobox mode sync**: The component syncs `mode` from `selectedId` via `useEffect`. When managing dialog state, reset `selectedSystemId` to `null` when closing the dialog — this resets the combobox to 'searching' mode for the next open.

3. **Role select guard**: When pre-filling the Role `<select>`, add a guard: if the value from the link is not one of the four known enum values, fall back to `''` (empty / "Select a role") to avoid rendering a broken option.

4. **Search failures**: If `useSystemSearch` is in error state, `SystemCombobox` already surfaces an error row in the dropdown — no extra handling needed in the dialog.

5. **ArrowDown opening**: The combobox already handles ArrowDown to open; no changes needed.

---

### Key Implementation Patterns from Existing Code

**Controlled dialog with pending guard** (from existing delete dialog in `OrganisationDetailPage.jsx`):
```jsx
<Dialog
  open={addDialogOpen}
  onOpenChange={(open) => {
    if (someMutation.isPending) return
    setAddDialogOpen(open)
    if (open) someMutation.reset()
  }}
>
```

**5-second auto-dismiss banner** (from `showSavedBanner` pattern in the same file):
```jsx
const [linkRemovedBanner, setLinkRemovedBanner] = useState(false)

useEffect(() => {
  if (!linkRemovedBanner) return undefined
  const t = window.setTimeout(() => setLinkRemovedBanner(false), BANNER_MS)
  return () => window.clearTimeout(t)
}, [linkRemovedBanner])
```

**Mutation with cache invalidation** (follow `useDeleteOrganisation` pattern):
```jsx
const queryClient = useQueryClient()
const deleteLinkMutation = useDeleteOrganisationSystemLink()

// in onSuccess:
deleteLinkMutation.mutate({ orgId: id, linkId: removeLinkId }, {
  onSuccess: () => {
    setRemoveLinkId(null)
    queryClient.invalidateQueries({ queryKey: ['organisations'] })
    setLinkRemovedBanner(true)
  },
})
```

**409 conflict detection in Add dialog:**
```jsx
// In createOrganisationSystemLink, attach on throw:
// err.isConflict = true
// In component:
createLinkMutation.mutate({ orgId, ... }, {
  onError: (err) => {
    if (err.isConflict) setAddComboboxError('This system is already linked to this organisation')
  },
})
```

---

### Acceptance Test Checklist

- [ ] Open an org detail page → "Ticketing provider" and "CRM platform" rows are gone from Details
- [ ] Org with linked systems → Linked systems panel shows groups by role with correct humanised headings
- [ ] Each link row shows: name link (navigates to system detail), vendor, source ref (hyperlink if URL), note (truncated), last updated, Edit + Remove buttons
- [ ] Click Edit → dialog opens pre-filled; Save calls PUT; panel updates without page reload
- [ ] Click Remove → confirmation dialog shows org name + system name; Remove link calls DELETE; panel updates; "Link removed." banner appears and auto-dismisses in 5s
- [ ] Click Add system → empty dialog; select system + role; Save calls POST; panel updates
- [ ] Add a system already linked → "This system is already linked to this organisation" error on combobox
- [ ] Org with 0 linked systems → "No systems linked yet." empty state with "Add system →" action
- [ ] Org with ≥2 linked systems → "Compare these systems →" ghost link appears
- [ ] "Organisation saved." banner still appears after navigating from edit form
- [ ] Delete organisation dialog still works
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass

---

---

### Review Findings

- [x] [Review][Decision] AC3 null source display vs `SourceReferenceDisplay` — Resolved 2026-05-01: added optional `emptyLabel` (default `'Not recorded'`) on `SourceReferenceDisplay`; linked-system rows pass `emptyLabel="—"`.

- [x] [Review][Patch] Guard nested `system` on links — Resolved 2026-05-01: edit `useEffect` and `handleSaveEdit` gate on `editLink?.system?.id`; list rows use safe fallbacks and disable Edit when `system` is missing.

- [x] [Review][Patch] Remove-dialog copy when link snapshot missing — Resolved 2026-05-01: `removeTarget` holds `{ linkId, systemName }` captured at click time instead of re-deriving from live `systems`.

- [x] [Review][Patch] Normalise `fetchOrganisationSystemLinks` return — Resolved 2026-05-01: return `[]` when `body.data` is not an array; Vitest case added.

- [x] [Review][Defer] Edit flow: duplicate `systemId` / 409 on PUT — [OrganisationDetailPage.jsx:189-206] No `isConflict`-style handling for update; behaviour depends on backend. Defer until PUT conflict contract is confirmed — deferred, pre-existing

---

### Dev Agent Record

#### Implementation Notes

- `api/organisation-systems.js`: All four CRUD functions follow exact same envelope/error pattern as `api/organisations.js`. Used `Object.assign` for error property attachment to avoid `no-unexpected-multiline` lint rule conflict with JSDoc cast comments.
- Three mutation hooks follow the story's "no auto-invalidate in hook" pattern; invalidation happens in component `onSuccess` callbacks so UI state (dialog close, banner) can run atomically.
- Edit dialog form state synced from `editLink` via `useEffect` with `eslint-disable react-hooks/set-state-in-effect` (matching existing `SystemCombobox` pattern for external interaction state).
- `handleSaveEdit` diffs form against `editLink` and sends only changed fields; skips API call entirely if nothing changed.
- Add dialog shows `addComboboxError` inline below the `SystemCombobox` on 409 conflict; non-conflict errors shown via separate alert paragraph.
- `linkRemovedBanner` placed before the Linked Systems `<section>` per AC5.
- Empty state (AC7) shows inline "Add system →" button; non-empty state shows separate "Add system" `<Button>` below role groups.
- Compare shortcut (AC8) conditionally rendered alongside "Add system" button when `systems.length >= 2`.
- Lint: 0 errors. Tests: 13 passed (9 new + 4 existing), 0 regressions.

#### File List

**New files:**
- `frontend/src/api/organisation-systems.js`
- `frontend/src/api/organisation-systems.test.js`
- `frontend/src/hooks/useCreateOrganisationSystemLink.js`
- `frontend/src/hooks/useUpdateOrganisationSystemLink.js`
- `frontend/src/hooks/useDeleteOrganisationSystemLink.js`

**Modified files:**
- `frontend/src/pages/OrganisationDetailPage.jsx`

#### Change Log

- 2026-05-01: Implemented Story 8.4 — Organisation Detail Linked Systems Panel. Added API module, three mutation hooks, and full Linked Systems panel with Edit/Remove/Add dialogs in OrganisationDetailPage. Removed legacy ticketingProvider and crmPlatform detail rows.

### Completion Notes

Created: 2026-05-01
