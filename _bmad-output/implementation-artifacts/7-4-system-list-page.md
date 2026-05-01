# Story 7.4: System List Page

Status: done

## Story

As a staff member,
I want a paginated, searchable, filterable table of all Systems with selection for compare,
So that I have a primary working surface for the Systems catalogue.

## Acceptance Criteria

**Given** a staff member navigates to `/systems`
**When** the page renders
**Then** a horizontal filter bar above the table contains: a search input ("Search systems…", debounced ~300ms calling `GET /api/systems?q=` on every keystroke after the debounce), three Category toggle chips ("Integrated" / "Ticketing" / "Audience management" — multi-value, active state `bg-blue-600 text-white`, inactive `bg-white border-slate-300 text-slate-600 hover:bg-slate-50`), a Deployment select (SaaS / Self-hosted / Hybrid / All deployments), a Pricing select (Subscription / Transaction fee / Licence / Hybrid / Unknown / All pricing), a Geographic focus select (sourced from the seeded `SYSTEM_GEOGRAPHIC_FOCUS` constant + an "All regions" default), and three Capability selects (Membership / Donation / Reserved seating — each Yes / No / Unknown / Any)
**And** filter changes do *not* require an "Apply" button; results narrow reactively as filters change

**Given** a Category chip is toggled on
**When** the URL is inspected
**Then** the selected category is encoded into the URL via `useSearchParams` as a repeated `category` param (e.g. `?category=INTEGRATED&category=TICKETING`) — multi-value semantics
**And** browser back navigation restores the exact filter state
**And** all other filter params (`q`, `deployment_model`, `pricing_model`, `geographic_focus`, `membership`, `donation`, `seating`, `page`, `limit`) are also encoded into the URL and restored on back navigation

**Given** any filter is active
**When** the active filter chips strip renders below the filter bar
**Then** one chip per active filter value is shown with labels: `category` (one chip per value: "Category: Integrated"), `deployment_model` ("Deployment: SaaS"), `pricing_model` ("Pricing: Subscription"), `geographic_focus` ("Region: UK"), `membership` / `donation` / `seating` (e.g. "Membership: Yes"), and `q` ("Search: [term]")
**And** clicking the dismiss `×` on a chip removes that param only; "Clear all" removes every filter param simultaneously

**Given** the System table renders
**When** the columns are inspected
**Then** they are: a checkbox (row selection for compare, bound to `SystemSelectionContext`), Name (link to `/systems/:id`, `font-medium text-slate-800`), Vendor (`text-sm text-slate-500`; on narrow widths flows to a second line under Name), Category (Badge with v2 colour tokens: Integrated `bg-blue-50 text-blue-700 border-blue-200`; Ticketing `bg-amber-50 text-amber-700 border-amber-200`; Audience management `bg-purple-50 text-purple-700 border-purple-200`), Deployment (`text-sm text-slate-600`; "—" if null), Pricing (`text-sm text-slate-600`; "—" if null), Membership / Donation / Reserved seating (`CapabilityBadge` compact icon-only), Last updated (`text-xs text-slate-500`, relative date)
**And** the table wrapper has `overflow-x-auto` for narrow viewports
**And** each column has a sufficient `min-w-[Xpx]` so it remains readable before horizontal scroll activates

**Given** the list is loading and `useSystems` has `isLoading === true`
**When** the table body renders
**Then** skeleton rows (slate-100 shimmer) are shown matching the column count — no full-page spinner; `isFetching` (refetches from cache) does not trigger skeletons

**Given** the catalogue is empty after a filter combination
**When** the table body renders
**Then** the empty state reads "No systems match these filters. Try removing a filter or clearing all." with a "Clear all filters" link
**And** when the search returns nothing, the empty state reads "No systems found for '[term]'. Try a shorter search or check the spelling." with a Clear search action
**And** when the catalogue itself is empty (no Systems yet), the empty state reads "No systems yet. Add the first one to get started." with an "Add system" primary button

**Given** a staff member checks ≥1 System row
**When** the `CompareSelectionBar` is rendered (bound to `SystemSelectionContext`)
**Then** the bar displays "Compare selected (N) →" as a primary blue button — clicking navigates to `/compare/systems?ids=<id1>,<id2>,...`
**And** at 5+ selected the button is `disabled` with a tooltip "Select up to 4 systems to compare"
**And** the bar exposes a "Clear selection" link that resets `SystemSelectionContext`

