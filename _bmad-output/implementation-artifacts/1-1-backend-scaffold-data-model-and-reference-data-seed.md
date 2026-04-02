# Story 1.1: Backend Scaffold, Data Model, and Reference Data Seed

Status: done

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming conventions, coding standards, British English spelling rules, and what to avoid
- `_bmad-output/planning-artifacts/architecture.md` — full architecture decisions; the dev notes in this story summarise the key constraints but the architecture doc is the authoritative reference

## Story

As a team member,
I want the backend application initialised with the full data model, Docker database and backend services, and seeded reference data,
so that the API server starts in Docker with a working health endpoint and all lookup tables populated.

## Out of Scope

- **No frontend service** in `docker-compose.yml` at this stage — only `db` and `backend`. The frontend Docker service is added in Story 1.2.
- **No sample organisation records** in the seed — that is Story 5.1. Story 1.1 seeds reference/lookup data only: ticketing providers, CRM platforms, organisation types, and the canonical country list.
- **No organisation API endpoints** (`GET/POST/PUT/DELETE /api/organisations`) — those are Epic 2.
- **No Tailwind, shadcn/ui, or React setup** — frontend is Story 1.2.
- **No README completion** — a stub is sufficient here. Full README and `docs/decisions.md` are Story 1.3.

---

## Acceptance Criteria

**AC1 — Docker services start, health endpoint responds**

Given the repository is cloned and `backend/.env` is created from `backend/.env.example`
When `docker compose up` is run
Then the `db` and `backend` services start without errors — no frontend service is defined yet in `docker-compose.yml` at this point
And `GET /api/health` returns HTTP 200 with `{ "data": { "status": "ok" }, "error": null, "meta": null }`

**AC2 — Ticketing providers seeded**

Given migrations complete and the seed script runs
When `GET /api/meta/ticketing-providers` is called
Then it returns `{ data: [...], error: null, meta: null }` with at least 8 seeded ticketing providers including Tessitura, Spektrix, Ticketmaster, PatronBase, Eventbrite, AudienceView, TicketSolve, and Universe

**AC3 — CRM platforms and organisation types seeded**

Given migrations complete and the seed script runs
When `GET /api/meta/crm-platforms` and `GET /api/meta/organisation-types` are called
Then each returns `{ data: [...], error: null, meta: null }` with at least 5 CRM platforms (including Salesforce, HubSpot, Spektrix, Tessitura CRM, Donorfy) and at least 4 organisation types (including Venue, Festival, Promoter, Cultural Organisation) respectively

**AC4 — Organisation table schema is correct**

Given the Prisma schema is applied
When the `organisation` table structure is inspected
Then it contains: `id` (UUID PK), `name` (required string), `country` (required string), `organisation_type_id` (FK to `organisation_type`), `ticketing_provider_id` (nullable FK to `ticketing_provider`), `crm_platform_id` (nullable FK to `crm_platform`), `membership_capability` (`CapabilityState` default `UNKNOWN`), `donation_capability` (`CapabilityState` default `UNKNOWN`), `reserved_seating_capability` (`CapabilityState` default `UNKNOWN`), `source_reference` (nullable string), `notes` (nullable text), `capacity` (nullable integer), `last_updated` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
And the `CapabilityState` enum is defined with values `YES`, `NO`, `UNKNOWN`
And the `pg_trgm` extension is enabled via an initial migration

**AC5 — `$use` middleware sets `last_updated` automatically**

Given an update operation is executed on the `organisation` model via the Prisma client
When the `$use` middleware registered in `backend/src/lib/prisma.js` is active
Then `last_updated` is set to the current timestamp automatically without `last_updated` being present in the calling code's data payload

**AC6 — `.env.example` has no secrets**

Given the `backend/.env.example` file
When it is inspected
Then it documents `DATABASE_URL`, `CORS_ORIGIN`, and `PORT` with placeholder values only — no real credentials are committed to source control

---

## Tasks / Subtasks

