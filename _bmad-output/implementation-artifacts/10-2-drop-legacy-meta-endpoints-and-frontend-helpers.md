# Story 10.2: Drop Legacy Meta Endpoints and Frontend Helpers

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a frontend developer,
I want the legacy `/api/meta/ticketing-providers` and `/api/meta/crm-platforms` endpoints and the corresponding client helpers removed,
so that no dead surface area remains after the v2 pivot completes.

## Acceptance Criteria

1. **Backend meta layer**  
   **Given** Migration C from Story 10.1 has applied and the lookup tables no longer exist  
   **When** `backend/src/routes/meta.js`, `backend/src/controllers/meta-controller.js`, and any meta-related services are reviewed  
   **Then** there are no routes or handlers for `GET /api/meta/ticketing-providers` or `GET /api/meta/crm-platforms`  
   **And** there are no `TicketingProvider` or `CrmPlatform` imports from `@prisma/client` in the meta layer  
   **Note:** Story 10.1 already removed the handlers and route mounts — verify and keep clean; do not reintroduce.

2. **Explicit 404 for removed paths**  
   **Given** the legacy paths are not mounted  
   **When** a client requests `GET /api/meta/ticketing-providers` or `GET /api/meta/crm-platforms`  
   **Then** the response is **404** with the standard JSON envelope:  
   `{ data: null, error: { message: "Route not found" }, meta: null }`  
   **Current gap:** Today `app.js` has no API-wide 404 middleware — these URLs return Express’s default **HTML** `Cannot GET …` (verified). This story must satisfy the epic’s “explicit rather than silent” requirement via a **global** (or API-scoped) JSON 404 handler after all `app.use` route mounts.

3. **Remaining meta endpoint**  
   **Given** `GET /api/meta/organisation-types` is the only data meta endpoint  
   **When** it is called  
   **Then** it still returns seeded organisation types unchanged (same shape and behaviour as v1).

4. **Frontend API module**  
   **Given** `frontend/src/api/meta.js` exports `fetchTicketingProviders` and `fetchCrmPlatforms`  
   **When** v2 cleanup is applied  
   **Then** both functions are **deleted**  
   **And** `fetchOrganisationTypes` and shared `fetchMetaOptions` remain for org-type dropdowns.

5. **Frontend hooks**  
   **Given** `frontend/src/hooks/useMetaReferenceData.js` exposes provider/CRM queries  
   **When** cleanup is applied  
   **Then** `useTicketingProvidersQuery` and `useCrmPlatformsQuery` are **removed**  
   **And** `useOrganisationTypesQuery` remains.

6. **No consumers**  
   **Given** Epic 8 migrated Organisation surfaces off legacy meta hooks  
   **When** the repo is searched  
   **Then** there are **zero** imports of the deleted symbols (`fetchTicketingProviders`, `fetchCrmPlatforms`, `useTicketingProvidersQuery`, `useCrmPlatformsQuery`)  
   **Current state:** Only `OrganisationListPage.jsx` and `OrganisationFormPage.jsx` import from `useMetaReferenceData.js`, and both use **`useOrganisationTypesQuery` only** — confirm with `rg` after edits.

7. **Filter / list UX**  
   **Given** System list and Organisation list filter sidebars  
   **When** inspected  
   **Then** system filtering uses `useSystems` / `useSystemSearch` (per Story 8.3), not deleted helpers  
   **And** Organisation adopted-system combobox uses `useSystemSearch` — no regression.

## Tasks / Subtasks

