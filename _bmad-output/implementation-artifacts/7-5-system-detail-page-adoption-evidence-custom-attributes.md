# Story 7.5: System Detail Page (Adoption Evidence + Custom Attributes)

Status: done

## Story

As a staff member,
I want to view the full details of a single System, the Organisations that adopt it grouped by role, and any seeded custom attributes,
So that I can verify a System's profile and see who is using it without leaving the page.

## Acceptance Criteria

**Given** a staff member navigates to `/systems/:id`
**When** the page loads via `useSystem(id)` calling `GET /api/systems/:id`
**Then** the page header renders: System name (`text-2xl font-semibold`); Vendor subtitle (`text-base text-slate-500`); Category Badge inline (using the v2 colour tokens from Story 7.4); a `← Back to systems` link (`text-sm text-blue-600`) at the top
**And** the header right-aligned actions are "Edit system" (secondary outlined button → `/systems/:id/edit`) and "Delete system" (ghost destructive `text-red-600`)

**Given** the System facts panel renders
**When** its contents are inspected
**Then** it is a two-column label/value grid (`grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3`) with rows: Vendor (plain text); Category (Category Badge with v2 tokens); Deployment (plain text or "Not recorded" in `text-slate-400` when null); Pricing model (same null handling); Geographic focus (same null handling); Description (full prose `text-sm text-slate-700`; the row is hidden entirely if null); Membership / Donation / Reserved seating (each `CapabilityBadge` labelled variant); Source reference (rendered as `<a target="_blank" rel="noopener noreferrer">` if it starts with `http`, otherwise plain text; "None recorded" when null — use `SourceReferenceDisplay`); Last updated (absolute date plus relative in parentheses, `text-xs text-slate-500`)

**Given** the Adoption evidence panel renders below the facts panel
**When** its contents are inspected
**Then** the heading reads "Organisations using this system (N)" where N is `data.organisations.length`
**And** rows are grouped by `role` — each role group has a heading rendered as a muted badge (`text-xs font-medium text-slate-500 uppercase tracking-wide`) showing the humanised role label: `PRIMARY_TICKETING` → "Primary ticketing"; `PRIMARY_CRM` → "Primary CRM"; `INTEGRATED_SUITE` → "Integrated suite"; `SECONDARY` → "Secondary"; only roles with at least one row appear
**And** within each group, rows show: Organisation name (link to `/organisations/:id`) | Organisation type Badge (`text-xs`) | Country | per-link source reference (link if starts with `http`, plain text otherwise, `—` if null) | per-link note (truncated to one line with full text in a `title` tooltip; `—` if null) | per-link last updated (`text-xs text-slate-500`)
**And** if zero organisations are linked, the panel shows "No organisations have linked to this system yet."
**And** this panel is **read-only** — adding/removing links is done from the Organisation side per Story 8.4

**Given** the System has non-null `custom_attributes`
**When** the Custom attributes panel renders
**Then** the panel heading is "Additional attributes" and the body is a compact table with columns: Label, Value, Source
**And** each row maps a `{ label, value, sourceReference }` triple from the JSON array
**And** the source column renders as a link (`<a target="_blank" rel="noopener noreferrer">`) if the value starts with `http`; the source cell is omitted (empty) if `sourceReference` is null
**And** if `custom_attributes` is null or an empty array, the entire panel is hidden — no empty state is shown

**Given** the page is loading
**When** `useSystem` has `isLoading === true`
**Then** a skeleton matching the layout (header + facts + adoption + custom attributes) is shown using `animate-pulse` and `bg-slate-100` placeholder shapes — no full-page spinner

**Given** a staff member navigates to `/systems/:id` for a non-existent ID
**When** the API returns `404`
**Then** the page renders "System not found" with a `← Back to systems` link

**Given** a staff member is redirected here after create (Story 7.6 will implement this)
**When** `location.state?.systemSaved` is truthy
**Then** an inline success banner appears at the top: `bg-emerald-50 border border-emerald-200 text-emerald-800`, auto-dismisses after 5 seconds, and has a manual dismiss `×` button

