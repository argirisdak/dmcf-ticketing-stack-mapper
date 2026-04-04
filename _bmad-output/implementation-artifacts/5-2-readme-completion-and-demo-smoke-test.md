# Story 5.2: README completion and demo smoke test

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required reading (read before implementation)

- `_bmad-output/project-context.md` — British English, no auth, decisions in `docs/decisions.md`, README must stand alone for a stranger
- `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.2 (~lines 722–746)
- `_bmad-output/planning-artifacts/architecture.md` — FR26–28 operability, Prisma seed behaviour (~lines 936–942)
- `README.md` — current structure (Story 1.3); remove or replace the **Roadmap note (Story 5.2)** once this work lands
- `docker-compose.yml` — backend startup runs `migrate deploy` then `db seed` (no host DB port)
- `docs/decisions.md` — completeness check against Story 5.2 AC4 (see **Decisions completeness** below)

## Story

As a team member,  
I want the README and docs to be complete for the fully-featured application,  
so that the product can be handed off or demonstrated without the original author present.

**Note (epics):** Story 1.3 established README structure, setup steps, ports, and threat model. This story **extends** it with seed/reset command documentation, a **full-feature** smoke-test sequence, **known limitations**, and a final `docs/decisions.md` review.

## Acceptance criteria

1. **Seed and reset commands in README**  
   **Given** the README from Story 1.3 is in place  
   **When** this story is complete  
   **Then** the README additionally documents:
   - `npx prisma db seed` — run from **`backend/`** with `DATABASE_URL` set (see `backend/.env.example`). In **Docker**, use the backend service, e.g. `docker compose exec backend npx prisma db seed` (or `docker compose run --rm backend npx prisma db seed` if no running container).
   - `npx prisma migrate reset` — same working directory / env rules; **warn** that this drops all data, reapplies migrations, then runs seed (clean demo DB). Docker: e.g. `docker compose exec backend npx prisma migrate reset`.
   - A **clear note** on what each command does: **`migrate reset`** yields a **full** empty-then-seeded database; **`db seed`** **upserts** reference data and **sample organisations** (fixed UUIDs per **ADR-014**) and **does not remove** user-created organisations that are not part of the sample set. Align wording with `docs/decisions.md` **ADR-014** so readers are not misled.  
   [Source: epics Story 5.2; ADR-014]

2. **Extended smoke-test checklist (end-to-end)**  
   **Given** the README smoke-test section  
   **When** a team member follows it **after** the database contains seeded data (fresh `docker compose up --build` or after `db seed` / `migrate reset`)  
   **Then** the checklist walks through **in sequence**:
   - **Organisations list** — open `http://localhost:5173/organisations` (or app root redirect); the list shows **multiple** seeded organisations (not an empty state).
   - **Filter** — apply a filter combination that returns a **non-empty** result (epics example: **Country** = United Kingdom and **Provider** = Tessitura). Document the **URL shape** if useful: `?country=United+Kingdom&provider=Tessitura` (names must match `COUNTRIES` and seeded provider names exactly).
   - **Compare** — select **2** organisations on the list (checkboxes), open the compare experience (`/compare?ids=...` via **Compare selected** or equivalent); **two** cards/sections render with meaningful content (not blank/error).
   - **Create** — open **New organisation** (`/organisations/new`), submit a **minimal valid** create (required fields only is fine); **expect** successful save and **navigation to** `/organisations/:id` (detail page).  
   **Retain** the existing shorter checks (health, meta endpoints, frontend shell) **above** or **integrated** into this flow as appropriate — the goal is one coherent checklist, not duplicate contradictory sections.  
   [Source: epics Story 5.2; `App.jsx` routes; Story 5.1 completion notes for compare IDs]