**Given** a staff member opens System detail and uses browser back
**When** they return to `/systems`
**Then** the filter state (URL params) and selection state (context) are both preserved — matching the v1 Organisation list behaviour and ADR-013

**Given** the page header
**When** it renders
**Then** the page title is "Systems" left-aligned and an "Add system" primary button (`bg-blue-600`) is right-aligned, mirroring the v1 Organisation list header

## Tasks / Subtasks

- [x] **Task 1** — Create `frontend/src/lib/system-list-filter-params.js`
  - [x] **1.1** — Export `SYSTEM_LIST_FILTER_PARAM_KEYS` constant array (order: `deployment_model`, `pricing_model`, `geographic_focus`, `membership`, `donation`, `seating`)
  - [x] **1.2** — Export `SYSTEM_CAPABILITY_FILTER_PARAM_KEYS` Set (`membership`, `donation`, `seating`)
  - [x] **1.3** — Export `SYSTEM_CATEGORY_PARAM_KEY = 'category'` (multi-value, handled separately from single-value filters)
  - [x] **1.4** — Export `SYSTEM_FILTER_DIMENSION_LABELS` object mapping keys to human labels (e.g. `deployment_model: 'Deployment'`, `geographic_focus: 'Region'`)
  - [x] **1.5** — Export `parseSystemListInputsFromSearchParams(searchParams, limit)` that parses `page`, `limit`, `q`, all filter keys (including multi-value `category` as array), and normalises capability values
  - [x] **1.6** — Export `hasActiveSystemListFilters(searchParams)` — returns true if any filter param or `q` is set
  - [x] **1.7** — Export `clearAllSystemListFiltersInSearchParams(prev)` — removes `q`, `category` (all), and all filter keys, resets `page=1`

- [x] **Task 2** — Create `frontend/src/api/systems.js`
  - [x] **2.1** — Follow the exact same pattern as `frontend/src/api/organisations.js`
  - [x] **2.2** — Export `fetchSystems(params)` — builds URLSearchParams including multi-value `category` (use `.append('category', val)` for each active value), calls `GET /api/systems`, validates response envelope, returns body
  - [x] **2.3** — No create/update/delete functions in this file (those are for Stories 7.5–7.6)

- [x] **Task 3** — Create `frontend/src/hooks/useSystems.js`
  - [x] **3.1** — Follow the exact same pattern as `frontend/src/hooks/useOrganisations.js`
  - [x] **3.2** — Query key includes all params including `category` array so multi-value selection drives correct cache keys
  - [x] **3.3** — Default `page=1`, `limit=20`

- [x] **Task 4** — Create `frontend/src/pages/SystemListPage.jsx`
  - [x] **4.1** — Mirror the structure of `OrganisationListPage.jsx`: filter section component + results component + main page shell
  - [x] **4.2** — Filter section: search input (`useDebouncedValue` at 300ms), Category multi-value chips, four `<select>` dropdowns (Deployment, Pricing, Geographic focus, then three capability selects)
  - [x] **4.3** — Category chip multi-value URL state: reads `searchParams.getAll('category')`, toggles values using `searchParams.delete('category')` then `searchParams.append('category', v)` for each remaining value
  - [x] **4.4** — Active filter chips: render `SystemActiveFilterChips` (built in Task 5) below filter bar
  - [x] **4.5** — Table: 10 columns matching the spec (checkbox, Name/Vendor, Category badge, Deployment, Pricing, Membership, Donation, Reserved seating, Last updated); `overflow-x-auto` wrapper; `min-w-` per column
  - [x] **4.6** — Category badge: inline component mapping INTEGRATED → blue tokens, TICKETING → amber, AUDIENCE_MANAGEMENT → purple (all new tokens — see colour spec in Dev Notes)
  - [x] **4.7** — Category label rendering: `INTEGRATED` → "Integrated", `TICKETING` → "Ticketing", `AUDIENCE_MANAGEMENT` → "Audience management"
  - [x] **4.8** — Vendor rendered on second line under Name: `<div className="text-sm text-slate-500">{sys.vendor}</div>`
  - [x] **4.9** — Skeleton: `TableSkeleton` with 10 columns; triggered only when `isLoading === true`, NOT on `isFetching`
  - [x] **4.10** — Three empty states (filters, search, empty catalogue) matching spec messages exactly
  - [x] **4.11** — `CompareSelectionBar` wired with `entityLabel="systems"` and `useSelectionHook={useSystemSelection}`
  - [x] **4.12** — Pagination: reuse the same `pageItems(page, totalPages)` pattern as OrganisationListPage (copy function, or extract to shared lib if preferred)
  - [x] **4.13** — Page header: "Systems" title + "Add system" `<Link to="/systems/new">` button (button navigates; `/systems/new` route comes in Story 7.6 — link can be stubbed)
  - [x] **4.14** — Relative date: use `formatUpdated` pattern from OrganisationListPage (local function, `toLocaleDateString` with `dateStyle: 'medium'`)