**Given** a staff member clicks "Delete system" for a System with zero adopters
**When** the shadcn/ui `Dialog` confirmation renders
**Then** the dialog body shows the System name in bold and "This cannot be undone. Any organisations linked to this system must be unlinked first."
**And** the destructive button (`bg-red-600 text-white`) reads "Delete system"; the secondary reads "Cancel"
**And** Escape and overlay click dismiss the dialog without action (Radix default)
**And** on confirm, `DELETE /api/systems/:id` is called; on success navigate to `/systems` with banner state

**Given** a staff member clicks "Delete system" for a System with adopters
**When** `DELETE /api/systems/:id` returns `409` with `linkedOrganisationCount`
**Then** the dialog body is replaced in-place with: "This system is linked to [N] organisations. Remove all organisation links before deleting." plus a "View linked organisations" link that closes the dialog and scrolls to the Adoption evidence panel
**And** the destructive "Delete system" button is hidden; only "Close" remains

## Tasks / Subtasks

- [x] **Task 1** — Extend `frontend/src/api/systems.js` with `fetchSystem`
  - [x] **1.1** — Add `SystemNotFoundError` class (extends `Error`) — analogous to `OrganisationNotFoundError` in `api/organisations.js`
  - [x] **1.2** — Export `fetchSystem(id)` — calls `GET /api/systems/:id`, returns parsed body on success, throws `SystemNotFoundError` on 404, throws generic `Error` on other non-OK statuses
  - [x] **1.3** — Validate response shape: `{ data: object, error: null, meta: null }`

- [x] **Task 2** — Create `frontend/src/hooks/useSystem.js`
  - [x] **2.1** — Mirror `useOrganisation.js` exactly: `useQuery({ queryKey: ['systems', id], queryFn: () => fetchSystem(id), enabled: Boolean(id) })`
  - [x] **2.2** — Export `useSystem(id)` — returns the standard TanStack Query result object

- [x] **Task 3** — Create `frontend/src/pages/SystemDetailPage.jsx`
  - [x] **3.1** — Import and use `useSystem(id)` with `useParams()` for the `id`
  - [x] **3.2** — Import `useDeleteSystem` hook (create in Task 4) for the delete mutation
  - [x] **3.3** — `← Back to systems` back link (`text-sm text-blue-600`) rendered unconditionally above everything
  - [x] **3.4** — Loading state: `<DetailSkeleton />` while `isLoading === true` (see skeleton shape in Dev Notes)
  - [x] **3.5** — 404 state: detect `error instanceof SystemNotFoundError`; render "System not found" message with back link
  - [x] **3.6** — Generic error state: for non-404 errors render "Something went wrong" without exposing raw error
  - [x] **3.7** — Success banner: read `location.state?.systemSaved`; follow `OrganisationDetailPage.jsx` banner pattern exactly (useState + useEffect 5s auto-dismiss + `useCallback` to clear state via `navigate(location.pathname, { replace: true, state: {...} })`)
  - [x] **3.8** — Page header: System name h1 + Vendor subtitle + inline `SystemCategoryBadge` + right-aligned "Edit system" button (Link to `/systems/:id/edit`) and Delete trigger
  - [x] **3.9** — Facts panel: `grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3` with `<FactRow label>` helper; hide Description row entirely when `data.description` is null
  - [x] **3.10** — Source reference: use `<SourceReferenceDisplay value={data.sourceReference} />` from `components/SourceReferenceDisplay.jsx`
  - [x] **3.11** — CapabilityBadge: use `<CapabilityBadge value={data.membershipCapability} variant="labelled" />` etc. — import from `components/CapabilityBadge.jsx`
  - [x] **3.12** — Adoption evidence panel: group `data.organisations` by `role` (already sorted by API: `role asc, org.name asc`); render role heading badge per group; `—` for null note/source
  - [x] **3.13** — Note truncation: `truncate` Tailwind class on note cell + `title={link.note}` for tooltip
  - [x] **3.14** — Custom attributes panel: hidden when `data.customAttributes` is null or `[]`; compact `<table>` when present; source column as link when starts with `http`, otherwise plain text cell
  - [x] **3.15** — Delete dialog: use shadcn/ui `Dialog` pattern from `OrganisationDetailPage.jsx` exactly; handle 409 response by showing in-place error state with "View linked organisations" link that calls `closeDialog()` then scrolls to adoption panel (use `useRef` on the adoption panel heading + `scrollIntoView`)
  - [x] **3.16** — Last updated formatting: `formatLastUpdated(iso)` → absolute date + relative via `Intl.RelativeTimeFormat` (matches `SystemListPage.jsx` pattern)

