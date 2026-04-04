# Story 3.2: Filter bar and active filter chips

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required reading (read before implementation)

- `_bmad-output/project-context.md` — British English (`organisation`), API envelope `{ data, error, meta }`, Tailwind-only UI, shadcn copy-paste only, React hooks only
- `_bmad-output/planning-artifacts/architecture.md` — **query param names** for list filters (`country`, `provider`, `type`, `crm`, `membership`, `donation`, `seating`); `useSearchParams` pattern; TanStack Query keys deferred to Story 3.3
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `ActiveFilterChips` anatomy, chip Tailwind, `role="status"`, filter bar layout (~§577–589, ~§705–706, ~§767)
- `_bmad-output/implementation-artifacts/3-1-text-search.md` — list page layout, `OrganisationListResults` + `key={q ?? '__full__'}` pattern, search slot above table; **do not** regress delete banner / `location.state` merge

## Story

As a staff member,  
I want to see filter controls above the results table and have my applied filters shown as removable chips,  
so that I always know which filters are active and can remove individual ones without reopening a panel.

## Acceptance criteria

1. **Given** a staff member is on `/organisations`  
   **When** the page loads  
   **Then** a horizontal **filter bar** renders **above the results table** with **native `<select>`** dropdowns in this **exact order**: Country, Provider, Type, CRM, Membership, Donation, Reserved Seating  
   **And** each dropdown defaults to an unset option labelled **All [dimension]s** (e.g. All countries, All providers — use natural English per dimension)  
   **And** the filter bar container uses **`flex flex-wrap gap-3`** so controls wrap on narrow viewports  
   **And** the search field from Story 3.1 remains **visible** in its existing area (see layout note below) — it must not disappear when filters exist [Source: `_bmad-output/planning-artifacts/epics.md` Story 3.2]

2. **Given** a staff member selects a value from any filter dropdown  
   **When** the selection is made  
   **Then** the corresponding **URL query param** is written **immediately** via React Router **`useSearchParams`** (no full page reload)  
   **And** param **names** match the architecture table exactly: `country`, `provider`, `type`, `crm`, `membership`, `donation`, `seating` [Source: `_bmad-output/planning-artifacts/architecture.md` — Query params (list/filter endpoint)]  
   **And** **values** encoded in the URL are consistent with Story 3.3 / backend expectations:  
   - `country`: full label string from `frontend/src/lib/countries.js` (e.g. `United Kingdom` → `United+Kingdom` in query string)  
   - `provider`, `type`, `crm`: **display `name`** strings from meta endpoints (same strings the API will exact-match in 3.3)  
   - `membership`, `donation`, `seating`: **`YES` | `NO` | `UNKNOWN`** (uppercase), matching `CapabilityState` / Story 3.3  
   **And** unset / “All …” selection **removes** that param from the URL (do not write empty strings)

3. **Given** at least one filter param is present in the URL  
   **When** the list section renders  
   **Then** an **`ActiveFilterChips`** strip appears **below the filter bar** (above the table/results region)  
   **And** there is **one chip per active filter**, label format **`[Dimension]: [Value]`** (human-readable dimension names, e.g. `Country: United Kingdom`, `Membership: YES`)  
   **And** each chip uses Tailwind: **`bg-blue-50 border border-blue-300 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full`** [Source: `_bmad-output/planning-artifacts/epics.md` UX-DR2 / UX spec]  
   **And** each chip exposes a dismiss control (e.g. **`×`**) that is a **button** with **`aria-label="Remove [dimension] filter"`** where `[dimension]` matches the chip’s dimension (Country, Provider, Type, CRM, Membership, Donation, Reserved Seating)  
   **And** a **“Clear all”** control appears on the **right** of the chips row when at least one filter is active  
   **And** the strip root element has **`role="status"`** so assistive tech can treat it as a live region for filter changes [Source: UX spec]

4. **Given** the `ActiveFilterChips` strip is visible  
   **When** a staff member activates a chip’s dismiss control  
   **Then** **only** that filter’s query param is removed via `setSearchParams` (preserve other params)  
   **And** the chip disappears and the matching dropdown returns to its “All …” state

5. **Given** the **“Clear all”** control is activated  
   **When** the action completes  
   **Then** **all seven** filter params (`country`, `provider`, `type`, `crm`, `membership`, `donation`, `seating`) are **removed** from the URL  
   **Implementation note:** Prefer deleting **only** these keys (functional `URLSearchParams` update) rather than `setSearchParams({})`, so when Story 3.3 adds **`q`** and **`page`** to the URL, “clear all filters” does not accidentally wipe search. If no other params exist yet, behaviour matches epic intent.

