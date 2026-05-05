# Story 14.1: API — `?sort` and `?order` on Both List Endpoints

Status: done

## Story

As a backend developer,
I want `GET /api/organisations` and `GET /api/systems` to accept `sort` and `order` query params validated against per-entity allow-lists,
so that the frontend can drive sorting through familiar query-param contracts.

## Acceptance Criteria

1. **Sort allow-list module** — `backend/src/lib/sort-allowlists.js` is created. Exports two frozen arrays:
   - `ORGANISATION_SORT_KEYS = ['name', 'country', 'lastUpdated', 'capacity', 'organisationType']`
   - `SYSTEM_SORT_KEYS = ['name', 'vendor', 'category', 'lastUpdated', 'geographicFocus']`

2. **Organisation list contract** — `GET /api/organisations` accepts `sort=<key>&order=asc|desc`. Default when omitted: `sort=name&order=asc`.

3. **System list contract** — `GET /api/systems` accepts the same two params with its own allow-list. Default: `sort=name&order=asc`.

4. **Validation** — Invalid `sort` (not in allow-list) returns 400 with `fields: [{ field: "sort", message: "Sort field must be one of: <list>" }]`. Invalid `order` (not `asc` or `desc`) returns 400 with `fields: [{ field: "order", message: "Order must be asc or desc" }]`. Missing both falls through to the default.

5. **Service translation** — Each service builds a Prisma `orderBy` from `(sort, order)`:
   - Scalar fields map directly: `{ name: order }`, `{ country: order }`, etc.
   - Relation fields use nested syntax: `organisationType` → `{ organisation_type: { name: order } }`; `vendor` is a direct column on `system`.
   - `lastUpdated` maps to the snake_case column `last_updated`.

6. **Compose with filter, search, pagination** — Sort applies after filter/search and before pagination. A request like `?q=opera&country=UK&sort=lastUpdated&order=desc&page=1` returns the correct ordered window.

7. **Pagination metadata unchanged** — `meta: { page, limit, total, totalPages }` is unaffected by sort.

8. **Tests** — Jest tests cover:
   - Default sort (no params) returns alphabetical ascending.
   - Each allow-listed sort key + direction returns expected order.
   - Invalid `sort` → 400 with correct `fields[]`.
   - Invalid `order` → 400 with correct `fields[]`.
   - Sort + filter + search composition on at least one entity.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Create `backend/src/lib/sort-allowlists.js`.
- [x] **Task 2 (AC: 2, 3, 4)** — Update `organisation-controller.js` and `system-controller.js`:
  - [x] 2.1 Parse `sort` and `order` from `req.query`.
  - [x] 2.2 Validate against the allow-list; reject with 400 on miss.
  - [x] 2.3 Pass validated `(sort, order)` tuple to the service.
- [x] **Task 3 (AC: 5)** — Update `organisation-service.js` and `system-service.js`:
  - [x] 3.1 Add an `orderBy` builder function per service that maps the validated tuple to a Prisma `orderBy` clause.
  - [x] 3.2 For relation sorts (`organisationType`), use nested orderBy syntax.
  - [x] 3.3 Pass the built clause to `findMany`.
- [x] **Task 4 (AC: 8)** — Add Jest tests covering AC4 and AC8 cases. Place coverage in:
  - [x] 4.1 `organisation-controller.test.js`: validation rejection paths.
  - [x] 4.2 `organisation-service.test.js`: orderBy translation, filter+sort composition.
  - [x] 4.3 Mirror coverage in `system-controller.test.js` and `system-service.test.js`.
- [x] **Task 5 (AC: 6, 7)** — Manual smoke check via `curl`:
  - [x] 5.1 `GET /api/organisations?sort=name&order=desc&limit=5` — expect Z→A first 5.
  - [x] 5.2 `GET /api/systems?sort=vendor&order=asc&limit=5` — expect alphabetical-by-vendor first 5.
  - [x] 5.3 `GET /api/organisations?country=UK&sort=lastUpdated&order=desc` — expect UK orgs newest first.

## Dev Notes