- [x] **Task 4** — Create `frontend/src/hooks/useDeleteSystem.js`
  - [x] **4.1** — Mirror `useDeleteOrganisation.js` pattern: `useMutation({ mutationFn: (id) => deleteSystem(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systems'] }) })`
  - [x] **4.2** — Add `deleteSystem(id)` to `frontend/src/api/systems.js` (calls `DELETE /api/systems/:id`; throws `SystemNotFoundError` on 404; attaches `status` and `linkedOrganisationCount` to thrown errors)

- [x] **Task 5** — Update `frontend/src/App.jsx`
  - [x] **5.1** — Import `SystemDetailPage` from `./pages/SystemDetailPage.jsx`
  - [x] **5.2** — Replace `<Route path="/systems/:id" element={<SystemDetailStubPage />} />` with `<Route path="/systems/:id" element={<SystemDetailPage />} />`
  - [x] **5.3** — Removed `SystemDetailStubPage` from import (kept `SystemNewStubPage` and `SystemCompareStubPage`)

- [x] **Task 6** — Verify no regressions
  - [x] **6.1** — Frontend ESLint: 0 errors
  - [x] **6.2** — Backend test suite: 172 tests, 12 suites, 0 failures
  - [x] **6.3** — System list page unaffected (no modifications to `SystemListPage.jsx`)
  - [x] **6.4** — Organisation detail page unaffected (no modifications to `OrganisationDetailPage.jsx`)

## Dev Notes

### API Response Shape — `GET /api/systems/:id`

The backend already implements this endpoint (`system-controller.js` → `system-service.js` → `system-list-dto.js`). Response shape on success (from `toSystemDetailDto`):

```json
{
  "data": {
    "id": "uuid",
    "name": "Tessitura",
    "vendor": "Tessitura Network",
    "category": "INTEGRATED",
    "deploymentModel": "SAAS",
    "pricingModel": "LICENCE",
    "geographicFocus": "Global",
    "description": "Full suite...",
    "membershipCapability": "YES",
    "donationCapability": "YES",
    "reservedSeatingCapability": "YES",
    "sourceReference": "https://tessitura.com",
    "customAttributes": [
      { "label": "Market segment", "value": "Opera & Ballet", "sourceReference": null }
    ],
    "lastUpdated": "2026-04-29T10:00:00.000Z",
    "createdAt": "2026-04-01T00:00:00.000Z",
    "organisations": [
      {
        "id": "junction-uuid",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "https://...",
        "note": "Migrated in 2024",
        "lastUpdated": "2026-04-15T00:00:00.000Z",
        "organisation": {
          "id": "org-uuid",
          "name": "Royal Opera House",
          "type": "Venue",
          "country": "United Kingdom"
        }
      }
    ]
  },
  "error": null,
  "meta": null
}
```

`organisations` is pre-sorted by the backend: `role asc, org.name asc`. Frontend groups by role; no re-sort needed.

`customAttributes` is a JSON column — it may be `null`, `[]`, or an array of `{ label, value, sourceReference }` objects.

### File Locations — What to Create vs Reuse