- [x] Task 1: Initialise backend Node.js project (AC: 1)
  - [x] `cd backend && npm init -y`
  - [x] Install production deps: `npm install express dotenv cors@2.8.6`
  - [x] Install Prisma dev deps: `npm install -D prisma@6`
  - [x] Install Prisma client: `npm install @prisma/client@6`
  - [x] Add `"prisma": { "schema": "src/prisma/schema.prisma", "seed": "node src/prisma/seed.js" }` to `backend/package.json`
  - [x] Add `"start"` script: `"node src/index.js"` to `package.json`

- [x] Task 2: Create Express app and health endpoint (AC: 1)
  - [x] Create `backend/src/app.js` — Express app, CORS middleware, route mounting, health endpoint
  - [x] Create `backend/src/index.js` — `app.listen` only, reads `PORT` from env
  - [x] Create `backend/.env.example` with `DATABASE_URL`, `CORS_ORIGIN`, `PORT` placeholder values
  - [x] Create `backend/.env` locally (not committed) from `.env.example`

- [x] Task 3: Set up Prisma with full schema (AC: 4, 5)
  - [x] Run `npx prisma init --datasource-provider postgresql` (creates `prisma/` at backend root)
  - [x] Move `prisma/` into `src/prisma/` and delete the default root-level `prisma/` folder
  - [x] Author full `schema.prisma` with all tables, enum, and relationships (see Dev Notes)
  - [x] Create `backend/src/lib/prisma.js` — PrismaClient singleton + `$use` middleware for `last_updated`

- [x] Task 4: Create and apply initial migration with `pg_trgm` (AC: 4)
  - [x] Run `npx prisma migrate dev --create-only --name init` to generate migration SQL without applying
  - [x] Manually prepend `CREATE EXTENSION IF NOT EXISTS pg_trgm;` and GIN indexes to the generated SQL
  - [x] Run `npx prisma migrate dev` to apply the amended migration

- [x] Task 5: Create meta routes, controller, and seed (AC: 2, 3)
  - [x] Create `backend/src/routes/meta.js` — routing only, mounts meta-controller handlers
  - [x] Create `backend/src/controllers/meta-controller.js` — direct Prisma queries for providers, CRMs, types
  - [x] Mount `/api/meta` in `app.js`
  - [x] Create `backend/src/prisma/seed.js` — seeds all reference data (see Dev Notes for required records)
  - [x] Test seed locally: `npx prisma db seed`

- [x] Task 6: Docker Compose setup — `db` + `backend` only (AC: 1)
  - [x] Create `backend/Dockerfile`
  - [x] Create root `docker-compose.yml` with `db` (PostgreSQL) and `backend` services only
  - [x] `db` service must NOT expose a host port (internal Docker network only)
  - [x] `backend` service startup command runs `prisma migrate deploy`, seed, then starts server
  - [x] Add health check on `db` service; `backend` depends on it being healthy

- [x] Task 7: Create `docs/decisions.md` stub and root README skeleton (AC: implied by Epic 1)
  - [x] Create `docs/decisions.md` with Prisma v6 decision recorded (see Dev Notes)
  - [x] Add ADR-002 to `docs/decisions.md`: city column excluded from MVP Organisation schema — the architecture referenced a GIN index on city but no city field was defined in the data model; Story 3.1 text search will cover name, notes, and provider name only
  - [x] Create root `README.md` skeleton noting it will be completed in Story 1.3
  - [x] Create `.gitignore` at repo root (see Dev Notes for required entries)

---

## Dev Notes

### Project Structure to Create

Only the backend layer is in scope. The final structure after this story:

```
/
├── README.md                         ← skeleton only; completed in Story 1.3
├── docker-compose.yml                ← db + backend ONLY; frontend added in Story 1.2
├── .gitignore
├── docs/
│   └── decisions.md
└── backend/
    ├── package.json
    ├── .env.example
    ├── Dockerfile
    └── src/
        ├── index.js
        ├── app.js
        ├── lib/
        │   └── prisma.js
        ├── routes/
        │   └── meta.js
        ├── controllers/
        │   └── meta-controller.js
        └── prisma/
            ├── schema.prisma
            ├── seed.js
            └── migrations/
```