- [x] **Task 5** — Create `frontend/src/components/SystemActiveFilterChips.jsx`
  - [x] **5.1** — Same visual shell as `ActiveFilterChips` (CHIP_CLASSES, dismiss × button, "Clear all" button)
  - [x] **5.2** — Handles single-value params from `SYSTEM_LIST_FILTER_PARAM_KEYS` using `SYSTEM_FILTER_DIMENSION_LABELS`
  - [x] **5.3** — Handles multi-value `category` — one chip per active value: label "Category: Integrated" (use human label mapping)
  - [x] **5.4** — Handles `q` — chip label "Search: [term]"
  - [x] **5.5** — Dismissing a `category` chip removes only that one value (delete all `category` params, re-append remaining); "Clear all" calls `clearAllSystemListFiltersInSearchParams`
  - [x] **5.6** — Props: `{ searchParams, setSearchParams }` — same as `ActiveFilterChips`

- [x] **Task 6** — Update `frontend/src/App.jsx`
  - [x] **6.1** — Import `SystemListPage` from `./pages/SystemListPage.jsx`
  - [x] **6.2** — Replace `<Route path="/systems" element={<SystemsPlaceholderPage />} />` with `<Route path="/systems" element={<SystemListPage />} />`
  - [x] **6.3** — Remove `SystemsPlaceholderPage` import (file itself can remain for now or be deleted)
  - [x] **6.4** — Add `/systems/new` and `/systems/:id` and `/systems/:id/edit` route stubs pointing to placeholders OR simply leave them absent (404 until Stories 7.5–7.6); at minimum add the `/systems/new` route stub so the "Add system" button doesn't 404 ungracefully

- [x] **Task 7** — Verify no regressions
  - [x] **7.1** — Frontend ESLint clean: `cd frontend && npm run lint`
  - [x] **7.2** — Backend test suite still passes: `cd backend && npm test`
  - [x] **7.3** — Manually verify Organisation list still works (selection, compare bar, filters) — context split from Story 7.3 must not be disturbed

## Dev Notes

### Critical Architecture Decisions

- **Multi-value `category` param** — This is the biggest difference from the Organisation list. Use `searchParams.getAll('category')` to read (returns `string[]`), and when updating, delete all existing `category` params then re-append each remaining value. DO NOT use `searchParams.set('category', ...)` — that would overwrite to a single value.
- **`isFetching` vs `isLoading`** — Show skeleton only on `isLoading` (first load / no cached data). `isFetching` (background refetch) does not trigger skeletons — matches v1 OrganisationListPage behaviour exactly (see spec AC).
- **Selection context** — Already wired in Story 7.3. `useSystemSelection()` from `frontend/src/hooks/useSystemSelection.js` — do NOT import `useOrganisationSelection`.
- **No meta API calls** — System filter options (category, deployment, pricing, geographic focus) are all enums / constants; no `/api/meta/*` calls needed, unlike OrganisationListPage which calls three meta endpoints.
- **`SYSTEM_GEOGRAPHIC_FOCUS`** already exists at `frontend/src/lib/system-geographic-focus.js` — import from there, do NOT redefine.

### File Locations — What to Create vs What to Reuse

| File | Action |
|------|--------|
| `frontend/src/lib/system-list-filter-params.js` | CREATE (analogous to `organisation-list-filter-params.js`) |
| `frontend/src/api/systems.js` | CREATE (analogous to `api/organisations.js`) |
| `frontend/src/hooks/useSystems.js` | CREATE (analogous to `useOrganisations.js`) |
| `frontend/src/pages/SystemListPage.jsx` | CREATE (replaces SystemsPlaceholderPage) |
| `frontend/src/components/SystemActiveFilterChips.jsx` | CREATE (extended version of ActiveFilterChips) |
| `frontend/src/App.jsx` | UPDATE (swap placeholder → SystemListPage) |
| `frontend/src/components/ActiveFilterChips.jsx` | DO NOT MODIFY — used by Organisation list |
| `frontend/src/lib/organisation-list-filter-params.js` | DO NOT MODIFY |
| `frontend/src/context/SystemSelectionContext.jsx` | DO NOT MODIFY — already done in Story 7.3 |
| `frontend/src/hooks/useSystemSelection.js` | DO NOT MODIFY — already done in Story 7.3 |
| `frontend/src/pages/SystemsPlaceholderPage.jsx` | DELETE (no longer needed after route swap) |

