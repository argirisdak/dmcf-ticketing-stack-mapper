# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

DMCF Ticketing Stack Mapper — an internal tool for mapping and comparing ticketing and CRM platforms used by cultural organisations. No authentication; internal/trusted-network deployment only.

## Commands

### Docker (recommended)

```bash
docker compose up --build        # first run — builds images, migrates, seeds, starts
docker compose up                # subsequent runs
docker compose exec backend npx prisma db seed          # re-seed without rebuild
docker compose exec backend npx prisma migrate reset    # full wipe + re-seed
```

### Local development (requires PostgreSQL 16)

```bash
# Backend
cd backend && npm install
npx prisma migrate dev
npx prisma db seed
npm start                        # http://localhost:3001

# Frontend (separate terminal)
cd frontend && npm install
npm run dev                      # http://localhost:5173
```

**Vite 8 / Rolldown (local frontend):** Use **Node.js ≥20.19** (or ≥22.12) as required by Vite. The repo pins **`@rolldown/binding-linux-x64-gnu`** for **Linux and WSL2** so `vite build` and tooling resolve the native binding when npm optional deps mis-install. On **macOS** or **Windows**, if you see “Cannot find native binding” / missing `@rolldown/binding-*`, run a clean install (`rm -rf node_modules && npm install`) or add the matching optional package for your platform (e.g. `@rolldown/binding-darwin-arm64`, `@rolldown/binding-win32-x64-msvc`) alongside the Linux pin, then reinstall.

### Tests and linting

```bash
cd backend && npm test           # Jest + Supertest (unit + integration)
cd frontend && npm run lint      # ESLint
cd frontend && npm run test      # Vitest (API helper unit tests; uses vitest.config.js)
```

Run a single test file:

```bash
cd backend && npx jest src/__tests__/organisation-service.test.js
```

## Architecture

### Backend (`backend/src/`)

Three-layer Express 5 (CommonJS) API:

- **`routes/`** — routing only, no logic
- **`controllers/`** — request/response shaping, input validation, FK checks before writing
- **`services/`** — all Prisma calls and business logic

All responses use the envelope `{ data, error, meta }`. `meta` is `null` on non-list endpoints; `error` is `null` on success. List endpoints always include `{ page, limit, total, totalPages }` in `meta`.

`organisation-list-dto.js` (also used for create/update/detail) maps Prisma snake_case rows to camelCase API output. All new organisation endpoints must go through `toOrganisationDto`.

### Frontend (`frontend/src/`)

- **`pages/`** — route-level components; four routes: list, detail, form (create/edit), compare
- **`components/`** — shared UI pieces; `components/ui/` holds shadcn/ui primitives (copy-paste, never the CLI)
- **`hooks/`** — all TanStack Query data-fetching; components never call `fetch` directly
- **`api/`** — raw `fetch` wrappers consumed only by hooks
- **`context/SelectionProvider`** — cross-page compare selection state; do not clear on compare navigation (ADR-013)
- **`lib/`** — pure utilities (country list, filter param keys, compare URL helpers)

### Database

PostgreSQL 16 via Prisma 6 (pinned to v6 for CommonJS — ADR-001). Schema at `backend/src/prisma/schema.prisma`. All schema changes go through `prisma migrate dev`; never edit migration SQL manually for schema changes.

Current models: `Organisation`, `TicketingProvider`, `CrmPlatform`, `OrganisationType`. `CapabilityState` enum (`YES | NO | UNKNOWN`) is used for membership, donation, and reserved-seating capabilities.

`last_updated` on `Organisation` is managed by Prisma's `@updatedAt` — do not accept it from request bodies and do not use `$use` middleware (ADR-011).

Seed (`backend/src/prisma/seed.js`) upserts reference data and sample organisations with fixed UUIDs (ADR-014). Re-running seed is idempotent and does not delete user-created organisations unless they share those fixed ids.

## Key conventions

**Spelling:** British English — `organisation` not `organization` everywhere (files, variables, routes, UI copy).

**Country list:** Canonical list lives in `backend/src/lib/countries.js` and is **mirrored** in `frontend/src/lib/countries.js`. There is no `/api/meta/countries` endpoint (ADR-008). When the list changes, update **both files** in the same commit.

**shadcn/ui:** Add primitives by copying source into `frontend/src/components/ui/`. Do not use `npx shadcn@latest add`.

**Tailwind:** v3 with `tailwind.config.js`. Do not upgrade to v4 (ADR-005).

**Capability enum values** surface as-is in the API (`YES`, `NO`, `UNKNOWN`); the frontend renders them as lowercased text.

**Validation flow (write endpoints):** Strip client-controlled keys → parse/validate body → validate FK existence against DB → call service. Return `400` for validation errors, `404` for missing resources, `409` for constraint conflicts.

**Migrations that move data** must be split into three sequential migrations: additive (new schema), backfill (data move), destructive (drop legacy). Never combine schema drops with data backfill.

## Decisions log

`docs/decisions.md` records all meaningful architectural decisions (ADRs). Check it before changing stack choices, enum handling, pagination behaviour, or UUID/seed conventions.