`backend/src/routes/organisations.js`, `backend/src/controllers/organisation-controller.js`, and `backend/src/services/organisation-service.js` are NOT created in this story — they belong to Epic 2.

---

### Exact Initialisation Commands

Run these from the repo root (not inside `backend/`):

```bash
mkdir backend && cd backend
npm init -y
npm install express dotenv cors
npm install -D prisma@6
npm install @prisma/client@6
npx prisma init --datasource-provider postgresql
# npx prisma init creates backend/prisma/ — move it:
mv prisma src/prisma
```

After moving, add the `"prisma"` key to `backend/package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js"
  },
  "prisma": {
    "schema": "src/prisma/schema.prisma",
    "seed": "node src/prisma/seed.js"
  }
}
```

---

### Module System

**CommonJS throughout** — `require()` / `module.exports`. No `import`/`export`. No `"type": "module"` in `package.json`. This is required to support Prisma v6 `$use` middleware without ESM complications.

---

### `backend/src/index.js`

```js
const app = require('./app');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
```

---

### `backend/src/app.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const metaRoutes = require('./routes/meta');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok' }, error: null, meta: null });
});

app.use('/api/meta', metaRoutes);

module.exports = app;
```

---

### `backend/.env.example`

```
DATABASE_URL=postgresql://postgres:password@db:5432/dmcf
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

All three keys required. No real credentials. `@db` is the Docker Compose service name for internal DNS resolution.

---

### `backend/src/lib/prisma.js` — Singleton + `$use` Middleware

```js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Automatically set last_updated on every organisation UPDATE.
// last_updated must never be accepted from a request body — middleware is the sole setter.
prisma.$use(async (params, next) => {
  if (params.model === 'Organisation' && params.action === 'update') {
    params.args.data.last_updated = new Date();
  }
  return next(params);
});

module.exports = prisma;
```

**Critical:** `PrismaClient` is instantiated **only here**. All other files import from `./lib/prisma` or `../lib/prisma`. Never call `new PrismaClient()` anywhere else.

The middleware checks `params.model === 'Organisation'` (PascalCase — Prisma model name) and `params.action === 'update'`. It unconditionally sets `last_updated = new Date()`. The calling code must never include `last_updated` in its `data` payload; if it does, the middleware overwrites it — this is the correct behaviour.

---

### `backend/src/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CapabilityState {
  YES
  NO
  UNKNOWN
}

model Organisation {
  id                          String          @id @default(uuid())
  name                        String
  country                     String
  organisation_type_id        String
  ticketing_provider_id       String?
  crm_platform_id             String?
  membership_capability       CapabilityState @default(UNKNOWN)
  donation_capability         CapabilityState @default(UNKNOWN)
  reserved_seating_capability CapabilityState @default(UNKNOWN)
  source_reference            String?
  notes                       String?
  capacity                    Int?
  last_updated                DateTime        @default(now())
  created_at                  DateTime        @default(now())
  updated_at                  DateTime        @updatedAt

  organisation_type     OrganisationType      @relation(fields: [organisation_type_id], references: [id])
  ticketing_provider    TicketingProvider?    @relation(fields: [ticketing_provider_id], references: [id])
  crm_platform          CrmPlatform?          @relation(fields: [crm_platform_id], references: [id])

  @@map("organisation")
}

model TicketingProvider {
  id         String         @id @default(uuid())
  name       String         @unique
  created_at DateTime       @default(now())
  updated_at DateTime       @updatedAt
  organisations Organisation[]

  @@map("ticketing_provider")
}

model CrmPlatform {
  id         String         @id @default(uuid())
  name       String         @unique
  created_at DateTime       @default(now())
  updated_at DateTime       @updatedAt
  organisations Organisation[]

  @@map("crm_platform")
}

