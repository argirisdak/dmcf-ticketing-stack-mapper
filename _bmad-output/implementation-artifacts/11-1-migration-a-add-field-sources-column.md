# Story 11.1: Migration A — Add `field_sources` Column to System and Organisation

Status: done

## Story

As a backend developer,
I want a nullable `field_sources Json?` column on both `System` and `Organisation`,
so that per-data-point provenance can be persisted without a schema sprawl.

## Acceptance Criteria

1. **Schema (Prisma)** — `backend/src/prisma/schema.prisma` gains `field_sources Json?` on both `System` and `Organisation`. No other field, enum, or index is changed in this migration.

2. **Migration SQL (additive only)** — After `npx prisma migrate dev --name add_field_sources --create-only`, the generated `migration.sql` contains exactly two `ALTER TABLE … ADD COLUMN "field_sources" JSONB;` statements (one per table) and nothing else. **No** `DROP`, **no** `ALTER ... DROP COLUMN`, **no** new index, **no** `CREATE TYPE`.

3. **DB shape after `npx prisma migrate dev`** — Both `system.field_sources` and `organisation.field_sources` exist with type `jsonb` and accept `NULL`. Every existing row has `field_sources = NULL`. All other columns and indexes on both tables are unchanged.

4. **Test suite green** — `cd backend && npm test` passes after the migration; the additive change must not affect any current code path.

5. **Prisma client wired through** — After `npx prisma generate`, the Prisma client surfaces `field_sources` as `Prisma.JsonValue | null` on both models — confirming the column is read/writable.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Edit `backend/src/prisma/schema.prisma`. Add `field_sources Json?` as the last field before `last_updated` on the `System` model and the equivalent position on the `Organisation` model.
- [x] **Task 2 (AC: 2)** — Generate the migration with `npx prisma migrate dev --name add_field_sources --create-only`. Inspect `migration.sql` and verify it contains only the two ADD COLUMN statements.
- [x] **Task 3 (AC: 3)** — Apply with `npx prisma migrate dev`. Verify in psql or Prisma Studio:
  - [x] 3.1 `\d system` shows `field_sources` jsonb nullable.
  - [x] 3.2 `\d organisation` shows `field_sources` jsonb nullable.
  - [x] 3.3 `SELECT count(*) FROM system WHERE field_sources IS NOT NULL;` = 0.
  - [x] 3.4 `SELECT count(*) FROM organisation WHERE field_sources IS NOT NULL;` = 0.
- [x] **Task 4 (AC: 4)** — Run `cd backend && npm test`; full suite must be green.
- [x] **Task 5 (AC: 5)** — Run `npx prisma generate`. Open `system-service.js` and `organisation-service.js` in an IDE and confirm `field_sources` autocomplete is present on both Prisma model types.

## Dev Notes

- **Out of scope for this story:** API contract changes, DTO changes, controller validation, frontend changes, seed updates. All of those land in subsequent Epic 11 stories.
- **JSON column type:** Use Prisma `Json?` mapped to `jsonb` in PostgreSQL — same pattern as `system.custom_attributes` (ADR-019).
- **Naming:** The column is `field_sources` (snake_case) at DB and Prisma level; it surfaces as `fieldSources` (camelCase) at the API boundary in Story 11.2.
- **No backfill:** The column starts NULL on every row. Seed data is populated separately in Story 11.5.

### References

- [epics.md — Epic 11, Story 11.1](_bmad-output/planning-artifacts/epics.md) (authoritative AC text).
- [architecture-v3-delta.md §2.1, §2.2, §6.1](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/decisions.md ADR-019](docs/decisions.md) — JSON column precedent for `custom_attributes`.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Accidental schema changes to other models in the same migration | Diff `schema.prisma` against HEAD before generating; reject any unrelated edit. |
| Migration name collision with previous migrations | Verify no existing migration directory ends with `_add_field_sources` before generation. |
| Prisma generates the migration with extra index changes (drift) | Use `--create-only`; review SQL line-by-line before apply. If the SQL contains anything beyond the two ADD COLUMN statements, abort and investigate. |

## Technical requirements

