---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/phase-1-analysis-dmcf-ticketing-stack-mapper.md
  - _bmad-output/project-context.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-01'
project_name: 'dmcf-app'
user_name: 'Argirisdak'
date: '2026-04-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

31 FRs across eight categories:

| Category | FRs | Architectural implication |
|----------|-----|--------------------------|
| Organisation CRUD | FR1–4 | Standard REST resource with validation layer |
| List / dashboard | FR5 | Paginated table view; server-side query |
| Discovery | FR6–7 | Text search via `ILIKE` / Postgres FTS on designated fields; predictable navigation |
| Filtering | FR8–13 | Five filter dimensions (country, type, provider, CRM, capabilities); server-side, combinable |
| Comparison | FR14–16 | Multi-select → dedicated compare route; aligned attribute rendering |
| Provenance & freshness | FR17–20 | `source_reference` field; `last_updated` system-maintained via ORM hook |
| Reference dimensions | FR21–24 | Lookup tables for provider, CRM, type; three-state capability enum |
| Pagination | FR25 | Server-backed segmentation; default page size 20 |
| Operability | FR26–28 | Docker Compose, seed script, README — not optional |
| Validation & optional fields | FR29–31 | Per-field validation; optional notes and capacity |

**Non-Functional Requirements:**

| ID | Concern | Architectural implication |
|----|---------|--------------------------|
| P1 | List responsiveness at hundreds–low thousands of rows | DB-level filtering and indexed columns; no client-side full-dataset load |
| P2 | Compare responsiveness | Avoid N+1 fetches; parallel or batch fetch for compare |
| P3 | Server-backed pagination | All list endpoints paginated from day one |
| S1 | No secrets in source control | `.env` + `.env.example` pattern; no hardcoded values |
| S2 | No production-grade auth; internal deployment | All routes unauthenticated; README must document threat model |
| S3 | Notes may contain personal data | Field intent documented; no structural enforcement in MVP |
| SC1–2 | Small concurrency; hundreds–low thousands of rows | Single Postgres instance; sensible indexes sufficient |
| A1–2 | Pragmatic WCAG 2.2 AA; no formal audit gate | Semantic HTML, focus management via Radix, keyboard nav on primary flows |

**Scale & Complexity:**

- Primary domain: Full-stack web application (React SPA + REST API + PostgreSQL)
- Complexity level: Medium — narrow entity model, no real-time features, no external integrations, no auth, small concurrent user base
- Estimated architectural components: 4 API route groups, 3 lookup entities, 1 primary entity, ~4 custom frontend components, ~8 shadcn/ui primitives

### Technical Constraints & Dependencies

Mandated by `project-context.md` — non-negotiable for all implementation:

| Layer | Technology | Constraint |
|-------|-----------|------------|
| Frontend | React (functional components + hooks only) | No class components |
| Styling | Tailwind CSS exclusively | No CSS-in-JS, no plain CSS except global reset |
| UI primitives | shadcn/ui — copy-paste only | Not installed as a package dependency |
| Backend | Node.js + Express | Route files routing only; business logic in services |
| ORM | Prisma | Mandated — Kysely/raw SQL excluded |
| Database | PostgreSQL | All schema changes via Prisma migrations; no manual SQL edits |
| Local environment | Docker Compose (3 services: `db`, `backend`, `frontend`) | DB not exposed on host by default |
| API response shape | `{ data, error, meta }` | All endpoints; no exceptions |
| Table conventions | UUID `id`, `created_at`, `updated_at` on every table | Enforced via Prisma schema |
| Organisation type | Lookup table seeded with fixed list | Not a text column or enum |
| Naming | British English throughout | `organisation` not `organization` everywhere |
| Auth | None | No auth system to be introduced |
| External APIs | None | All data entered manually |

### Cross-Cutting Concerns Identified

| Concern | Layers affected | Notes |
|---------|----------------|-------|
| Filter state as URL query params | Frontend routing, API query parsing | Enables bookmarkable/shareable filtered views and filter persistence on back-navigation |
| Three-state capability model (`YES`/`NO`/`UNKNOWN`) | DB schema, API serialisation, frontend rendering | Must be consistent end-to-end; default `UNKNOWN` on create |
| System-maintained `last_updated` | Prisma schema + middleware hook | Never a client-settable field; updated on every `UPDATE` automatically |
| Reference lookup data (provider, CRM, type) | DB seeding, `/api/meta/*` endpoints, frontend dropdowns | Seeded via `prisma/seed.js`; no unauthenticated write surface on meta in MVP |
| Server-side pagination + filtering | All list endpoints, frontend TanStack Query hooks | Query params: `page`, `limit`, `q`, filter dimensions |
| Consistent `{ data, error, meta }` response shape | All API controllers | `meta` carries pagination info on list endpoints |
| Compare URL stability (`/compare?ids=...`) | React Router, TanStack Query | Shareable and bookmarkable; selection state derived from URL |
| No auth / deployment threat model | All API routes, README | Documented posture: internal trusted-network only; README warns against public exposure |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application with a **separate** React SPA frontend and Node.js/Express REST API backend.
No monorepo framework (Next.js, T3, Redwood) — independent initialisation of each layer, consistent
with the directory structure defined in `project-context.md`.

Language: **JavaScript** throughout (`.js` / `.jsx`) — project context file structure uses `.js` and
`.jsx` extensions with no TypeScript configuration indicated.

### Starter Options Considered

| Option | Notes | Verdict |
|--------|-------|---------|
| T3 Stack (`create-t3-app`) | TypeScript-first, Next.js, tRPC, Prisma — opinionated monolith | ❌ Conflicts with separate frontend/backend structure and JS-first context |
| Vite + React monorepo starters | Various community starters mixing concerns | ❌ None match the exact split + Docker Compose requirement |
| `create-vite` (react template) + manual backend | Standard, minimal, matches project context exactly | ✅ Selected |

