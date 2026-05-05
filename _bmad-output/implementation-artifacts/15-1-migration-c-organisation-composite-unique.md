# Story 15.1: Migration C — Composite Unique on Organisation `(name, city, country)`

Status: done

## Story

As a backend developer,
I want a composite unique index on `organisation(name, city, country)` and a pre-flight check that surfaces existing collisions,
so that duplicate organisations are blocked at the data layer without forcing legitimate name reuse across cities.

## Acceptance Criteria

1. **Pre-flight collision check** — Before generating or applying the migration, the developer runs the diagnostic SQL `SELECT name, city, country, count(*) AS c FROM organisation GROUP BY name, city, country HAVING count(*) > 1;` against the target environment (local seed DB, then any other environment). The result is recorded in the story's Dev Agent Record. If any rows return, the migration is blocked until the operator manually deduplicates.

2. **Schema (Prisma)** — `Organisation` model gains `@@unique([name, city, country])`.

3. **Migration SQL (constraint only)** — `npx prisma migrate dev --name organisation_composite_unique --create-only` generates SQL containing exactly one statement: `CREATE UNIQUE INDEX "organisation_name_city_country_key" ON "organisation"("name", "city", "country");`

4. **DB shape after apply** — The unique index exists and Prisma's introspection matches the schema. All existing rows are preserved.

5. **NULL semantics accepted** — PostgreSQL treats NULL as distinct in unique indexes. Two `(X, NULL, UK)` rows do **not** collide. This is intentional per the architecture-v3-delta §2.2 — the warning UX (Story 15.3) catches the rest.

6. **Test suite green** — `cd backend && npm test` passes after migration.

7. **Controller error mapping** — `organisation-controller.js` maps Prisma `P2002` errors with `target` containing `name_city_country_key` to a 409 response with envelope `{ data: null, error: { message: "An organisation called \"<name>\" already exists in <city>, <country>.", fields: [{ field: "name", message: "Conflicts with existing organisation in this city and country." }] }, meta: null }`. Other `P2002` errors (different unique constraint) map to a generic 409 without crashing.

8. **Tests for 409 mapping** — Jest test creates an organisation, then attempts to create another with the same `(name, city, country)` and asserts:
   - HTTP status 409.
   - `error.message` mentions both the city and country.
   - `error.fields[0].field === "name"`.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Pre-flight check:
  - [x] 1.1 Run the diagnostic SQL against the local dev DB; record result.
  - [x] 1.2 If non-zero, deduplicate manually (decide which row to keep, delete the rest) and re-run until zero. *(N/A for seed definitions — static check found 0 duplicate groups.)*
  - [x] 1.3 Record the date and result of the check in the story's Dev Agent Record.
- [x] **Task 2 (AC: 2)** — Edit `schema.prisma` to add `@@unique([name, city, country])` to `Organisation`.
- [x] **Task 3 (AC: 3)** — Generate migration with `--create-only`. Inspect SQL; confirm only the one CREATE UNIQUE INDEX statement.
- [x] **Task 4 (AC: 4)** — Apply with `npx prisma migrate dev`. Verify in psql:
  - [x] 4.1 `\d organisation` shows the new unique index.
  - [x] 4.2 `SELECT count(*) FROM organisation;` is unchanged.
  - [x] 4.3 `INSERT INTO organisation (...) VALUES (<duplicate>)` raises `duplicate key value violates unique constraint "organisation_name_city_country_key"`.
- [x] **Task 5 (AC: 7)** — Update `organisation-controller.js`:
  - [x] 5.1 In the catch-block of `createOrganisation` and `updateOrganisation`, check for Prisma `P2002` with `target` containing `'name_city_country_key'`.
  - [x] 5.2 Build the 409 envelope with the conflict message including `name`, `city`, `country` from the request body.
  - [x] 5.3 Don't crash on missing `city` (write "(no city)" or omit from message gracefully).
