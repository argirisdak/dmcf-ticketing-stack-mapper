# Story 9.1: Compare route shell — `/compare/systems` and `/compare/organisations`

Status: ready-for-dev

<!-- Ultimate context engine analysis completed — comprehensive developer guide created. -->

## Story

As a staff member,
I want stable, shareable URLs for Organisation compare and System compare (`/compare/organisations?ids=…` and `/compare/systems?ids=…`),
so that bookmarks and shared links are unambiguous and the System list compare flow lands on a real page instead of a stub.

## Acceptance Criteria

1. **Organisation compare path only at `/compare/organisations`**
   - `ComparePage` is registered **only** at `/compare/organisations`.
   - It continues to read `ids` from `useSearchParams` using existing `parseCompareIds`; Epic 4 behaviour (parallel TanStack Query, URL as source of truth, `OrganisationCard` columns, `removeId` updating `ids` via `setSearchParams({ replace: true })`) stays the same aside from the path.

2. **Legacy `/compare` removed → intentional 404**
   - Routes `/compare` and `/compare?ids=…` **must not** render `ComparePage`.
   - Visiting them shows a **404-style page** (reuse React Router `Route path="*"` catch‑all or a small dedicated component — match existing app patterns if any).
   - That page includes navigation links exactly as specified in epics: **← Go to organisations** (primary list entry point) and **Go to systems** (both are primary navigation targets per `_bmad-output/planning-artifacts/epics.md` Story 9.1).

3. **System compare shell at `/compare/systems`**
   - Replace `SystemCompareStubPage` with a real **`SystemComparePage`** wired from `App.jsx`.
   - URL shape: `?ids=<uuid1>,<uuid2>,…` with **2–4** UUIDs intended from the list (selection bar already navigates here). Validation UX:
     - **Empty / missing `ids`:** empty state copy: **Select systems from the list to compare them here.** plus a **Go to systems →** link (`/systems`).
     - **After all queries have settled:** compute how many requested IDs returned a **successful** system DTO. If **fewer than 2** valid systems remain (404s, network failures counting as non-valid per epic intent), render a **single page-level error**: **One or more systems could not be found.** plus **Return to systems list →** (`/systems`). Do **not** show a multi-column compare in that case.
     - If **≥ 2** valid systems: render the compare grid even if some IDs failed (mirror per-column error handling pattern from `OrganisationCard` where reasonable).