### Selected Approach: Independent Layer Initialisation

No single starter covers this setup. Each layer is initialised from its canonical tool and then
extended — the only approach consistent with the mandated structure.

**Initialisation Commands:**

```bash
# Frontend — create-vite v9, scaffolds Vite 6
npm create vite@latest frontend -- --template react

# Backend
cd backend && npm init -y
npm install express dotenv
npm install prisma@6 @prisma/client@6
npx prisma init --datasource-provider postgresql
```

### Architectural Decisions Established by This Approach

**Language & Runtime:**
JavaScript throughout — no TypeScript compilation step, no `tsconfig.json`. Frontend uses `.jsx`;
backend uses `.js`. Consistent with project context file structure.

**Frontend Build Tooling:**
`create-vite` v9 scaffolding Vite 6 — fast HMR dev server, optimised production build, `VITE_*`
env var convention for public API base URL (no secrets in the bundle, per project context).

**Backend Module System:**
CommonJS (default Node.js) — no `"type": "module"` in `package.json`.

**ORM:**
Prisma v6 with the `postgresql` datasource provider. Chosen over v7 for this MVP because:
- All standard patterns work without modification (including `$use` middleware for `last_updated`)
- No ESM conversion required
- No `prisma.config.ts` (TypeScript file in a JS project)
- Automatic seeding on `migrate dev` still works as expected
- No confirmed EOL date; v6 remains viable for an internal MVP

Note: Prisma v7 with the legacy `prisma-client-js` provider is a viable alternative that avoids the
ESM requirement, but still removes `$use` middleware, automatic seeding, and requires `prisma.config.ts`.
If the project moves to v7, the `last_updated` hook must be implemented as a Client Extension or
PostgreSQL trigger — a decision to revisit in a future phase.

Schema at `backend/prisma/schema.prisma`. Migrations via `npx prisma migrate dev`.
Seed via `backend/prisma/seed.js` per project context.

**Styling (Frontend):**
Tailwind CSS added post-init via `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init`.
shadcn/ui components copied into `frontend/src/components/` as needed — not installed as a package.

**Testing Framework:**
None mandated for MVP. The PRD carries no testing requirements. Testing infrastructure should be
added post-MVP; if added, **Vitest** is preferred for both layers (native Vite integration on the
frontend, clean Node.js support on the backend, single framework, no Babel).

**Code Organisation:**
Project context structure followed exactly:
`backend/src/{routes,controllers,services,prisma}/` and `frontend/src/{components,pages,hooks}/`.

**Note:** Project initialisation (Vite frontend scaffold + Express/Prisma backend scaffold + Docker
Compose setup) should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**
- Data model: country field representation, capability enum, `last_updated` mechanism
- API: compare fetch strategy, search approach, pagination style
- Frontend: routing library, data fetching library, selection state

**Important Decisions (shape architecture):**
- Validation strategy: where validation lives and what shape errors take
- CORS: how frontend and backend communicate across Docker services

**Deferred Decisions (post-MVP):**
- Prisma v6 → v7 migration (revisit when project moves to ESM or TypeScript)
- PostgreSQL full-text search (upgrade path from `ILIKE` if search performance degrades)
- Batch compare endpoint (upgrade path from parallel fetches if latency becomes noticeable)
- Testing framework (Vitest for both layers, added post-MVP)

---

### Data Architecture

**Decision: Country field representation**
- Choice: Constrained dropdown string — fixed seeded list stored as a normalised plain string
  column (e.g. `"United Kingdom"`); no FK relationship, no join
- Rationale: Prevents the filter-inconsistency risk of free text ("UK" vs "United Kingdom" vs
  "England") without the overhead of a lookup table and additional join. Country names are stable;
  a curated seed list of ~25–30 relevant countries covers DMCF scope. Staff always pick from a
  dropdown, so values stay consistent. A lookup table adds migration complexity with no query
  benefit at this scale.
- Implementation: `country VARCHAR(100) NOT NULL`; seeded list drives the frontend dropdown via
  a static constant (no meta endpoint needed); application-layer validation ensures only seeded
  values are accepted.
- Affects: `organisation` table schema, create/edit form, filter dropdown, seed data

**Decision: Three-state capability model**
- Choice: Prisma enum — `enum CapabilityState { YES NO UNKNOWN }` in `schema.prisma`
- Rationale: Enforced at DB level; renders cleanly in the Prisma client as a typed value;
  the three states are stable and will not expand for MVP. Default `UNKNOWN` on create.
- Implementation: Three fields on `organisation`: `membership_capability`, `donation_capability`,
  `reserved_seating_capability`, each typed `CapabilityState @default(UNKNOWN)`.
- Affects: `organisation` table schema, API serialisation, frontend `CapabilityBadge` component

**Decision: `last_updated` mechanism**
- Choice: Prisma v6 `$use` middleware
- Rationale: Internal MVP where all writes go through the API; DB-level trigger enforcement is
  unnecessary overhead. Middleware is visible in application code, easier to read and reason
  about than a DB trigger. `$use` is clean and idiomatic in Prisma v6.
- Implementation: Single middleware registered on the Prisma client instance; sets
  `data.last_updated = new Date()` before every `update` operation on `organisation`.
  `last_updated` is never accepted from the request body.
- Affects: Prisma client setup, all organisation update paths

---

### Authentication & Security

No open decisions. Auth is explicitly out of scope per `project-context.md`.

**Documented posture:** Internal trusted-network deployment only. README must state the threat
model clearly: application is not hardened for public internet exposure; no auth middleware is
present; mis-deployment to a public host would expose all data. Secrets in `.env` only;
`.env.example` documents all required keys without values.

---

### API & Communication Patterns

