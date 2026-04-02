# Story 1.3: README and Project Documentation

Status: done

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming conventions, documentation rules, and what to avoid
- `_bmad-output/planning-artifacts/architecture.md` — environment variables, Docker, security posture, and stack choices (authoritative reference for rationale text in `docs/decisions.md`)

## Story

As a team member,
I want complete setup documentation covering every step from clone to smoke test,
so that a second team member can get the full stack running without prior knowledge or undocumented steps.

## What Stories 1.1 and 1.2 Delivered (context handoff)

- **Backend** (`backend/`) — Express + Prisma v6, health + meta routes, seed, migrations, Jest tests
- **Frontend** (`frontend/`) — Vite + React, Tailwind v3, React Router v6, TanStack Query v5, `SelectionContext`, placeholder pages, shadcn-style `Button`
- **`docker-compose.yml`** — three services: `db`, `backend`, `frontend` (ports: backend `3001`, frontend `5173`; database is internal-only)
- **`backend/.env.example`** — `DATABASE_URL`, `CORS_ORIGIN`, `PORT`
- **`frontend/.env.example`** — `VITE_API_BASE_URL`
- **`docs/decisions.md`** — ADR-001 through ADR-004 already recorded (Prisma v6, city column scope, Jest, Express v5). Story 1.3 **adds** the remaining architecture-aligned decisions listed in the acceptance criteria (see Task 2) without removing or contradicting existing ADRs
- **`README.md`** — skeleton only; this story replaces it with full setup + smoke test + threat model

**Backend country list:** `COUNTRIES` is a **named CommonJS export** from `backend/src/prisma/seed.js`:

```js
module.exports = { COUNTRIES };
```

Any code that consumes it must destructure:

```js
const { COUNTRIES } = require('../prisma/seed.js');
```

(Adjust the relative path from the importing file.) Document this in `docs/decisions.md` under the country-list ADR.

## Out of Scope

- **Seed command / `prisma migrate reset` documentation** — Story 5.2 extends the README with seed/reset commands and full end-to-end smoke steps. Story 1.3 should **briefly note** in the README that sample organisation seeding and extended smoke tests arrive in Story 5.2 (so readers are not surprised by a shorter checklist now)
- **Known limitations section** (no auth, desktop-first, no CSV export, etc.) — Story 5.2
- **Epic 4 `clearSelection()` architecture override** — Story 4.1 + `docs/decisions.md` when implemented
- **Code changes** except documentation and `.gitignore` if the acceptance criteria require it

---

## Acceptance Criteria

**AC1 — README enables unassisted bring-up**

Given a machine with Docker, Node.js, and Git installed
When following the README from start to finish without outside help
Then the reader can: clone the repo, create `.env` files for both layers from `.env.example`, run `docker compose up`, and confirm the stack is running — all without consulting anyone
And the README documents all service ports (backend: 3001, frontend: 5173)
And the README includes a smoke-test checklist (e.g. health endpoint returns OK, meta endpoints return reference data, frontend loads at port 5173)
And the README includes an explicit threat model note: the application has no authentication and must not be exposed to the public internet

**AC2 — `docs/decisions.md` records mandated decisions**

Given the `docs/decisions.md` file
When it is opened
Then it records the following decisions with brief rationale: Prisma v6 (not v7) choice, Tailwind CSS v3 (not v4) pin, shadcn/ui copy-paste approach (not CLI), React Router v6 package name (`react-router-dom@6`), country list dual-maintenance rule (frontend constant + seed script must be updated together)

**AC3 — `.gitignore` covers secrets, dependencies, and Prisma client output**

Given the `.gitignore` at the repository root
When it is inspected
Then `.env` files, `node_modules/` directories, and Prisma-generated client output are excluded from source control

---

## Tasks / Subtasks