3. **Known limitations section**  
   **Given** the README  
   **When** it is reviewed for completeness  
   **Then** it includes a **Known limitations** (or similarly titled) section stating at minimum:
   - No authentication or authorisation — internal / trusted-network deployment only (can cross-reference the existing **Threat model** subsection).
   - Desktop-optimised UI for MVP — **no** dedicated mobile layout.
   - No CSV export — post-MVP.
   - No external API integrations — data is entered manually.  
   [Source: epics Story 5.2]

4. **`docs/decisions.md` completeness**  
   **Given** `docs/decisions.md`  
   **When** reviewed as a final completeness check  
   **Then** epic-required topics are **present and findable** (by ADR or section):
   - Prisma v6 rationale (**ADR-001**)
   - Tailwind v3 pin (**ADR-005**)
   - shadcn/ui copy-paste approach (**ADR-006**)
   - React Router v6 via **`react-router-dom`** (**ADR-007**)
   - Country list dual-maintenance rule (**ADR-008**)
   - Epic 4 **`clearSelection()`** / preserve selection on compare navigation (**ADR-013**)  
   If any bullet is only implied elsewhere, add a **short pointer** or ADR cross-link in `decisions.md` (minimal edit — do not duplicate long rationale). Remove or update the closing line *“Further decisions will be recorded…”* if it is no longer accurate after Epic 5.  
   [Source: epics Story 5.2]

## Tasks / subtasks

- [x] **README — seed / reset** (AC: 1)  
  - [x] Document commands for **both** Docker-first workflow and optional local-Postgres workflow (`cd backend`, env file).  
  - [x] Clarify Compose already runs `migrate deploy` + `db seed` on backend container start (see `docker-compose.yml`) vs manual re-run.  
  - [x] Accurate semantics: `migrate reset` vs `db seed` vs user-created rows (**ADR-014**).

- [x] **README — smoke test** (AC: 2)  
  - [x] One ordered checklist covering health/meta (existing), list, filter, compare (2 orgs), create → detail.  
  - [x] Optional: cite 2–4 sample UUIDs from **5-1** story file for deep-link compare smoke (`5e1a0001-…` examples) — only if it reduces ambiguity.

- [x] **README — known limitations** (AC: 3)  
  - [x] New section; avoid contradicting threat-model wording.

- [x] **`docs/decisions.md`** (AC: 4)  
  - [x] Verify ADRs above; minimal edits for gaps; trim stale footer if needed.

- [x] **Housekeeping**  
  - [x] Remove **“Roadmap note (Story 5.2)”** from `README.md` (superseded by this work).

### Review Findings

- [x] [Review][Patch] Add Docker `migrate reset` when no backend container is running — mirror `db seed` with `docker compose run --rm backend npx prisma migrate reset`, and state that `exec` needs a running backend. [`README.md` — AC1 parity with seed section; Acceptance Auditor + Edge Case Hunter]
- [x] [Review][Patch] Show non-interactive Docker `migrate reset` — add a copy-paste example using `--force` (e.g. `docker compose exec backend npx prisma migrate reset --force`) next to the interactive note. [`README.md` — AC1 / dev notes Prisma behaviour]
- [x] [Review][Patch] Clarify API envelope wording — avoid `{ "data", "error", "meta" }` as if it were JSON object syntax; use “top-level keys `data`, `error`, and `meta`” (or equivalent). [`README.md` — Blind Hunter]
- [x] [Review][Patch] Extend decisions index — include **ADR-011** and **ADR-014** in the opening index line (and ADR-010/012 if you want full coverage of new ADRs in this diff). [`docs/decisions.md` — AC4 findability; Blind Hunter]

- [x] [Review][Defer] ADR-011 rationale tone — phrases like “lineage the user hit” are weak for audits; tighten with a concrete Prisma version and a link to release notes when convenient. [`docs/decisions.md`]
- [x] [Review][Defer] Smoke checklist brittleness — filter URL and optional compare UUIDs depend on exact seed data and Story 5.1 ids; refresh when seed or routes change. [`README.md`]
- [x] [Review][Defer] Operational note — optional future sentence on backend startup time when `db seed` runs on every container start (if operators report confusion). [`README.md`]