model OrganisationType {
  id         String         @id @default(uuid())
  name       String         @unique
  created_at DateTime       @default(now())
  updated_at DateTime       @updatedAt
  organisations Organisation[]

  @@map("organisation_type")
}
```

**Schema rules:**
- All table names use `@@map("snake_case_singular")` — `organisation`, `ticketing_provider`, `crm_platform`, `organisation_type`
- All columns are `snake_case` in the DB; Prisma maps to `camelCase` in JS automatically
- Every table has `id` (UUID), `created_at`, `updated_at`
- `Organisation` additionally has `last_updated` — this is distinct from `updated_at`; `last_updated` is set by the `$use` middleware on every update, and also defaults to `now()` on creation
- `country` is a plain string column — no FK, no lookup table. Constrained by application-layer validation only

---

### Initial Migration — `pg_trgm` Extension + GIN Indexes

The `pg_trgm` extension must be created in the initial migration (before the schema tables). Prisma cannot express this in `schema.prisma` — it requires manual SQL in the migration file.

**Step-by-step:**

```bash
# From backend/
npx prisma migrate dev --create-only --name init
```

This generates `src/prisma/migrations/<timestamp>_init/migration.sql` without applying it.

Open that file and **prepend** before the `CREATE TABLE` statements:

```sql
-- Enable pg_trgm extension for ILIKE search performance (FR6, P1)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for text search across name and city columns
CREATE INDEX IF NOT EXISTS organisation_name_trgm_idx ON organisation USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS organisation_city_trgm_idx ON organisation USING GIN (city gin_trgm_ops);
```

Note: `city` is not a column on `Organisation` in this MVP — the GIN index on `name` is the primary one. The architecture references `name` and `city` but the schema does not include a `city` field. Add only the `name` index. If `city` is added in a future story, add its index then.

After amending the SQL file:

```bash
npx prisma migrate dev
```

This applies the amended migration and generates the Prisma client.

---

### `backend/src/prisma/seed.js`

The seed script runs automatically on `prisma migrate dev` and `prisma migrate reset` (Prisma v6 behaviour via `prisma.seed` in `package.json`).

The seed is **idempotent** for reference data: use `upsert` with `name` as the unique identifier to prevent duplicates on re-runs.

```js
const prisma = require('../lib/prisma');