- **DTO field names vs Prisma column names:** The allow-list is camelCase (matching DTO output), but Prisma `orderBy` uses the schema field names (snake_case). The service-layer builder translates. Keeping the allow-list in DTO terms means the API contract reads consistently with the rest of the surface.
- **Default ordering:** `name asc` is the most intuitive default for both entities. Don't change this without a reason.
- **Stable ordering:** When sorting by a non-unique field (e.g. `country`), Prisma's order is unspecified for ties. Consider adding a tiebreaker `orderBy: [{ country: order }, { name: 'asc' }]` if pagination consistency becomes an issue — but defer until evidence shows it matters.
- **Out of scope:** Multi-column sort (`?sort=country,name`) — single-column only for v3.
- **No frontend changes in this story:** Story 14.2 wires the dropdown.

### References

- [epics.md — Story 14.1](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §3.3](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/decisions.md ADR-028](docs/decisions.md) — sort query-param contract.
- [backend/src/services/organisation-service.js](backend/src/services/organisation-service.js).
- [backend/src/services/system-service.js](backend/src/services/system-service.js).

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Allow-list drift between controller validation and service translation | Both read from the same `sort-allowlists.js` constant. |
| Incorrect Prisma syntax for relation sorts | Test explicitly: `?sort=organisationType&order=asc` returns rows ordered by joined `organisation_type.name`. |
| Performance regression on sort by capacity (non-indexed) | Acceptable for MVP scale (hundreds to low thousands of rows). Add an index later if profiling flags it. |
| Tied rows reorder between requests | Acceptable for MVP — see Dev Notes on stable ordering. |

## Technical requirements

- **Stack:** Express 5, Prisma 6.
- **No new npm packages.**

## File structure requirements

| Action | Path |
|--------|------|
| Add | `backend/src/lib/sort-allowlists.js` |
| Edit | `backend/src/controllers/organisation-controller.js` |
| Edit | `backend/src/controllers/system-controller.js` |
| Edit | `backend/src/services/organisation-service.js` |
| Edit | `backend/src/services/system-service.js` |
| Edit | `backend/src/__tests__/organisation-controller.test.js` |
| Edit | `backend/src/__tests__/organisation-service.test.js` |
| Edit | `backend/src/__tests__/system-controller.test.js` |
| Edit | `backend/src/__tests__/system-service.test.js` |

## Testing requirements

- Jest coverage per AC8.
- Manual smoke check per Task 5.

## Dev Agent Record

### Implementation Plan

- Added frozen allow-list module; controllers validate `sort` / `order` with shared constants and default `name` + `asc` when omitted or whitespace-only.
- Services expose `buildOrganisationListOrderBy` / `buildSystemListOrderBy` (exported for tests) mapping camelCase API keys to Prisma field / relation `orderBy`.
- Extended Jest coverage on all four test files; fixed a pre-existing syntax error in `system-controller.test.js` (invalid `expect(.some(...))` nesting) so the suite parses under Babel in Docker.

### Debug Log

- Local `npm test` failed (root-owned `node_modules`, missing jest runner on host). Full suite run successfully via `docker compose build backend && docker compose run --rm --no-deps backend npm test` (312 tests). Task 5 curls run against `docker compose up` stack.

### Completion Notes

- All ACs satisfied: list endpoints accept `sort` and `order`, validate against allow-lists, compose with existing filters/search/pagination, `meta` unchanged.
- Smoke: organisations `name` desc returned Wiener Staatsoper first; systems `vendor` asc returned AudienceView first; UK filter + `lastUpdated` desc returned Royal Opera House first (used `country=United+Kingdom` to match canonical country filter values).

## File List

- `backend/src/lib/sort-allowlists.js` (new)
- `backend/src/controllers/organisation-controller.js`
- `backend/src/controllers/system-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/services/system-service.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `backend/src/__tests__/system-controller.test.js`
- `backend/src/__tests__/system-service.test.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings

- [x] [Review][Defer] Organisation list pagination lacks safe-integer / skip overflow guards [`organisation-controller.js:104-126`] — deferred, pre-existing: `GET /api/systems` validates `page`, `limit`, and `skip` with `Number.isSafeInteger`; organisation list does not. Sort story touched this handler but did not introduce the gap; align hardening when this controller is next refactored.

## Change Log

- 2026-05-04 — Story 14.1: API `sort` / `order` on organisation and system list endpoints; tests and smoke verification; sprint status → review.
- 2026-05-04 — Code review: no patch or decision-needed items; story marked done; sprint synced.
