# Story 7.6: System Create / Edit Form

Status: done

## Story

As a staff member,
I want a single form that handles creating a new System and editing an existing one,
So that the catalogue can be curated end-to-end with the same field set, validation, and provenance pattern.

## Acceptance Criteria

**Given** a staff member navigates to `/systems/new`
**When** the form renders
**Then** the back link reads `← Back to systems` and the page title is "Add system"
**And** the form fields are laid out with GOV.UK anatomy (label → hint → input → inline error): Name (required text, `max-w-md`, hint "Must be unique. Use the canonical product name (e.g. \"Tessitura\", not \"Tess\")."); Vendor (required text, `max-w-md`, hint "The supplier organisation (e.g. \"Tessitura Network\")."); Category (required select, `max-w-xs`, options Integrated / Ticketing / Audience management); Deployment model (optional select, `max-w-xs`, default "Select deployment model (optional)", options SaaS / Self-hosted / Hybrid); Pricing model (optional select, `max-w-xs`, options Subscription / Transaction fee / Licence / Hybrid / Unknown); Geographic focus (optional select, `max-w-xs`, sourced from `SYSTEM_GEOGRAPHIC_FOCUS`); Description (optional textarea full-width, hint "Include typical audience size and sector specialisation."); Membership capability (required select, default Unknown, options Yes / No / Unknown); Donation capability (same); Reserved seating capability (same); Source reference (optional text input full-width, hint "URL or citation for this record.")
**And** below Source reference a `bg-slate-50 rounded p-3 text-sm text-slate-600` note reads: "Custom attributes are managed via seed data. Full editing will be available in a future update."
**And** required fields have no asterisks; optional fields append "(optional)" in muted `text-slate-500` — matching the Organisation form convention