### Category Toggle Chips — Exact Implementation

Category chips are multi-value and backed by repeated `?category=` URL params. The three chips map to these enum values:

| Chip label | URL value |
|---|---|
| "Integrated" | `INTEGRATED` |
| "Ticketing" | `TICKETING` |
| "Audience management" | `AUDIENCE_MANAGEMENT` |

Active chip style: `bg-blue-600 text-white border-transparent`
Inactive chip style: `bg-white border border-slate-300 text-slate-600 hover:bg-slate-50`

Toggle logic:
```jsx
const activeCategories = searchParams.getAll('category') // string[]
const toggleCategory = (value) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    next.delete('category')
    const current = prev.getAll('category')
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updated.forEach((v) => next.append('category', v))
    next.set('page', '1')
    return next
  })
}
```

### Category Badge — New Colour Tokens

These three tokens are new to v2 (not in v1 Badge component):

```jsx
function SystemCategoryBadge({ category }) {
  const config = {
    INTEGRATED: { label: 'Integrated', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    TICKETING: { label: 'Ticketing', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    AUDIENCE_MANAGEMENT: { label: 'Audience management', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  }
  const { label, cls } = config[category] ?? { label: category, cls: 'bg-slate-50 text-slate-700 border border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
```

Do NOT add these tokens to the existing `Badge` component — that's a shared component and adding system-specific tokens would create coupling. Define `SystemCategoryBadge` locally in `SystemListPage.jsx` (or as a small named export in a new `frontend/src/components/SystemCategoryBadge.jsx`).

### `fetchSystems` — Multi-Value Category in URLSearchParams

```js
export async function fetchSystems(params = {}) {
  const { page = 1, limit = 20, q, categories = [], deployment_model, pricing_model, geographic_focus, membership, donation, seating } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  const trimmed = typeof q === 'string' ? q.trim() : ''
  if (trimmed !== '') qs.set('q', trimmed)
  // Multi-value category — append each value separately
  for (const cat of categories) {
    qs.append('category', cat)
  }
  if (deployment_model) qs.set('deployment_model', deployment_model)
  if (pricing_model) qs.set('pricing_model', pricing_model)
  if (geographic_focus) qs.set('geographic_focus', geographic_focus)
  if (membership) qs.set('membership', membership)
  if (donation) qs.set('donation', donation)
  if (seating) qs.set('seating', seating)
  const res = await fetch(`${base}/api/systems?${qs}`)
  // ... same envelope validation as organisations.js
}
```

### `useSystems` — Query Key with Multi-Value Category

The query key must include the `categories` array so React Query invalidates correctly when multi-value selection changes:

```js
export function useSystems(params = {}) {
  const keyPart = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    ...(params.categories?.length ? { categories: [...params.categories].sort() } : {}),
    // ... other params
  }
  return useQuery({
    queryKey: ['systems', keyPart],
    queryFn: () => fetchSystems(params),
  })
}
```

Sort `categories` in the key to avoid cache misses from order differences (e.g. `[INTEGRATED, TICKETING]` vs `[TICKETING, INTEGRATED]` should be the same cache entry).

### `parseSystemListInputsFromSearchParams` — Canonical Parser

```js
export function parseSystemListInputsFromSearchParams(searchParams, limit = 20) {
  const pageRaw = searchParams.get('page')
  let page = 1
  if (pageRaw != null) {
    const n = Number(pageRaw)
    if (Number.isInteger(n) && n >= 1) page = n
  }
  const out = { page, limit }

  const qRaw = searchParams.get('q')
  if (qRaw != null && qRaw.trim() !== '') out.q = qRaw.trim()

  // Multi-value category
  const cats = searchParams.getAll('category').filter(v => VALID_CATEGORIES.includes(v))
  if (cats.length > 0) out.categories = cats

  // Single-value filters
  for (const key of SYSTEM_LIST_FILTER_PARAM_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null || raw === '') continue
    if (SYSTEM_CAPABILITY_FILTER_PARAM_KEYS.has(key)) {
      const n = normaliseCapabilityParam(raw)
      if (n) out[key] = n
    } else {
      const t = raw.trim()
      if (t) out[key] = t
    }
  }
  return out
}
```

