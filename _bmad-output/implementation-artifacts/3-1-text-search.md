# Story 3.1: Text Search

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — British English (`organisation`), API envelope `{ data, error, meta }`, Tailwind-only UI, shadcn copy-paste only (no CLI), default list page size 20
- `_bmad-output/planning-artifacts/architecture.md` — list endpoint pagination in `meta`, server-side filtering, TanStack Query keys per query shape
- `_bmad-output/planning-artifacts/ux-design-specification.md` — search placeholder, debounce, empty state copy, “clear search” affordance (~§703, empty-state table ~§687)
- `_bmad-output/implementation-artifacts/2-1-organisation-list-page.md` — list page structure, pagination UX, `useOrganisations` / `fetchOrganisations` baseline
- `_bmad-output/implementation-artifacts/2-5-delete-organisation.md` — list page banners, `location.state` merge pattern when clearing flags (do not regress)

## Story

As a staff member,
I want to search for organisations by name, city, notes, or ticketing provider name,
so that I can quickly locate a specific organisation without scrolling through the full catalogue.

## Acceptance Criteria

1. **Given** a staff member is on `/organisations`  
   **When** the page loads  
   **Then** a search input with placeholder **"Search organisations…"** (ellipsis character `…`) is visible **above** the results table at all times  
   **And** it remains visible in the layout position reserved for it (Story 3.2 will add a filter bar; this field must **not** disappear when that work lands — design for a stable slot above the table) [Source: `_bmad-output/planning-artifacts/epics.md` Story 3.1; UX-DR14 in same file]

2. **Given** a staff member types a search term into the search input  
   **When** the input value changes  
   **Then** the API request is **debounced ~300ms** after the last change — no request on every keystroke  
   **And** `GET /api/organisations?q=<term>&page=1&limit=20` is used for the in-flight list fetch (omit `q` entirely when the trimmed term is empty)  
   **And** results update **reactively** without a full page reload and without a separate "Search" button

3. **Given** `GET /api/organisations?q=<term>` is handled on the backend  
   **When** the service runs the query with a non-empty trimmed `q`  
   **Then** filtering is **server-side** using case-insensitive substring match (**equivalent to** `ILIKE '%term%'`) across:  
   - `organisation.name`  
   - `organisation.city`  
   - `organisation.notes` (nullable — rows still match via other fields)  
   - `ticketing_provider.name` via the existing `ticketing_provider` relation (**JOIN** semantics; organisations with no provider can still match on name/city/notes)  
   **And** a row matches if **any** of the above fields matches (**OR** logic)  
   **And** the full catalogue is never loaded to the client for filtering

4. **Given** PostgreSQL `pg_trgm` is enabled (already in init migration)  
   **When** migrations are applied for this story  
   **Then** **GIN (`gin_trgm_ops`) indexes** exist to support the search paths above — today only `organisation.name` is indexed (`organisation_name_trgm_idx` in `backend/src/prisma/migrations/20260402000000_init/migration.sql`); add indexes for **`city`**, **`notes`**, and **`ticketing_provider.name`** via a **new Prisma migration** (raw SQL `CREATE INDEX ... USING GIN (... gin_trgm_ops)` is acceptable; keep extension as-is) [Source: `_bmad-output/planning-artifacts/epics.md` Story 3.1 AC]

5. **Given** a search term returns no matching organisations (trimmed `q` non-empty, total === 0)  
   **When** the results area renders  
   **Then** the empty state message is exactly: **No organisations found for '[term]'. Try a shorter search or check the spelling.** (use the **debounced / active** term in the message)  
   **And** a **clear search** control is shown (e.g. link or button) that clears the input and restores the full paginated list without reload

6. **Given** a staff member clears the search input (trimmed value empty)  
   **When** the debounced value becomes empty  
   **Then** requests use **no** `q` param and the **full** paginated list is restored (same behaviour as pre-search)  
   **And** local **page** state resets to **1** whenever the debounced search term **changes** (typing a new term or clearing), so the user is not left on an empty page past the last result set [aligns with Story 3.3 pagination-reset rule; implement now for search-only]