- [x] **Backend — JSON 404** (AC: #2)  
  - [x] After all routes in `backend/src/app.js`, register a catch-all middleware that returns `404` + `{ data: null, error: { message: 'Route not found' }, meta: null }` for unmatched requests (scope at least `/api/*` if you need to avoid changing non-API behaviour; simplest is all unmatched routes).  
  - [x] Add Jest/Supertest coverage: `GET /api/meta/ticketing-providers` and `GET /api/meta/crm-platforms` assert status `404` and envelope shape (new test file or extend `meta-controller.test.js` / `health.test.js` — prefer a small dedicated `app-404.test.js` or similar).

- [x] **Backend — verification** (AC: #1, #3)  
  - [x] Confirm `meta.js` only mounts `GET /organisation-types`; `meta-controller.js` only exports `getOrganisationTypes`; `rg TicketingProvider|CrmPlatform|ticketing-providers|crm-platforms backend/src` is clean.

- [x] **Frontend — remove dead exports** (AC: #4, #5, #6)  
  - [x] Edit `frontend/src/api/meta.js` — remove `fetchTicketingProviders`, `fetchCrmPlatforms`.  
  - [x] Edit `frontend/src/hooks/useMetaReferenceData.js` — remove CRM/provider query hooks and unused imports.  
  - [x] Run `rg` from repo root for deleted symbol names → zero hits outside `_bmad-output` / historical story markdown.

- [x] **Quality gates**  
  - [x] `cd backend && npm test`  
  - [x] `cd frontend && npm run lint && npm run test`

### Review Findings

- [x] [Review][Decision] Branch scope vs Story 10.2 sign-off — **Resolved 2026-05-02:** Option **1** — sign off Story 10.2 on this combined branch (Epic 9 + Prisma/sprint/planning + 10.2) as intentional; no split required before closing 10.2.

- [x] [Review][Patch] Commit untracked implementation files required by the tracked diff — **Applied 2026-05-02:** Staged and committed `backend/`, `frontend/`, and `_bmad-output/implementation-artifacts/` (excluding `code-review-session/` and `.agents/`). Backend 215 tests, frontend lint + 36 tests passing.

- [x] [Review][Defer] Mixed-epic diff and bisection — Large combined diff complicates rollback and story-isolated review; prefer smaller PRs per epic/story when practical. [`repository-wide`]

- [x] [Review][Defer] Compare organisations page only renders the “Compare systems used by these organisations” strip when `organisationsSystemUnion.kind === 'ready'` — If the union helper exposes error or stale non-ready states, users might get no strip or link without explanation; verify in `deriveCompareOrganisationsSystemUnion` / consumers after union file is in-tree. [`frontend/src/pages/ComparePage.jsx`]

## Dev Notes

### Current codebase state (must read before editing)

- **`backend/src/app.js`** — mounts `/api/meta` with only `organisation-types`; **no** global JSON 404 (legacy meta URLs → HTML 404).  
- **`backend/src/routes/meta.js`** — single route: `router.get('/organisation-types', ...)`.  
- **`backend/src/controllers/meta-controller.js`** — only `getOrganisationTypes`; no Prisma delegates for dropped models.  
- **`frontend/src/api/meta.js`** — still exports `fetchTicketingProviders` / `fetchCrmPlatforms` pointing at **removed** backend paths (broken if called).  
- **`frontend/src/hooks/useMetaReferenceData.js`** — still defines `useTicketingProvidersQuery` / `useCrmPlatformsQuery`; **no page imports them** (only org-type hook is used).

### What this story changes vs preserves

| Change | Preserve |
|--------|----------|
| Add API JSON 404 so removed meta URLs match epic contract | `GET /api/meta/organisation-types` behaviour and envelope |
| Delete frontend provider/CRM fetchers and hooks | `fetchMetaOptions`, `fetchOrganisationTypes`, `useOrganisationTypesQuery` |
| New/updated tests for 404 envelope | All existing organisation/system routes and 404 messages for **resources** (e.g. “Organisation not found”) |

### Error envelope nuance

- Epic AC uses `error: { message: "Route not found" }` **without** `fields: []`. Elsewhere controllers often use `fields: []`. Prefer **exact epic text** for the global route 404 unless you decide to align with `organisation-controller` / `system-controller` and update the epic in review — default to **AC as written**.

### Architecture compliance

- Stack: Express 5, Prisma 6, React + TanStack Query — unchanged ([project-context.md](../../project-context.md), [CLAUDE.md](../../../CLAUDE.md)).  
- API envelope `{ data, error, meta }` for all JSON responses.  
- Meta endpoint removal aligns with [architecture-v2-delta.md](../planning-artifacts/architecture-v2-delta.md) (drop legacy meta paths).  
- Spelling: British English in UI copy; file names remain kebab-case.

### File / touch list (expected)

| Area | Files |
|------|--------|
| Backend app shell | `backend/src/app.js` (404 middleware) |
| Backend tests | New or existing `backend/src/__tests__/*.test.js` for legacy meta paths → 404 JSON |
| Frontend API | `frontend/src/api/meta.js` |
| Frontend hooks | `frontend/src/hooks/useMetaReferenceData.js` |

### Testing requirements

- **Backend:** Supertest against `app` — two GETs on removed paths + body JSON parse.  
- **Frontend:** Lint + Vitest (no tests today reference removed symbols; regression unlikely).  
- **Manual (optional):** Hit legacy URLs via curl — `Content-Type: application/json` body with envelope.

### Previous story intelligence (10.1)

- Migration C and backend meta **handlers/routes** for ticketing/CRM were removed in 10.1 so Prisma would compile; **frontend cleanup was explicitly deferred** to 10.2.  
- Deferred-work note: [`deferred-work.md`](deferred-work.md) calls out `frontend/src/api/meta.js` still targeting removed REST paths — this story closes that.  
- Do **not** re-add Prisma meta queries for dropped models.

### Git intelligence (recent themes)

- Recent commits: ticketing/systems features, README, seed — follow existing Express + Jest patterns; keep diffs minimal.

### Latest tech notes

- No dependency upgrades. Express 5: standard `(req, res, next) => { … }` last middleware for unmatched routes.

### Project context reference

- [_bmad-output/project-context.md](../../project-context.md) — API envelope, hooks-only data fetch, no dead endpoints.  
- [epics.md Epic 10 / Story 10.2](../planning-artifacts/epics.md) — source acceptance criteria.  
- README smoke steps that still mention legacy meta URLs are updated in **Story 10.3**, not this story.

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor agent)

### Debug Log References

### Completion Notes List

- Added global JSON 404 handler in `backend/src/app.js` after all route mounts; legacy meta paths return `{ data: null, error: { message: 'Route not found' }, meta: null }` per AC (no `fields` on route-not-found).
- New `backend/src/__tests__/app-404.test.js` — Supertest coverage for removed meta URLs.
- Removed `fetchTicketingProviders` / `fetchCrmPlatforms` and provider/CRM query hooks; `frontend/src` has zero references to deleted symbols. Meta layer verified: only organisation-types route and `getOrganisationTypes`; `rg` on `backend/src` shows only test path strings for legacy URLs.
- Quality: `backend npm test` (215 tests), `frontend npm run lint`, `frontend npm run test` (36 tests) — all passing.

### File List

- backend/src/app.js
- backend/src/__tests__/app-404.test.js
- frontend/src/api/meta.js
- frontend/src/hooks/useMetaReferenceData.js

## Change Log

- 2026-05-02 — Story 10.2: JSON 404 for unmatched routes; remove legacy meta client helpers and hooks; add app 404 tests.
