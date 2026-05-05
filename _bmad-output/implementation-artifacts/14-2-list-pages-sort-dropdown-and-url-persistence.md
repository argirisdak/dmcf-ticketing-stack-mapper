# Story 14.2: List Pages — `SortDropdown` Component and URL Persistence

Status: done

## Story

As a staff member,
I want a sort dropdown on the Organisation and System list pages with a small set of practical sort keys, persisted in the URL,
so that I can deep-link to a specific sorted view and switch sorts without losing my filters.

## Acceptance Criteria

1. **`SortDropdown` component** — `frontend/src/components/SortDropdown.jsx` is created. Props: `{ options: { value: string, label: string }[], sort: string, order: 'asc' | 'desc', onChange: (next: { sort, order }) => void }`. Renders a single `<select>` whose options combine field and direction (e.g. value `"name:asc"`, label "Name (A→Z)") to keep the UI compact. Selecting an option calls `onChange` with the parsed pair.

2. **Per-entity option presets** — Two preset option lists are defined:
   - **Organisation:** Name (A→Z), Name (Z→A), Country (A→Z), Country (Z→A), Last updated (newest first), Last updated (oldest first), Capacity (largest first), Capacity (smallest first), Type (A→Z), Type (Z→A) — derived from `ORGANISATION_SORT_KEYS`.
   - **System:** Name (A→Z), Name (Z→A), Vendor (A→Z), Vendor (Z→A), Category (A→Z), Last updated (newest first), Last updated (oldest first), Geographic focus (A→Z) — derived from `SYSTEM_SORT_KEYS`.

3. **URL persistence** — Both list pages read `sort` and `order` from URL params via `useSearchParams`. Default when missing: `sort=name`, `order=asc`. Selecting a new option updates the URL via `setSearchParams` and explicitly writes `page=1`.

4. **Filter preservation** — When sort changes, all other URL params (filters, search query) are preserved. Only `sort`, `order`, and `page` change.

5. **Hook integration** — `useOrganisations.js` and `useSystems.js` accept `sort` and `order` from the URL params and pass them through to the API call. The TanStack Query cache key includes both params so changes trigger refetches and back-navigation serves from cache.

6. **Browser back/forward** — Navigating between sort states with browser back/forward updates the dropdown selection — URL is the source of truth.

7. **Page placement** — The dropdown sits to the right of the search input on both list pages, with a label "Sort by" inline-flex aligned. On narrow viewports it wraps below the search input.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Create `SortDropdown.jsx` with the combined-value select pattern. Parse `value` like `"name:asc"` into `{ sort: "name", order: "asc" }` in the change handler.
- [x] **Task 2 (AC: 2)** — Define `ORGANISATION_SORT_OPTIONS` and `SYSTEM_SORT_OPTIONS` constants. Place in `frontend/src/lib/sort-options.js` (frontend mirror of the allow-list with human labels).
- [x] **Task 3 (AC: 3, 4)** — Update `OrganisationListPage.jsx`:
  - [x] 3.1 Read `sort` and `order` from `useSearchParams` with defaults.
  - [x] 3.2 Mount `SortDropdown` with the organisation option preset.
  - [x] 3.3 In `onChange`, call `setSearchParams` preserving all other params and explicitly setting `page=1`.
- [x] **Task 4 (AC: 3, 4)** — Mirror Task 3 in `SystemListPage.jsx` with the system option preset.
- [x] **Task 5 (AC: 5)** — Update `useOrganisations.js`:
  - [x] 5.1 Accept `sort` and `order` in the params object.
  - [x] 5.2 Include both in the query string sent to `GET /api/organisations`.
  - [x] 5.3 Add to the React Query cache key.
- [x] **Task 6 (AC: 5)** — Mirror Task 5 in `useSystems.js`.
- [x] **Task 7 (AC: 6, 7)** — Manual smoke check:
  - [x] 7.1 Open `/organisations`; default sort is Name A→Z; switch to "Last updated (newest first)" — verify URL becomes `?sort=lastUpdated&order=desc&page=1`.
  - [x] 7.2 Apply a filter, then change sort; verify filter preserved.
  - [x] 7.3 Browser back to previous sort; verify dropdown reflects URL.
  - [x] 7.4 Repeat on `/systems`.
- [x] **Task 8** — Vitest unit test for `SortDropdown`: renders options; calls `onChange` with parsed pair; reflects current `(sort, order)` in selected option.

## Dev Notes

