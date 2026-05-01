# Story 6.1: Migration A — Add System and OrganisationSystem Schema (Additive)

Status: done

<!-- Story status: review. Validation: optional `validate-create-story` before future stories. -->

## Story

As a backend developer,
I want the new `system` and `organisation_system` tables, their four enums, and search indexes added without touching the legacy schema,
so that the new entities can be populated by Migration B before the legacy structures are removed.

## Acceptance Criteria

1. **Schema (Prisma)** — `backend/src/prisma/schema.prisma` gains four enums (`SystemCategory`, `SystemRole`, `DeploymentModel`, `PricingModel`) with **SCREAMING_SNAKE_CASE** values per [epics.md §Story 6.1](_bmad-output/planning-artifacts/epics.md) and [architecture-v2-delta §2.3 naming note](_bmad-output/planning-artifacts/architecture-v2-delta.md); `System` and `OrganisationSystem` models with fields/constraints exactly as AC2–AC4 in epics; `Organisation` gains **`systems OrganisationSystem[]`** only — **do not** remove `ticketing_provider_id`, `crm_platform_id`, `TicketingProvider`, or `CrmPlatform`.

2. **Migration SQL (additive only)** — After `npx prisma migrate dev --name add_system_and_junction --create-only`, the generated `migration.sql` contains only `CREATE TYPE`, `CREATE TABLE`, `CREATE UNIQUE INDEX`, and `CREATE INDEX` (and any harmless extensions already used in repo). **No** `DROP`, **no** `ALTER ... DROP COLUMN` on legacy objects.

3. **Trigram search indexes** — `pg_trgm` is already enabled (v1). The **final** migration applied for this story must include GIN trigram indexes on `system.name`, `system.vendor`, and `system.description` for `ILIKE '%term%'` parity with Organisation search. *Prisma schema cannot express GIN/trgm;* if `--create-only` omits them, **append** the SQL to the same migration file using the same style as [backend/src/prisma/migrations/20260404140000_organisation_search_trgm_indexes/migration.sql](backend/src/prisma/migrations/20260404140000_organisation_search_trgm_indexes/migration.sql) (`USING GIN (... gin_trgm_ops)`).

4. **DB shape after `npx prisma migrate dev`** — Tables and enums match epics Story 6.1 AC bullets: column list for `system` and `organisation_system`, `UNIQUE (organisation_id, system_id)`, non-unique indexes on `organisation_system(system_id)` and `organisation_system(organisation_id)`, FK `organisation` → CASCADE, `system` → RESTRICT.

5. **Legacy intact** — Post-migration: `organisation.ticketing_provider_id` / `crm_platform_id` still present; `ticketing_provider` and `crm_platform` tables and row counts unchanged; `system` and `organisation_system` **empty**.

6. **Documentation** — Add a [docs/decisions.md](docs/decisions.md) entry recording the **binding three-migration sequence** (additive → backfill → destructive) with rationale: *single migration would drop FKs before the junction is populated* (quote/epic wording acceptable).

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Edit `schema.prisma`: enums, `System`, `OrganisationSystem`, `Organisation.systems` back-relation; `@@map("system")`, `@@map("organisation_system")`; `last_updated` on both new models uses `DateTime @default(now()) @updatedAt` (ADR-011, aligns with Story 6.3 — no `$use` middleware).
  - [x] **1.1** — Reuse existing `CapabilityState` on `System` for the three capability columns; defaults `UNKNOWN`.
  - [x] **1.2** — `System` field nullability matches architecture-v2-delta §2.1 (required `name`, `vendor`, `category`; optional deployment/pricing/geo/description/source/custom_attributes JSON as `Json?`).
  - [x] **1.3** — `OrganisationSystem`: `onDelete: Cascade` on organisation FK, `onDelete: Restrict` on system FK, `@@unique([organisation_id, system_id])`, `@@index([system_id])`, `@@index([organisation_id])`.

- [x] **Task 2 (AC: 2, 3)** — Generate migration with `--create-only`; review SQL line-by-line; ensure additive-only; inject trigram indexes if missing.
  - [x] **2.1** — Apply with `npx prisma migrate dev`; confirm no drift.

- [x] **Task 3 (AC: 4, 5)** — Verify DB: `\d system`, `\d organisation_system`, enum labels, empty new tables, legacy columns/tables unchanged (psql or Prisma Studio — document commands in Dev Agent Record).

- [x] **Task 4 (AC: 6)** — `docs/decisions.md` ADR-style entry for three-step migration strategy.

- [x] **Task 5** — Run `cd backend && npm test` — **must be green**; fix any test/fixture assumptions only if this migration exposed a real regression (unlikely if scope is schema-only).

## Dev Notes

- **Out of scope for this story:** Migration B backfill SQL, seed re-shape, any `/api/systems` or organistion link routes, dropping legacy tables/columns, `system-geographic-focus.js` files (Epic 6 Stories 6.2–6.3 and Epic 7+).
- **Conflict guard:** Do not run Migration B or edit Organisation API in the same PR unless explicitly instructed — breaks the ordered epic sequence.
- **Prisma location:** All migrations live under `backend/src/prisma/migrations/` (existing project layout).
- **`custom_attributes`:** Use Prisma `Json?` mapped to `jsonb` in PostgreSQL.

### Project Structure Notes

- Single source of truth for schema: [backend/src/prisma/schema.prisma](backend/src/prisma/schema.prisma).
- British English in comments and docs only; DB identifiers remain snake_case per Prisma `@@map`.

### References