| File | Action |
|------|--------|
| `frontend/src/api/systems.js` | UPDATE — add `fetchSystem(id)` and `deleteSystem(id)` functions |
| `frontend/src/hooks/useSystem.js` | CREATE — analogous to `useOrganisation.js` |
| `frontend/src/hooks/useDeleteSystem.js` | CREATE — analogous to `useDeleteOrganisation.js` |
| `frontend/src/pages/SystemDetailPage.jsx` | CREATE — replaces `SystemDetailStubPage` route |
| `frontend/src/App.jsx` | UPDATE — swap `SystemDetailStubPage` → `SystemDetailPage` |
| `frontend/src/pages/SystemRouteStubs.jsx` | Leave `SystemDetailStubPage` in file; just remove from App.jsx import usage (keep `SystemNewStubPage` and `SystemCompareStubPage` stubs active) |
| `frontend/src/components/CapabilityBadge.jsx` | DO NOT MODIFY — reuse as-is |
| `frontend/src/components/SourceReferenceDisplay.jsx` | DO NOT MODIFY — reuse as-is |
| `frontend/src/pages/OrganisationDetailPage.jsx` | DO NOT MODIFY — reference pattern only |
| `frontend/src/hooks/useDeleteOrganisation.js` | DO NOT MODIFY — reference pattern only |
| `backend/` | NO CHANGES — API already fully implemented |

### `fetchSystem` / `SystemNotFoundError` — Add to `api/systems.js`

```js
export class SystemNotFoundError extends Error {
  constructor(id) {
    super(`System not found: ${id}`)
    this.name = 'SystemNotFoundError'
  }
}

export async function fetchSystem(id) {
  const res = await fetch(`${base}/api/systems/${encodeURIComponent(id)}`)
  const body = await res.json()
  if (res.status === 404) throw new SystemNotFoundError(id)
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
  if (body?.data == null || typeof body.data !== 'object' || body.error !== null) {
    throw new Error('Invalid response from systems API')
  }
  return body
}

export async function deleteSystem(id) {
  const res = await fetch(`${base}/api/systems/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const body = await res.json()
  if (res.status === 404) throw new SystemNotFoundError(id)
  if (!res.ok) {
    const err = new Error(body?.error?.message ?? `Request failed (${res.status})`)
    err.status = res.status
    err.linkedOrganisationCount = body?.error?.linkedOrganisationCount ?? null
    throw err
  }
  return body
}
```

### `useSystem` Hook — Create in `hooks/useSystem.js`

```js
import { useQuery } from '@tanstack/react-query'
import { fetchSystem } from '../api/systems.js'

export function useSystem(id) {
  return useQuery({
    queryKey: ['systems', id],
    queryFn: () => fetchSystem(id),
    enabled: Boolean(id),
  })
}
```

### `useDeleteSystem` Hook — Create in `hooks/useDeleteSystem.js`

```js
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSystem } from '../api/systems.js'

