# Story 15.2: New Endpoint — `GET /api/organisations/check-similar`

Status: done

## Story

As a backend developer,
I want a focused endpoint that returns up to 5 minimal similar-organisation matches for a given name,
so that the form's fuzzy-match warning has a fast, narrow query path.

## Acceptance Criteria

1. **Route registration** — `GET /api/organisations/check-similar` is registered in `backend/src/routes/organisations.js`. The route is **before** the dynamic `/:id` route to avoid being shadowed by id parsing.

2. **Query params** — Accepts:
   - `name` (required, string, min 2 chars after trim) — the name to match against.
   - `excludeId` (optional, UUID string) — exclude the row with this id from results (used by edit form to prevent self-flag, though MVP warning UX is create-only — endpoint supports the param for forward compat).

3. **Validation** — Missing or short `name` returns 400 with `fields: [{ field: "name", message: "Name must be at least 2 characters." }]`. Invalid `excludeId` (not a UUID) returns 400 with `fields: [{ field: "excludeId", message: "Must be a valid UUID." }]`.

4. **Response shape** — Success returns `{ data: [{ id, name, city, country }], error: null, meta: null }` with up to 5 entries.

5. **Match query** — Implementation uses the existing `pg_trgm` GIN index on `organisation.name`. SQL pattern (per architecture-v3-delta §3.5):
   ```sql
   SELECT id, name, city, country FROM organisation
   WHERE id <> COALESCE($2, '00000000-0000-0000-0000-000000000000')
     AND (name ILIKE $1 || '%' OR name ILIKE '%' || $1 || '%' OR similarity(name, $1) > 0.4)
   ORDER BY similarity(name, $1) DESC
   LIMIT 5;
   ```
   The `0.4` threshold is the starting value — tuneable.

6. **Performance** — A typical request completes in under 50 ms against a seeded DB (hundreds of rows). The trigram index makes this comparable to the existing search endpoint.

7. **DTO mapping** — The result is mapped through a minimal DTO (no full `toOrganisationDto`); only `id`, `name`, `city`, `country` are returned. Other fields are not leaked through this endpoint.

8. **Tests** — Jest tests cover:
   - Successful similar match returns expected rows.
   - `name=A` (1 char) returns 400.
   - `excludeId` properly excludes the named row.
   - Invalid `excludeId` returns 400.
   - No matches returns `data: []`.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Add route in `organisations.js` **before** the `/:id` handler. The literal segment `check-similar` will not be matched by `:id` if registration order is correct, but for safety also add a UUID-pattern check on the `:id` route (already present per ADR-012).
- [x] **Task 2 (AC: 2, 3)** — Add `checkSimilarOrganisations` controller handler in `organisation-controller.js`. Validate `name` (trim, length ≥ 2) and `excludeId` (UUID regex if present). Reject with 400 envelope on miss.
- [x] **Task 3 (AC: 5, 6)** — Add `findSimilarOrganisations(name, excludeId)` service function in `organisation-service.js`. Use `prisma.$queryRaw` with the SQL pattern from AC5.
- [x] **Task 4 (AC: 4, 7)** — Map the raw query result to the minimal DTO shape `{ id, name, city, country }`. Don't reuse `toOrganisationDto` — that returns the full shape with `fieldSources`, `systems[]`, etc.
- [x] **Task 5 (AC: 8)** — Add Jest tests:
  - [x] 5.1 Seed two orgs with similar names (e.g. "Royal Opera House" / "Royal Opera Hse"); assert similarity match.
  - [x] 5.2 Validation rejection for short name and invalid UUID.
  - [x] 5.3 `excludeId` exclusion path.
  - [x] 5.4 Empty result for a name with no matches.
- [x] **Task 6** — Manual smoke check via `curl`:
  - [x] 6.1 `GET /api/organisations/check-similar?name=Theatre` returns up to 5 sorted results.
  - [x] 6.2 `GET /api/organisations/check-similar?name=A` returns 400.
  - [x] 6.3 `GET /api/organisations/check-similar?name=Royal&excludeId=<uuid>` excludes that row.

### Review Findings

- [x] [Review][Decision] Empty or whitespace-only `excludeId` — **Resolved (2026-05-04):** keep current contract — any present `excludeId` must be a valid UUID after trim; empty/whitespace → 400 (`Must be a valid UUID.`).

- [x] [Review][Patch] ILIKE metacharacters in `name` widen matches — **Fixed (2026-05-04):** `escapeIlikePattern` + `ILIKE … ESCAPE '\\'` for prefix/substring patterns; `similarity()` still uses the raw term. Tests: `escapeIlikePattern` unit cases. [`backend/src/services/organisation-service.js`](backend/src/services/organisation-service.js)

