# Story 10.3: README and `docs/decisions.md` v2 Updates

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a team member taking over the project,
I want the README and decisions log updated to reflect the v2 world,
so that I can run the full app, smoke-test both catalogues, and understand the binding architectural calls without reading the delta documents.

## Acceptance Criteria

1. **README smoke-test checklist (v2)**  
   **Given** the v1 README contained setup steps, ports, smoke-test checklist, threat-model note, and known-limitations section  
   **When** the v2 README updates are applied  
   **Then** the smoke-test checklist covers **both** catalogues and matches this ordered list:
   - (1) `GET /api/health` — `data.status` is `"ok"`.
   - (2) `GET /api/meta/organisation-types` — non-empty `data` (reference data). **Do not** require legacy `ticketing-providers` / `crm-platforms` URLs (removed in Story 10.2; they return JSON **404** with route-not-found envelope if hit).
   - (3) `/organisations` loads with seeded sample organisations.
   - (4) `/systems` loads with the **11** seeded Systems.
   - (5) At least one `GET /api/organisations` filter combination including **`system=<uuid>`** (valid seeded System id) returns a non-empty `data` array — use Network tab, seed data, or `GET /api/systems?limit=100` to pick a uuid.
   - (6) `/compare/systems?ids=<uuid-a>,<uuid-b>` renders two System columns (meaningful content, not blank/error).
   - (7) Creating a System via **`/systems/new`** saves and redirects to detail.
   - (8) Linking a System to an Organisation via the organisation form saves and the link appears on the Organisation detail page (**Linked systems** panel).

2. **README deployment / Migration C**  
   **Given** architecture-v2-delta §6.5 rollback strategy  
   **When** the README deployment section is updated (new subsection or prominent callout under database/migrations)  
   **Then** it **explicitly** states: Migration C (`drop_legacy_lookups`) is **forward-only**; take a **database backup** before applying it in any non-throwaway environment — there is **no SQL inverse** for the dropped legacy FK columns.  
   **And** it names the **three** v2 migrations **in order** (folder names under `backend/src/prisma/migrations/`):
   - `20260429220615_add_system_and_junction` — additive (A)
   - `20260430183000_backfill_systems_and_links` — backfill (B)
   - `20260502180000_drop_legacy_lookups` — destructive (C)

3. **README navigation reference**  
   **Given** the v2 navigation structure  
   **When** the README adds a short routing table  
   **Then** it lists (with one-line descriptions): `/organisations`, `/organisations/new`, `/organisations/:id`, `/organisations/:id/edit`, `/systems`, `/systems/new`, `/systems/:id`, `/systems/:id/edit`, `/compare/systems`, `/compare/organisations`.  
   **Note:** `App.jsx` also mounts `/compare/*` via `CompareLegacyPathPage` for old bookmarks — optional one-line mention if you document redirects.

4. **README known limitations**  
   **Given** the v1 known-limitations list  
   **When** v2 updates are applied  
   **Then** retain: no auth (internal only); desktop-only MVP; no CSV export (post-MVP); no external integrations.  
   **And** add: **System `custom_attributes`** editing is **read-only** in MVP (full editing → Growth); **Mode B** (organisation-filtered System compare) is **Growth**.

5. **`docs/decisions.md` — seven v2 delta entries**  
   **Given** architecture-v2-delta §8  
   **When** entries are added with rationale  
   **Then** all **seven** items appear (assign new ADR numbers **ADR-018** through **ADR-024** after **ADR-017**, and update the **index line** at the top of `docs/decisions.md`):
   - (1) OrganisationSystem **hard-deletes** on unlink — no soft-delete or history table.
   - (2) System **custom attributes** as **JSON** on `System.custom_attributes`, not a separate table.
   - (3) **System name unique**; vendor disambiguation in `vendor`.
   - (4) **Three-migration sequence** (additive → backfill → destructive) mandatory — *if this duplicates ADR-015, keep one short ADR that **references ADR-015** and records §8 traceability rather than pasting the same long rationale twice*.
   - (5) **No batch compare endpoint** — parallel `GET /api/systems/:id` calls.
   - (6) **Selection context split** — Organisation vs System compare state.
   - (7) Compare paths **`/compare/systems`** and **`/compare/organisations`** — v1 `/compare?ids=` bookmarks break; acceptable for internal MVP.

6. **`docs/decisions.md` — existing Story 6.3 / 7.1 decisions**  
   **Given** Stories 6.3 and 7.1  
   **When** the file is reviewed  
   **Then** **ADR-016** (`system-geographic-focus` dual maintenance) and **ADR-017** (multi-value `category` on `GET /api/systems`) **already exist** — verify wording still accurate; **do not** duplicate them.

7. **Handoff / implementation-readiness**  
   **Given** prd-v2-delta §7  
   **When** the README is updated  
   **Then** add an **“After v2 changes ship”** (or similar) short section instructing: re-run **`bmad-check-implementation-readiness`** against updated `_bmad-output/planning-artifacts/epics.md`, `prd-v2-delta.md`, `architecture-v2-delta.md`, and v2-extended `ux-design-specification.md` — report supersedes the v1 readiness report dated **2026-04-02**. Use **repo-relative paths** from project root so links work in GitHub.

## Tasks / Subtasks