### Table Structure — Column Count = 10

The table has 10 columns (to match `colSpan` in empty state rows and `TableSkeleton`):

| # | Column | `min-w-` |
|---|---|---|
| 1 | Checkbox | `w-12` |
| 2 | Name + Vendor (stacked) | `min-w-[200px]` |
| 3 | Category | `min-w-[140px]` |
| 4 | Deployment | `min-w-[120px]` |
| 5 | Pricing | `min-w-[120px]` |
| 6 | Membership | `min-w-[80px] text-center` |
| 7 | Donation | `min-w-[80px] text-center` |
| 8 | Reserved seating | `min-w-[80px] text-center` |
| 9 | Last updated | `min-w-[120px]` |

Wait — that is 9 data columns + checkbox = 10 total. Use `colSpan={10}` in empty state cells (same count as OrganisationListPage which also has 10 cols including checkbox).

### SystemActiveFilterChips — Chip Handlers for Category

`category` is multi-value so its dismiss handler must remove only the matching value:

```jsx
// Dismiss one category chip
const removeCategory = (value) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    next.delete('category')
    prev.getAll('category').filter(v => v !== value).forEach(v => next.append('category', v))
    next.set('page', '1')
    return next
  })
}

// Build category chips
const catChips = searchParams.getAll('category')
  .filter(v => CATEGORY_LABELS[v])
  .map(v => ({ key: `category:${v}`, value: v, text: `Category: ${CATEGORY_LABELS[v]}` }))
```

Where `CATEGORY_LABELS = { INTEGRATED: 'Integrated', TICKETING: 'Ticketing', AUDIENCE_MANAGEMENT: 'Audience management' }`.

### Enum Display Labels — Select Options

Deployment model display labels:
- `SAAS` → "SaaS"
- `SELF_HOSTED` → "Self-hosted"
- `HYBRID` → "Hybrid"

Pricing model display labels:
- `SUBSCRIPTION` → "Subscription"
- `TRANSACTION_FEE` → "Transaction fee"
- `LICENCE` → "Licence"
- `HYBRID` → "Hybrid"
- `UNKNOWN` → "Unknown"

These are used both in the filter selects and in table cells. Define them as constants in `SystemListPage.jsx` or a shared `system-list-filter-params.js` export.

### App.jsx — Route Swap

Replace:
```jsx
import SystemsPlaceholderPage from './pages/SystemsPlaceholderPage.jsx'
// ...
<Route path="/systems" element={<SystemsPlaceholderPage />} />
```

With:
```jsx
import SystemListPage from './pages/SystemListPage.jsx'
// ...
<Route path="/systems" element={<SystemListPage />} />
```

No other changes to `App.jsx` needed. The nav, providers, and other routes are unchanged.

### Scroll Restoration & Filter Persistence (ADR-013)

The URL contains all filter/page state so scroll/filter restoration is automatic via React Router's `useSearchParams`. Selection state is in `SystemSelectionContext` (in-memory, already mounted at app root). No additional scroll restoration logic needed — same behaviour as OrganisationListPage.

### Relative Dates

Use the same `formatUpdated(iso)` helper from `OrganisationListPage.jsx` — copy it into `SystemListPage.jsx`:
```js
function formatUpdated(iso) {
  if (!iso) return '–'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return '–'
  }
}
```

### Search Input — Controlled Debounce Pattern

Mirror the `OrganisationListPage` approach: search input is controlled by local state; `useDebouncedValue` at 300ms; when debounced value changes, update `searchParams`. The debounced value drives the `q` URL param (not the live input value).

### Do NOT Implement

- `/systems/:id` detail page — that is Story 7.5
- `/systems/new` or `/systems/:id/edit` form page — that is Story 7.6
- Organisation–System linking — that is Epic 8
- System-to-system compare page — that is Epic 9
- Any changes to the `CompareSelectionBar` component (already done in Story 7.3)

## References