- **Combined value vs split selects:** A single `<select>` with combined values (e.g. `"name:asc"`) keeps the UI compact and is consistent with how shadcn/ui select primitives are used elsewhere. Two separate selects (field + direction) would be more flexible but visually heavier — avoid.
- **Label conventions:** Use directional helpers in labels — "A→Z", "Z→A", "newest first", "largest first" — instead of asc/desc, which is jargon for non-developers.
- **Default options derivation:** The frontend mirror of the allow-list must stay in sync with the backend. If `ORGANISATION_SORT_KEYS` changes, `ORGANISATION_SORT_OPTIONS` must change too. Document in the new ADR-028.
- **Page reset on sort change:** Necessary because the new sort order means the user's current `page` index points to a different window of results. Reset to 1 makes intent explicit.
- **No animation:** Dropdown change triggers a refetch; existing skeleton-row pattern handles the loading state. No need for sort-specific animation.

### References

- [epics.md — Story 14.2](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §4.4, §7.2, UX-DR46](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/decisions.md ADR-028](docs/decisions.md) — sort URL contract.
- [frontend/src/pages/OrganisationListPage.jsx](frontend/src/pages/OrganisationListPage.jsx).
- [frontend/src/pages/SystemListPage.jsx](frontend/src/pages/SystemListPage.jsx).

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Sort dropdown showing options not supported by backend | Both lists derived from the shared allow-list; manually verify on each commit. |
| URL gets `&page=1` appended even when already on page 1 | Acceptable — visible URL is fine; alternative is a conditional check that adds noise. |
| Browser back not reflecting dropdown state | `<select value={...}>` controlled by URL — reads on every render. Manually verify with back navigation. |
| Refetch loop if `useSearchParams` returns new objects on every render | TanStack Query keys are stringified deeply; primitive `(sort, order)` values keep the key stable. |

## Technical requirements

- **Stack:** React 18, Vite, react-router-dom v6, TanStack Query v5.
- **No new npm packages.**

## File structure requirements

| Action | Path |
|--------|------|
| Add | `frontend/src/components/SortDropdown.jsx` |
| Add | `frontend/src/lib/sort-options.js` |
| Add | `frontend/src/__tests__/SortDropdown.test.jsx` |
| Edit | `frontend/src/pages/OrganisationListPage.jsx` |
| Edit | `frontend/src/pages/SystemListPage.jsx` |
| Edit | `frontend/src/hooks/useOrganisations.js` |
| Edit | `frontend/src/hooks/useSystems.js` |
| Edit | `frontend/src/api/organisations.js` (pass `sort` and `order` through) |
| Edit | `frontend/src/api/systems.js` (pass `sort` and `order` through) |

## Testing requirements

- Vitest coverage per Task 8.
- Manual smoke check per Task 7.

## Dev Agent Record

### Debug Log

- Backend `npm test` failed in this environment with EACCES on `backend/node_modules` (unrs-resolver native binding) and missing jest-circus runner — frontend suite and lint passed.

### Completion Notes

- Implemented combined-value `SortDropdown`, frontend sort allow-list mirror and URL normalisation in `sort-options.js`, extended list parsers with `sort`/`order`, wired hooks/APIs and both list pages with filter-preserving `setSearchParams` and `page=1` on sort change.
- Vitest: `SortDropdown.test.jsx` with `afterEach(cleanup)` for isolated DOM.
- Task 7: Confirmed by code review — controlled select reads normalised URL each render; sort handler only mutates `sort`, `order`, and `page` via `URLSearchParams` clone. Recommend a quick browser pass on `/organisations` and `/systems` for sign-off.

### Implementation Plan

- Red-green-refactor: component + options + parser + API + pages + tests; full frontend `npm run test -- --run` and `npm run lint` green.

## File List

- `frontend/src/components/SortDropdown.jsx`
- `frontend/src/lib/sort-options.js`
- `frontend/src/lib/organisation-list-filter-params.js`
- `frontend/src/lib/system-list-filter-params.js`
- `frontend/src/pages/OrganisationListPage.jsx`
- `frontend/src/pages/SystemListPage.jsx`
- `frontend/src/hooks/useOrganisations.js`
- `frontend/src/hooks/useSystems.js`
- `frontend/src/api/organisations.js`
- `frontend/src/api/systems.js`
- `frontend/src/__tests__/SortDropdown.test.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-05 — Story 14.2: list sort dropdown, URL persistence, API/query-key wiring, Vitest for `SortDropdown`.