- [x] [Review][Defer] Story-scoped diff noise — The same change-set updates `sprint-status.yaml` broadly (epics 10–15), organisation list `sort`/`order`, `fieldSources`, and composite-unique `P2002` handling alongside Story 15.2; increases review risk and blames unrelated concerns on this story. Prefer narrower commits when practical. — deferred, pre-existing

- [x] [Review][Defer] AC6 (50 ms) not automated — Acceptance criterion 6 is an NFR; automated tests do not assert latency. Manual smoke remains the check unless you add a gated perf test later. — deferred, pre-existing

- [x] [Review][Defer] Integration suite optional when `DATABASE_URL` unset — `organisation-check-similar.integration.test.js` uses `describe.skip` without DB; CI jobs without `DATABASE_URL` get a green run without exercising the integration path. Confirm CI always supplies DB for backend tests or document the gap. [`backend/src/__tests__/organisation-check-similar.integration.test.js`](backend/src/__tests__/organisation-check-similar.integration.test.js) — deferred, pre-existing

- [x] [Review][Defer] Composite-unique `P2002` detection heuristic — `isOrganisationNameCityCountryUniqueViolation` treats string `meta.target` via `includes('name_city_country')`; a differently named constraint could mis-classify. Bundled with non–15.2 controller changes. — deferred, pre-existing

## Dev Notes

- **Why a separate endpoint vs `?q=`:** The existing `?q=` search endpoint returns the full DTO with `fieldSources`, `systems[]`, pagination metadata, etc. The warning UX needs a *minimal* shape and a hard 5-result cap. A focused endpoint keeps the contract narrow and the response payload small (matters for P2 — no extra round-trips on the form).
- **Threshold tuning:** `0.4` is empirical. If too lenient (too many false matches), raise to `0.5`. If too strict (missing real near-duplicates), lower to `0.3`. Document the chosen value in the new ADR if it deviates from the default.
- **Substring match OR similarity:** The OR condition makes the query more forgiving — substring catches "Royal Opera" finding "Royal Opera House", similarity catches "Royal Opera Hse" finding "Royal Opera House". Both are real near-duplicate patterns.
- **Out of scope:** The frontend hook and warning UX (Story 15.3).
- **Index reuse:** The existing `pg_trgm` GIN index on `organisation.name` is what makes the similarity scan fast. Don't add a new index.

### References

- [epics.md — Story 15.2](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §3.5](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [backend/src/services/organisation-service.js](backend/src/services/organisation-service.js).
- [backend/src/routes/organisations.js](backend/src/routes/organisations.js).

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Route shadowed by `/:id` | Register `check-similar` before `/:id` in the routes file; verify with a curl test. |
| Threshold too lenient → noisy warnings | Tune empirically against real seed; document chosen value. |
| Raw SQL injection via `name` param | Use `prisma.$queryRaw` with parameter binding (`$1`, `$2`); never concatenate. |
| Returning full DTO accidentally | Use a separate minimal DTO; tests assert response keys. |

## Technical requirements

- **Stack:** Express 5, Prisma 6, PostgreSQL with `pg_trgm`.
- **No new npm packages.**

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `backend/src/routes/organisations.js` |
| Edit | `backend/src/controllers/organisation-controller.js` |
| Edit | `backend/src/services/organisation-service.js` |
| Edit | `backend/src/__tests__/organisation-controller.test.js` |
| Edit | `backend/src/__tests__/organisation-service.test.js` |

## Testing requirements

- Jest coverage per AC8.
- Manual smoke check per Task 6.

## Dev Agent Record

### Debug Log

- Integration tests failed initially: `organisation.id` is `TEXT` in PostgreSQL, so `::uuid` casts in raw SQL were removed; exclusion uses `id <> COALESCE(${excludeId}, sentinel)` (text-safe).
- Host `npm test` can fail on broken local `node_modules` permissions; full suite verified in Docker: `docker compose run --rm backend sh -c "npx prisma migrate deploy && npx jest --runInBand"` (330 tests).

### Completion Notes

- Delivered `GET /api/organisations/check-similar` with query validation, `findSimilarOrganisations` + minimal DTO mapping, and tests (controller mock, service mock, DB integration). Smoke-tested with `curl` against a running backend (Theatre / `name=A` / `excludeId`).

### Implementation Plan

- Register static route before `/:id`; controller validates `name` and optional `excludeId`; service runs parameterized `$queryRaw` using `pg_trgm` `similarity` + `ILIKE` per AC5; map rows without `toOrganisationDto`.

## File List

- `backend/src/routes/organisations.js`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `backend/src/__tests__/organisation-check-similar.integration.test.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- **2026-05-04** — Story 15.2: check-similar endpoint, tests, integration file; sprint status → review for `15-2-new-endpoint-check-similar-organisations`.