export function useDeleteSystem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteSystem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}
```

### `SystemCategoryBadge` — Redefine Locally (Do NOT Import from SystemListPage)

`SystemCategoryBadge` was defined as a local function inside `SystemListPage.jsx`. Since it is not exported, redefine it locally in `SystemDetailPage.jsx`:

```jsx
function SystemCategoryBadge({ category }) {
  const config = {
    INTEGRATED: { label: 'Integrated', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    TICKETING: { label: 'Ticketing', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    AUDIENCE_MANAGEMENT: { label: 'Audience management', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  }
  const { label, cls } = config[category] ?? { label: category ?? '—', cls: 'bg-slate-50 text-slate-700 border border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
```

**DO NOT** add to the shared `Badge` component — system-specific tokens create coupling (established in Story 7.4 dev notes).

### Role Labels for Adoption Evidence Panel

```js
const ROLE_LABELS = {
  PRIMARY_TICKETING: 'Primary ticketing',
  PRIMARY_CRM: 'Primary CRM',
  INTEGRATED_SUITE: 'Integrated suite',
  SECONDARY: 'Secondary',
}
```

Group `data.organisations` by `role`. The backend returns them pre-sorted (`role asc`, then `org.name asc`), so iterate in order and emit a group heading whenever `role` changes. Preserve backend ordering — no client-side re-sort.

Role heading badge:
```jsx
<span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
  {ROLE_LABELS[role] ?? role}
</span>
```

### Delete Dialog — 409 In-Place Error State

When the delete API returns 409, replace the dialog body content in-place. Do not open a new modal. Pattern:

```jsx
const [deleteState, setDeleteState] = useState('idle') // 'idle' | 'pending' | 'conflict'
const [linkedCount, setLinkedCount] = useState(0)
const adoptionPanelRef = useRef(null)

// On delete confirm:
deleteMutation.mutate(id, {
  onSuccess: () => {
    setDeleteDialogOpen(false)
    navigate('/systems', { state: { systemDeleted: true } })
  },
  onError: (err) => {
    if (err.status === 409) {
      setDeleteState('conflict')
      setLinkedCount(err.linkedOrganisationCount ?? 0)
    }
  }
})

// "View linked organisations" link handler:
const handleViewLinked = () => {
  setDeleteDialogOpen(false)
  setDeleteState('idle')
  adoptionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
```

Reset `deleteState` back to `'idle'` when the dialog closes (in `onOpenChange`).

### Success Banner Pattern — Mirror OrganisationDetailPage Exactly

```jsx
const [showSavedBanner, setShowSavedBanner] = useState(
  () => Boolean(location.state?.systemSaved),
)
const clearBannerState = useCallback(() => {
  setShowSavedBanner(false)
  const s = location.state
  const nextState =
    s && typeof s === 'object' && !Array.isArray(s)
      ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'systemSaved'))
      : {}
  navigate(location.pathname, { replace: true, state: nextState })
}, [navigate, location.pathname, location.state])

useEffect(() => {
  if (!showSavedBanner) return undefined
  const t = window.setTimeout(() => { clearBannerState() }, 5000)
  return () => window.clearTimeout(t)
}, [showSavedBanner, clearBannerState])
```

Banner JSX:
```jsx
{showSavedBanner && (
  <div
    className="mb-6 flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
    role="status"
  >
    <p className="text-sm font-medium">System saved.</p>
    <button type="button" onClick={clearBannerState} className="shrink-0 rounded px-2 text-lg leading-none text-emerald-900 hover:bg-emerald-100" aria-label="Dismiss notification">×</button>
  </div>
)}
```

Note: Story 7.6 (Create/Edit Form) will navigate here with `{ state: { systemSaved: true } }` — the banner check is forward-compatible.

### Skeleton Shape

```jsx
function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      {/* Back link placeholder */}
      <div className="h-4 w-24 rounded bg-slate-200" />
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="h-9 w-64 rounded bg-slate-200" />
        <div className="h-5 w-40 rounded bg-slate-200" />
      </div>
      {/* Facts panel */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-[8rem_1fr] gap-4">
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      {/* Adoption panel */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-2">
        <div className="h-5 w-48 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-3/4 rounded bg-slate-100" />
      </div>
    </div>
  )
}
```

### Date Formatting

Follow `SystemListPage.jsx` pattern (relative via `Intl.RelativeTimeFormat`):

```js
function formatLastUpdated(iso) {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
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
```

### Null Display Helper

```js
function displayText(value) {
  if (value == null || value === '') return '—'
  return String(value)
}
```

For nullable enum fields like Deployment/Pricing/Geographic focus, render "Not recorded" in `text-slate-400` (not `—`), matching UX spec D3.1.

### App.jsx — Route Swap

Find:
```jsx
import { SystemDetailStubPage, ... } from './pages/SystemRouteStubs.jsx'
// ...
<Route path="/systems/:id" element={<SystemDetailStubPage />} />
```

Replace route element with:
```jsx
import SystemDetailPage from './pages/SystemDetailPage.jsx'
// ...
<Route path="/systems/:id" element={<SystemDetailPage />} />
```

Keep the remaining stub routes (`/systems/new` → `SystemNewStubPage`, `/compare/systems` → `SystemCompareStubPage`) unchanged.

### Do NOT Implement

- System create/edit form — that is Story 7.6
- Adding/removing organisation–system links — that is Epic 8
- System compare page — that is Epic 9
- Any changes to `OrganisationDetailPage.jsx`
- Any backend changes — the API is fully implemented and tested

## References

- Epics Story 7.5 (lines 1305–1344): `_bmad-output/planning-artifacts/epics.md`
- UX Spec D3 System Detail Page (lines 888–936): `_bmad-output/planning-artifacts/ux-design-specification.md`
- API implementation: `backend/src/controllers/system-controller.js` (`getSystemById`, `deleteSystem`)
- API DTO: `backend/src/services/system-list-dto.js` (`toSystemDetailDto`)
- Pattern: `frontend/src/pages/OrganisationDetailPage.jsx` (banner, delete dialog, skeleton, error states)
- Pattern: `frontend/src/hooks/useOrganisation.js` (for `useSystem`)
- Pattern: `frontend/src/hooks/useDeleteOrganisation.js` (for `useDeleteSystem`)
- Pattern: `frontend/src/api/organisations.js` (`OrganisationNotFoundError`, `fetchOrganisation`)
- Reuse: `frontend/src/components/CapabilityBadge.jsx` (labelled variant)
- Reuse: `frontend/src/components/SourceReferenceDisplay.jsx`
- SystemCategoryBadge reference: `frontend/src/pages/SystemListPage.jsx` (local function — redefine locally)
- Context not needed: `SystemSelectionContext` / `useSystemSelection` — detail page has no compare selection

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Completion Notes List

- Added `SystemNotFoundError`, `fetchSystem`, and `deleteSystem` to `api/systems.js`. `deleteSystem` attaches `status` and `linkedOrganisationCount` to thrown errors so the delete dialog can distinguish 409 conflict from other failures.
- `useSystem` mirrors `useOrganisation` exactly — TanStack Query key `['systems', id]`, enabled guard on `Boolean(id)`.
- `useDeleteSystem` mirrors `useDeleteOrganisation` — invalidates both `['systems']` and `['systems', id]` on success.
- `SystemDetailPage` extracts `data` from `envelope.data` (API returns `{ data, error, meta }` shape). All state vars (`showSavedBanner`, `deleteDialogOpen`, `deleteConflict`) reset cleanly.
- Delete conflict state (409) replaces dialog body in-place; "View linked organisations" link closes the dialog, resets state, and scrolls to the adoption panel via `useRef` + 100ms timeout to allow dialog close animation.
- `SystemCategoryBadge` defined locally (not imported from `SystemListPage`) — matching the Story 7.4 convention of not adding system-specific tokens to the shared `Badge` component.
- `AdoptionPanel` groups pre-sorted backend data by role using a simple sequential scan (no re-sort needed).
- `CustomAttributesPanel` hidden when `customAttributes` is `null` or empty array; source column renders as link when starts with `http`.
- Frontend ESLint: 0 errors. Backend: 172 tests, 12 suites, 0 regressions.

### File List

New files:
- `frontend/src/hooks/useSystem.js`
- `frontend/src/hooks/useDeleteSystem.js`
- `frontend/src/pages/SystemDetailPage.jsx`

Updated files:
- `frontend/src/api/systems.js` (added `SystemNotFoundError`, `fetchSystem`, `deleteSystem`)
- `frontend/src/App.jsx` (swapped `SystemDetailStubPage` → `SystemDetailPage` for `/systems/:id`)

### Review Findings

- [x] [Review][Patch] Render `SystemCategoryBadge` inline in the page header alongside name/vendor per acceptance criteria (currently category appears only in the facts grid) [`frontend/src/pages/SystemDetailPage.jsx:~409`] — addressed in batch post-review (badge beside vendor).

- [x] [Review][Patch] Place header actions in documented order: **Edit system** (secondary) then **Delete system** (ghost destructive); JSX currently renders Delete before Edit [`frontend/src/pages/SystemDetailPage.jsx:~414`] — addressed.

- [x] [Review][Patch] Extend `DetailSkeleton` with a compact placeholder block for the Additional attributes panel so loading matches header + facts + adoption + attributes [`frontend/src/pages/SystemDetailPage.jsx:~94`] — addressed.

- [x] [Review][Patch] Align `fetchSystem` success validation with detail-fetch parity used elsewhere: reject responses where `meta !== null` (story Task 1.3 / mirrors `fetchOrganisation`) [`frontend/src/api/systems.js:~97`] — addressed.

- [x] [Review][Patch] Use explicit `http://` / `https://` checks (matching `SourceReferenceDisplay`) instead of loose `startsWith('http')` for adoption rows and custom-attribute sources [`frontend/src/pages/SystemDetailPage.jsx:~195`] — addressed (`isHttpOrHttpsUrl`).