## Tasks / Subtasks

- [x] **Database — trigram indexes** (AC: 4)
  - [x] Add migration under `backend/src/prisma/migrations/` with `CREATE INDEX IF NOT EXISTS` GIN trigram indexes on `organisation.city`, `organisation.notes`, and `ticketing_provider.name` (and verify `organisation.name` index remains)

- [x] **Backend — parse `q` and filter** (AC: 3–4)
  - [x] In `organisation-controller.js` `listOrganisations`: read `q` via existing `asQueryString(req.query.q)`; trim; pass `q` to service only when non-empty after trim (no new 400 for normal text; optional max length guard is out of scope unless you hit practical limits)
  - [x] In `organisation-service.js` `listOrganisations`: extend signature `{ page, limit, q? }`; build a Prisma `where` clause using `OR` with `contains` + `mode: 'insensitive'` on `name`, `city`, `notes`, and nested `ticketing_provider: { name: { contains, mode: 'insensitive' } }`  
  - [x] Apply the same `where` to `findMany` and `count`; keep `orderBy: { name: 'asc' }`, existing `include`, skip/take unchanged

- [x] **Backend — tests** (AC: 3)
  - [x] Extend `organisation-controller.test.js` and/or `organisation-service.test.js`: with seeded or mocked data, assert list with `q` returns only matching rows; assert `q` omitted behaves as today; assert OR across fields (at least one case hitting provider name)

- [x] **Frontend — debounce + API** (AC: 2, 6)
  - [x] Add a tiny `useDebouncedValue(value, 300)` hook (no new npm dependency unless already present)
  - [x] Extend `fetchOrganisations` in `frontend/src/api/organisations.js` to append `q` to `URLSearchParams` only when defined/non-empty after trim
  - [x] Extend `useOrganisations` to accept `q` (optional) and set `queryKey: ['organisations', { page, limit, q }]` so cache entries differ per search

- [x] **Frontend — list page UI** (AC: 1, 2, 5, 6)
  - [x] In `OrganisationListPage.jsx`: controlled search input above the table; placeholder **Search organisations…**; wire debounced `q` to `useOrganisations`  
  - [x] On debounced `q` change: `setPage(1)`  
  - [x] Distinguish **global empty catalogue** (`total === 0` and no active search) vs **search empty** (`total === 0` and debounced `q` non-empty) — keep existing “No organisations yet…” only for the former  
  - [x] For search empty: show required copy + **clear search** action  
  - [x] Use accessible labeling (`<label>` with `htmlFor` or `aria-label` on the input)

## Dev Notes

### Epic 3 cross-story context

- **3.1 (this story):** Text search + server `q` + list UI; URL sync for `q` is **Story 3.3** — use **React state** for the search string for now unless you intentionally align early with `useSearchParams` (3.3 will unify keys).
- **3.2:** Filter bar and chips; list still unfiltered server-side until 3.3.
- **3.3:** Full URL + combined filters + `useOrganisations` key expansion.

### Previous story intelligence (Epic 2, especially 2.5)

- List page already has delete success banner and careful `location.state` merging — keep those patterns when touching `OrganisationListPage.jsx`.
- `last_updated` / Prisma `@updatedAt` is the source of truth (architecture mentions of `$use` middleware may be stale).

### Architecture compliance (must follow)

- List success: `{ data: [...], error: null, meta: { page, limit, total, totalPages } }`.
- Controllers validate query params; services own Prisma queries.
- Prisma client only from `backend/src/lib/prisma.js`.

### Reinvention prevention

- Reuse `asQueryString` for `q`; reuse `toOrganisationDto` / `organisationInclude` for list rows.
- Do not add client-side filtering of the full list.

### File structure (expected touches)