**Decision: Validation strategy**
- Choice: Manual validation in the Express controller layer; no additional validation library
- Rationale: `project-context.md` mandates "no unnecessary dependencies." The organisation
  form has ~10 fields with straightforward rules (required strings, optional fields, enum
  membership). Manual validation is proportionate. Consistent `{ data, error, meta }` response
  shape is enforced at the controller level.
- Implementation: Controller validates the request body before calling the service. On failure,
  returns HTTP `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field,
  message }] }, meta: null }`. Field-level error messages are specific (e.g. "Enter the
  organisation name") per the UX spec's GOV.UK-pattern requirement. Frontend mirrors validation
  rules using React controlled form state — no additional frontend library.
- Affects: All organisation write endpoints (`POST`, `PUT`), all form components

**Decision: Compare fetch strategy**
- Choice: Parallel individual fetches (`Promise.all` over `GET /api/organisations/:id`)
- Rationale: At 2–4 records on an internal network, latency difference from a batch endpoint
  is negligible. Reuses the existing single-org endpoint with no new code. PRD explicitly
  lists batch fetch as a "Growth" optimisation. Clean upgrade path if profiling shows need.
- Affects: `/compare` page data fetching, TanStack Query configuration

**Decision: Text search**
- Choice: PostgreSQL `ILIKE` with a `pg_trgm` trigram index
- Rationale: Sufficient for hundreds to low-thousands of rows (PRD scale). `pg_trgm` GIN index
  makes `ILIKE '%term%'` fast without the setup overhead of full-text search. FTS is the upgrade
  path if search volume or dataset grows.
- Implementation: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in an initial migration; GIN index
  on `name` and `city` columns. Search query uses `ILIKE '%:q%'` across name, city, notes.
- Affects: Initial migration, `GET /api/organisations` query

**Decision: Pagination**
- Choice: Offset-based — `page` + `limit` query params
- Rationale: UX spec specifies numbered page buttons (not infinite scroll); offset pagination
  matches that interaction exactly. Dataset is hundreds to low-thousands; offset is efficient
  at this scale. Cursor-based adds complexity with no benefit here.
- Implementation: `GET /api/organisations?page=1&limit=20`. Response `meta` carries
  `{ page, limit, total, totalPages }`.
- Affects: All list endpoints, frontend TanStack Query hooks, pagination component

---

### Frontend Architecture

**Decision: Routing — React Router v6 (v6.30.3)**
- Choice: React Router v6
- Rationale: `useSearchParams` hook maps cleanly to the UX spec's filter-state-in-URL
  requirement. React Router v7 introduces Remix-style loaders and actions — useful for
  SSR frameworks, unnecessary for a plain SPA with simple routing. v6 is stable and
  well-documented.
- Routes: `/organisations` (list), `/organisations/new` (create), `/organisations/:id`
  (detail), `/organisations/:id/edit` (edit), `/compare` (compare)
- Affects: App routing structure, filter state management, compare URL

**Decision: Data fetching — TanStack Query v5 (@tanstack/react-query v5.95.2)**
- Choice: TanStack Query v5
- Rationale: Referenced in PRD and Phase 1 analysis. `useMutation` + cache invalidation is
  the natural pattern for this CRUD-heavy app — creating, editing, and deleting an org each
  need to invalidate and refetch the list. Devtools available for debugging. SWR's lighter
  mutation support is a regression for this use case.
- Implementation: `QueryClientProvider` at app root; query keys scoped by resource and params
  (e.g. `['organisations', { page, filters }]`, `['organisations', id]`). Mutations invalidate
  the `organisations` query key on success.
- Affects: All data-fetching hooks, loading/error states, compare fetch

**Decision: Compare selection persistence**
- Choice: React context (`SelectionContext`) wrapping the main routes
- Rationale: Selection is transient SPA state — it must survive route transitions (list →
  detail → back) but need not survive a page reload. A context provider is the minimal,
  no-extra-dependency solution. No Zustand, no localStorage, no URL encoding of selection
  on the list route. Keeps the dependency count down.
- Implementation: `SelectionContext` provides `selectedIds` (array of strings),
  `toggleSelection(id)`, `clearSelection()`. Wrapped around the route tree. `CompareSelectionBar`
  reads from context; list row checkboxes write to context.
- Affects: `CompareSelectionBar`, list row checkboxes, compare page navigation

---

### Infrastructure & Deployment

**Decision: CORS — `cors` middleware on Express (v2.8.6)**
- Choice: `cors` npm package on the Express backend
- Rationale: Works identically in Docker and outside Docker; mirrors production behaviour
  from day one. Vite proxy works only in development — any deployment still needs CORS
  configured. Better to make it explicit from the start.
- Implementation: `app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))`.
  `CORS_ORIGIN` in `.env` and `.env.example`. Frontend calls backend directly via
  `VITE_API_BASE_URL` environment variable.
- Affects: Express app setup, `.env.example`, Docker Compose environment config

---

### Decision Impact Analysis

**Implementation sequence (decisions that must be in place before others):**
1. Prisma schema (country string, CapabilityState enum, `last_updated` field) — blocks all API work
2. Prisma `$use` middleware for `last_updated` — must be in place before any organisation update
3. `pg_trgm` extension migration — must precede search implementation
4. `SelectionContext` provider — must be in place before list checkboxes or compare bar
5. TanStack Query `QueryClientProvider` — must wrap the app before any data-fetching hooks
6. CORS middleware — must be in place before any frontend-to-backend calls in Docker

**Cross-component dependencies:**
- `CapabilityState` enum flows from Prisma schema → API response shape → `CapabilityBadge` props
- Filter query params flow from `useSearchParams` → TanStack Query key → API `GET /organisations`
- Selection state flows from `SelectionContext` → `CompareSelectionBar` → `/compare?ids=...` URL
- `last_updated` is set by Prisma middleware → returned in API response → displayed as read-only
  in detail, compare card, and list table (muted secondary text per UX spec)
- Validation error shape (`fields: [{ field, message }]`) flows from controller → API response →
  frontend error summary + inline error components

## Implementation Patterns & Consistency Rules

**Critical conflict points identified:** 12 areas where agents could make incompatible choices
without explicit specification.

---

### Naming Patterns

**Database naming (Prisma schema → PostgreSQL):**
- Tables: `snake_case` singular nouns — `organisation`, `ticketing_provider`, `crm_platform`,
  `organisation_type`
- Columns: `snake_case` — `ticketing_provider_id`, `created_at`, `last_updated`
- Prisma maps DB `snake_case` → JS `camelCase` automatically; never use camelCase in the schema
- Foreign keys: `{referenced_table}_id` — `ticketing_provider_id`, `organisation_type_id`
- Enum type: `PascalCase` in Prisma schema — `CapabilityState`; values `SCREAMING_SNAKE_CASE`
  — `YES`, `NO`, `UNKNOWN`

**API naming:**
- Endpoint paths: lowercase, hyphenated, plural — `/api/organisations`, `/api/meta/ticketing-providers`
- Route params: `:id` (UUID string)
- Query params (list/filter endpoint):

  | Param | Type | Values / notes |
  |-------|------|----------------|
  | `q` | string | Free-text search term |
  | `page` | integer | 1-based; default `1` |
  | `limit` | integer | Default `20` |
  | `country` | string | Exact match against seeded country list |
  | `provider` | string | Ticketing provider name (exact match) |
  | `type` | string | Organisation type name (exact match) |
  | `crm` | string | CRM platform name (exact match) |
  | `membership` | `YES\|NO\|UNKNOWN` | Capability filter |
  | `donation` | `YES\|NO\|UNKNOWN` | Capability filter |
  | `seating` | `YES\|NO\|UNKNOWN` | Capability filter |

- No camelCase query params; no underscores in param names except where listed
- The compare page fetches organisations via parallel individual `GET /api/organisations/:id`
  calls — there is no batch `ids` query param on any endpoint

**Code naming (extends project-context.md):**
- Custom hooks: `use` + PascalCase resource — `useOrganisations`, `useOrganisation`,
  `useOrganisationMutation`, `useMetaProviders`
- API utility functions: verb + resource — `fetchOrganisations`, `fetchOrganisation`,
  `createOrganisation`, `updateOrganisation`, `deleteOrganisation`
- Context: `{Name}Context` and `{Name}Provider` — `SelectionContext`, `SelectionProvider`
- TanStack Query keys: `['organisations', params]` for lists, `['organisations', id]` for
  single items, `['meta', 'providers']` / `['meta', 'crms']` / `['meta', 'types']` for
  reference data

---

### Structure Patterns

**Backend file locations:**
```
backend/src/
  lib/
    prisma.js          ← Prisma client singleton — exported from here, imported everywhere
  routes/
    organisations.js   ← routing only; no logic
    meta.js            ← /api/meta/* endpoints
  controllers/
    organisation-controller.js
    meta-controller.js
  services/
    organisation-service.js
  prisma/
    schema.prisma
    seed.js
    migrations/
```

- Prisma client: single instance exported from `src/lib/prisma.js`; never instantiate
  `PrismaClient` anywhere else
- Middleware (including `$use` for `last_updated`) is registered on the instance in `lib/prisma.js`
  immediately after instantiation

**Frontend file locations:**
```
frontend/src/
  api/
    organisations.js   ← fetch wrappers (fetchOrganisations, createOrganisation, etc.)
    meta.js            ← fetch wrappers for /api/meta/* endpoints
  components/
    ActiveFilterChips.jsx
    CapabilityBadge.jsx
    CompareSelectionBar.jsx
    OrganisationCard.jsx
    ← shadcn/ui copied components also live here
  context/
    SelectionContext.jsx   ← SelectionProvider + useSelection hook
  hooks/
    useOrganisations.js
    useOrganisation.js
    useOrganisationMutation.js
    useMetaData.js
  pages/
    OrganisationListPage.jsx
    OrganisationDetailPage.jsx
    OrganisationFormPage.jsx   ← handles both create and edit via route params
    ComparePage.jsx
```

- No deep nesting inside `components/` — flat structure per project context
- `OrganisationFormPage` handles both create (`/organisations/new`) and edit
  (`/organisations/:id/edit`) — determined by presence of `:id` param
- `SelectionContext.jsx` exports `SelectionProvider` (wraps route tree) and `useSelection` hook

---

### Format Patterns

**API response envelope — always three keys, no exceptions:**

```js
// Success (list)
{
  data: [ ...organisations ],
  error: null,
  meta: { page: 1, limit: 20, total: 87, totalPages: 5 }
}

// Success (single resource or mutation)
{
  data: { ...organisation },
  error: null,
  meta: null
}

// Validation error (400)
{
  data: null,
  error: {
    message: "Validation failed",
    fields: [
      { field: "name", message: "Enter the organisation name" },
      { field: "country", message: "Select a country" }
    ]
  },
  meta: null
}

// Not found (404)
{
  data: null,
  error: { message: "Organisation not found", fields: [] },
  meta: null
}

// Server error (500)
{
  data: null,
  error: { message: "An unexpected error occurred", fields: [] },
  meta: null
}
```

- `meta` is always present — `null` for non-list endpoints, never omitted
- `error` is always present — `null` on success, never omitted
- `fields` array is always present on error — empty `[]` for non-validation errors
- Never return raw stack traces or Prisma error objects in the response

**Date/time format:**
- All timestamps serialised as **ISO 8601 strings** in API responses
  (e.g. `"2026-04-01T14:32:00.000Z"`)
- Prisma returns `Date` objects; serialise via `JSON.stringify` (automatic) or `.toISOString()`
- Frontend displays dates as localised strings using `new Date(isoString).toLocaleDateString('en-GB')`
- Never return Unix timestamps or non-ISO date strings

**Capability enum serialisation:**
- Serialised as **uppercase strings** in API JSON: `"YES"`, `"NO"`, `"UNKNOWN"`
- Matches Prisma enum output directly — no transform required
- Frontend `CapabilityBadge` compares against these uppercase string values
- Never downcase; never use `true`/`false`/`null` for capability states

**JSON field naming in API responses:**
- camelCase throughout (Prisma maps DB `snake_case` → JS `camelCase` automatically)
- e.g. `ticketingProvider`, `crmPlatform`, `lastUpdated`, `createdAt`, `sourceReference`
- Never return snake_case field names in API JSON

---

### Communication Patterns

**TanStack Query cache invalidation:**
- Mutations that create, update, or delete an organisation invalidate by resource root:
  `queryClient.invalidateQueries({ queryKey: ['organisations'] })`
- This invalidates both list and detail queries in one call
- Do not use `refetchQueries` directly — invalidation triggers automatic refetch

**SelectionContext contract:**
```js
// Context shape — all agents must use this interface
const { selectedIds, toggleSelection, clearSelection } = useSelection()
// selectedIds: string[]  — array of organisation UUID strings
// toggleSelection(id): void  — adds if absent, removes if present
// clearSelection(): void  — resets to []
```

**Filter state (URL ↔ component):**
- Use React Router `useSearchParams` — never `window.location` or manual URL manipulation
- Read: `searchParams.get('country')` → `null` if unset (treat as "all")
- Write: `setSearchParams(prev => { prev.set('country', value); return prev; })` to preserve other params
- Clear one filter: `setSearchParams(prev => { prev.delete('country'); return prev; })`
- Clear all: `setSearchParams({})` — resets to empty object
- TanStack Query key includes current filter state so cache is filter-specific:
  `['organisations', { page, q, country, provider, type, crm, membership, donation, seating }]`

---

### Process Patterns

**Loading states:**
- List table: skeleton rows (slate-100 shimmer, same column count as loaded state) — never
  a full-page spinner; never blank
- Detail page: skeleton matching detail layout — not a spinner
- Mutation in progress: primary button shows loading indicator and is `disabled`; no double-submit
- Use TanStack Query `isLoading` (initial load, no data) vs `isFetching` (background refetch)
  — only show skeleton on `isLoading`, not on background `isFetching`

**Success feedback:**
- After create/update: navigate to detail or list, then display inline banner at page top:
  `"Organisation saved."` — `bg-emerald-50 border border-emerald-200 text-emerald-800`
- Auto-dismiss after 5 seconds; dismissable manually
- Implemented via a transient URL state param or local component state — not a global toast
  library
- After delete: navigate to list with an inline success banner: `"Organisation deleted."`

**Error handling:**
- API errors caught in TanStack Query `onError` or via `isError` + `error` — never swallowed
- `400` validation errors: extract `error.fields`, map to form field state, display GOV.UK
  error summary at form top + inline per-field messages
- `404`: render a clear "Not found" message with a link back to the list — not a blank page
- `500`: render a generic "Something went wrong" message — never expose raw `error.message`
  from the server to end users
- No `console.error` left in committed code — errors either surface in UI or are deliberately
  swallowed with a comment explaining why

**Form submit pattern:**
1. Client-side validation on submit (not on blur for MVP) — mirrors backend rules
2. If client validation fails: show error summary + inline errors, do not call API
3. If client validation passes: call API, disable submit button
4. If API returns `400`: extract `fields`, map to form state, re-enable submit button
5. If API returns success: navigate away, show success banner

---

### Enforcement Guidelines

**All agents MUST:**
- Import the Prisma client only from `src/lib/prisma.js` — never instantiate `PrismaClient` directly
- Use the `{ data, error, meta }` wrapper on every API response — `meta: null` on non-list endpoints
- Use uppercase strings for capability values throughout (`"YES"`, `"NO"`, `"UNKNOWN"`)
- Use `useSearchParams` for all filter state — never `window.location` or manual URL writes
- Name query params exactly as specified in the Naming Patterns table above
- Return ISO 8601 strings for all dates — never Unix timestamps
- Use `useSelection` from `SelectionContext` for compare selection — never local checkbox state
- Validate request bodies in the controller before calling the service

**Anti-patterns (never do these):**
- `new PrismaClient()` outside `src/lib/prisma.js`
- Returning `{ success: true, organisation: {...} }` instead of `{ data, error, meta }`
- Using `null` or `false` for a capability state instead of `"UNKNOWN"` or `"NO"`
- Storing filter state in `useState` instead of URL params
- Passing `last_updated` in a request body
- Returning raw Prisma errors or stack traces in API responses
- Using `window.location.href` for navigation — use React Router `useNavigate`

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category | Backend files | Frontend files |
|-------------|--------------|----------------|
| CRUD (FR1–4) | `organisation-controller.js`, `organisation-service.js` | `OrganisationFormPage.jsx`, `OrganisationDetailPage.jsx` |
| List / dashboard (FR5) | `organisation-controller.js` (list action) | `OrganisationListPage.jsx` |
| Text search (FR6) | `organisation-service.js` (ILIKE query) | `useOrganisations.js` |
| Navigation (FR7) | — | `App.jsx` (React Router routes) |
| Filtering (FR8–13) | `organisation-controller.js` (query param parsing) | `ActiveFilterChips.jsx`, `useOrganisations.js` |
| Compare (FR14–16) | — | `CompareSelectionBar.jsx`, `ComparePage.jsx`, `OrganisationCard.jsx`, `SelectionContext.jsx` |
| Provenance & freshness (FR17–20) | `lib/prisma.js` (`$use` middleware), `schema.prisma` | `OrganisationDetailPage.jsx`, `OrganisationCard.jsx` |
| Reference dimensions (FR21–24) | `meta-controller.js`, `seed.js`, schema enums | `useMetaData.js`, select fields in `OrganisationFormPage.jsx` |
| Pagination (FR25) | `organisation-controller.js` (offset query + meta) | `OrganisationListPage.jsx` (shadcn `Pagination`) |
| Operability (FR26–28) | `docker-compose.yml`, `README.md`, `seed.js` | `README.md` |
| Validation feedback (FR29) | `organisation-controller.js` (fields array) | `OrganisationFormPage.jsx` (error summary + inline errors) |
| Optional fields (FR30–31) | `schema.prisma` (`notes`, `capacity` nullable) | `OrganisationFormPage.jsx` |

### Complete Project Directory Structure

```
/
├── README.md
├── docker-compose.yml
├── .gitignore
├── docs/
│   └── decisions.md                  ← all meaningful decisions recorded here
│
├── backend/
│   ├── package.json
│   ├── .env.example                  ← all required keys documented, no values
│   ├── Dockerfile
│   └── src/
│       ├── index.js                  ← server entry point (app.listen)
│       ├── app.js                    ← Express app, middleware registration, route mounting
│       ├── lib/
│       │   └── prisma.js             ← PrismaClient singleton + $use middleware for last_updated
│       ├── routes/
│       │   ├── organisations.js      ← routing only; mounts organisation-controller handlers
│       │   └── meta.js               ← routing only; mounts meta-controller handlers
│       ├── controllers/
│       │   ├── organisation-controller.js   ← request parsing, validation, response shaping
│       │   └── meta-controller.js           ← serves provider/CRM/type lists for dropdowns
│       ├── services/
│       │   └── organisation-service.js      ← all business logic and Prisma queries
│       └── prisma/
│           ├── schema.prisma         ← data model; migrations run from here
│           ├── seed.js               ← seeds providers, CRMs, types, countries, sample orgs
│           └── migrations/           ← auto-generated by prisma migrate dev
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example                  ← VITE_API_BASE_URL documented
    ├── Dockerfile
    └── src/
        ├── main.jsx                  ← React root; mounts App; QueryClientProvider here
        ├── App.jsx                   ← SelectionProvider + React Router routes
        ├── api/
        │   ├── organisations.js      ← fetch wrappers: fetchOrganisations, fetchOrganisation,
        │   │                            createOrganisation, updateOrganisation, deleteOrganisation
        │   └── meta.js               ← fetch wrappers: fetchProviders, fetchCrms, fetchTypes
        ├── components/
        │   ├── ActiveFilterChips.jsx
        │   ├── CapabilityBadge.jsx
        │   ├── CompareSelectionBar.jsx
        │   ├── OrganisationCard.jsx
        │   └── ui/
        │       ├── button.jsx
        │       ├── input.jsx
        │       ├── select.jsx
        │       ├── checkbox.jsx
        │       ├── dialog.jsx
        │       ├── badge.jsx
        │       ├── pagination.jsx
        │       ├── table.jsx
        │       ├── textarea.jsx
        │       ├── label.jsx
        │       └── separator.jsx
        ├── context/
        │   └── SelectionContext.jsx  ← SelectionProvider + useSelection hook
        ├── hooks/
        │   ├── useOrganisations.js   ← list query with filters + pagination
        │   ├── useOrganisation.js    ← single org query by id
        │   ├── useOrganisationMutation.js  ← create, update, delete mutations
        │   └── useMetaData.js        ← providers, CRMs, types for dropdowns
        ├── lib/
        │   └── countries.js          ← exported constant: COUNTRIES array (seeded list)
        └── pages/
            ├── OrganisationListPage.jsx    ← filter bar, table, pagination, compare bar
            ├── OrganisationDetailPage.jsx  ← full record view, source + last updated prominent
            ├── OrganisationFormPage.jsx    ← create + edit (route param determines mode)
            └── ComparePage.jsx             ← parallel fetches, OrganisationCard columns
```

### Architectural Boundaries

**API boundary — Express backend:**

All data access goes through the REST API. The frontend has no direct database access.

| Endpoint | Handler file | Service file |
|----------|-------------|--------------|
| `GET /api/organisations` | `organisation-controller.js` | `organisation-service.js` |
| `GET /api/organisations/:id` | `organisation-controller.js` | `organisation-service.js` |
| `POST /api/organisations` | `organisation-controller.js` | `organisation-service.js` |
| `PUT /api/organisations/:id` | `organisation-controller.js` | `organisation-service.js` |
| `DELETE /api/organisations/:id` | `organisation-controller.js` | `organisation-service.js` |
| `GET /api/meta/ticketing-providers` | `meta-controller.js` | — (direct Prisma query) |
| `GET /api/meta/crm-platforms` | `meta-controller.js` | — (direct Prisma query) |
| `GET /api/meta/organisation-types` | `meta-controller.js` | — (direct Prisma query) |
| `GET /api/health` | inline in `app.js` | — |

Meta endpoints are read-only and simple enough to query Prisma directly in the controller — no service layer needed.

**Layer boundaries — backend:**
- `routes/` → routing only; calls controller handler functions; no logic
- `controllers/` → parse request, validate body, call service, shape response; no Prisma calls
- `services/` → all Prisma queries and business logic; no req/res knowledge
- `lib/prisma.js` → singleton and middleware; imported by service layer only

**Component boundaries — frontend:**
- `pages/` → route-level components; compose hooks and components; manage page-level state
- `components/` → reusable presentational components; receive props; no direct API calls
- `hooks/` → all TanStack Query data fetching; return `{ data, isLoading, isError, mutate }`
- `api/` → raw fetch functions; called only from hooks; return parsed JSON or throw
- `context/` → selection state only; no data fetching

**State boundaries:**
- Filter state → URL query params via `useSearchParams` (React Router)
- Selection state → `SelectionContext` (in-memory, cleared on compare or explicit clear)
- Server state → TanStack Query cache (keyed by resource + params)
- Form state → local `useState` within `OrganisationFormPage`
- No other state management — no Zustand, no Redux, no other context

### Integration Points

**Frontend → Backend:**
- All API calls use `VITE_API_BASE_URL` (e.g. `http://localhost:3001`) set in `.env`
- No hardcoded URLs; API base URL never embedded in committed code
- CORS handled by `cors` middleware on Express; `CORS_ORIGIN` in backend `.env`

**Backend → Database:**
- All DB access via Prisma client from `lib/prisma.js`
- Connection string via `DATABASE_URL` in backend `.env`
- Schema at `src/prisma/schema.prisma`; configured in `backend/package.json`
  via `"prisma": { "schema": "src/prisma/schema.prisma" }`

**Docker Compose service communication:**
- `frontend` → `backend`: browser calls `VITE_API_BASE_URL` (host-mapped port); not service-name DNS
- `backend` → `db`: `DATABASE_URL=postgresql://...@db:5432/dmcf` using Docker internal DNS (`db`)
- `db`: not exposed on host by default; accessible only within Docker network

**Data flow — primary path (filter → compare):**

```
useSearchParams (URL)
  → useOrganisations hook (TanStack Query)
    → fetchOrganisations (api/organisations.js)
      → GET /api/organisations?country=...&provider=...
        → organisation-controller (validate params)
          → organisation-service (Prisma query with WHERE + ILIKE + LIMIT/OFFSET)
            → PostgreSQL
          ← { rows, total }
        ← { data: [...], error: null, meta: { page, limit, total, totalPages } }
      ← parsed JSON
    ← cached query result
  ← { data, isLoading, isFetching }

SelectionContext (selectedIds[])
  → CompareSelectionBar (renders when selectedIds.length > 0)
    → navigate('/compare?ids=abc,def') on "Compare selected" click

ComparePage
  → reads ids from useSearchParams on /compare route (frontend route, not API endpoint)
  → Promise.all(ids.map(id => fetchOrganisation(id)))
    → GET /api/organisations/:id (×N, parallel — one request per id)
      ← { data: organisation, error: null, meta: null }
  → renders OrganisationCard per result
```

### Environment Variables

**Backend (`backend/.env.example`):**
```
DATABASE_URL=postgresql://postgres:password@db:5432/dmcf
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

**Frontend (`frontend/.env.example`):**
```
VITE_API_BASE_URL=http://localhost:3001
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:**
All technology choices are mutually compatible. Prisma v6 + CommonJS Express + PostgreSQL work
together without ESM conflicts. React Router v6 `useSearchParams` directly supports the UX spec's
URL-encoded filter state requirement. TanStack Query v5 `useMutation` + `invalidateQueries` is
the correct pattern for CRUD-heavy applications. shadcn/ui Radix primitives provide accessible
keyboard and focus management for the modal, dropdowns, and form components specified in the UX
design. No contradictory decisions identified.

**Pattern consistency:**
Naming conventions are consistent across layers: `snake_case` in DB schema, `camelCase` in API
JSON (Prisma auto-maps), `kebab-case` filenames, `PascalCase` components. The `{ data, error,
meta }` response envelope is specified for every endpoint. Capability values are uppercase strings
end-to-end. Filter state flows consistently from URL → TanStack Query key → API query param →
Prisma `WHERE` clause.

**Structure alignment:**
The directory structure matches `project-context.md` conventions exactly. Layer boundaries
(routes → controllers → services → lib/prisma.js) are enforced by the patterns section.
Component boundaries (pages, components, hooks, api, context) align with the data flow
diagrams in the integration points section.

---

### Requirements Coverage Validation ✅

**All 31 functional requirements covered:**

| FR range | Coverage |
|----------|----------|
| FR1–4 (CRUD) | `OrganisationFormPage`, `OrganisationDetailPage`, `organisation-controller.js`, `organisation-service.js`, delete `Dialog` |
| FR5–7 (List, search, nav) | `OrganisationListPage`, `useOrganisations`, `ILIKE` + `pg_trgm`, React Router routes |
| FR8–13 (Filtering) | `ActiveFilterChips`, URL query params, server-side `WHERE` clause, all five filter dimensions |
| FR14–16 (Compare) | `SelectionContext`, `CompareSelectionBar`, `ComparePage`, `OrganisationCard`, parallel fetches |
| FR17–20 (Provenance) | `source_reference` field, `last_updated` via Prisma `$use` middleware, detail + compare display |
| FR21–24 (Reference dims) | Lookup tables + meta endpoints + `CapabilityState` enum + seeded data |
| FR25 (Pagination) | Offset pagination, `meta: { page, limit, total, totalPages }`, shadcn `Pagination` |
| FR26–28 (Operability) | `docker-compose.yml`, `seed.js`, `README.md` |
| FR29–31 (Validation, optional) | Manual controller validation + GOV.UK error pattern; `notes` and `capacity` nullable |

**All NFRs addressed:**

| NFR | Architectural provision |
|-----|------------------------|
| P1 — list responsiveness | DB-level filtering, `pg_trgm` GIN index, server-side pagination |
| P2 — compare responsiveness | `Promise.all` parallel fetches; 2–4 records on internal network |
| P3 — server pagination | Offset pagination from day one; no full-catalogue client load |
| S1 — secrets handling | `.env` + `.env.example`; `VITE_*` convention; no hardcoded values |
| S2 — deployment posture | No auth; README must document threat model explicitly |
| S3 — notes PII | Field intent documented; no structural enforcement in MVP |
| SC1–2 — concurrency + dataset | Single Postgres instance; indexed filter columns; offset pagination |
| A1–2 — accessibility | Radix UI primitives (keyboard, ARIA, focus trap); WCAG 2.2 AA pragmatic target; no formal audit gate |

---

### Implementation Readiness Validation ✅

**Decision completeness:** All 11 architectural decisions documented with rationale, affected
components, and (where applicable) verified package versions. Deferred decisions logged with
upgrade paths.

**Structure completeness:** Complete directory tree with per-file annotations. All 31 FRs mapped
to specific files. All API endpoints listed with handler and service. All environment variables
documented.

**Pattern completeness:** 12 conflict points identified and resolved. Naming table covers all
query params. Response envelope examples cover all HTTP status codes. Anti-patterns explicitly
listed.

---

### Gap Analysis & Clarifications Added

**Important — resolved in this section:**

1. **Tailwind CSS version:** `tailwind.config.js` in the project structure implies Tailwind v3
   syntax. Tailwind v4 (current) uses CSS-based configuration and no `tailwind.config.js`. Pin
   to **Tailwind CSS v3**: `npm install -D tailwindcss@3 postcss autoprefixer`. shadcn/ui
   components are tested against v3; v4 migration is a post-MVP concern.

2. **React Router package name:** Install as `react-router-dom@6` (the browser package), not
   `react-router@6`. Imports come from `react-router-dom`. React Router v7 collapsed the two
   packages; on v6 they remain separate.

3. **shadcn/ui — JavaScript setup and dependencies:** As of February 2026, shadcn/ui uses a
   unified `radix-ui` package rather than individual `@radix-ui/react-*` packages. JavaScript
   projects are supported via `"tsx": false` in `components.json`. Components must be
   **manually copied** from [ui.shadcn.com](https://ui.shadcn.com) into
   `frontend/src/components/ui/` — do not use the `npx shadcn@latest add` CLI, which installs
   runtime package dependencies and conflicts with the project context constraint
   ("copy-paste only — not installed as a package dependency").

   Required base utility dependencies (install once, used by all copied components):
   ```bash
   npm install radix-ui class-variance-authority clsx tailwind-merge lucide-react
   ```

4. **DELETE response body:** `DELETE /api/organisations/:id` returns
   `{ data: { id }, error: null, meta: null }` — the deleted record's ID confirms the operation
   without a follow-up fetch.

**Minor — noted for awareness:**

5. **Country list sync:** `frontend/src/lib/countries.js` and `backend/src/prisma/seed.js`
   both encode the canonical country list. There is no `/api/meta/countries` endpoint. If the
   list changes, both files must be updated together. Document this in `docs/decisions.md`.

6. **Prisma seeding in v6:** In Prisma v6, `npx prisma migrate dev` and
   `npx prisma migrate reset` automatically run `seed.js` after applying migrations. This is
   the expected local setup behaviour. The README should document both commands.

---

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analysed against 4 input documents
- [x] Scale and complexity assessed (Medium; hundreds–low thousands of rows)
- [x] Technical constraints identified (11 hard rules from project-context.md)
- [x] Cross-cutting concerns mapped (8 identified and addressed)

**Architectural Decisions**
- [x] 11 decisions documented with rationale and affected components
- [x] Technology stack fully specified with verified versions
- [x] Deferred decisions logged with upgrade paths
- [x] Security posture (no auth) explicitly documented

**Implementation Patterns**
- [x] 12 naming and structural conflict points resolved
- [x] API response envelope fully specified with examples for all status codes
- [x] Process patterns: loading states, success feedback, error handling, form submit
- [x] Anti-patterns explicitly listed

**Project Structure**
- [x] Complete annotated directory tree
- [x] All 31 FRs mapped to specific files
- [x] All API endpoints listed with handler/service
- [x] Data flow diagram for primary path
- [x] Environment variables documented

---

### Architecture Readiness Assessment

**Overall status: READY FOR IMPLEMENTATION**

**Confidence level: High** — all FRs covered, all NFRs addressed, no unresolved conflicts,
four clarifications added during validation to prevent common agent errors.

**Key strengths:**
- Narrow, focused scope (one entity, three lookup tables) with clear boundaries
- No auth complexity, no external integrations — agents can focus on product logic
- Comprehensive pattern specification reduces ambiguity for AI-agent implementation
- URL-encoded filter state is a well-understood React Router pattern
- Prisma v6 with `$use` middleware is the simplest, most readable `last_updated` solution

**Areas for future enhancement (post-MVP):**
- Prisma v6 → v7 migration when moving to ESM or TypeScript
- `ILIKE` → PostgreSQL FTS if search performance degrades at scale
- Parallel fetches → batch endpoint for compare if latency becomes measurable
- `/api/meta/countries` endpoint to eliminate the country list sync maintenance rule
- Tailwind v3 → v4 migration (CSS-based config, smaller output)
- Vitest testing infrastructure (both layers)

### Implementation Handoff

**First implementation story — project initialisation:**

```bash
# Frontend
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom@6 @tanstack/react-query@5
npm install radix-ui class-variance-authority clsx tailwind-merge lucide-react
npm install -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p

# Backend
cd ../backend && npm init -y
npm install express dotenv cors
npm install -D prisma@6
npm install @prisma/client@6
npx prisma init --datasource-provider postgresql
# Add to backend/package.json: "prisma": { "schema": "src/prisma/schema.prisma" }
```

**For all implementing agents:** This document is the single source of truth for architectural
decisions. When in doubt, the decision rationale sections explain *why* a choice was made, which
is more useful than the decision alone. The anti-patterns section in Implementation Patterns is
equally authoritative — a listed anti-pattern is a defect, not a suggestion.
