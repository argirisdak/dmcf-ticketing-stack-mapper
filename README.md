# DMCF Ticketing Stack Mapper

Internal tool for mapping and comparing ticketing and CRM platforms used by cultural **organisations** (British English spelling is used in the codebase and API).

## Prerequisites

- **Git**
- **Docker** with Docker Compose v2 (`docker compose` CLI)
- **Node.js** 20 LTS or newer (needed for local development without Docker, and for running backend tests from your machine)

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

   Compose runs database migrations and the Prisma seed for the backend container on startup. The database is **not** published to your host; only the API and frontend dev server are.

## Service URLs and ports

| Service    | URL                         | Notes                                      |
|------------|-----------------------------|--------------------------------------------|
| **Backend**  | http://localhost:3001       | REST API (`/api/...`)                      |
| **Frontend** | http://localhost:5173       | Vite + React app shell                     |
| **Database** | *(none on host)*            | PostgreSQL 16 inside Docker network only   |

## Smoke test checklist

After `docker compose up` (wait until backend and frontend are healthy):

1. **Health** — `GET http://localhost:3001/api/health` returns JSON where `data.status` is `"ok"` (envelope: `{ "data", "error", "meta" }`).
2. **Reference data** — These return JSON with **non-empty** `data` arrays (same envelope):
   - `GET http://localhost:3001/api/meta/ticketing-providers`
   - `GET http://localhost:3001/api/meta/crm-platforms`
   - `GET http://localhost:3001/api/meta/organisation-types`
3. **Frontend** — Open http://localhost:5173 in a browser; the application shell should load without errors in the developer console.

You can use `curl`, your browser, or any HTTP client for the API checks.

## Threat model and deployment posture

This application **has no authentication or authorisation**. Anyone who can reach the API or UI can read and, where implemented, change data.

- Treat deployments as **internal / trusted-network only**.
- **Do not** expose the stack to the public internet or untrusted networks.
- Mis-deployment (e.g. port forwarding, wide firewall rules) risks **data exposure** and unauthorised use.

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

## Roadmap note (Story 5.2)

A later story will extend this README with **sample organisation seed / reset commands**, a **longer end-to-end smoke checklist**, and a **known limitations** section (e.g. no auth, desktop-first scope). The steps above are intended to be complete for **foundation** bring-up today.