**Given** a staff member navigates to `/systems/:id/edit`
**When** the form renders
**Then** the back link reads `← Back to [System name]` (using the fetched system's name) and the page title is "Edit system"
**And** all fields are pre-filled from the fetched System record

**Given** a staff member submits the form with `name` empty
**When** client-side validation fires
**Then** an error summary appears at the top of the form with heading "There is a problem." and a link to the Name field that focuses the input on click
**And** the Name field shows an inline error "Enter the system name" with a `border-red-500` border
**And** the API is NOT called

**Given** a staff member submits with all required fields populated
**When** `POST /api/systems` (or `PUT /api/systems/:id` for edit) is called
**Then** during the in-flight request the Save button shows a spinner and is `disabled`
**And** on success the staff member is redirected to `/systems/:id` with `{ state: { systemSaved: true, systemSaveKind: 'create' } }` (create) or `{ state: { systemSaved: true, systemSaveKind: 'edit' } }` (edit) — SystemDetailPage displays the success banner with copy **"System added."** after create and **"System saved."** after edit (`bg-emerald-50 border border-emerald-200 text-emerald-800`, auto-dismiss + manual `×` per Story 7.5)

**Given** the API returns `409` because `name` already exists
**When** the response is received
**Then** the inline error on the Name field reads "A system with this name already exists" and the error summary lists Name
**And** the Save button is re-enabled

**Given** the API returns `400` with field-level errors
**When** the response is received
**Then** `error.fields` entries are mapped to the matching inputs; error summary shown; Save button re-enabled

## Tasks / Subtasks

- [x] **Task 1** — Add `createSystem` and `updateSystem` to `frontend/src/api/systems.js`
  - [x] **1.1** — `createSystem(body)` — POST to `/api/systems`; returns `envelope.data` on 201; on non-201, throws Error with `.fields` array attached if `error.fields` is present (enables `onError` pattern in mutation handlers)
  - [x] **1.2** — `updateSystem(id, body)` — PUT to `/api/systems/${id}`; returns `envelope.data` on 200; throws existing `SystemNotFoundError` (already in this module — Story 7.5) on 404; same `.fields` attachment pattern on 400/409


- [x] **Task 2** — Create `frontend/src/hooks/useCreateSystem.js`
  - [x] **2.1** — Mirror `useCreateOrganisation.js` exactly: `useMutation({ mutationFn: (body) => createSystem(body), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systems'] }) })`

- [x] **Task 3** — Create `frontend/src/hooks/useUpdateSystem.js`
  - [x] **3.1** — Mirror `useUpdateOrganisation.js`: accepts `id`; on success invalidates `['systems']` AND `['systems', id]`

- [x] **Task 4** — Create `frontend/src/pages/SystemFormPage.jsx`
  - [x] **4.1** — `FIELD_IDS` constant mapping field keys to DOM ids (use `sys-` prefix to avoid collisions)
  - [x] **4.2** — `validateClient(values)` — name (empty → "Enter the system name"), vendor (empty → "Enter the vendor name"), category (empty → "Select a category"); returns `{ field, message, anchorId }[]`
  - [x] **4.3** — `mapServerFieldsToSummary(fields)` — maps API error fields using `FIELD_IDS`, falling back to `field-${f.field}` for unmapped keys
  - [x] **4.4** — `initialFormState()` — all blank strings; capabilities default to `'UNKNOWN'`
  - [x] **4.5** — `dtoToFormState(dto)` — maps DTO camelCase fields to form state; null/undefined → `''` for optional enums
  - [x] **4.6** — `buildSubmitBody(form)` — always includes name (trimmed), vendor (trimmed), category, three capabilities; only includes optional fields if non-empty
  - [x] **4.7** — `FieldInlineError` component — identical to OrganisationFormPage pattern
  - [x] **4.8** — `focusFormControl(anchorId)` — identical utility
  - [x] **4.9** — `SystemFormBody` component — full GOV.UK form render; error summary with focus-on-click links; spinner on Save during `mutation.isPending`; custom-attributes read-only note below Source reference
  - [x] **4.10** — `SystemCreateForm` — `useCreateSystem`; on success navigate to `/systems/${data.id}` with `{ state: { systemSaved: true, systemSaveKind: 'create' } }`
  - [x] **4.11** — `SystemEditForm({ id })` — `useSystem(id)` for pre-fill (DTO is at `envelope?.data`, not `data` directly — see Dev Notes); `useUpdateSystem(id)`; loading/404/error states per OrganisationEditForm; on success navigate to `/systems/${id}` with `{ state: { systemSaved: true, systemSaveKind: 'edit' } }`; `hydratedRef` prevents form reset after initial fill
  - [x] **4.12** — Default export `SystemFormPage` — `useMatch({ path: '/systems/:id/edit', end: true })` + `useParams()` to route to create vs edit (exact pattern from `OrganisationFormPage`)

- [x] **Task 5** — Update `frontend/src/App.jsx`
  - [x] **5.1** — Import `SystemFormPage` from `./pages/SystemFormPage.jsx`
  - [x] **5.2** — Replace `<Route path="/systems/new" element={<SystemNewStubPage />} />` → `<Route path="/systems/new" element={<SystemFormPage />} />`
  - [x] **5.3** — Add `<Route path="/systems/:id/edit" element={<SystemFormPage />} />` — neighbour pattern already used for `/organisations/:id` → `/organisations/:id/edit` in `App.jsx`
  - [x] **5.4** — Remove `SystemNewStubPage` from the destructured import of `SystemRouteStubs.jsx` (keep `SystemCompareStubPage`)

- [x] **Task 6** — Update `frontend/src/pages/SystemDetailPage.jsx` (success banner copy only)
  - [x] **6.1** — When `systemSaved` is truthy on first paint, choose banner headline **"System added."** if `systemSaveKind === 'create'`, else **"System saved."**; store that string in React state alongside `showSavedBanner` so the wording stays stable across the 5s auto-dismiss lifecycle when `clearBannerState` rewrites history (fallback **"System saved."** if `systemSaveKind` omitted)
  - [x] **6.2** — In `clearBannerState`, strip `systemSaveKind` from `location.state` alongside `systemSaved` so replace navigation leaves no stale keys

- [x] **Task 7** — Verify no regressions
  - [x] **7.1** — Frontend ESLint: 0 errors
  - [x] **7.2** — Backend test suite: all tests pass, 0 failures (no backend changes)
  - [x] **7.3** — System list, System detail, Organisation pages unaffected (except detail banner copy behaviour above)
  - [x] **7.4** — Manual smoke: `/systems/new` → submit empty → error summary; fill required → save → redirect → banner **"System added."**
  - [x] **7.5** — Manual smoke: `/systems/:id/edit` → pre-filled → save → banner **"System saved."**

## Dev Notes

### Epic scope boundary (`epics.md` Story 7.6)

`_bmad-output/planning-artifacts/epics.md` bundles **Delete system** dialogue ACs inside the Story 7.6 section; those behaviours are implemented in **Story 7.5** (`SystemDetailPage`). **Out of scope for 7.6** — implement the form + routes + banner-variant wiring only.

### No Backend Changes Required

All API endpoints for System create/update/delete are fully implemented and tested. Zero backend work needed for this story.

### API Shapes

**POST `/api/systems`** (create):
- Request: camelCase body `{ name, vendor, category, deploymentModel?, pricingModel?, geographicFocus?, description?, membershipCapability?, donationCapability?, reservedSeatingCapability?, sourceReference? }`
- Success: `201 { data: SystemDto, error: null, meta: null }` — navigate to `/systems/${data.id}`
- Error 400: `{ data: null, error: { message: "Validation failed", fields: [{ field, message }] }, meta: null }`
- Error 409: `{ data: null, error: { message: "A system with this name already exists", fields: [{ field: "name", message: "A system with this name already exists" }] }, meta: null }`

**PUT `/api/systems/:id`** (edit):
- Same body shape; `requireAll: false` in backend so only sent fields are validated
- Success: `200 { data: SystemDto, error: null, meta: null }` — navigate to `/systems/${id}`
- Error 404: `{ data: null, error: { message: "System not found", fields: [] }, meta: null }`
- Error 400/409: same as create

**IMPORTANT**: Send camelCase keys (`membershipCapability`, `deploymentModel`, `pricingModel`, `geographicFocus`, `sourceReference`). Backend accepts both camelCase and snake_case but the rest of the codebase uses camelCase exclusively.

**DO NOT** send `id`, `lastUpdated`, `createdAt`, `customAttributes`, or `organisations` in the request body.

### `createSystem` / `updateSystem` — Error Attachment Pattern

The mutation hooks use `err.fields` in their `onError` callbacks. Both functions must attach the `.fields` array to thrown errors:

```js
export async function createSystem(body) {
  const res = await fetch(`${base}/api/systems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 201) {
    if (envelope?.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from systems API')
    }
    if (envelope.error !== null) throw new Error('Invalid response from systems API: error must be null on success')
    if (envelope.meta !== null) throw new Error('Invalid response from systems API: meta must be null on create')
    return envelope.data
  }
  const err = new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
  if (Array.isArray(envelope?.error?.fields)) {
    err.fields = envelope.error.fields
  }
  throw err
}

