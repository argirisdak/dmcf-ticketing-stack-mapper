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

Upserts reference lookups and **sample organisations** (fixed UUIDs — see **ADR-014** in `docs/decisions.md`). It **does not** delete organisations you created in the app unless they use the same fixed ids as the sample set (see ADR-014 for the upsert semantics).

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

## Smoke test checklist

Follow these **in order** after the database has been seeded (fresh `docker compose up --build`, or after **`db seed`** / **`migrate reset`** as above). API responses are JSON objects with top-level keys **`data`**, **`error`**, and **`meta`**.

1. **Health** — `GET http://localhost:3001/api/health` returns JSON where `data.status` is `"ok"`.
2. **Reference data** — These return JSON with **non-empty** `data` arrays:
   - `GET http://localhost:3001/api/meta/ticketing-providers`
   - `GET http://localhost:3001/api/meta/crm-platforms`
   - `GET http://localhost:3001/api/meta/organisation-types`
3. **Frontend shell** — Open http://localhost:5173; the app should load without errors in the browser developer console.
4. **Organisations list** — Open http://localhost:5173/organisations (the app root `/` redirects here). You should see **multiple** seeded organisations, not an empty state.
5. **Filter** — Apply filters that return at least one row, for example open  
   http://localhost:5173/organisations?country=United+Kingdom&provider=Tessitura  
   Country and provider names must match **`COUNTRIES`** in `backend/src/lib/countries.js` and seeded ticketing provider names exactly (`United Kingdom`, `Tessitura`).
6. **Compare** — On the list, tick **two** organisation checkboxes. Use **Compare selected (2) →** in the selection bar. You should land on **`/compare?ids=...`** and see **two** columns with meaningful content (not blank or error).  
   **Optional deep-link smoke:**  
   `/compare?ids=5e1a0001-0001-4001-8001-000000000001,5e1a0001-0001-4001-8001-000000000009`  
   (fixed sample UUIDs from Story 5.1 — useful if you want to verify compare without using the list.)
7. **Create** — From the organisations list, choose **Add organisation** (or open http://localhost:5173/organisations/new). Submit a **minimal valid** payload (required fields only). Expect a successful save and navigation to **`/organisations/:id`** (detail page).

You can use `curl`, your browser, or any HTTP client for the API checks.

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