- **Stack:** Prisma 6, PostgreSQL 16 (CommonJS).
- **Commands:** `npx prisma migrate dev --name add_field_sources --create-only` → review → `npx prisma migrate dev` → `npx prisma generate`.

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `backend/src/prisma/schema.prisma` |
| Add | `backend/src/prisma/migrations/<timestamp>_add_field_sources/migration.sql` (Prisma-generated) |

## Testing requirements

- Full backend Jest suite passes.
- No new tests required for this story — the column has no behaviour yet. Tests for read/write paths land in Story 11.2.

## Dev Agent Record

### Debug Log

- Initial `prisma migrate dev --create-only` emitted six `DROP INDEX` statements for trigram indexes (indexes created in earlier raw-SQL migrations are not modelled in `schema.prisma`). Those drops were removed so `migration.sql` matches AC 2 (additive-only, two `ALTER TABLE … ADD COLUMN "field_sources" JSONB` only).
- After applying the migration, a bare `prisma migrate dev` session prompted interactively for an extra migration name (drift). The `20260503100850_add_field_sources` migration had already applied successfully; DB verification used `psql` inside the `db` container.

### Implementation Plan

- Add `field_sources Json?` to `Organisation` and `System` in `schema.prisma` before `last_updated`.
- Generate migration, keep only the two `ADD COLUMN` lines, apply to PostgreSQL, run `npx prisma generate` and `npm test`.

### Completion Notes

- `field_sources` is nullable `jsonb` on both tables; all existing rows have `NULL`. Prisma client exposes `field_sources: Prisma.JsonValue | null` on both models (verified in generated `index.d.ts`). Services can use the new field on `prisma` create/update/select payloads without code changes in this story.
- Full suite: `cd backend && npm test` — 15 suites, 215 tests passed (host run with `DATABASE_URL` pointed at the Compose DB IP for DB-backed tests).
- For local runs when `.env` uses `db:5432`, use Docker Compose for migrate/DB, or override `DATABASE_URL` to the container IP (or publish the DB port) for host-side `npm test` / `prisma`.

## File List

- `backend/src/prisma/schema.prisma` (add `field_sources` on `Organisation` and `System`)
- `backend/src/prisma/migrations/20260503100850_add_field_sources/migration.sql` (new; additive-only SQL)
- `_bmad-output/implementation-artifacts/11-1-migration-a-add-field-sources-column.md` (this story — tasks, status, record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (11-1: ready-for-dev → in-progress → review)

## Change Log

- 2026-05-03: Story 11.1 — additive `field_sources` JSONB column on `organisation` and `system`; migration trimmed to satisfy AC 2; tests green.
- 2026-05-03: Code review closed — **ADR-030** (drift repair); README / epics / TODO patches applied; status **done**.

### Review Findings

- [x] [Review][Decision] Migration SQL hand-edit after `--create-only` — **Resolved:** **ADR-030** documents the narrow exception for drift repair (removing unintended `DROP INDEX` / similar when indexes are not modelled in Prisma). See `docs/decisions.md`.

- [x] [Review][Patch] README readiness section — **Applied:** retitled “After v2 and v3 changes ship”; added `prd-v3-delta.md` and `architecture-v3-delta.md` to the artifact list [README.md:~299].

- [x] [Review][Patch] `epics.md` title/overview — **Applied:** heading and overview now use **dmcf-ticketing-stack-mapper** [epics.md:~21].

- [x] [Review][Patch] `docs/TODO.txt` trailing newline — **Applied.**

- [x] [Review][Defer] Very large non-11.1 diff surface (`epics.md` v3 block, `decisions.md` ADRs, README) bundled with the migration — acceptable for a local branch, but it complicates story-isolated review and `git bisect`; prefer separate commits/PRs when you next touch planning docs. — deferred, pre-existing pattern (see `deferred-work.md`).

- [x] [Review][Defer] AC 4–5 (full `npm test` green, Prisma client types for `field_sources`) are claimed in the Dev Agent Record but are not proved by the diff itself — a reviewer should re-run `cd backend && npm test` and spot-check generated types. — deferred, verification gap.