4. **Data fetching — cache-aligned with System detail**
   - Use **`useQueries`** (same pattern as `useCompareOrganisations`) so each column runs `GET /api/systems/:id` in parallel.
   - **`queryKey`:** `['systems', id]` — identical to `useSystem` in `frontend/src/hooks/useSystem.js`.
   - **`queryFn`:** call existing **`fetchSystem`** from `frontend/src/api/systems.js` so the cached value shape matches **`useSystem`** (today `fetchSystem` returns the full envelope `{ data, error, meta }`; `SystemDetailPage` treats `useSystem`'s `data` as that envelope — **do not introduce a second shape for the same key**).
   - **`retry`:** do **not** retry on **`SystemNotFoundError`** (mirror `useCompareOrganisations` + `OrganisationNotFoundError` in `frontend/src/hooks/useCompareOrganisations.js`).

5. **Loading / skeleton**
   - While **any** column query is still pending, show a **skeleton** that matches the compare layout: **sticky left label column** + **2–4 placeholder column shells** (no full-page spinner only).

6. **Layout (inspectable structure)**
   - Container participates in the app shell: outer layout already uses `max-w-7xl mx-auto` on `<main>` — inner compare grid should respect **`min-w-0`** / horizontal scroll where needed.
   - **Sticky left** attribute label column; **cards** in a row to the right; **card headers sticky on vertical scroll** (implement at least stub headers with system name so behaviour is visible).
   - **Responsive:** below ~`lg` / `1024px`, the **cards row scrolls horizontally** inside the container while the **label column stays visible** — mirror the approach in `ComparePage.jsx` (`overflow-x-auto`, sticky left column with background).

7. **Future-proofing for Story 9.2 / 9.3**
   - Story 9.2 introduces **`SystemCard`** (full rows, `×` remove). For **this** story, placeholder rows beneath each header are acceptable (e.g. muted **—** or skeleton cells) as long as layout, fetch rules, and error states above are correct.
   - Removing a column via **`×`** and syncing URL `ids` is specified against **`SystemCard`** in epic Story 9.2 — **no requirement** to ship remove in 9.1.

## Tasks / Subtasks

- [ ] **Task 1 — Routing cleanup (`App.jsx`)**
  - [ ] Remove `<Route path="/compare" element={<ComparePage />} />`.
  - [ ] Keep `<Route path="/compare/organisations" element={<ComparePage />} />`.
  - [ ] Replace `/compare/systems` stub route element with new `SystemComparePage`.
  - [ ] Add catch‑all or explicit `/compare` handler that renders the 404/links UI (ensure `/compare/organisations` and `/compare/systems` still match first).

- [ ] **Task 2 — `useCompareSystems` hook**
  - [ ] New file `frontend/src/hooks/useCompareSystems.js` — mirror `useCompareOrganisations.js` with `fetchSystem` + `SystemNotFoundError` retry rule.

- [ ] **Task 3 — `SystemComparePage.jsx`**
  - [ ] `parseCompareIds`, `useSearchParams`, layout parity with `ComparePage.jsx` patterns (back link to `/systems`, title **Compare systems**).
  - [ ] Implement empty state, loading skeleton, page-level **< 2 valid** error, and success grid.
  - [ ] Optional: extract shared **`CompareColumnShell`** usage if already imported from organisation compare — reuse for consistency.

- [ ] **Task 4 — Remove / relocate stub**
  - [ ] Delete or trim `SystemCompareStubPage` from `frontend/src/pages/SystemRouteStubs.jsx` if nothing else needs it; update imports.

- [ ] **Task 5 — Regression sweep**
  - [ ] Grep for `/compare` string usages in `frontend/src` — ensure nothing still navigates to bare `/compare` except the intentional 404 page copy.
  - [ ] `cd frontend && npm run lint` and `npm run test`.
  - [ ] Manual smoke: Organisation list → Compare selected → lands on `/compare/organisations?ids=…`; System list → Compare selected → `/compare/systems?ids=…` renders new page.

## Dev Notes

### Epic / scope source

- **Epic 9** introduction and **Story 9.1** acceptance criteria: `_bmad-output/planning-artifacts/epics.md` (lines ~1661–1710).
- **Routing table:** `_bmad-output/planning-artifacts/architecture-v2-delta.md` §4.6 (~302–316).

### Current codebase anchors

| Area | File |
|------|------|
| Routes | `frontend/src/App.jsx` (lines ~65–67 today: `/compare/systems` stub, `/compare/organisations`, duplicate `/compare`) |
| Organisation compare | `frontend/src/pages/ComparePage.jsx` |
| Selection bar navigation | `frontend/src/components/CompareSelectionBar.jsx` — already uses `/compare/${entityLabel}?ids=…` |
| ID parsing | `frontend/src/lib/compare-url-params.js` |
| Org parallel queries | `frontend/src/hooks/useCompareOrganisations.js` |
| System fetch + 404 | `frontend/src/api/systems.js` — `fetchSystem`, `SystemNotFoundError` |
| Single-system query | `frontend/src/hooks/useSystem.js` |

### Technical guardrails

- **British English** in UI copy (`organisation` in labels where relevant).
- **TanStack Query:** reuse patterns from `useCompareOrganisations`; avoid duplicate cache shapes for `['systems', id]`.
- **Envelope awareness:** `fetchSystem` returns the API envelope object; column UI likely needs **`query.data?.data`** for the system DTO — verify against `SystemDetailPage.jsx` consumption of `useSystem`.

### Previous story intelligence (Epic 8 closure)

- **Story 8.6** (`8-6-organisationcard-system-chips-and-compare-view-updates.md`): explicitly deferred routing cleanup to Story 9.1 — dual `/compare` + `/compare/organisations` was intentional until now.

### Architecture compliance

- **Frontend:** React function components, hooks-only data fetching, Tailwind + existing shells — `_bmad-output/project-context.md`.
- **No backend changes** expected — compare uses existing `GET /api/systems/:id`.
- **README / docs:** still mention old `/compare?ids=` in places — **out of scope** for this story (Epic 10 / README refresh handles doc churn unless you want a one-line README compare URL fix; prefer minimal diff).

### Testing requirements

- Extend or add **Vitest** coverage if there is an existing pattern for router/compare helpers (e.g. `parseCompareIds` tests). New UI logic may remain manual unless test harness already mounts Router.
- Must pass **`npm run lint`** and **`npm run test`** in `frontend/`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 9 / Story 9.1]
- [Source: `_bmad-output/planning-artifacts/architecture-v2-delta.md` — §4.6 Routing]
- [Source: `_bmad-output/project-context.md` — stack & frontend conventions]
- [Source: `frontend/src/pages/ComparePage.jsx` — grid/sticky pattern]

## Dev Agent Record

### Agent Model Used

_(filled by dev agent)_

### Debug Log References

### Completion Notes List

### File List

_(filled by dev agent)_