- [x] **README** — Replace v1 smoke steps (legacy meta URLs, `/compare?ids=`, provider filter URLs) with AC1 list; add Migration C / three-migration names (AC2); add route table (AC3); refresh known limitations (AC4); add handoff section (AC7).
- [x] **`docs/decisions.md`** — Append ADR-018…024 per AC5; update index; confirm ADR-016/017 (AC6).
- [x] **Consistency pass** — `grep` README for `ticketing-providers`, `crm-platforms`, `TicketingProvider`, `CrmPlatform`, `/compare?ids=` as primary flow; fix or qualify (legacy redirect).
- [x] **Optional same-PR** — `CLAUDE.md` still lists `TicketingProvider` / `CrmPlatform` under Database and understates frontend routes; align with v2 if you want agent guidance to match production (epic names only README + `docs/decisions.md` — treat as recommended follow-through).

### Review Findings

- [x] [Review][Patch] ADR-009 **Rationale** still claims nested `ticketingProvider` / `crmPlatform` in the public contract; it contradicts the new v2 list/detail paragraph and AC6 (“verify wording still accurate”). Tighten the **Rationale** (e.g. historical pre-v2 sentence + pointer to mapper) so the ADR reads as one coherent story. [`docs/decisions.md` ~118]
- [x] [Review][Patch] `sprint-status.yaml` **`last_updated`** moved backward (`2026-05-02T22:25:00Z` → `2026-05-02T18:45:00Z`); restore monotonic / current timestamp for audit hygiene. [`_bmad-output/implementation-artifacts/sprint-status.yaml` ~38]

## Dev Notes

### Current state (must read before editing)

- **`README.md`** — Smoke test still references **`/api/meta/ticketing-providers`**, **`/api/meta/crm-platforms`**, **`/compare?ids=`**, and **provider** URL filters (`?provider=Tessitura`). Those are **v1**; backend list filters and compare routes have moved (see `frontend/src/App.jsx`).
- **`docs/decisions.md`** — Strong v1 + migration ADRs through **ADR-017**; **no** §8 delta entries yet. **ADR-009** body still describes organisation DTO nested **`ticketingProvider` / `crmPlatform`** — v2 list/detail uses **linked systems**; consider a short **amendment paragraph** under ADR-009 or a new ADR that points implementers to `organisation-list-dto.js` v2 shape **without** rewriting history.

### What this story changes vs preserves

| Change | Preserve |
|--------|----------|
| README reflects Systems catalogue, junction linking, v2 compare URLs | Docker/local commands, threat model, British English |
| Decisions log gains §8 v2 decisions | Existing ADR numbering scheme; append-only style |
| Migration C backup warning | Three-migration rule already in ADR-015 |

### Architecture / doc compliance

- Sources: [epics.md Epic 10 / Story 10.3](../planning-artifacts/epics.md), [architecture-v2-delta.md §6.5–§8](../planning-artifacts/architecture-v2-delta.md), [project-context.md](../project-context.md).
- Spelling: **organisation**; migration folder names are factual — copy exactly from `backend/src/prisma/migrations/`.

### File touch list

| File | Action |
|------|--------|
| `README.md` | Update smoke, deployment/Migration C, routes, limitations, handoff |
| `docs/decisions.md` | ADR-018–024 + index; optional ADR-009 clarification |

### Testing / QA

- No automated tests for markdown. **Manual:** run through new smoke list on a clean `docker compose up --build` (or `migrate reset` + seed). Proofread relative links in handoff section.

### Previous story intelligence (10.2)

- Legacy meta endpoints removed; **JSON 404** for unknown API routes — smoke docs must not assert 200 on removed paths.
- Frontend/API cleanup completed; README is the remaining user-facing doc debt called out in [10-2 story](10-2-drop-legacy-meta-endpoints-and-frontend-helpers.md).

### Git intelligence

- Recent work: Epic 9 compare, Migration C, Story 10.2 — docs should finally match merged code.

### Latest tech notes

- None; documentation-only story.

### Project context reference

- [_bmad-output/project-context.md](../project-context.md) — dual-file maintenance for countries / `system-geographic-focus`; no new endpoints for this story.

### Open questions (saved for end)

- Whether to expand **ADR-009** vs add **ADR-025** for organisation DTO v2 is left to implementer preference; epic does not mandate ADR-009 edits, but leaving wrong DTO description confuses readers.

## Dev Agent Record

### Agent Model Used

Cursor agent

### Debug Log References

### Implementation Plan

1. Updated `README.md` for v2 smoke checklist, migration C callout with exact migration folder names, frontend route table, known limitations, and post-v2 handoff paths.
2. Appended **ADR-018**–**ADR-024** and extended the decisions index; added **ADR-009** v2 DTO amendment; verified **ADR-016** / **ADR-017** unchanged and still accurate.
3. Aligned `CLAUDE.md` with v2 models, routes, and split selection providers.
4. Regression: `backend npm test` (215 tests), `frontend npm run lint`.

### Completion Notes List

- README smoke list matches AC1 order; legacy meta URLs documented as 404 only.
- Migration subsection states forward-only C and lists A/B/C folder names under `backend/src/prisma/migrations/`.
- `docs/decisions.md` index includes ADR-018–024; ADR-021 references ADR-015 for three-migration rationale per AC5(4).

### File List

- `README.md`
- `docs/decisions.md`
- `CLAUDE.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-3-readme-and-docs-decisions-md-v2-updates.md`

## Change Log

- 2026-05-02 — Story file created (create-story workflow); status `ready-for-dev`.
- 2026-05-02 — Story 10.3 implemented: README v2 smoke, migrations, routes, limitations, handoff; ADR-018–024 + ADR-009 v2 note; CLAUDE.md v2 alignment; sprint status → `review`.
- 2026-05-02 — Code review: ADR-009 Rationale aligned with v2 DTO; `sprint-status.yaml` `last_updated` corrected; story and sprint → `done`.
