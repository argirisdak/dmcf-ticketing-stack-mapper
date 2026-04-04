# Story 3.3: Multi-filter API integration and URL state

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required reading (read before implementation)

- `_bmad-output/project-context.md` — British English (`organisation`), API envelope `{ data, error, meta }`, default `limit` 20, controllers validate / services own Prisma
- `_bmad-output/planning-artifacts/architecture.md` — query param names table (`q`, `page`, `limit`, `country`, `provider`, `type`, `crm`, `membership`, `donation`, `seating`); TanStack Query key shape; `useSearchParams` only (no `window.location`)
- `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.3 acceptance criteria (~lines 545–580)
- `_bmad-output/implementation-artifacts/3-1-text-search.md` — `q`, debounce, search empty-state copy, trigram search behaviour
- `_bmad-output/implementation-artifacts/3-2-filter-bar-and-active-filter-chips.md` — URL param names/values, `LIST_FILTER_PARAM_KEYS`, “clear all” must not wipe `q`/`page`, `ActiveFilterChips`, filter bar order

## Story

As a staff member,  
I want my applied filters and search to actually narrow the results list, persist across navigation, and reset pagination when the filter set changes,  
so that my filtered view is trustworthy, shareable, and predictable.

## Acceptance criteria

1. **Given** the filter bar and search from Stories 3.1–3.2  
   **When** the list loads or updates  
   **Then** `useOrganisations` (and `fetchOrganisations`) derive **page**, **limit**, **q**, and all seven filter dimensions from the **same source of truth as the URL** (`useSearchParams` on the list route)  
   **And** the TanStack Query key is  
   `['organisations', { page, limit, q, country, provider, type, crm, membership, donation, seating }]`  
   where each optional value is either **omitted** or set to a **stable primitive** (avoid putting raw `URLSearchParams` in the key); **undefined** for “not in URL” is acceptable if consistent everywhere  
   **And** `GET /api/organisations` is called with **every active** param as a query string argument (`page`, `limit`, and any of `q`, `country`, `provider`, `type`, `crm`, `membership`, `donation`, `seating` that are present)  
   [Source: `_bmad-output/planning-artifacts/epics.md` Story 3.3; `architecture.md` — Communication Patterns]

2. **Given** filter and/or search params are sent to the backend  
   **When** `GET /api/organisations` runs  
   **Then** **all** supplied params are applied in **one** Prisma `findMany` / `count` pair: `q` (existing OR across name, city, notes, ticketing provider name), plus **AND** conditions for:  
   - `country` — exact match on `organisation.country` (value must match seeded `COUNTRIES` labels, same strings as the filter bar)  
   - `provider` — exact match on related `ticketing_provider.name` (row must have that provider)  
   - `type` — exact match on related `organisation_type.name`  
   - `crm` — exact match on related `crm_platform.name` (row must have that CRM)  
   - `membership`, `donation`, `seating` — match `membership_capability`, `donation_capability`, `reserved_seating_capability` respectively; values **`YES` | `NO` | `UNKNOWN`** (uppercase), same as `CapabilityState`  
   **And** combined logic is **AND** between dimensions; within `q`, keep existing **OR** across search fields (FR13)  
   [Source: epics Story 3.3; `backend/src/prisma/schema.prisma`]

3. **Given** any filter dropdown changes **or** the debounced search term applied to the URL changes  
   **When** the URL is updated  
   **Then** `page` is set to **`1`** in the URL (user always lands on the first page of the new result set)  
   **And** changing **page only** (pagination controls) does **not** clear filters or `q`  
   [Source: epics Story 3.3]

4. **Given** a staff member had filters/search in the URL and opened an organisation detail  
   **When** they use browser **Back**  
   **Then** they return to `/organisations` with the **same** query string (filters + `q` + `page`) — no duplicate state in React that fights the URL  
   [Source: epics Story 3.3; UX-DR13 in planning epics]

5. **Given** `q` and at least one filter are both active (e.g. `?q=royal&country=United+Kingdom`)  
   **When** the API responds  
   **Then** every row satisfies **both** the text search and **all** supplied filters (AND across dimensions)  
   [Source: epics Story 3.3]

6. **Given** a **filter** (any of the seven keys) or **search** `q` is active and the result set is empty  
   **When** the table area renders  
   **Then** if **only** `q` is active (no filter params), keep Story **3.1** copy:  
   `No organisations found for '[term]'. Try a shorter search or check the spelling.` plus **Clear search**  
   **And** if **any** of the seven filter params is active (with or without `q`), show:  
   `No organisations match these filters. Try removing a filter or clearing all.`  
   **And** provide a **“Clear all filters”** control that removes **only** the seven filter keys from the URL (reuse semantics from Story 3.2 — do **not** wipe `q` or `page` unless product choice; prefer preserving `q` and setting `page=1` if you touch page)  
   [Source: epics Story 3.3; align with `LIST_FILTER_PARAM_KEYS` in `frontend/src/lib/organisation-list-filter-params.js`]

7. **Given** invalid **capability** or **country** query values on the API  
   **When** the list endpoint validates  
   **Then** respond with **400** and `{ data: null, error: { message: 'Validation failed', fields: [...] }, meta: null }` (reuse patterns from `organisation-controller.js` for `page`/`limit`)  
   **And** unknown `provider`/`type`/`crm` strings are **not** required to 400 — they may legitimately return an empty list (exact match, no row)  
   **Note:** Align country validation with existing `COUNTRY_SET` / `COUNTRIES` on the backend.

## Tasks / subtasks

- [x] **Backend — parse list filters** (AC: 2, 7)  
  - [x] In `listOrganisations` controller: read `country`, `provider`, `type`, `crm`, `membership`, `donation`, `seating` via `asQueryString`; normalise capability values (reuse `CAPABILITY_SET` pattern already used for writes)  
  - [x] Validate `country` against `COUNTRY_SET` when present; invalid → 400 field `country`  
  - [x] Pass a single options object to the service: `{ page, limit, q?, country?, provider?, type?, crm?, membership?, donation?, seating? }`

- [x] **Backend — Prisma `where` composition** (AC: 2, 5)  
  - [x] Extend `organisation-service.js` `listOrganisations`: combine existing `buildOrganisationListWhere(q)` with **AND** clauses for each supplied filter; use relation filters for provider/type/CRM names (`organisation_type`, `ticketing_provider`, `crm_platform`)  
  - [x] Apply the **same** composite `where` to `findMany` and `count`  
  - [x] Keep `orderBy: { name: 'asc' }`, existing `include`, skip/take

- [x] **Backend — tests** (AC: 2, 5, 7)  
  - [x] Extend `organisation-service.test.js` / `organisation-controller.test.js`: combined `q` + `country`; single filter; invalid `country`; invalid capability → 400; empty result with valid but non-matching provider name

- [x] **Frontend — URL as source of truth** (AC: 1, 3, 4)  
  - [x] Read `page` from URL (default `1`); parse as positive integer, clamp or 400 on bad values **on the server**; client may coerce invalid `page` to `1` when writing  
  - [x] Sync **debounced** search to URL param `q`: remove `q` when trimmed empty; updating `q` sets `page=1`  
  - [x] On filter `<select>` change in `OrganisationListFilterSection`, also set **`page=1`** in the same `setSearchParams` update (preserve other params)  
  - [x] Pagination buttons update **only** `page` in the URL

- [x] **Frontend — API + hook** (AC: 1)  
  - [x] Extend `fetchOrganisations` to append all defined filter/`q` params using `URLSearchParams`  
  - [x] Extend `useOrganisations` to accept the full param object and set the query key exactly as in AC1

- [x] **Frontend — list UI** (AC: 1, 3, 6)  
  - [x] Refactor `OrganisationListResults` so **page** is not trapped in isolated `useState` that ignores the URL — drive list fetch from URL-derived `page` and filters  
  - [x] Replace or adjust `key={q ?? '__full__'}`: after URL owns `page` + filters, ensure filter changes still reset correctly (URL `page=1` + query key change is enough; remove remount hacks if redundant)  
  - [x] Implement **filter empty state** vs **search-only empty state** per AC6  
  - [x] Wire **Clear all filters** in the filter-empty state to the same helper as chip “Clear all” (seven keys only)

- [x] **QA** (AC: 1–7)  
  - [x] Manual: share URL with `q` + filters; reload; back from detail; pagination with filters; clear-all-filters leaves search if present  
  - [x] `cd backend && npm test`; `cd frontend && npm run build` (and eslint if configured)

## Dev notes

### Current implementation snapshot (do not duplicate — extend)

| Area | Today |
|------|--------|
| List API | `organisation-controller.js` — `page`, `limit`, `q` only → `organisationService.listOrganisations` |
| Service | `organisation-service.js` — `where` from `q` only via `buildOrganisationListWhere` |
| Client fetch | `frontend/src/api/organisations.js` — `page`, `limit`, `q` only |
| Hook | `frontend/src/hooks/useOrganisations.js` — `queryKey: ['organisations', { page, limit, q }]` |
| List page | `OrganisationListPage.jsx` — search in **React state** + debounce; filters in **URL** only; **`OrganisationListResults`** holds **local `page` state** |

### Reinvention prevention

- Reuse `asQueryString`, `COUNTRY_SET` / `COUNTRIES`, existing `organisationInclude` / `toOrganisationDto`  
- Reuse `LIST_FILTER_PARAM_KEYS` (and capability helpers) from `frontend/src/lib/organisation-list-filter-params.js` for “clear all filters” and any bulk URL deletes  
- Do **not** add new meta endpoints; filter values remain those agreed in 3.2  
- Keep delete-success banner and `location.state` merge pattern from Story 2.5 / 3.1 when navigating with `replace` + state cleanup

### Architecture compliance

- Response envelope unchanged for list success  
- `invalidateQueries({ queryKey: ['organisations'] })` remains valid for mutations  
- British spelling in UI copy; param names **lowercase** per architecture table

### File structure (expected touches)

| Path | Action |
|------|--------|
| `backend/src/controllers/organisation-controller.js` | Parse/validate filter query params; pass to service |
| `backend/src/services/organisation-service.js` | Composite `where` for list + count |
| `backend/src/__tests__/organisation-controller.test.js` | Filter + validation cases |
| `backend/src/__tests__/organisation-service.test.js` | Prisma `where` integration-style tests if present |
| `frontend/src/api/organisations.js` | Append filter params to list request |
| `frontend/src/hooks/useOrganisations.js` | Full query key + params |
| `frontend/src/pages/OrganisationListPage.jsx` | URL sync for `q` + `page`; lift or merge results section with URL |
| `frontend/src/lib/organisation-list-filter-params.js` | Optional: shared helper to build filter object from `URLSearchParams` (avoid duplicating key list) |

### Testing requirements

- Backend: automated tests for combined filters + `q`, validation errors, and at least one “empty list” case  
- Frontend: `npm run build`; manual URL scenarios in AC4 and AC6

### Previous story intelligence (3.2)

- “Clear all” in chips removes **only** the seven filter keys — preserve **`q`** and **`page`** for Story 3.3 continuity  
- `normaliseCapabilityParam` guards invalid capability strings in the UI; API must still validate for direct HTTP clients  
- Meta load errors already surface with `role="alert"` — do not regress

### Previous story intelligence (3.1)

- Debounce **~300ms** before writing `q` to the URL (or before firing fetch — but epic requires URL state; typical pattern: local input state + debounced sync to URL)  
- Search empty state copy is **exact** when only `q` is active

### Git intelligence

- Repository history may be shallow; rely on story files and code references above.

### Latest technical notes

- TanStack Query v5: include all list inputs in `queryKey` so cache partitions per filter combination  
- React Router v6: `setSearchParams` functional updates to preserve unrelated keys (e.g. future compare prep)

## Project context reference

See `_bmad-output/project-context.md` for stack, naming (`kebab-case` routes/files, PascalCase components), and REST/Prisma rules.

## Story completion status

**done** — Implementation complete; code review (backend, frontend, tests chunks) finished 2026-04-04; open items are deferred follow-ups only.

## Dev agent record

### Agent model used

Composer (Cursor agent)

### Debug log references

_(none)_

### Completion notes list

- List `GET` parses and validates `country` + capability filters; optional `provider`/`type`/`crm` strings forwarded for exact-match filtering (empty list allowed).
- `organisation-service` composes `q` OR-block with AND filters on country, related names, and capability enums; same `where` on `findMany` and `count`.
- Frontend: `parseOrganisationListInputsFromSearchParams` + `hasActiveListFilters` / `clearAllListFiltersInSearchParams`; list fetch, TanStack key, and pagination read/write URL via `useSearchParams`.
- Search field remounts on `location.key` so Back restores `q` without a sync effect (React 19 `set-state-in-effect` lint).
- Filter selects, chip remove/clear-all, and debounced `q` updates set `page=1` where required; filter empty state uses shared clear-all helper.

### File list

- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `frontend/src/api/organisations.js`
- `frontend/src/hooks/useOrganisations.js`
- `frontend/src/lib/organisation-list-filter-params.js`
- `frontend/src/components/ActiveFilterChips.jsx`
- `frontend/src/pages/OrganisationListPage.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-3-multi-filter-api-integration-and-url-state.md`

## Change log

- 2026-04-04 — Story 3.3: multi-filter list API, URL-driven list state, empty states, tests (Composer).

### Review Findings

_Backend, frontend, and **tests** chunks (code review 2026-04-04) — complete._

- [x] [Review][Patch] Whitespace-only capability list params return 400 — `normaliseCapability` rejects `""` after trim, but `country` / `q` treat whitespace-only as absent; `membership`/`donation`/`seating` with only spaces (e.g. `%20`) hit `Select a valid option` before the “omit empty filter” branch. Treat trimmed-empty capability query values as absent (no filter), consistent with other list params [`backend/src/controllers/organisation-controller.js` — `normaliseCapability` / list validation order] — fixed 2026-04-04

- [x] [Review][Defer] Prisma client middleware removed — `backend/src/lib/prisma.js` is now a bare `PrismaClient` export; `prisma-middleware.test.js` deleted. Confirm nothing relied on middleware for auditing or timestamps beyond `last_updated` `@updatedAt` — deferred, pre-existing cleanup scope

_Frontend chunk (code review 2026-04-04) — unified diff ~2850 lines (list URL/search/filters, API client, hooks, shared filter helpers, plus broader page/component edits in the same working tree)._

- [x] [Review][Patch] Clear search does not reset **page** to **1** — Debounced URL sync sets `page=1` whenever `q` changes (including removal). The Clear search control only deletes `q`, so a user at `?q=foo&page=3` becomes `?page=3` and can land on an empty page while page 1 has rows — misaligned with AC3’s “reset pagination when the filter set changes” for search [`frontend/src/pages/OrganisationListPage.jsx` — `OrganisationListSearchInput.clearSearch`] — fixed 2026-04-04

- [x] [Review][Patch] **Whitespace-only non-capability filter params** — `parseOrganisationListInputsFromSearchParams` assigns `country`/`provider`/`type`/`crm` from raw URL values without trimming; `hasActiveListFilters` treats any non-empty string (including `"  "`) as active. The API trims / omits these, so the UI can show the **filter** empty state and chips while the backend applies no effective filter, and TanStack keys can diverge from server semantics [`frontend/src/lib/organisation-list-filter-params.js` — `parseOrganisationListInputsFromSearchParams`, `hasActiveListFilters`] — fixed 2026-04-04 (`normaliseCapabilityParam` also trims so whitespace-only capability params match)

- [x] [Review][Defer] **Stale JSDoc on filter section** — `OrganisationListFilterSection` still says list fetch is only `page`/`limit`/`q`; implementation is full URL-driven list (Story 3.3). Update comment when touching the file [`frontend/src/pages/OrganisationListPage.jsx`] — addressed 2026-04-04 (comment updated)

- [x] [Review][Defer] **Large non–list-route diff** — `OrganisationFormPage`, `OrganisationDetailPage`, `CapabilityBadge`, `button`/`dialog`/`SelectionProvider`, etc., were not re-audited line-by-line against Story 3.3 ACs in this pass; focus was list URL, query key, fetch params, empty states, and filter/search behaviour.

_Tests chunk (code review 2026-04-04) — unified diff ~931 lines (`organisation-controller.test.js`, `organisation-service.test.js`, minor `health` / `meta` tweaks, `prisma-middleware.test.js` removed). No frontend `*.test.*` files in repo (per story: `npm run build` + manual URL checks)._

- [x] [Review][Defer] **List validation tests vs AC7 envelope** — `invalid country` and `invalid capability` list GET tests assert status and `fields` but not the full error envelope (`data: null`, `meta: null`, `error.message`) that `invalid page` already checks; aligning them would harden regressions for Story 3.3 AC7 [`backend/src/__tests__/organisation-controller.test.js`]

- [x] [Review][Defer] **Lowercase capability query normalisation** — Controller uppercases capability list params before calling the service; there is no test that e.g. `membership=yes` forwards as `YES` to `listOrganisations` (same path as writes) [`backend/src/__tests__/organisation-controller.test.js`]