- [x] **Task 6 (AC: 8)** — Add Jest test in `organisation-controller.test.js` covering the 409 path. Use a real Prisma test DB (test container) — mocking won't catch the constraint behaviour realistically.
- [x] **Task 7 (AC: 6)** — Run full backend test suite.
- [x] **Task 8** — Update README's "After v3 changes ship" section to mention this migration in the deployment runbook (per architecture-v3-delta §6.5 rollback note).

## Dev Agent Record

### Debug Log

- **2026-05-05:** Static seed check (`sample-organisations-seed-data`): **0** rows would violate `GROUP BY name, city, country HAVING count(*) > 1`.
- **2026-05-05:** Agent environment could not run `npx prisma db execute` (Prisma engine copy **EACCES** into root-owned `node_modules`) or `npm test` (Jest / native postinstall failures for same reason). **Argirisdak:** fix ownership (`sudo chown -R "$USER" backend/node_modules` or clean `npm install`), run `npx prisma migrate dev`, execute pre-flight SQL on the target DB, then `cd backend && npm test`.
- **2026-05-04:** Pre-flight on Docker Postgres (`dmcf`): diagnostic `GROUP BY name, city, country HAVING count(*) > 1` returned **0 rows**. `\d organisation` lists unique index `organisation_name_city_country_key` on `(name, city, country)`. Row count **32** before duplicate probe. Intentional duplicate `INSERT` for `(Southbank Centre, London, United Kingdom)` failed with `duplicate key value violates unique constraint "organisation_name_city_country_key"`.
- **2026-05-04:** `docker compose run --rm backend npm test` — **18** suites, **330** tests, all passed (includes `organisation-composite-unique.integration.test.js` against compose DB).

### Implementation Plan

- Add `@@unique([name, city, country], map: "organisation_name_city_country_key")` and a single-statement migration matching AC3.
- Centralise `P2002` handling for organisation writes; map composite unique to the specified 409 envelope; other `P2002` → generic 409.
- Controller tests with mocked service for envelope behaviour; `organisation-composite-unique.integration.test.js` for real DB when `DATABASE_URL` is set; migration sanity test for SQL shape.

### Completion Notes

- Story 15.1 verified end-to-end: composite unique migration applied, pre-flight clean, DB checks and full backend Jest suite green via Docker (`docker compose run --rm backend npm test`). Local `npm test` may still require fixing root-owned `backend/node_modules` if present.

## File List