- [x] Task 1: Replace `README.md` with complete project documentation (AC: 1)
  - [x] Remove the "skeleton / Story 1.3" placeholder tone — write for a stranger cloning the repo
  - [x] Prerequisites: Docker (with Compose), Node.js (state a sensible minimum, e.g. 20 LTS), Git
  - [x] Step-by-step: clone → `cp backend/.env.example backend/.env` → `cp frontend/.env.example frontend/.env` → `docker compose up` (or `docker compose up --build` on first run)
  - [x] Document ports explicitly: **backend `http://localhost:3001`**, **frontend `http://localhost:5173`**; note that the database is **not** exposed on the host
  - [x] Smoke-test checklist (numbered or checkbox style):
    - [x] `GET http://localhost:3001/api/health` returns JSON with `data.status` === `"ok"` (or equivalent per existing API shape)
    - [x] `GET http://localhost:3001/api/meta/ticketing-providers` (and CRM / organisation-types) return non-empty `data` arrays
    - [x] Open `http://localhost:5173` — app shell loads without console errors
  - [x] **Threat model** — dedicated short subsection: no authentication; internal/trusted-network deployment only; **do not** expose to the public internet; mis-deployment risks data exposure
  - [x] Optional but recommended: **Local dev without Docker** — one short subsection: `cd backend && npm install && npx prisma migrate dev && npm start` and `cd frontend && npm install && npm run dev`, with `DATABASE_URL` pointing at a local Postgres if not using Compose (keep it brief; Docker is the primary path)
  - [x] **Forward pointer:** one sentence that Story 5.2 will add seed/reset commands, extended smoke tests, and known limitations — so the README is intentionally complete for foundation but not final for demo handoff

- [x] Task 2: Extend `docs/decisions.md` to satisfy AC2 (AC: 2)
  - [x] **Prisma v6:** Already covered by **ADR-001**. Add a one-line cross-reference under a "Story 1.3 compliance" note or leave ADR-001 as-is — do **not** duplicate the full Prisma rationale in a second ADR
  - [x] **Add new ADRs** (suggested numbering) with brief rationale each, aligned with `_bmad-output/planning-artifacts/architecture.md`:
    - [x] **ADR-005:** Tailwind CSS v3 pin (not v4) — `tailwind.config.js` workflow; v4 is CSS-first config; shadcn/ui tested against v3 for this project
    - [x] **ADR-006:** shadcn/ui via **manual copy** into `frontend/src/components/ui/` — **do not** use `npx shadcn@latest add` CLI (avoids extra package coupling per project context)
    - [x] **ADR-007:** React Router **browser** package — install `react-router-dom@6`; all imports from `react-router-dom` (not `react-router@6` alone)
    - [x] **ADR-008:** Country list **dual maintenance** — canonical list in `backend/src/prisma/seed.js` as `COUNTRIES` (named export: `const { COUNTRIES } = require('...')`) and mirrored in `frontend/src/lib/countries.js`; **no** `/api/meta/countries`; both files must stay in sync; document in decisions when the list changes
  - [x] Update the footer line `*Additional decisions will be recorded...*` to remain accurate after your edits

- [x] Task 3: Verify and tighten `.gitignore` (AC: 3)
  - [x] Ensure **all** `.env` files are ignored — a root pattern `.env` matches `.env` in subdirectories in standard Git ignore behaviour; if any `.env` is tracked, stop and fix
  - [x] Ensure `node_modules/` is ignored at root and/or per package (existing `backend/node_modules/` and `frontend/node_modules/` entries are fine)
  - [x] **Prisma client:** Generated client and engines live under `node_modules/` (e.g. `node_modules/.prisma/`, `@prisma/client`). Confirm `node_modules/` coverage is explicit in comments so future agents do not commit generated output. If the project ever adds a custom Prisma output path outside `node_modules`, add that path here — for the current layout, documenting that `node_modules/` covers Prisma output is sufficient

### Review Findings