- Epics Story 7.4 (line 1251–1304): `_bmad-output/planning-artifacts/epics.md`
- UX Spec D2 System List Page (line 803–882): `_bmad-output/planning-artifacts/ux-design-specification.md`
- UX Spec D2.3 Category badge tokens (line 854–862): `_bmad-output/planning-artifacts/ux-design-specification.md`
- Previous story (7.3) file: `_bmad-output/implementation-artifacts/7-3-navigation-shell-organisations-systems-switch-and-selectioncontext-split.md`
- Mirror pattern: `frontend/src/pages/OrganisationListPage.jsx`
- Mirror pattern: `frontend/src/hooks/useOrganisations.js`
- Mirror pattern: `frontend/src/api/organisations.js`
- Mirror pattern: `frontend/src/lib/organisation-list-filter-params.js`
- Mirror pattern: `frontend/src/components/ActiveFilterChips.jsx`
- Geographic focus constant: `frontend/src/lib/system-geographic-focus.js`
- Selection hook to use: `frontend/src/hooks/useSystemSelection.js`
- App routes: `frontend/src/App.jsx`
- Placeholder to replace: `frontend/src/pages/SystemsPlaceholderPage.jsx`
- CapabilityBadge (unchanged): `frontend/src/components/CapabilityBadge.jsx`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Completion Notes List

- Created `system-list-filter-params.js` with multi-value category handling via `getAll`/`append` pattern — key difference from `organisation-list-filter-params.js` which only uses single-value params.
- `useSystems` query key sorts `categories` array to prevent cache misses from ordering differences.
- `SystemActiveFilterChips` handles three chip types: multi-value `category` (each chip removes only its own value), single-value filter keys, and `q`. Does not modify `ActiveFilterChips` (org list unaffected).
- `SystemCategoryBadge` defined locally in `SystemListPage.jsx` with new v2 colour tokens (blue/amber/purple) — not added to shared `Badge` component to avoid coupling.
- Skeleton triggered only on `isLoading`, not `isFetching`, matching the v1 behaviour spec.
- `SystemListFilterSection` uses `useRef` + `useEffect` pattern to avoid firing URL update on first render when reading initial `q` from URL.
- `SystemsPlaceholderPage.jsx` deleted; `App.jsx` now routes `/systems` to `SystemListPage`.
- Code review (2026-04-30): `formatUpdated` switched to `Intl.RelativeTimeFormat` for relative last-updated text; `App.jsx` gained `/compare/systems`, `/systems/new`, `/systems/:id` stubs (`SystemRouteStubs.jsx`); table skeleton and empty rows use nine columns to match the thead.
- Frontend ESLint: 0 errors. Backend: 172 tests, 12 suites, 0 regressions.

### File List

New files:
- `frontend/src/lib/system-list-filter-params.js`
- `frontend/src/api/systems.js`
- `frontend/src/hooks/useSystems.js`
- `frontend/src/pages/SystemListPage.jsx`
- `frontend/src/pages/SystemRouteStubs.jsx`
- `frontend/src/components/SystemActiveFilterChips.jsx`

Updated files:
- `frontend/src/App.jsx`

Deleted files:
- `frontend/src/pages/SystemsPlaceholderPage.jsx`

### Review Findings

- [x] [Review][Resolved] **Relative last updated** — Product choice: implement relative wording. `formatUpdated` now uses `Intl.RelativeTimeFormat` with second→year cutoffs (`SystemListPage.jsx`).

- [x] [Review][Resolved] **`/compare/systems`** — Route registered; `SystemCompareStubPage` placeholder until Epic 9 (`App.jsx`, `SystemRouteStubs.jsx`).

- [x] [Review][Resolved] **`/systems/new` and `/systems/:id`** — Stub routes avoid 404 on header CTA, empty state, compare bar navigation, and row click (`App.jsx`, `SystemRouteStubs.jsx`).

- [x] [Review][Resolved] **Table skeleton / empty-state colspan** — Aligned to **nine** columns (`SystemListPage.jsx`).

- [x] [Review][Defer] **`limit` not read from URL** — `parseSystemListInputsFromSearchParams` always takes `limit` from the function argument, not `searchParams`, matching `parseOrganisationListInputsFromSearchParams`. Defer unless product wants URL-driven page size for systems.

- [x] [Review][Defer] **`fetchSystems` `res.json()` on error bodies** — Non-JSON error responses can throw on parse; same risk pattern as other API wrappers. Defer global hardening.

- [x] [Review][Defer] **Search input vs URL `q` after external navigation** — Local `searchInput` is initialised once from the URL; history/back may change `q` without updating the field, mirroring organisation list. Defer unless UX requires full two-way sync.
