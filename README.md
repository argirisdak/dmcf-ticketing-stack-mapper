# DMCF Ticketing Stack Mapper

Internal tool for mapping and comparing ticketing and CRM platforms used by cultural **organisations**.

## Prerequisites

- **Git**
- **Docker** with Docker Compose v2 (`docker compose` CLI)
- **Node.js** 20 LTS or newer (needed for local development without Docker, and for running backend tests from your machine)

On **Windows**, use **Git for Windows** and **Docker Desktop** (Linux containers — default), and work from **PowerShell** or **Command Prompt**; see **[Windows (native, without WSL)](#windows-native-without-wsl)** below.

## Quick start (Docker — recommended)

These steps assume you are at the **project root** after cloning (the folder that contains `docker-compose.yml`, `backend/`, and `frontend/` — often named `dmcf-app`).

1. **Clone the repository** (if you have not already)

   ```bash
   git clone <repository-url>
   cd dmcf-app
   ```

2. **Create environment files** from the examples (required for Compose):

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start the stack**

   On first run, build images before (or during) start:

   ```bash
   docker compose up --build
   ```

   On later runs, `docker compose up` is enough.

   The **backend** container command (see `docker-compose.yml`) runs **`npx prisma migrate deploy`** then **`npx prisma db seed`** before starting the API. So the database is migrated and seeded automatically on each backend start. You only need the manual commands below if you want to **re-seed** or **fully reset** without rebuilding images or if you run the backend outside Compose.

   The database is **not** published to your host; only the API and frontend dev server are.

## Windows (native, without WSL)

These steps are for **Windows only**: you clone and run commands from a normal Windows folder (for example under `%USERPROFILE%`), not from an Ubuntu/WSL shell. **Docker Desktop** still runs **Linux** containers internally; you do not need a separate WSL distro for day-to-day Git and `docker compose` commands.

### Prerequisites (Windows)

1. **[Git for Windows](https://git-scm.com/download/win)** — install with default options so `git` works in PowerShell.
2. **[Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)** — use **Linux containers** (default). Start Docker Desktop and wait until it reports that it is running.
3. **Node.js 20+** — only if you will run the backend or frontend **on the host** instead of in Docker (see [Local development without Docker](#local-development-without-docker-optional)).

### Clone

Example (PowerShell):

```powershell
cd $env:USERPROFILE\source\repos
git clone <repository-url> dmcf-app
cd dmcf-app
```

Prefer a path on the Windows filesystem (for example `C:\dev\dmcf-app`), not `\\wsl$\...`, if you want a purely Windows workspace.

### Environment files

**PowerShell:**

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

**Command Prompt:**

```cmd
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

For Docker Compose, keep `backend/.env` aligned with the example (`DATABASE_URL` host **`db`**, `CORS_ORIGIN=http://localhost:5173`). Keep `frontend/.env` pointing at `http://localhost:3001` for the API.

### Start the stack

From the folder that contains `docker-compose.yml`:

```powershell
docker compose up --build
```

On later runs, `docker compose up` is enough. Behaviour matches **Quick start (Docker — recommended)** above (migrations and seed on backend start).

### URLs

Same as **[Service URLs and ports](#service-urls-and-ports)** — open http://localhost:5173 for the app and http://localhost:3001 for the API.

### Prisma commands (Docker on Windows)

With the **backend** service already running:

```powershell
docker compose exec backend npx prisma db seed
```

If no backend container is running:

```powershell
docker compose run --rm backend npx prisma db seed
```

Use the same `exec` / `run --rm` pattern for `migrate reset` as in **[Database seed and reset](#database-seed-and-reset)**.

### Troubleshooting (Windows)

- **Docker daemon not running** — start **Docker Desktop** and wait until it is ready.
- **Port already in use** — another process is using `3001` or `5173`; stop it or adjust published ports in `docker-compose.yml` only if you understand the impact.
- **Line endings** — if a host-side script misbehaves, `git config core.autocrlf true` in this repo may help; Compose runs commands inside Linux images, so this is rarely needed for the default Docker workflow.
- **Virtualization** — Docker Desktop needs hardware virtualisation enabled; follow the installer’s checklist (Hyper-V / WSL2 components as required by your Docker Desktop version).

### Optional: backend and frontend on Windows without Docker

1. Install **PostgreSQL 16** for Windows and create a database (for example `dmcf`).
2. Set `DATABASE_URL` in `backend/.env` to a **localhost** URL (not host `db`), for example `postgresql://USER:PASSWORD@localhost:5432/dmcf`.
3. In one terminal:

   ```powershell
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm start
   ```

4. In another terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

Ensure `frontend/.env` contains `VITE_API_BASE_URL=http://localhost:3001`.

## Service URLs and ports

| Service    | URL                         | Notes                                      |
|------------|-----------------------------|--------------------------------------------|
| **Backend**  | http://localhost:3001       | REST API (`/api/...`)                      |
| **Frontend** | http://localhost:5173       | Vite + React app shell                     |
| **Database** | *(none on host)*            | PostgreSQL 16 inside Docker network only   |

## Frontend routes

| Path | Description |
|------|-------------|
| `/organisations` | Organisation catalogue list (app root `/` redirects here). |
| `/organisations/new` | Create organisation. |
| `/organisations/:id` | Organisation detail. |
| `/organisations/:id/edit` | Edit organisation (includes **Linked systems** editor). |
| `/systems` | System catalogue list. |
| `/systems/new` | Create system. |
| `/systems/:id` | System detail (adoption evidence, **custom attributes** read-only in MVP). |
| `/systems/:id/edit` | Edit system. |
| `/compare/systems` | Side-by-side system comparison (`?ids=` comma-separated UUIDs). |
| `/compare/organisations` | Side-by-side organisation comparison (`?ids=` comma-separated UUIDs). |

**Legacy bookmarks:** `App.jsx` also mounts `/compare/*` via `CompareLegacyPathPage` so old `/compare?ids=...` links are not a dead route; first-class compare URLs are the two paths above.

## Database seed and reset

Run Prisma CLI commands from **`backend/`** with **`DATABASE_URL`** set. Copy `backend/.env.example` to `backend/.env` and adjust:

- **Docker Compose:** the example URL uses host **`db`** (the Postgres service name on the Compose network).
- **Local PostgreSQL on your machine:** use a URL whose host is **`localhost`** (or your server name) and credentials that match your instance.

### Automatic vs manual

| Situation | What happens |
|-----------|----------------|
| **`docker compose up`** | Backend runs **`migrate deploy`** then **`db seed`** on startup (see `docker-compose.yml`). |
| **Re-run seed only** | Use **`db seed`** when you want to refresh reference data and sample organisations without dropping other tables. |
| **Clean demo database** | Use **`migrate reset`** when you want to wipe the DB, reapply migrations, and run seed from scratch. |

### `npx prisma db seed`

Upserts reference lookups, **11 systems** from the system seed catalog, and **sample organisations** with junction links (fixed UUIDs — see **ADR-014** in `docs/decisions.md`). It **does not** delete organisations you created in the app unless they use the same fixed ids as the sample set (see ADR-014 for the upsert semantics).

**Docker (backend service already running):**

```bash
docker compose exec backend npx prisma db seed
```

**Docker (no running backend container):**

```bash
docker compose run --rm backend npx prisma db seed
```

**Local backend folder** (Postgres reachable via `DATABASE_URL` in `backend/.env`):

```bash
cd backend
npx prisma db seed
```

### `npx prisma migrate reset`

**Warning:** this **drops all data** in the configured database, reapplies migrations from scratch, and then runs the seed script. Use it for a **full** empty-then-seeded database (clean demo).

**Docker (backend service already running):**

`docker compose exec` only works when the **backend** container is already up (for example after `docker compose up`).

```bash
docker compose exec backend npx prisma migrate reset
```

**Docker (no running backend container):**

```bash
docker compose run --rm backend npx prisma migrate reset
```

**Local:**

```bash
cd backend
npx prisma migrate reset
```

In an interactive terminal, Prisma may ask for confirmation. For non-interactive use (scripts/CI), add **`--force`** to the same command you would run above, for example:

**Docker (non-interactive, backend already running):**

```bash
docker compose exec backend npx prisma migrate reset --force
```

**Docker (non-interactive, no running backend):**

```bash
docker compose run --rm backend npx prisma migrate reset --force
```

**Local (non-interactive):**

```bash
cd backend
npx prisma migrate reset --force
```

### v2 migration sequence and Migration C (forward-only)

The systems model (Epic 6–10) ships as **three** Prisma migrations applied **in this order** (folder names under `backend/src/prisma/migrations/`):

1. `20260429220615_add_system_and_junction` — **additive** (A): `system`, `organisation_system`, enums; legacy lookup tables and organisation FK columns unchanged.
2. `20260430183000_backfill_systems_and_links` — **backfill** (B): custom SQL from legacy FKs into the new tables.
3. `20260502180000_drop_legacy_lookups` — **destructive** (C): drops legacy lookup tables and FK columns (`drop_legacy_lookups`).

**Migration C is forward-only.** Before applying it in any **non-throwaway** environment, take a **full database backup**. There is **no SQL inverse** that restores the dropped legacy FK columns and lookup tables once C has run (see **ADR-015** and **ADR-021** in `docs/decisions.md`).

## Smoke test checklist

Follow these **in order** after the database has been seeded (fresh `docker compose up --build`, or after **`db seed`** / **`migrate reset`** as above). API responses are JSON objects with top-level keys **`data`**, **`error`**, and **`meta`**.

1. **Health** — `GET http://localhost:3001/api/health` returns JSON where `data.status` is `"ok"`.
2. **Reference data** — `GET http://localhost:3001/api/meta/organisation-types` returns JSON with a **non-empty** `data` array (organisation types). **Do not** rely on removed v1 paths `GET /api/meta/ticketing-providers` or `GET /api/meta/crm-platforms` (removed in Story 10.2); if called, the API returns **JSON 404** with the usual route-not-found envelope, not a 200 with provider lists.
3. **Organisations list** — Open http://localhost:5173/organisations. You should see **multiple** seeded organisations, not an empty state.
4. **Systems list** — Open http://localhost:5173/systems. You should see **11** seeded systems (seed invariant).
5. **Organisation filter by linked system** — In the browser **Network** tab (or via `curl`), call `GET http://localhost:3001/api/organisations` with a filter that includes **`system=<uuid>`**, where `<uuid>` is a real system id from seeded data (pick one from the Systems UI, or `GET http://localhost:3001/api/systems?limit=100` and copy an `id`). Expect a **non-empty** `data` array for at least one valid seeded system id.
6. **Compare systems** — Open  
   `http://localhost:5173/compare/systems?ids=<uuid-a>,<uuid-b>`  
   with two distinct system ids from the seeded catalogue. Expect **two** columns with meaningful content (not blank or error).
7. **Create system** — Open http://localhost:5173/systems/new, submit a **minimal valid** system. Expect a successful save and redirect to **`/systems/:id`** (detail).
8. **Link system on organisation** — On http://localhost:5173/organisations/:id/edit, add or confirm a link to a system and save. Open the organisation **detail** page and confirm the link appears under **Linked systems**.

You can use `curl`, your browser, or any HTTP client for the API checks. For organisation compare (not required in this ordered list but available), use **`/compare/organisations`** and the list selection bar, or deep-link with `?ids=` the same way as systems compare.

## Threat model and deployment posture

This application **has no authentication or authorisation**. Anyone who can reach the API or UI can read and, where implemented, change data.

- Treat deployments as **internal / trusted-network only**.
- **Do not** expose the stack to the public internet or untrusted networks.
- Mis-deployment (e.g. port forwarding, wide firewall rules) risks **data exposure** and unauthorised use.

## Known limitations

- **No authentication or authorisation** — internal / trusted-network deployment only (see **Threat model and deployment posture** above).
- **Desktop-optimised UI** for the MVP — there is no dedicated mobile layout.
- **No CSV export** — out of scope for the MVP; treat as post-MVP if needed.
- **No external API integrations** — data is entered manually through the application.
- **System `custom_attributes`** — displayed on system detail but **read-only** in the MVP; full editing is a Growth-phase item.
- **Mode B (organisation-filtered system compare)** — not in the MVP; planned for Growth.

## After v2 and v3 changes ship (implementation readiness)

Before applying the **`organisation_composite_unique`** migration (`20260505120000_organisation_composite_unique`) in any environment, run this pre-flight query against that database and resolve any duplicate groups before migrating:

```sql
SELECT name, city, country, count(*) AS c
FROM organisation
GROUP BY name, city, country
HAVING count(*) > 1;
```

Re-run **`bmad-check-implementation-readiness`** (or your team’s equivalent checklist) against the updated planning artifacts so the readiness report reflects the **v2 and v3** stack and supersedes any v1 report dated **2026-04-02**. Use these paths **from the repository root**:

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd-v2-delta.md`
- `_bmad-output/planning-artifacts/architecture-v2-delta.md`
- `_bmad-output/planning-artifacts/prd-v3-delta.md`
- `_bmad-output/planning-artifacts/architecture-v3-delta.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`

## Local development without Docker (optional)

Use this if you already have PostgreSQL 16 available locally.

**Backend**

```bash
cd backend
npm install
# Set DATABASE_URL in backend/.env to your local Postgres (see .env.example for shape)
npx prisma migrate dev
npx prisma db seed
npm start
```

**Frontend** (in another terminal)

```bash
cd frontend
npm install
npm run dev
```

Point `VITE_API_BASE_URL` in `frontend/.env` at your running API (e.g. `http://localhost:3001`). Docker Compose remains the primary, documented path for new contributors.

## Project layout

- `backend/` — Express API, Prisma schema, migrations, seed, Jest tests
- `frontend/` — Vite + React + Tailwind, TanStack Query, React Router
- `docs/` — Architecture decision records (`docs/decisions.md`)
- `docker-compose.yml` — `db`, `backend`, `frontend` services

## Tests

Backend unit and integration tests (Jest):

```bash
cd backend && npm test
```

## Further documentation

- **`docs/decisions.md`** — ADRs (stack, tooling, and data conventions).
- **`v2-roadmap.md`** — Post-MVP product direction (PRD Growth/Vision) and consolidated engineering backlog from deferred work and epic retrospectives.