- [x] [Review][Patch] README quick start: clarify clone intro (remove misleading “From an empty directory”) [`README.md`:13–14] — applied (project root + clone wording)
- [x] [Review][Defer] Frontend ESLint `react-refresh/only-export-components` in `button.jsx` and `SelectionContext.jsx` — deferred, pre-existing (not introduced by Story 1.3)

---

## Dev Notes

### API response shapes (for README examples)

Smoke tests should describe checks that match the real API:

- Health: `{ "data": { "status": "ok" }, "error": null, "meta": null }`
- Meta list endpoints: `{ "data": [ ... ], "error": null, "meta": null }`

Do not document a different envelope — see `backend/src/app.js` and meta controller.

### README tone and structure (suggested outline)

1. Title + one-sentence product description  
2. Prerequisites  
3. Quick start (Docker Compose — primary)  
4. Service URLs and ports  
5. Smoke test checklist  
6. Threat model / security posture  
7. Project layout (short — `backend/`, `frontend/`, `docs/`)  
8. Running tests (optional one-liner: `cd backend && npm test`)  
9. Pointer to `docs/decisions.md`  
10. Note on Story 5.2 README extensions  

### ADR-001 handling

The acceptance criteria require that `docs/decisions.md` "records" the Prisma v6 decision. **ADR-001 already satisfies this.** In Task 2, either add a short "Compliance checklist (Story 1.3)" section that lists all five bullets with pointers to ADR-001, ADR-005–008, or ensure ADR-001's title explicitly mentions "Prisma v6 (not v7)" — it already does. No need to merge ADR-001 into a new ADR.

### Anti-Patterns

- Removing ADR-002, ADR-003, or ADR-004 — they are implementation truth from Stories 1.1–1.2
- Documenting ports or URLs that contradict `docker-compose.yml` and `.env.example` files
- Promising features in the README that are not yet implemented (e.g. full CRUD, compare) — stay within foundation scope

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure, Environment Variables, Security]
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-04-02T17-25-47Z.md#Concern m4]
- [Source: _bmad-output/project-context.md#Documentation Rules, Docker Compose Rules]
- [Source: docker-compose.yml]
- [Source: backend/.env.example, frontend/.env.example]
- [Source: docs/decisions.md]

---

## Change Log

- **2026-04-02:** Story 1.3 implemented — full `README.md`, `docs/decisions.md` (compliance checklist + ADR-005–008), root `.gitignore` env/Prisma commentary.
- **2026-04-02:** Code review — README quick-start intro clarified (project root after clone); ESLint deferrals recorded in `deferred-work.md`. Story marked **done**.

---

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

None.

### Completion Notes List

- Replaced skeleton `README.md` with clone-to-smoke-test instructions, ports table, threat model, optional non-Docker dev path, project layout, backend test one-liner, pointer to `docs/decisions.md`, and Story 5.2 forward note. API smoke steps match `{ data, error, meta }` envelopes from `backend/src/app.js` and meta controller.
- Extended `docs/decisions.md` with Story 1.3 compliance table (maps AC2 to ADR-001 + ADR-005–008) and new ADRs for Tailwind v3, shadcn copy-paste, `react-router-dom@6`, and country list dual maintenance with `COUNTRIES` export pattern.
- Tightened `.gitignore`: `.env.*` for variants, `!.env.example` to keep examples trackable, comments clarifying Prisma output under `node_modules/`.
- **Tests:** `cd backend && npm test` — 22 passed. **Lint:** `cd frontend && npm run lint` fails with 2 pre-existing `react-refresh/only-export-components` issues in `button.jsx` and `SelectionContext.jsx` (unchanged by this story).
- **Code review (2026-04-02):** Patch finding addressed (README clone / project-root wording). Deferred ESLint items tracked in `deferred-work.md`. Status → **done**.

### File List

- `README.md`
- `docs/decisions.md`
- `.gitignore`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (story status `ready-for-dev` → `in-progress` → `review`)
- `_bmad-output/implementation-artifacts/1-3-readme-and-project-documentation.md` (this file — workflow sections only)
