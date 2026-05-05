# Story 12.1: Migration B — Add Five Capability Columns to System

Status: done

## Story

As a backend developer,
I want five new `CapabilityState` columns on `System` defaulting to `UNKNOWN`,
so that richer comparisons are possible without changing existing capability semantics.

## Acceptance Criteria

1. **Schema (Prisma)** — `System` model gains five new fields, all `CapabilityState @default(UNKNOWN)`:
   - `season_subscriptions_capability`
   - `dynamic_pricing_capability`
   - `multi_venue_support_capability`
   - `marketing_automation_capability`
   - `accessibility_features_capability`

2. **Migration SQL (additive only)** — `npx prisma migrate dev --name add_system_capabilities_v3 --create-only` generates SQL containing exactly five `ALTER TABLE "system" ADD COLUMN ... "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';` statements and nothing else.

3. **DB shape after apply** — All 11 existing System rows have all five new columns set to `UNKNOWN`. No other column is changed. The existing `pg_trgm` indexes are unaffected.

4. **DTO updates** — `system-list-dto.js` exposes the five fields camelCased (`seasonSubscriptionsCapability`, `dynamicPricingCapability`, `multiVenueSupportCapability`, `marketingAutomationCapability`, `accessibilityFeaturesCapability`) on every list and detail response.

5. **Test suite green** — `cd backend && npm test` passes after migration and DTO changes.

6. **No frontend changes in this story** — Form, detail, compare, and filter UI updates land in Stories 12.3 and 12.4. The new fields are silently present in API responses.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Edit `schema.prisma`. Add the five new fields to `System` immediately after `reserved_seating_capability`.
- [x] **Task 2 (AC: 2)** — Generate the migration with `npx prisma migrate dev --name add_system_capabilities_v3 --create-only`. Inspect SQL; verify only five ADD COLUMN statements.
- [x] **Task 3 (AC: 3)** — Apply with `npx prisma migrate dev`. Verify in psql:
  - [x] 3.1 `\d system` shows all five new columns.
  - [x] 3.2 `SELECT count(*) FROM system WHERE season_subscriptions_capability = 'UNKNOWN';` = 11.
  - [x] 3.3 Other capability columns unchanged.
- [x] **Task 4 (AC: 4)** — Update `services/system-list-dto.js` to map all five new columns to camelCase output.
- [x] **Task 5 (AC: 5)** — Run full backend test suite.
- [x] **Task 6** — Update `frontend/src/lib/field-source-keys.js` to include the five new capability keys in `SYSTEM_FIELD_SOURCE_KEYS` (mirror of backend allow-list per ADR-016 / ADR-025 dual-maintenance pattern).

### Review Findings

- [x] [Review][Decision] Mixed Epic 11 (`field_sources` / `fieldSources`) and Epic 12.1 (five system capabilities) in the same diff — **Resolved (2026-05-03):** Accept bundled backend WIP; ship 12.1 together with the coupled Epic 11 backend changes on this branch. Story/file list may be updated later for traceability if needed.

- [x] [Review][Patch] `BASE_ROW` mock omits five new capability columns — [backend/src/__tests__/system-service.test.js:386](backend/src/__tests__/system-service.test.js) — After the migration, real `System` rows always include `season_subscriptions_capability` through `accessibility_features_capability`. Add those keys to `BASE_ROW` (e.g. all `'UNKNOWN'`) so Prisma mocks match the table shape and DTO tests do not rely on `undefined` passthrough.

## Dev Agent Record

### Implementation Plan

- Add five `CapabilityState` columns on `System` with `@default(UNKNOWN)`, Prisma-formatted schema.
- Generate migration via Docker (`migrate dev --create-only`); replace Prisma’s first draft (DROP INDEX + single multi-ADD `ALTER`) with five additive `ALTER TABLE "system" ADD COLUMN ...` statements only, preserving `pg_trgm` indexes (AC2/AC3).
- Extend `toSystemDto` / detail (spread) with camelCase mappings; refresh test fixtures and DTO unit assertions.
- Confirm `frontend/src/lib/field-source-keys.js` and backend allow-list already contained the five keys (no edit required).

### Debug Log

- Host `migrate dev` targeted `db:5432` (unreachable outside Compose); used `docker compose run` with backend bind-mount.
- Prisma advisory lock timeout once (stale `backend-run` container); stopped container and retried.
- `migrate dev` after apply prompted for a new migration name (interactive); killed process — `migrate status` confirmed DB up to date; used `prisma generate` + tests in Docker.

### Completion Notes

- ✅ Story **12-1** complete: schema, migration `20260503113633_add_system_capabilities_v3`, DTO, tests (229 passing in Docker). Verified in Postgres: 11 systems with `season_subscriptions_capability = 'UNKNOWN'`, trgm indexes present on `system`.
- ✅ Task 6: `SYSTEM_FIELD_SOURCE_KEYS` already included the five capability keys on frontend and backend; no file change.
- Prisma’s raw `--create-only` output did not meet AC2/AC3; migration SQL was rewritten accordingly.

### File List

- `backend/src/prisma/schema.prisma`
- `backend/src/prisma/migrations/20260503113633_add_system_capabilities_v3/migration.sql`
- `backend/src/services/system-list-dto.js`
- `backend/src/__tests__/system-service.test.js`
- `backend/src/__tests__/system-controller.test.js`
- `backend/src/__tests__/system-http-stack.test.js`

### Change Log

- 2026-05-03 — Epic 12.1: five system capability columns (additive migration), DTO exposure, test fixture updates; migration SQL trimmed to five `ADD COLUMN` statements only.

## Dev Notes

- **Out of scope:** API filter param wiring (Story 12.2), form/detail/compare UI (Story 12.3), filter sidebar UI (Story 12.4), seed values (Story 12.5).
- **Default UNKNOWN:** Aligns with FR24 — "Unknown" is the honest default. Existing rows inherit this; the seed in Story 12.5 fills in known values.
- **DTO field order:** Group the five new fields adjacent to the three existing capability fields in the DTO output for readability.

### References

- [epics.md — Story 12.1](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §2.1, §6.2](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/decisions.md ADR-027](docs/decisions.md) — capability set scoping rationale.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Adding a column with a NULL default by mistake | Schema explicitly uses `@default(UNKNOWN)` — verify in SQL `NOT NULL DEFAULT 'UNKNOWN'`. |
| Forgetting to update DTO | Task 4 explicitly required; test suite assertions on DTO shape catch this. |
| Renaming an existing capability column accidentally | Diff schema.prisma against HEAD before generating; reject any unrelated edit. |

## Technical requirements

- **Stack:** Prisma 6, PostgreSQL 16.
- **Commands:** `npx prisma migrate dev --name add_system_capabilities_v3 --create-only` → review → `npx prisma migrate dev` → `npx prisma generate`.

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `backend/src/prisma/schema.prisma` |
| Add | `backend/src/prisma/migrations/<timestamp>_add_system_capabilities_v3/migration.sql` |
| Edit | `backend/src/services/system-list-dto.js` |
| Edit | `frontend/src/lib/field-source-keys.js` (frontend mirror) |

## Testing requirements

- Full backend suite passes.
- Manual: `GET /api/systems/:id` for any seeded System returns the five new fields with value `"UNKNOWN"`.
