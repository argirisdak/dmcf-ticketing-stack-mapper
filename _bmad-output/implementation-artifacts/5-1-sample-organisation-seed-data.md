# Story 5.1: Sample organisation seed data

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required reading (read before implementation)

- `_bmad-output/project-context.md` — British English (`organisation`), Prisma migrations, seed in `prisma/seed.js`, country validation against shared list, no auth
- `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.1 (~lines 690–720)
- `_bmad-output/planning-artifacts/architecture.md` — seed operability (FR26–28), `src/prisma/seed.js`, list filters (`country`, `provider` query params)
- `backend/src/prisma/schema.prisma` — `Organisation` model, `CapabilityState`, relations to lookups
- `backend/src/lib/countries.js` — canonical `COUNTRIES` strings (must match any seeded `country` values)
- `frontend/src/lib/organisation-list-filter-params.js` — URL keys: `country`, `provider`, `type`, `crm`, capability keys

## Story

As a team member,  
I want a set of curated sample organisation records loaded into the application,  
so that demos, onboarding, and smoke tests do not depend on manual data entry.

## Acceptance criteria

1. **Volume and mix**  
   **Given** `npx prisma db seed` or `npx prisma migrate reset` is run (from `backend/`, with `DATABASE_URL` set)  
   **When** the seed script completes  
   **Then** at least **15** `organisation` rows exist — a mix of **Venue**, **Festival**, **Promoter**, and **Cultural Organisation** types across **multiple** distinct `country` values from `COUNTRIES`  
   [Source: epics Story 5.1]

2. **Field richness**  
   **Given** the sample organisations exist  
   **When** inspected in the DB or via the API  
   **Then** each record has: realistic `name`, `country` ∈ `COUNTRIES`, valid `organisation_type_id`, **at least one** row with a `ticketing_provider_id`, **at least one** with `crm_platform_id`, a **variety** of `membership_capability`, `donation_capability`, `reserved_seating_capability` (`YES` / `NO` / `UNKNOWN` across the dataset), and plausible `source_reference` (URL or citation-style text) where appropriate  
   **And** `created_at` and `last_updated` are **not** all identical — use varied, plausible past `Date` values (explicitly set on create/upsert so they are deterministic per run)  
   [Source: epics Story 5.1; `schema.prisma` Organisation]

3. **Filter → list demo path**  
   **Given** seeded data  
   **When** a staff member opens the organisations list with filters **Country** = `United Kingdom` and **Provider** = `Tessitura` (URL: `?country=United+Kingdom&provider=Tessitura` — names must match `countries.js` and seeded `TicketingProvider.name` exactly)  
   **Then** at least **one** organisation appears in the result set  
   [Source: epics Story 5.1; `organisation-controller.js` list query params; `organisation-service.js` filter composition]

4. **Compare demo path**  
   **Given** seeded data  
   **When** a staff member selects **2–4** organisations (checkboxes) and opens the compare page  
   **Then** the comparison is **meaningfully different** across columns — include variation in ticketing provider, CRM, capabilities, and types so side-by-side value is obvious (not four near-identical rows)  
   [Source: epics Story 5.1; Epic 4 compare behaviour]

5. **Idempotency and reset**  
   **Given** reference data is seeded with upserts (existing behaviour)  
   **When** `npx prisma db seed` runs again **or** `npx prisma migrate reset` completes  
   **Then** the database ends in the **same** deterministic sample-organisation state — no duplicate sample orgs, no orphaned partial state  
   **Implementation expectation:** use **fixed UUIDs** per sample organisation and `upsert` on `id`, **or** a documented delete of seed-only IDs then recreate inside a transaction — choose one approach and document it in Dev Notes for maintainers  
   [Source: epics Story 5.1]

## Out of scope

- **README** updates, smoke-test checklist prose, and `docs/decisions.md` completeness review → **Story 5.2** only.

## Tasks / subtasks

- [x] **Extend `backend/src/prisma/seed.js`** (AC: 1–5)  
  - [x] After existing reference-data upserts, resolve lookup IDs: `organisationType`, `ticketingProvider`, `crmPlatform` by **name** (query `findFirst` / map — do not hardcode DB UUIDs for lookups unless you also upsert by name first)  
  - [x] Define **≥ 15** sample organisations as a data structure (names, cities optional, country, type name, optional provider/CRM names, three capabilities, optional notes/capacity, `source_reference`, explicit `created_at` / `last_updated`)  
  - [x] Implement deterministic persistence (upsert by fixed `id` recommended)  
  - [x] Verify AC3: ≥1 row with `country === 'United Kingdom'` and ticketing provider **Tessitura**  
  - [x] Verify AC4: subset of IDs suitable for manual multi-select compare (document 2–4 example IDs or names in Dev Notes for testers)  
  - [x] Log concise summary after seed (e.g. count created/updated) without noisy per-row logs in CI

- [x] **Validation** (AC: 1–5)  
  - [x] Run `npx prisma migrate reset` (or `db seed`) against local Docker DB and confirm counts and filter URL manually or via API `GET /api/organisations?country=United%20Kingdom&provider=Tessitura`  
  - [x] Optional: add a **lightweight** Jest test that mocks Prisma and asserts seed **data module** shape / count ≥ 15, **if** it avoids flaking on real DB — prefer manual verification if integration test setup is heavy

- [x] **Decision log** (minimal)  
  - [x] If seed strategy or data design choices are non-obvious, add a short entry to `docs/decisions.md` (per project-context)

### Review Findings

- [x] [Review][Patch] Assert multiple distinct `created_at` values in seed data tests — AC2 requires `created_at` and `last_updated` not be uniform across the dataset; tests already check `last_updated` variety but not `created_at`. [`backend/src/__tests__/sample-organisations-seed-data.test.js`] — fixed 2026-04-04 (code review)

- [x] [Review][Patch] Point module header at ADR-014 — Top-of-file comment says “ADR sample seed”; use explicit **ADR-014** for maintainers. [`backend/src/prisma/sample-organisations-seed-data.js`] — fixed 2026-04-04 (code review)

- [x] [Review][Patch] Refresh Dev notes “Current state” — Text still said seed creates no `Organisation` rows; updated to describe sample organisations + ADR-014. [`_bmad-output/implementation-artifacts/5-1-sample-organisation-seed-data.md`] — fixed 2026-04-04 (review)

- [x] [Review][Defer] Sample organisation upserts are not wrapped in a `prisma.$transaction` — A crash mid-loop could leave a partial sample set until seed is re-run; acceptable for local/demo; consider a transaction if CI ever relies on atomic partial seeds. [`backend/src/prisma/seed.js`] — deferred, low severity

## Dev notes

### Current state

- `backend/src/prisma/seed.js` upserts reference data (ticketing providers, CRM platforms, organisation types), then applies **deterministic sample `Organisation` rows** from `sample-organisations-seed-data.js` (fixed UUID upserts per ADR-014).  
- `backend/package.json` already declares `"prisma": { "seed": "node src/prisma/seed.js" }` — no change required unless you split modules for clarity (optional).

### Schema guardrails

- Required: `name`, `country`, `organisation_type_id`.  
- Optional: `city`, `ticketing_provider_id`, `crm_platform_id`, `membership_capability`, `donation_capability`, `reserved_seating_capability` (default `UNKNOWN`), `source_reference`, `notes`, `capacity`.  
- Use `CapabilityState` enum values exactly: `YES`, `NO`, `UNKNOWN`.

### Country and lookup names

- **Country** strings must be **exact** members of `backend/src/lib/countries.js` (kept in sync with `frontend/src/lib/countries.js`).  
- **Organisation types** (seeded): `Venue`, `Festival`, `Promoter`, `Cultural Organisation`.  
- **Tessitura** must exist as a `TicketingProvider` (already in seed list) for AC3.

### API / list filters (for manual AC checks)

- Backend list endpoint accepts `country` and `provider` as query strings; `provider` filters on `ticketing_provider.name` (see `organisation-service.js`).  
- Type filter query param is `type` (organisation type **name**).

### Anti-patterns

- Do **not** instantiate a second `PrismaClient` in seed — use the existing `require('../lib/prisma')` pattern already in `seed.js`.  
- Do **not** add authentication or external API calls.  
- Do **not** put demo-only organisations outside the seed script without a cleanup strategy (breaks AC5).

### Latest stack note

- Prisma **6.19.x** is pinned in `backend/package.json` — use `upsert` / `create` APIs compatible with current client; no upgrade in this story.

## Previous story intelligence

- **Story 4.2** (`4-2-compare-page.md`): compare is URL-driven; list filters sync to URL (`country`, `provider`, …). Seed data should make those journeys **obvious** without custom URL crafting beyond the documented UK + Tessitura example.

## Project context reference

- Naming: **organisation** (British English), kebab-case files except React components.  
- Seed data lives in **`backend/src/prisma/seed.js`** per project-context and actual repo layout (architecture diagram may still say `backend/prisma/` in places — **trust the repo**).

## Dev agent record

### Agent model used

Composer (Cursor agent), dev-story workflow

### Debug log references

- Docker image required rebuild (`COPY` layout) for running container to pick up seed changes; `docker compose run --rm backend npx prisma db seed` verified create vs update counts and AC3 via `curl` to `GET /api/organisations?country=United%20Kingdom&provider=Tessitura`.

### Completion notes list

- Added **17** curated organisations in `sample-organisations-seed-data.js` (fixed UUIDs `5e1a0001-…000001`–`…0011`): all four organisation types, **11** countries, explicit varied `created_at` / `last_updated`, mix of providers/CRM (including nulls), capability triplets spanning YES/NO/UNKNOWN. **AC3:** Royal Albert Hall (UK + Tessitura). **AC4 compare smoke (2–4 ids):** e.g. `5e1a0001-0001-4001-8001-000000000001` (Venue, Tessitura, Salesforce), `5e1a0001-0001-4001-8001-000000000009` (Festival, Eventbrite, no CRM), `5e1a0001-0001-4001-8001-00000000000a` (Promoter, Ticketmaster, Salesforce), `5e1a0001-0001-4001-8001-000000000005` (Cultural, no ticketing provider, Salesforce). Post-seed invariant throws if UK+Tessitura row missing. **ADR-014** documents fixed-id upsert strategy.
- Jest: `sample-organisations-seed-data.test.js` asserts count ≥ 15, countries, types, capabilities variety, UK+Tessitura row in data, distinct `created_at` and `last_updated` (AC2).

### File list

- `backend/src/prisma/sample-organisations-seed-data.js` (new)
- `backend/src/prisma/seed.js` (modified)
- `backend/src/__tests__/sample-organisations-seed-data.test.js` (new)
- `docs/decisions.md` (modified — ADR-014)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/5-1-sample-organisation-seed-data.md` (modified — story tracking only)

### Change log

- 2026-04-04: Story 5.1 — deterministic sample organisations (fixed UUID upsert), AC3 guard, seed summary log, ADR-014, lightweight Jest coverage for seed data module.

### Implementation plan

1. Extract sample rows to `sample-organisations-seed-data.js` for testability and clarity.  
2. After reference upserts, `findMany` lookups → maps by name → `organisation.upsert` per row with explicit timestamps on create and update.  
3. Assert AC3 with `findFirst`; log created/updated counts from pre-upsert existence check.