## Dev notes

### Architecture compliance

- **FR26–28:** Operability is **not** optional — README is the handoff surface for clone → run → smoke test.  
- **Threat model:** Already required; known limitations should **reinforce** no-auth posture without duplicating entire security subsection.  
- **Architecture path drift:** Some architecture diagrams reference `backend/prisma/seed.js`; the **actual** seed entry is `backend/src/prisma/seed.js` with `package.json` `prisma.seed` — document paths that match the repo.

### Technical requirements

- **No new dependencies** for this story unless absolutely necessary (documentation-only preferred).  
- **British English** in user-facing README prose (`organisation`).  
- Smoke steps must match **current** routes: `/organisations`, `/organisations/new`, `/organisations/:id`, `/compare`.  
- API envelope for checks remains `{ data, error, meta }`.

### File structure

- Primary edit: **`README.md`** (project root).  
- Secondary edit: **`docs/decisions.md`** (completeness only).

### Testing requirements

- **Manual:** Execute the final README smoke checklist once on a clean Docker bring-up (or after `migrate reset` in backend container).  
- **Automated:** Not required for this story unless the team adds a scripted smoke runner later (out of scope unless requested).

### Previous story intelligence (5.1)

- Sample data: **≥ 15** organisations; UK + Tessitura path documented in **5-1**; compare smoke IDs listed in **5-1** Dev agent record.  
- **ADR-014:** Fixed UUID upserts — re-seeding updates sample rows; does not delete arbitrary user orgs.

### Git intelligence

- Repository history may be shallow locally; rely on **implementation artifacts** and **decisions.md** for continuity.

### Latest tech information

- Prisma 6.x: `migrate reset` prompts for confirmation in interactive TTY; in CI/scripts use `--force` if ever scripted (document for humans: confirm prompt). Optional note in README for non-interactive use.

### Project context reference

- See `_bmad-output/project-context.md` — documentation rules, Docker three-service layout, README completeness for strangers.

## Dev agent record

### Agent model used

Cursor agent (Composer), dev-story workflow — 2026-04-04.

### Debug log references

### Completion notes list

- Extended root **README** with **Database seed and reset** (Docker `exec` / `run --rm`, local `cd backend`), automatic **`migrate deploy` + `db seed`** on Compose backend start vs manual re-run, **ADR-014** semantics (`migrate reset` vs `db seed`), and **`--force`** note for non-interactive reset.
- Replaced smoke test with a **single ordered** checklist: health, meta, shell, list, UK+Tessitura filter URL, compare via **Compare selected (2) →** plus optional fixed-UUID deep link from Story 5.1, **Add organisation** → detail navigation.
- Added **Known limitations** (no auth, desktop-first, no CSV export, no external APIs) with threat-model cross-reference.
- **docs/decisions.md:** top **index** line for audit topics, **ADR-013** row in Story 1.3 compliance table, footer updated; removed README roadmap note.
- **Regression:** `backend npm test` (69 tests), `frontend npm run lint` — pass.

### File list

- `README.md`
- `docs/decisions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-2-readme-completion-and-demo-smoke-test.md`

### Change log

- 2026-04-04: Story 5.2 — README seed/reset, E2E smoke checklist, known limitations, decisions index + AC4 table row; sprint status → review.
- 2026-04-04: Code review (batch option 0) — README `migrate reset` Docker parity (`run --rm`, `exec` prerequisite), non-interactive `--force` examples (including `run --rm`), API envelope wording; decisions index extended through **ADR-014**; sprint status → **done**.

### Implementation plan

1. Align README with `docker-compose.yml` startup and Prisma paths under `backend/`.
2. Document `db seed` / `migrate reset` for Docker and local Postgres; link behaviour to ADR-014.
3. Merge smoke steps into one list; cite filter URL and optional compare UUIDs.
4. Minimal `decisions.md` edits for findability (index, ADR-013 in table, footer).
