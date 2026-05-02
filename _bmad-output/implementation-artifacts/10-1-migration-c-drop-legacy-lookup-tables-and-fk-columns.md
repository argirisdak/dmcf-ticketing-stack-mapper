# Story 10.1: Migration C — Drop Legacy Lookup Tables and FK Columns

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a backend developer,
I want the legacy `ticketing_provider_id` / `crm_platform_id` columns and their lookup tables dropped after Epics 6–9 are deployed and stable,
so that the schema reaches its v2 target state with no dead columns or orphan tables.

## Acceptance Criteria

1. **Schema & migration (destructive only)**  
   **Given** Epics 6, 7, 8, and 9 are merged and Migration B’s backfill is verified in the target environment  
   **When** `backend/src/prisma/schema.prisma` is edited to remove `ticketing_provider_id`, `crm_platform_id`, the `ticketing_provider` and `crm_platform` relations on `Organisation`, and the entire `TicketingProvider` and `CrmPlatform` models  
   **Then** `npx prisma migrate dev --name drop_legacy_lookups --create-only` (or equivalent) produces a migration whose SQL includes dropping the two FK constraints on `organisation`, dropping the two columns, and `DROP TABLE` for `ticketing_provider` and `crm_platform` (order may vary; constraint names must match your DB — verify against `init` migration: `organisation_ticketing_provider_id_fkey`, `organisation_crm_platform_id_fkey`).

2. **Three-migration rule**  
   **Given** the migration is reviewed  
   **When** it is compared against the “no destructive ops in the same migration as data backfill” rule  
   **Then** it is purely destructive — no `INSERT` / `UPDATE` / `SELECT … INTO`, no new tables or columns.

3. **Operational safety**  
   **Given** Migration C is applied in a non-throwaway environment  
   **When** the deployment runbook is followed  
   **Then** a database backup is taken *before* the migration runs (see [architecture-v2-delta.md §6.5](../planning-artifacts/architecture-v2-delta.md); README call-out is Story 10.3).

4. **Post-migration data integrity**  
   **Given** Migration C has applied  
   **When** the schema is inspected  
   **Then** `organisation` has no `ticketing_provider_id` or `crm_platform_id`  
   **And** `ticketing_provider` and `crm_platform` tables no longer exist  
   **And** all `organisation_system` rows and all `system` rows remain intact (cascade on `organisation_id` unchanged; `system_id` untouched).

5. **Codebase consistency (same PR)**  
   **Given** any backend code still imports or calls Prisma for the dropped models  
   **When** `npx prisma generate` and the test suite run  
   **Then** there are no remaining `TicketingProvider` / `CrmPlatform` usages against `@prisma/client` — failures must be fixed in this PR (see Dev Notes for file list).

6. **Green reset**  
   **Given** `prisma migrate reset` in a fresh environment after Migration C  
   **When** the seed runs  
   **Then** the same invariants as today hold: 11 Systems, populated `organisation_system`, existing seed invariants (UK Tessitura `INTEGRATED_SUITE`, multi-link org, `SECONDARY`, suite+CRM combo) — **without** upserting or reading `ticketing_provider` / `crm_platform`.

## Tasks / Subtasks