- [epics.md — Epic 6, Story 6.1](_bmad-output/planning-artifacts/epics.md) (authoritative AC text).
- [architecture-v2-delta.md §2.1–2.3, §6.1](_bmad-output/planning-artifacts/architecture-v2-delta.md) (field semantics, migration A steps).
- [_bmad-output/project-context.md](_bmad-output/project-context.md) — migrations discipline, ADR-011 `last_updated`, three-phase data migrations.
- [CLAUDE.md](../../CLAUDE.md) — Prisma 6, `docker compose`, test commands.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Destructive SQL in Migration A | Grep migration for `DROP`, `ALTER ... DROP` before apply. |
| Wrong enum casing | API must see SCREAMING_SNAKE_CASE; match `CapabilityState` pattern. |
| Missing GIN indexes | Epic AC explicitly requires trigram on `system` search columns; mirror organisation migration style. |
| Accidentally removing legacy FKs | Keep transitional schema: old + new coexist until Epic 10. |

## Technical requirements

- **Stack:** Node backend, Prisma **6** (pinned; CommonJS), PostgreSQL 16.
- **Commands:** `npx prisma migrate dev --name add_system_and_junction --create-only` → review → `npx prisma migrate dev`.
- **JSON column:** `custom_attributes` nullable object array in later seed — column must exist nullable now.

## Architecture compliance

- Follow [architecture-v2-delta §6.1](_bmad-output/planning-artifacts/architecture-v2-delta.md): additive migration only; GIN trgm on `system(name, vendor, description)`.
- Data-loss-free sequence: this story = step 1 of 3; do not collapse provider/CRM data here.

## Library / framework requirements

- No new npm dependencies for this story unless Prisma workflow requires (it should not).
- Do not upgrade Prisma major version.

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `backend/src/prisma/schema.prisma` |
| Add | `backend/src/prisma/migrations/<timestamp>_add_system_and_junction/migration.sql` (via Prisma + manual index SQL if needed) |
| Edit | `docs/decisions.md` |

## Testing requirements

- Full backend Jest suite passes after schema apply.
- No new unit tests mandatory if team convention skips raw SQL migration tests — **manual verification checklist in Task 3 is mandatory** for this story.

## Previous story intelligence

- **Epic 5 complete:** v1 catalogue, compare, and seed patterns are stable; this story starts the v2 schema fork without changing runtime behaviour of existing APIs.
- **No prior Story 6.x file** — first story in Epic 6.

## Git intelligence (recent patterns)

- Recent commits touch README and seed organisations; expect frequent `schema.prisma` / migrations as the v2 roadmap lands. Keep migrations **small and ordered** to reduce merge pain.

## Latest technical information

- **Prisma 6:** Stay on project-pinned major version; `migrate dev --create-only` workflow per CLAUDE.md.
- **PostgreSQL trigram:** Extension `pg_trgm` already assumed enabled from init/search migrations.

## Project context reference

- See [_bmad-output/project-context.md](_bmad-output/project-context.md): three-step migrations rule; `last_updated`/`@updatedAt`; British English; `{ data, error, meta }` (no API work here but future stories depend on this schema).

## Story completion status

- [x] All tasks checked.
- [x] AC 1–6 satisfied with evidence in Dev Agent Record.
- [x] Sprint status updated to `done` after code review (2026-04-30).

### Review Findings

- [x] [Review][Patch] Remove stray whitespace-only edits in `backend/src/prisma/seed.js` (indent / blank line) — out of scope for Story 6.1; keeps blame clean [`seed.js:main`] — fixed in review pass
- [x] [Review][Defer] Git working tree includes large planning-artifact diffs (e.g. `epics.md`, `architecture.md`) unrelated to Migration A — when reviewing “the story”, scope diff to story File List; pre-existing branch state [`repo root`]

---

## Senior Developer Review (AI)

**Review outcome:** Approve  
**Review date:** 2026-04-30  
**Action items:** 0 open (1 patch applied), 1 defer (recorded)

### Action Items

- [x] [Review][Patch] Remove stray whitespace-only edits in `backend/src/prisma/seed.js`

---

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Prisma `--create-only` initially emitted `DROP INDEX` for legacy `pg_trgm` indexes (not modeled in `schema.prisma`); **removed** from `migration.sql` so Migration A stays additive per AC.
- `docker compose run` without a bind mount wrote the migration dir as **root**; fixed ownership with `docker run … chown` so the file could be edited on the host.
- `prisma migrate dev` (interactive) prompted for a **new** migration after apply because of raw-SQL index drift; migration **20260429220615** was already applied — process was stopped after apply; see **ADR-015** for `migrate deploy` in CI.

### Completion Notes List

- **Task 3 verification:** `docker compose exec -T db psql -U postgres -d dmcf -c "SELECT count(*) FROM system"` → `0`; `SELECT count(*) FROM organisation_system` → `0`; legacy `organisation` / `ticketing_provider` tables unchanged (empty DB after fresh volume — structural AC satisfied). `rg DROP` on `20260429220615_add_system_and_junction/migration.sql` → no matches.
- **Task 5:** `npx prisma generate && npm test` — 5 suites, 69 tests passed.

### File List

- `backend/src/prisma/schema.prisma`
- `backend/src/prisma/migrations/20260429220615_add_system_and_junction/migration.sql`
- `docs/decisions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-1-migration-a-add-system-and-organisationsystem-schema-additive.md`

### Change Log

- 2026-04-30: Story 6.1 — additive `system` + `organisation_system` schema, enums, FKs, GIN trgm indexes on `system`; **ADR-015**; sprint → `review`.
- 2026-04-30: Code review — **Approve**; `seed.js` whitespace cleanup; sprint → `done`.