6. **Given** no filter params are in the URL  
   **When** the chips region is rendered  
   **Then** the strip is **not shown** or shows **no placeholder row** — no empty “blank bar” [Source: epics Story 3.2]

7. **Explicit non-goal (epic note):** **`useOrganisations` / `fetchOrganisations` MUST NOT** gain filter arguments in this story. The list data remains driven only by **page**, **limit**, and **`q`** (debounced search) as today — URL filters are **UI + URL state only** until Story 3.3 wires them to the API [Source: `_bmad-output/planning-artifacts/epics.md` Story 3.2 Note].

## Tasks / subtasks

- [x] **Reference data for dropdowns** (AC: 1–2)  
  - [x] Country options: import `COUNTRIES` from `frontend/src/lib/countries.js` (keep parity with `backend/src/lib/countries.js`)  
  - [x] Provider / type / CRM: reuse **`useTicketingProvidersQuery`**, **`useOrganisationTypesQuery`**, **`useCrmPlatformsQuery`** from `frontend/src/hooks/useMetaReferenceData.js` (data shape `{ id, name }` — URL stores **`name`** per architecture)  
  - [x] Capability dimensions: three `<select>`s with options mapping to **YES / NO / UNKNOWN** (labels can be Yes / No / Not recorded if desired, but URL value must be the enum strings)

- [x] **URL sync** (AC: 2, 4, 5)  
  - [x] Use **`useSearchParams`** from `react-router-dom` on `OrganisationListPage` (or a small child component colocated on the list route)  
  - [x] On change: update params with **`setSearchParams`** while **preserving unrelated** entries  
  - [x] Initialise each `<select>`’s `value` from the URL (controlled selects); missing param ⇒ unset / “All …”

- [x] **`ActiveFilterChips` component** (AC: 3–6)  
  - [x] Add `frontend/src/components/ActiveFilterChips.jsx` (PascalCase file)  
  - [x] Input: current filter model derived from `URLSearchParams` + display helpers (resolve provider/type/crm **names** to labels; capabilities already discrete)  
  - [x] Render chips only for params that exist; **“Clear all”** and **`role="status"`** on wrapper

- [x] **Layout on `OrganisationListPage.jsx`** (AC: 1, 7)  
  - [x] Place filter bar in the existing grey card **below** the search field and **above** `<OrganisationListResults />` (replace the Story 3.2 placeholder comment ~line 331)  
  - [x] Keep **`OrganisationListResults`** behaviour unchanged: still **`useOrganisations({ page, limit, q })`** only — no filter props

- [x] **QA** (AC: 1–7)  
  - [x] Manual: apply multiple filters, confirm URL updates, back/forward restores dropdowns and chips; dismiss one chip; clear all; confirm list **unchanged** by filters (until 3.3)  
  - [x] `cd frontend && npm run build` (and lint if the project uses it)

### Review Findings

- [x] [Review][Patch] Align chips with validated capability URL values — `OrganisationListFilterSection` normalises `membership` / `donation` / `seating` for `<select>` values, but `ActiveFilterChips` reads raw `searchParams.get`, so a hand-edited invalid value (e.g. `?membership=MAYBE`) can show a chip while the dropdown shows “All …”, breaking AC2/AC3 consistency. [`frontend/src/components/ActiveFilterChips.jsx`] — fixed 2026-04-04 (shared `normaliseCapabilityParam` + chip guard).

- [x] [Review][Patch] Handle unknown `country` query values like meta dimensions — provider/type/CRM use an orphan `<option>` when the URL value is missing from loaded options; `country` does not, so an unknown or stale country string yields a broken controlled `<select>`. [`frontend/src/pages/OrganisationListPage.jsx`] — fixed 2026-04-04 (`countryOrphan` option).

- [x] [Review][Patch] Harden `fetchMetaOptions` error bodies — `await res.json()` runs for non-OK responses; HTML or non-JSON error payloads will throw before the intended `Error`, surfacing as an unhandled rejection instead of a clean message. [`frontend/src/api/meta.js`] — fixed 2026-04-04 (try/catch around `res.json()`).