- `backend/src/prisma/schema.prisma`
- `backend/src/prisma/migrations/20260505120000_organisation_composite_unique/migration.sql`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-composite-unique.integration.test.js`
- `backend/src/__tests__/migration-organisation-composite-unique-sanity.test.js`
- `README.md`

## Change Log

- **2026-05-05:** Composite unique on `organisation(name, city, country)`, P2002 → 409 mapping, tests, README pre-flight note (story 15-1).
- **2026-05-04:** Pre-flight SQL, psql verification (index, counts, duplicate INSERT), and full backend test run recorded; story marked **review**.

## Dev Notes

- **Why `(name, city, country)` not just `(name)`:** "Theatre Royal" exists in Bath, Newcastle, Plymouth, Drury Lane, etc. A hard `UNIQUE(name)` blocks legitimate data; the composite is the right shape. See architecture-v3-delta §2.2 and the new ADR-026.
- **NULL semantics:** The default PostgreSQL behaviour (NULL ≠ NULL in unique constraints) is accepted intentionally. The fuzzy-match warning UX (Story 15.3) catches the cases the constraint can't.
- **Edit-mode 409:** A user editing an organisation can introduce a collision by changing `name`, `city`, or `country`. The controller maps the same `P2002` to the same 409. Story 15.3's warning UX is create-only by design (per UX-DR48), but the 409 inline error path applies to both create and edit.
- **Why generic 409 for other `P2002`:** ADR-020 already enforces unique on `system.name`; that's a different constraint and shouldn't be misrepresented as the org name conflict. A generic 409 with the offending field name keeps behaviour sensible.
- **Out of scope:** The fuzzy-match endpoint and warning UX (Stories 15.2 and 15.3).

### References

- [epics.md — Story 15.1](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §2.2, §3.2, §6.3](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/decisions.md ADR-026](docs/decisions.md) — composite uniqueness rationale.
- [backend/src/controllers/organisation-controller.js](backend/src/controllers/organisation-controller.js).

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Existing data violates the constraint | Pre-flight check (Task 1) is mandatory; migration cannot apply with collisions. |
| Migration applied to a non-clean environment without pre-flight | README runbook update (Task 8) calls it out. |
| Catch-block crashes when `req.body` lacks `city` | Use `req.body.city ?? '(no city)'` or omit gracefully. |
| Non-name `P2002` errors mapped to a misleading message | Inspect `target` array; only specific message for `name_city_country_key`; generic for others. |

## Technical requirements

- **Stack:** Prisma 6, PostgreSQL 16.
- **Commands:** `npx prisma migrate dev --name organisation_composite_unique --create-only` → review → `npx prisma migrate dev`.

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `backend/src/prisma/schema.prisma` |
| Add | `backend/src/prisma/migrations/<timestamp>_organisation_composite_unique/migration.sql` |
| Edit | `backend/src/controllers/organisation-controller.js` |
| Edit | `backend/src/__tests__/organisation-controller.test.js` |
| Edit | `README.md` (deployment section) |

## Testing requirements

- Pre-flight check executed and recorded.
- Jest 409 mapping test passes.
- Full backend suite green.

### Review Findings

- [x] [Review][Dismiss] Multi-epic scope in the Story 15.1 scoped diff — **Resolved 2026-05-04:** accept dirty branch; Story 15.1 ACs reviewed in isolation (multi-epic noise is a process / merge strategy concern only).

- [x] [Review][Patch] Reconcile ADR-030 with migration policy in `docs/decisions.md` — Cross-reference or scoped exception so drift-repair hand-edits do not read as contradicting Prisma-first migration workflow (per review decision). **Applied 2026-05-04:** ADR-001 migration-SQL note + ADR-030 “Related” to ADR-001.

- [x] [Review][Patch] Whitespace-only `excludeId` on check-similar — `organisation-controller.js` (`checkSimilarOrganisations`): if `excludeId` is present but trims to empty, validation may push “invalid UUID” instead of treating the param as omitted. **Applied 2026-05-04** (+ controller test).

- [x] [Review][Patch] Integration teardown deletes by `name` only — `organisation-composite-unique.integration.test.js`: `afterAll` uses `deleteMany({ where: { name: uniqueName } })`; safer to capture `id` from the `201` response and delete that row to avoid accidental multi-row deletes if data collides. **Applied 2026-05-04.**

- [x] [Review][Defer] `isOrganisationNameCityCountryUniqueViolation` uses `includes('name_city_country')` — low-probability mis-routing if a future constraint name contains that substring; prefer exact `name_city_country_key` / column-set matching when next touching this helper. — deferred, pre-existing

- [x] [Review][Defer] 409 conflict message is built from the request body after parsing — if server-side normalization ever diverges from stored tuple, the message could theoretically mismatch the colliding row. — deferred, pre-existing

- [x] [Review][Defer] Integration describe skipped when `DATABASE_URL` unset — CI must supply DB for these tests or accept gap; overlaps deferred-work from 15.2 review. — deferred, pre-existing

- [x] [Review][Defer] `migration-organisation-composite-unique-sanity.test.js` golden-string assertion — may fail on benign formatting or generator churn; acceptable noise vs stronger assertion strategy. — deferred, pre-existing

- [x] [Review][Defer] `checkSimilarOrganisations` has no upper bound on `name` length — very long names could stress similarity search; no story NFR. — deferred, pre-existing

- [x] [Review][Defer] README / runbook factual breadth — large narrative diff; verify ops claims outside this review. AC1 pre-flight is process evidence, not provable from code diff alone. — deferred, pre-existing