- [x] Edit `backend/src/prisma/schema.prisma` — remove legacy fields, relations, and both lookup models (AC: #1, #4).
- [x] Generate migration `drop_legacy_lookups`; review SQL is destructive-only (AC: #2); apply locally and run tests (AC: #5, #6).
- [x] Reshape `backend/src/prisma/seed.js` — remove legacy lookup upserts and all `ticketing_provider_id` / `crm_platform_id` writes; simplify `buildOrganisationScalars` / `seedSampleOrganisationsAndLinks` to depend only on `organisation_type` + `system` + links (AC: #6).
- [x] Remove legacy meta handlers and routes that query dropped models: `backend/src/controllers/meta-controller.js`, `backend/src/routes/meta.js` (AC: #5; aligns with Epic 10.2 API AC — backend must compile).
- [x] Update tests that mock or assert legacy meta behaviour: `backend/src/__tests__/meta-controller.test.js`, `backend/src/__tests__/health.test.js` (trim Prisma mocks if unused) (AC: #5).
- [x] Optionally add `backend/src/__tests__/migration-drop-legacy-c-sanity.test.js` (mirror `migration-backfill-b-sanity.test.js`) asserting the new migration file **does** contain expected `DROP` / `ALTER TABLE … DROP COLUMN` patterns and **does not** contain backfill-style DML — reduces risk of wrong migration content.
- [x] Run `cd backend && npm test` and `docker compose` smoke path if that is your integration gate (AC: #5, #6).
- [x] **Out of scope for this story (Epic 10.2):** removing `fetchTicketingProviders` / `fetchCrmPlatforms` and hooks from `frontend/src/api/meta.js` / `useMetaReferenceData.js` — no current page imports those hooks; they can follow in 10.2.

## Dev Notes

### What exists today (do not break)

- `Organisation` still has optional FK columns and relations to `TicketingProvider` / `CrmPlatform` in Prisma ([schema.prisma](backend/src/prisma/schema.prisma)); junction `OrganisationSystem` and `System` are the real v2 adoption model.
- `seed.js` still upserts ticketing/CRM lookup rows and writes legacy FKs on organisation upsert for redundancy; **this must be deleted** or `migrate reset` will fail after tables are dropped.
- `meta-controller.js` calls `prisma.ticketingProvider` / `prisma.crmPlatform` — **will not compile** after `prisma generate` removes those delegates; remove handlers and mount only `GET /api/meta/organisation-types` in `meta.js`.
- `organisation-controller.js` strips `ticketing_provider_id`, `crm_platform_id`, camelCase variants from bodies — **keep** as client hardening; no schema fields required.
- `migration-backfill-b-sanity.test.js` asserts Migration B does **not** drop legacy tables — leave unchanged; it guards the wrong migration file.

### Implementation guardrails

- **Project rules:** Migrations that move data use additive → backfill → destructive; this story **is** the destructive step only. Never mix backfill DML into this migration ([project-context.md](_bmad-output/project-context.md)).
- **Spelling:** British English; DB tables stay `snake_case` per Prisma `@@map`.
- **Rollback:** After C applies, restore from backup only — no SQL inverse for dropped FK columns ([architecture-v2-delta §6.5](../planning-artifacts/architecture-v2-delta.md)).
- **Trigram index:** Historical migration `20260404140000_organisation_search_trgm_indexes` created an index on `ticketing_provider.name`; dropping the table removes it — no separate migration step needed.

### Seed refactor hints

- Remove `seedReferenceLookups()` ticketing/CRM loops; keep `organisationType` upserts (or fold org types into a smaller function).
- `buildOrganisationScalars` should stop calling `deriveLegacyFkLookupNames` / `requireLookup` for providers and CRMs; pass only type + scalar org fields + dates.
- `seedSampleOrganisationsAndLinks`: `Promise.all` should load `organisationType` + `system` only; link creation path is already correct.
- Delete unused helpers: `legacyTicketingLookupName`, `legacyCrmLookupName`, `deriveLegacyFkLookupNames` if nothing else references them.

### Architecture compliance

- Stack: Express 5, Prisma 6, PostgreSQL 16 — unchanged.
- API envelope `{ data, error, meta }` — unchanged; remaining meta endpoint unchanged.
- No new FRs — completes structural pivot ([epics.md Epic 10](../planning-artifacts/epics.md)).

### File / touch list (expected)

| Area | Files |
|------|--------|
| Schema + migration | `backend/src/prisma/schema.prisma`, new `backend/src/prisma/migrations/*/migration.sql` |
| Seed | `backend/src/prisma/seed.js` |
| Meta API | `backend/src/controllers/meta-controller.js`, `backend/src/routes/meta.js` |
| Tests | `backend/src/__tests__/meta-controller.test.js`, `backend/src/__tests__/health.test.js`, optional new migration sanity test |

### Testing requirements

- `npm test` in `backend` — all suites green after meta + seed updates.
- Manual: `npx prisma migrate reset` (or compose equivalent) — confirm seed completes and counts match expectations.

### Previous story intelligence

- Epic 9 stories established compare UX; no direct dependency on legacy lookups for **new** flows. Migration B already populated `organisation_system` from legacy FKs ([migration SQL](backend/src/prisma/migrations/20260430183000_backfill_systems_and_links/migration.sql)).

### Git intelligence (recent themes)

- Recent commits focused on ticketing/systems features and README; follow existing Express + Prisma patterns in controllers and tests.

### Latest tech notes

- Use the repo-pinned Prisma 6 workflow (`npx prisma migrate dev`, `npx prisma generate`) per [CLAUDE.md](CLAUDE.md). No library upgrades in this story.

### Project context reference

- [project-context.md](../project-context.md) — migrations, naming, API envelope, three-step migration rule.
- [docs/decisions.md](docs/decisions.md) — ADRs; v2 additions land in Story 10.3 per epic.

## Dev Agent Record

### Agent Model Used

Cursor agent (Claude)

### Debug Log References

_(none)_

### Completion Notes List

- Removed `TicketingProvider` / `CrmPlatform` from Prisma schema; added destructive-only migration `20260502180000_drop_legacy_lookups` (drop FKs, columns, tables).
- Seed now upserts organisation types and systems only; sample orgs no longer write legacy FK columns.
- Meta API exposes only `GET /api/meta/organisation-types`; `prisma generate` and backend tests (213) pass. Frontend lint and Vitest (36) pass; Docker Compose not available in this environment for migrate/seed smoke.

### File List

- `backend/src/prisma/schema.prisma`
- `backend/src/prisma/migrations/20260502180000_drop_legacy_lookups/migration.sql`
- `backend/src/prisma/seed.js`
- `backend/src/controllers/meta-controller.js`
- `backend/src/routes/meta.js`
- `backend/src/__tests__/meta-controller.test.js`
- `backend/src/__tests__/health.test.js`
- `backend/src/__tests__/migration-drop-legacy-c-sanity.test.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- **2026-05-02:** Story 10.1 — Migration C schema drop, seed reshape, meta routes trimmed, migration sanity test added, test suite green.

### Review Findings

- [x] [Review][Decision] Combined PR scope (10.1 + Epic 9 compare + BMAD tracking) — **Resolved:** intentional single PR / internal trunk; no split required (confirmed 2026-05-02).

- [x] [Review][Patch] Tighten Migration C sanity test for AC #2 — Extend `backend/src/__tests__/migration-drop-legacy-c-sanity.test.js` to assert the migration SQL does not contain additive DDL (e.g. `CREATE TABLE`, `ALTER TABLE … ADD COLUMN`) so purely destructive intent is enforced beyond INSERT/UPDATE/SELECT-INTO checks.

- [x] [Review][Defer] Frontend `fetchTicketingProviders` / `fetchCrmPlatforms` still target removed REST paths — [`frontend/src/api/meta.js`] — deferred, Epic 10.2 per story out-of-scope note.

- [x] [Review][Defer] Operational safety AC (backup before Migration C) — Runbook/README call-out is Story 10.3; no code finding.

- [x] [Review][Defer] Migration uses `DROP … IF EXISTS` — Idempotent re-apply but can skip silently if constraint/table names differ from init migration; operators must verify names match `20260402000000_init` / deployed DB before production apply.