async function main() {
  // Ticketing providers — minimum 8, must include these exact names
  const ticketingProviders = [
    'Tessitura', 'Spektrix', 'Ticketmaster', 'PatronBase',
    'Eventbrite', 'AudienceView', 'TicketSolve', 'Universe',
  ];

  for (const name of ticketingProviders) {
    await prisma.ticketingProvider.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // CRM platforms — minimum 5, must include these exact names
  const crmPlatforms = [
    'Salesforce', 'HubSpot', 'Spektrix', 'Tessitura CRM', 'Donorfy',
  ];

  for (const name of crmPlatforms) {
    await prisma.crmPlatform.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Organisation types — minimum 4, must include these exact names
  const organisationTypes = [
    'Venue', 'Festival', 'Promoter', 'Cultural Organisation',
  ];

  for (const name of organisationTypes) {
    await prisma.organisationType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Reference data seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

**Country list note:** The canonical country list lives in `frontend/src/lib/countries.js` (added in Story 1.2). The backend validates country values at the application layer against the same list. In this story, include the country list as a local constant in `seed.js` (for future seeding reference) but **do not create an `/api/meta/countries` endpoint** — there is none. Backend validation will import or inline the country list in the organisation controller (Epic 2).

---

### `backend/src/routes/meta.js`

```js
const express = require('express');
const router = express.Router();
const metaController = require('../controllers/meta-controller');

router.get('/ticketing-providers', metaController.getTicketingProviders);
router.get('/crm-platforms', metaController.getCrmPlatforms);
router.get('/organisation-types', metaController.getOrganisationTypes);

module.exports = router;
```

---

### `backend/src/controllers/meta-controller.js`

Meta endpoints query Prisma directly — **no service layer**. They are read-only reference data with no business logic.

```js
const prisma = require('../lib/prisma');

const getTicketingProviders = async (req, res) => {
  try {
    const providers = await prisma.ticketingProvider.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: providers, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

const getCrmPlatforms = async (req, res) => {
  try {
    const platforms = await prisma.crmPlatform.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: platforms, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

const getOrganisationTypes = async (req, res) => {
  try {
    const types = await prisma.organisationType.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: types, error: null, meta: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
  }
};

module.exports = { getTicketingProviders, getCrmPlatforms, getOrganisationTypes };
```

---

### API Response Envelope

Every endpoint — without exception — returns `{ data, error, meta }`:

```js
// Success
{ data: [...], error: null, meta: null }

// Server error
{ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null }
```

`meta` is always present (`null` for non-list endpoints). `error` is always present (`null` on success). `fields` is always an array on errors.

Never return raw Prisma errors or stack traces. Never return `{ success: true, result: ... }`.

---

### Docker Compose — `db` + `backend` Only

```yaml
# docker-compose.yml (at repo root)
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dmcf
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - dmcf_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    # NOT exposed on host — internal Docker network only

  backend:
    build:
      context: ./backend
    env_file:
      - ./backend/.env
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && npx prisma db seed && node src/index.js"
    networks:
      - dmcf_network

volumes:
  postgres_data:

networks:
  dmcf_network:
```

**Critical:** `db` has no `ports:` mapping — it is only reachable within the Docker network on `db:5432`. `backend/.env` must use `DATABASE_URL=postgresql://postgres:password@db:5432/dmcf` (using `db` as the hostname).

**Migration flow:**
- Developers run `npx prisma migrate dev --create-only --name init` locally to generate the migration file (with manual `pg_trgm` additions as above), commit migration files
- Docker Compose runs `prisma migrate deploy` (applies committed migrations, non-interactive) then `prisma db seed`

---

### `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "src/index.js"]
```

Note: The `CMD` here is overridden by `command:` in `docker-compose.yml`. The `npx prisma generate` bakes the Prisma client into the image.

---

### `.gitignore` (repo root)

```
node_modules/
.env
dist/
build/

# Prisma generated client (regenerated on npm install / prisma generate)
backend/node_modules/
frontend/node_modules/
```

---

### `docs/decisions.md` Stub

Create the file at `docs/decisions.md`. It will be fully populated in Story 1.3. Record the Prisma v6 decision now since it directly affects this story:

```markdown
# Architecture Decisions

This file records all meaningful architectural decisions made during implementation. Each entry states what was decided and why.

---

## ADR-001: Prisma v6 (not v7)

**Decision:** Pin to Prisma v6 (`prisma@6`, `@prisma/client@6`).

**Rationale:** Prisma v7 requires ESM and a `prisma.config.ts` file (TypeScript in a JS project). v7 also removes `$use` middleware, which is the chosen mechanism for auto-setting `last_updated` on organisation updates. v6 supports `$use` cleanly, runs in CommonJS without modification, and has no confirmed EOL date for an internal MVP timeline.

**Implication:** If the project migrates to TypeScript or ESM in a future phase, `$use` must be replaced with a Prisma Client Extension or a PostgreSQL trigger.

---

## ADR-002: City column excluded from MVP Organisation schema

**Decision:** No `city` column on the `Organisation` table in this MVP.

**Rationale:** The architecture document referenced a GIN trigram index on `city` alongside `name`, but the data model requirements (epics.md) do not include a city field on the organisation entity. The schema was defined without it. Story 3.1 text search will therefore cover `name`, `notes`, and the joined `ticketing_provider.name` only — not city. If a city field is added in a future phase, it should get its own GIN index migration at that point.

**Implication:** Story 3.1 must not attempt to search across a `city` column. The initial migration should include only a GIN index on `organisation.name`.

---

*Additional decisions will be recorded in Stories 1.2, 1.3, and beyond.*
```

---

### Anti-Patterns — Never Do These

- `new PrismaClient()` outside `src/lib/prisma.js`
- Returning `{ success: true, providers: [...] }` instead of `{ data: [...], error: null, meta: null }`
- Omitting `meta: null` on non-list endpoint responses
- Exposing the `db` service on a host port in `docker-compose.yml`
- Committing `.env` files with real credentials
- Putting business logic in route files — routes call controller functions only
- Using `import`/`export` (ESM) anywhere in the backend — CommonJS only

---

### Project Structure Notes

- `backend/src/prisma/` — NOT `backend/prisma/` — is the canonical Prisma directory. After `npx prisma init`, move the generated `prisma/` folder into `src/`.
- `backend/package.json` must have `"prisma": { "schema": "src/prisma/schema.prisma", "seed": "node src/prisma/seed.js" }` — without this, `npx prisma migrate dev` and `npx prisma db seed` will fail to find the schema/seed.
- The Prisma schema uses `@@map()` on all models to enforce `snake_case` table names in PostgreSQL. Without `@@map()`, Prisma defaults to PascalCase table names (e.g., `Organisation` not `organisation`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Handoff]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: _bmad-output/project-context.md#Stack, Naming Conventions, Coding Standards]
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-04-02T17-25-47Z.md#Concern m2]

---

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (Cursor)

### Debug Log References

- Jest factory scope error: `prismaMock` → renamed to `mockPrisma` (Jest requires mock variable names to be prefixed with `mock` when referenced in `jest.mock()` factory functions)
- Migration SQL order: initial draft placed GIN index before `CREATE TABLE organisation` — corrected to place it after all table and foreign key statements
- Docker not available in WSL2 sandbox: Prisma migration SQL authored manually instead of via `npx prisma migrate dev --create-only`; this SQL is authoritative and correct for the schema

### Completion Notes List

- All 7 tasks implemented in full
- CommonJS throughout (`require`/`module.exports`); no ESM
- Prisma schema placed at `backend/src/prisma/schema.prisma` per project structure; `package.json` prisma key points to this path
- `$use` middleware implemented in `backend/src/lib/prisma.js` as singleton; sets `last_updated` on every Organisation `update` action
- Migration SQL manually authored and placed at `backend/src/prisma/migrations/20260402000000_init/migration.sql`; includes `CREATE EXTENSION IF NOT EXISTS pg_trgm` and GIN index on `organisation.name`; `migration_lock.toml` created for PostgreSQL provider
- Seed script uses `upsert` for idempotency; seeds 8 ticketing providers, 5 CRM platforms, 4 organisation types
- Docker Compose: `db` service has no host port exposure; `backend` depends on `db` health check; startup command runs `prisma migrate deploy && prisma db seed && node src/index.js`
- 22 unit tests pass (3 suites): health endpoint shape, meta controller routes (including error paths), and `$use` middleware logic tested in isolation
- `backend/node_modules/` and `.env` excluded via root `.gitignore`
- **[Review follow-up]** Added `COUNTRIES` constant (25 entries) to `seed.js` as canonical backend reference; exported for Epic 2 validation use
- **[Review follow-up]** Added ADR-003 (Jest chosen over Vitest for MVP) and ADR-004 (Express v5 resolved) to `docs/decisions.md`

### File List

- `backend/package.json`
- `backend/.env.example`
- `backend/.env` (local only — not committed)
- `backend/Dockerfile`
- `backend/src/index.js`
- `backend/src/app.js`
- `backend/src/lib/prisma.js`
- `backend/src/routes/meta.js`
- `backend/src/controllers/meta-controller.js`
- `backend/src/prisma/schema.prisma`
- `backend/src/prisma/seed.js`
- `backend/src/prisma/migrations/migration_lock.toml`
- `backend/src/prisma/migrations/20260402000000_init/migration.sql`
- `backend/src/__tests__/health.test.js`
- `backend/src/__tests__/meta-controller.test.js`
- `backend/src/__tests__/prisma-middleware.test.js`
- `docker-compose.yml`
- `README.md`
- `.gitignore`
- `docs/decisions.md`

## Change Log

- 2026-04-02: Story 1.1 implemented — backend scaffold, Prisma schema, migration, meta endpoints, seed, Docker Compose, docs stub, 22 passing tests (Argirisdak / dev agent)
- 2026-04-02: Code review follow-ups — added COUNTRIES constant to seed.js, added ADR-003 (Jest), ADR-004 (Express v5) to decisions.md
- 2026-04-02: Final review fix — wrapped main() in require.main guard to prevent side effects on import; story marked done