| Path | Action |
|------|--------|
| `backend/src/prisma/migrations/<timestamp>_organisation_search_trgm_indexes/` | **New** — GIN indexes |
| `backend/src/controllers/organisation-controller.js` | Parse `q`, pass to service |
| `backend/src/services/organisation-service.js` | `where` + list/count with `q` |
| `backend/src/__tests__/organisation-controller.test.js` (and/or service tests) | Search cases |
| `frontend/src/hooks/useDebouncedValue.js` | **New** (or equivalent local hook) |
| `frontend/src/hooks/useOrganisations.js` | `q` in query key + params |
| `frontend/src/api/organisations.js` | `q` query param |
| `frontend/src/pages/OrganisationListPage.jsx` | Search input, empty states, page reset |

### Testing requirements

- **Backend:** `cd backend && npm test` — cover list with and without `q`, and at least one multi-field / provider-name case.
- **Frontend:** `npm run build` / lint; **manual:** type slowly — network tab shows debounced calls; clear search restores list; empty search message + clear control.

### Git intelligence

- Local git history may be minimal; rely on story files and code references above.

### Latest technical notes

- Prisma 6: `contains` with `mode: 'insensitive'` maps to `ILIKE` for PostgreSQL — appropriate for this story.
- React 19 / TanStack Query 5: confirm `package.json` versions if behaviour differs from docs.

## Project context reference

See `_bmad-output/project-context.md` for API envelope, pagination defaults, British spelling, and stack constraints.

## Story completion status

**done** — Code review complete; patch applied.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Added nullable `organisation.city` in Prisma + migration with GIN trigram indexes on `city`, `notes`, and `ticketing_provider.name` (existing `organisation_name_trgm_idx` unchanged).
- List API: `q` trimmed in controller; service builds OR `where` on name, city, notes, and `ticketing_provider.is.name` (case-insensitive contains).
- Frontend: `useDebouncedValue` 300ms, `fetchOrganisations` / `useOrganisations` with `q`, list page search slot with placeholder `Search organisations…`, search vs global empty states, clear search. Page resets to 1 when debounced `q` changes via keyed `OrganisationListResults` remount (avoids setState-in-effect lint issue).
- DTO includes `city` for API consistency. Updated **ADR-002** in `docs/decisions.md` to reflect city + search.

### File List

- `backend/src/prisma/schema.prisma`
- `backend/src/prisma/migrations/20260404140000_organisation_search_trgm_indexes/migration.sql`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/services/organisation-list-dto.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `frontend/src/hooks/useDebouncedValue.js`
- `frontend/src/hooks/useOrganisations.js`
- `frontend/src/api/organisations.js`
- `frontend/src/pages/OrganisationListPage.jsx`
- `docs/decisions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-04: Story 3.1 — server-side text search (`q`), trigram indexes, list UI with debounce and empty states (Dev Agent).

### Review Findings

- [x] [Review][Defer] DTO exposes both `lastUpdated` and `updatedAt` from the same `last_updated` column — consolidation deferred to a future API/versioning story (review decision 2026-04-04: option 2) [backend/src/services/organisation-list-dto.js] — deferred, no API change now

- [x] [Review][Patch] Harden `useDebouncedValue` for non-finite `delayMs` [frontend/src/hooks/useDebouncedValue.js] — fixed 2026-04-04 (clamp finite ≥0; invalid delay → 0)

- [x] [Review][Defer] Keyed remount of `OrganisationListResults` resets focus and subtree state whenever debounced `q` changes — acceptable for AC6; revisit if keyboard users report disruption when 3.2 adds more local state [frontend/src/pages/OrganisationListPage.jsx] — deferred, follow-up a11y polish

- [x] [Review][Defer] Trigram indexes created without `CONCURRENTLY` — acceptable for dev/small DBs; consider non-blocking strategy before large production cutovers [backend/src/prisma/migrations/20260404140000_organisation_search_trgm_indexes/migration.sql] — deferred, ops

- [x] [Review][Defer] `organisation-controller.js` bundles list/`q` handling with full CRUD validation — not introduced by 3.1 alone; split controller modules when the next refactor touches this area [backend/src/controllers/organisation-controller.js] — deferred, structural