- [x] [Review][Patch] Surface meta reference load failures in the filter bar — when `useTicketingProvidersQuery` / `useOrganisationTypesQuery` / `useCrmPlatformsQuery` are in `isError`, the UI only disables selects while loading; users get no explanation if meta endpoints fail. [`frontend/src/pages/OrganisationListPage.jsx`] — fixed 2026-04-04 (`role="alert"` error strip).

## Dev notes

### Epic cross-story context

- **3.1:** Search + `q` + debounce; search state is still **React state**, not URL — do **not** remove or relocate the search input.  
- **3.2 (this story):** Filter bar + chips + **URL params only** for the seven filter keys.  
- **3.3:** Extend `useOrganisations`, `fetchOrganisations`, backend `WHERE`, pagination reset, move **`q`** (and **`page`**) into URL — align param names with this story so 3.3 is mechanical.

### UX vs scope

- UX `ActiveFilterChips` mentions a **result count** beside chips. **Epic 3.2 does not require it**, and counts would not yet reflect filters. **Omit** the chips-row result count until 3.3 unless product asks otherwise.

### Reinvention prevention

- Do **not** add a new meta endpoint; use existing meta hooks and `COUNTRIES`.  
- Do **not** duplicate country lists inline.  
- Reuse existing **`Button`** / styling patterns from the list page where appropriate; native `<select>` + Tailwind is enough (no new shadcn **Select** unless already present).

### Architecture compliance

- Filter param names **must** match [Source: `_bmad-output/planning-artifacts/architecture.md` — “Query params (list/filter endpoint)”].  
- No `window.location` mutation — **`useSearchParams` only** [Source: architecture — Implementation Standards].

### File structure (expected touches)

| Path | Action |
|------|--------|
| `frontend/src/components/ActiveFilterChips.jsx` | **New** |
| `frontend/src/pages/OrganisationListPage.jsx` | Filter bar, URL wiring, mount chips |
| `frontend/src/hooks/useMetaReferenceData.js` | Read-only reuse (imports) |
| `frontend/src/lib/countries.js` | Read-only reuse |

**Out of scope:** `backend/*`, `frontend/src/hooks/useOrganisations.js`, `frontend/src/api/organisations.js` (except incidental import paths if needed).

### Testing requirements

- No new backend tests (no backend changes).  
- Frontend: **`npm run build`** minimum; document manual URL/chip scenarios above.

### Previous story intelligence (3.1)

- `OrganisationListResults` is **keyed** by debounced `q` to reset page — avoid wrapping it in a way that breaks that.  
- Preserve delete-success banner and **`navigate(..., { replace: true, state: nextState })`** when clearing flags.

### Git intelligence

- Repository history may be minimal; rely on story files and code references above.

### Latest technical notes

- React Router v6 **`useSearchParams`**: functional updates `setSearchParams(prev => next)` help preserve params you do not intend to change.  
- TanStack Query v5: list query key **unchanged** in this story (`['organisations', { page, limit, q }]`).

## Project context reference

See `_bmad-output/project-context.md` for API conventions (when 3.3 connects), British spelling, Tailwind-only UI, and folder/file naming.

## Story completion status

**done** — Code review patches applied; story complete.

## Dev agent record

### Agent model used

Cursor Composer (agent implementing dev-story workflow).

### Debug log references

_(none)_

### Completion notes list

- Added `OrganisationListFilterSection` on the list route: seven native `<select>`s in required order with `flex flex-wrap gap-3`, wired to `useSearchParams` / `setSearchParams` with functional updates so unrelated query keys are preserved. “Clear all” removes only `country`, `provider`, `type`, `crm`, `membership`, `donation`, and `seating`.
- Added `ActiveFilterChips` with chip Tailwind per UX spec, per-chip dismiss buttons with `aria-label="Remove [dimension] filter"`, `role="status"` on the strip, and no row when no filter params.
- Capability URL values are `YES` | `NO` | `UNKNOWN`; meta and country URL values match story (full country label, meta `name`). `useOrganisations` / list fetch unchanged (page, limit, `q` only). Delete banner and `OrganisationListResults` `key={q ?? '__full__'}` preserved.
- Verified: `npx eslint` on touched frontend files; `npm run build` (frontend); `npm test` (backend, 59 tests).

### File list

- `frontend/src/components/ActiveFilterChips.jsx` (new)
- `frontend/src/lib/organisation-list-filter-params.js` (new)
- `frontend/src/pages/OrganisationListPage.jsx` (modified)

### Change log

- 2026-04-04: Story 3.2 — filter bar, URL filter params, active filter chips, shared filter param keys module.