export async function updateSystem(id, body) {
  const res = await fetch(`${base}/api/systems/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = await res.json().catch(() => ({}))
  if (res.status === 200) {
    if (envelope?.data == null || typeof envelope.data !== 'object') {
      throw new Error('Invalid response from systems API')
    }
    if (envelope.error !== null) throw new Error('Invalid response from systems API: error must be null on success')
    if (envelope.meta !== null) throw new Error('Invalid response from systems API: meta must be null on update')
    return envelope.data
  }
  if (res.status === 404) throw new SystemNotFoundError(id)
  const err = new Error(envelope?.error?.message ?? `Request failed (${res.status})`)
  if (Array.isArray(envelope?.error?.fields)) {
    err.fields = envelope.error.fields
  }
  throw err
}
```

### `useSystem` Returns the Full Envelope — Extract `data.data` for DTO

`useSystem(id)` returns TanStack Query's result where `data` is the full API envelope `{ data: systemDto, error, meta }`. This is confirmed by `SystemDetailPage.jsx` completion notes: *"SystemDetailPage extracts `data` from `envelope.data`"*.

In `SystemEditForm`:
```js
const { data: envelope, isLoading, isError, error, isSuccess } = useSystem(id)
const systemDto = envelope?.data   // actual system DTO with name, vendor, category, etc.
```

Pre-fill:
```js
useEffect(() => {
  if (!systemDto || hydratedRef.current) return
  hydratedRef.current = true
  startTransition(() => {
    setForm(dtoToFormState(systemDto))
  })
}, [systemDto])
```

Back link in edit mode uses `systemDto?.name`:
```jsx
<Link to={`/systems/${id}`} className="mb-6 inline-block text-sm text-blue-600">
  ← Back to {systemDto?.name ?? 'system'}
</Link>
```

### `initialFormState` and `dtoToFormState`

```js
function initialFormState() {
  return {
    name: '',
    vendor: '',
    category: '',
    deploymentModel: '',
    pricingModel: '',
    geographicFocus: '',
    description: '',
    membershipCapability: 'UNKNOWN',
    donationCapability: 'UNKNOWN',
    reservedSeatingCapability: 'UNKNOWN',
    sourceReference: '',
  }
}

function dtoToFormState(dto) {
  return {
    name: dto.name ?? '',
    vendor: dto.vendor ?? '',
    category: dto.category ?? '',
    deploymentModel: dto.deploymentModel ?? '',
    pricingModel: dto.pricingModel ?? '',
    geographicFocus: dto.geographicFocus ?? '',
    description: dto.description ?? '',
    membershipCapability: String(dto.membershipCapability ?? 'UNKNOWN').toUpperCase(),
    donationCapability: String(dto.donationCapability ?? 'UNKNOWN').toUpperCase(),
    reservedSeatingCapability: String(dto.reservedSeatingCapability ?? 'UNKNOWN').toUpperCase(),
    sourceReference: dto.sourceReference ?? '',
  }
}
```

### `buildSubmitBody`

```js
function buildSubmitBody(form) {
  const body = {
    name: form.name.trim(),
    vendor: form.vendor.trim(),
    category: form.category,
    membershipCapability: form.membershipCapability,
    donationCapability: form.donationCapability,
    reservedSeatingCapability: form.reservedSeatingCapability,
  }
  if (form.deploymentModel) body.deploymentModel = form.deploymentModel
  if (form.pricingModel) body.pricingModel = form.pricingModel
  if (form.geographicFocus) body.geographicFocus = form.geographicFocus
  const desc = form.description.trim()
  if (desc) body.description = desc
  const sr = form.sourceReference.trim()
  if (sr) body.sourceReference = sr
  return body
}
```

### Form Field Options (Static — No API Needed)

```js
const CATEGORY_OPTIONS = [
  { value: 'INTEGRATED',          label: 'Integrated' },
  { value: 'TICKETING',           label: 'Ticketing' },
  { value: 'AUDIENCE_MANAGEMENT', label: 'Audience management' },
]

const DEPLOYMENT_OPTIONS = [
  { value: 'SAAS',        label: 'SaaS' },
  { value: 'SELF_HOSTED', label: 'Self-hosted' },
  { value: 'HYBRID',      label: 'Hybrid' },
]

const PRICING_OPTIONS = [
  { value: 'SUBSCRIPTION',    label: 'Subscription' },
  { value: 'TRANSACTION_FEE', label: 'Transaction fee' },
  { value: 'LICENCE',         label: 'Licence' },
  { value: 'HYBRID',          label: 'Hybrid' },
  { value: 'UNKNOWN',         label: 'Unknown' },
]
```

Import `SYSTEM_GEOGRAPHIC_FOCUS` from `'../lib/system-geographic-focus.js'` — values are `['UK', 'Europe', 'North America', 'Global', 'Other']`. This constant is dual-maintained with the backend (ADR-016) — do not hardcode the list inline.

### `validateClient` — Three Required Fields

```js
function validateClient(values) {
  const out = []
  if (!values.name.trim()) {
    out.push({ field: 'name', message: 'Enter the system name', anchorId: FIELD_IDS.name })
  }
  if (!values.vendor.trim()) {
    out.push({ field: 'vendor', message: 'Enter the vendor name', anchorId: FIELD_IDS.vendor })
  }
  if (!values.category) {
    out.push({ field: 'category', message: 'Select a category', anchorId: FIELD_IDS.category })
  }
  return out
}
```

Capability selects always have a value (`UNKNOWN` default) so they never need client-side validation.

### `FIELD_IDS` Constant

Use `sys-` prefix to prevent future DOM id conflicts if both forms ever co-exist on a page:

```js
const FIELD_IDS = {
  name:                      'field-sys-name',
  vendor:                    'field-sys-vendor',
  category:                  'field-sys-category',
  deploymentModel:           'field-sys-deployment',
  pricingModel:              'field-sys-pricing',
  geographicFocus:           'field-sys-geo-focus',
  description:               'field-sys-description',
  membershipCapability:      'field-sys-membership',
  donationCapability:        'field-sys-donation',
  reservedSeatingCapability: 'field-sys-seating',
  sourceReference:           'field-sys-source',
}
```

### Success Banner — preserve Story 7.5 contract + Epic copy split

Story 7.5 shows the emerald banner when `location.state?.systemSaved` is truthy. Extend navigation state:

```js
navigate(`/systems/${id}`, { state: { systemSaved: true, systemSaveKind: 'create' } }) // or 'edit'
```

Implement **Task 6** so the visible line reads **"System added."** (create) or **"System saved."** (edit), matching `epics.md` §Story 7.6. Clearing history must drop both **`systemSaved`** and **`systemSaveKind`**.

### Route Not Yet Present — Must Add `/systems/:id/edit`

Current `App.jsx` routes for systems:
```jsx
<Route path="/systems/new" element={<SystemNewStubPage />} />   // → replace with SystemFormPage
<Route path="/systems/:id" element={<SystemDetailPage />} />    // → unchanged
// /systems/:id/edit is MISSING — must add
```

After Task 5, the routes should be:
```jsx
<Route path="/systems/new" element={<SystemFormPage />} />
<Route path="/systems/:id" element={<SystemDetailPage />} />
<Route path="/systems/:id/edit" element={<SystemFormPage />} />
```

React Router v6 matches routes top-to-bottom. **`/systems/new` must remain before `/systems/:id`** so the segment `new` is not captured as `:id`.

### Mode Detection in `SystemFormPage`

Exact mirror of `OrganisationFormPage`:
```js
export default function SystemFormPage() {
  const editMatch = useMatch({ path: '/systems/:id/edit', end: true })
  const { id } = useParams()
  if (editMatch) {
    return <SystemEditForm key={id ?? 'edit'} id={id} />
  }
  return <SystemCreateForm />
}
```

The `key={id ?? 'edit'}` on `SystemEditForm` ensures React unmounts/remounts when navigating between different system edit URLs (prevents stale pre-fill).

### File Locations — What to Create vs Reuse

| File | Action |
|------|--------|
| `frontend/src/api/systems.js` | **UPDATE** — add `createSystem` and `updateSystem` |
| `frontend/src/hooks/useCreateSystem.js` | **CREATE** |
| `frontend/src/hooks/useUpdateSystem.js` | **CREATE** |
| `frontend/src/pages/SystemFormPage.jsx` | **CREATE** |
| `frontend/src/App.jsx` | **UPDATE** — route changes only |
| `frontend/src/pages/SystemRouteStubs.jsx` | **DO NOT MODIFY** — `SystemNewStubPage` stays in file but is no longer imported in App.jsx |
| `frontend/src/pages/SystemDetailPage.jsx` | **UPDATE** — Task 6: banner headline + strip `systemSaveKind` from cleared state |
| `frontend/src/pages/OrganisationFormPage.jsx` | **DO NOT MODIFY** — reference pattern only |
| `frontend/src/lib/system-geographic-focus.js` | **DO NOT MODIFY** — import only |
| `backend/` | **NO CHANGES** |

### Do NOT Implement in This Story

- Organisation–System linking editor — that is Epic 8
- System compare page — that is Epic 9
- Any changes to backend routes, controllers, or services
- Custom attributes editing — backend does not support it and the UX explicitly defers it

### Project Structure Notes

- `SystemFormPage.jsx` goes in `frontend/src/pages/` (route-level component) — consistent with `OrganisationFormPage.jsx`
- `useCreateSystem.js` and `useUpdateSystem.js` go in `frontend/src/hooks/` — no logic in pages, data fetching only in hooks
- No new `components/` files needed — all Tailwind utility classes inline, same as OrganisationFormPage pattern
- No new shadcn/ui primitives needed — uses the same plain `<input>`, `<select>`, `<textarea>` pattern as OrganisationFormPage (shadcn Input/Select are not used in the Organisation form — inspect the actual file before assuming)

### References

- Epics Story 7.6: `_bmad-output/planning-artifacts/epics.md` (Story 7.6 section)
- UX Spec D4 System Form Page: `_bmad-output/planning-artifacts/ux-design-specification.md` (section D4)
- Pattern: `frontend/src/pages/OrganisationFormPage.jsx` (primary mirror — read this first)
- Pattern: `frontend/src/hooks/useCreateOrganisation.js`
- Pattern: `frontend/src/hooks/useUpdateOrganisation.js`
- Pattern: `frontend/src/api/organisations.js` (`createOrganisation`, `updateOrganisation`)
- Reuse: `frontend/src/hooks/useSystem.js` (edit pre-fill — returns full envelope)
- Reuse: `frontend/src/lib/system-geographic-focus.js` (`SYSTEM_GEOGRAPHIC_FOCUS` constant)
- Backend API: `backend/src/controllers/system-controller.js` (`createSystem`, `updateSystem`, validation rules)
- Context: `frontend/src/pages/SystemDetailPage.jsx` (success banner scaffold from Story 7.5 — extend for create vs edit copy in Task 6)
- Context: `frontend/src/App.jsx` (route structure — add `/systems/:id/edit`)

## Dev Agent Record

### Agent Model Used

gpt-5.2-codex

### Debug Log References

### Completion Notes List

- Implemented `createSystem` / `updateSystem` with `.fields` on API errors.
- Added `SystemFormPage` (create + edit), hooks, routing; snake_case ↔ form key mapping for server `error.fields`.
- Detail page success banner headline from `systemSaveKind` (`create` vs `edit`); `clearBannerState` strips both keys.
- Frontend tests: `vitest run --config vitest.config.js`, `frontend/src/api/systems.test.js` (fetch mocks). Separate `vitest.config.js` avoids loading Vite + rolldown for unit tests only.
- `npm run lint` clean; backend `jest` all green; `vite build` OK with `@rolldown/binding-linux-x64-gnu` present (Linux / WSL; align Node to 20.19+ per Vite).

### File List

- frontend/src/api/systems.js
- frontend/src/api/systems.test.js
- frontend/src/hooks/useCreateSystem.js
- frontend/src/hooks/useUpdateSystem.js
- frontend/src/pages/SystemFormPage.jsx
- frontend/src/pages/SystemDetailPage.jsx
- frontend/src/App.jsx
- frontend/vite.config.js
- frontend/vitest.config.js
- frontend/package.json
- frontend/package-lock.json

### Change Log

- 2026-04-30 — Story 7.6 implemented: System create/edit form, API wrappers, mutations, banner split, Vitest smoke for systems API helpers.
- 2026-04-30 — Code review: decision (A) Rolldown binding + `CLAUDE.md` cross-platform note; story marked done.

### Review Findings

- [x] [Review][Decision] Pinning `@rolldown/binding-linux-x64-gnu` in `frontend/package.json` — **Resolved (A):** keep Linux pin; macOS/Windows documented in root `CLAUDE.md` under local frontend (Node version, clean install, optional `@rolldown/binding-*` for platform).

- [x] [Review][Defer] Vitest does not cover `createSystem` 409 duplicate name with `error.fields` [`frontend/src/api/systems.test.js`] — deferred; AC expects name conflict UX; add mock when expanding frontend API tests.

