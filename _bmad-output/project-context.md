# project-context.md
## DMCF Ticketing Stack Mapper — Technical Preferences & Implementation Rules

This file defines the conventions all AI agents must follow throughout this project. Read it before generating any code, architecture, or documentation.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (functional components, hooks only — no class components) |
| Backend | Node.js with Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Local environment | Docker Compose |
| Version control | Git |

**UI primitives:** shadcn/ui (copy-paste only — not installed as a package dependency). Use for accessible interactive components such as modals, dropdowns, and comboboxes. All visual styling via Tailwind CSS.

---

## Project Structure

```
/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── prisma/
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── main.jsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Naming Conventions

- **Files and folders:** `kebab-case` everywhere (e.g. `organisation-card.jsx`, `ticketing-routes.js`)
- **React components:** `PascalCase` for the component name and its file (e.g. `OrganisationCard.jsx`)
- **Variables and functions:** `camelCase`
- **Database tables and columns:** `snake_case` (Prisma maps to JS camelCase automatically)
- **Prisma enums:** type name is `PascalCase`, values are `SCREAMING_SNAKE_CASE` (e.g. `CapabilityState { YES NO UNKNOWN }`, `SystemCategory { INTEGRATED TICKETING AUDIENCE_MANAGEMENT }`). Values surface unchanged in API JSON; the frontend renders them as lowercased text with spaces in the UI (e.g. `AUDIENCE_MANAGEMENT` → "audience management").
- **Environment variables:** `SCREAMING_SNAKE_CASE`
- **API route paths:** lowercase, hyphenated, plural nouns (e.g. `/api/organisations`, `/api/systems`, `/api/organisations/:id/systems`)
- **Spelling:** Use British English throughout — `organisation` not `organization`

---

## Coding Standards

### General
- Keep functions small and single-purpose
- Prefer explicit over clever — readability over brevity
- No commented-out dead code in commits
- Every file should have a clear, single responsibility

### Backend
- Route files handle routing only — no business logic
- Business logic lives in service files
- Controllers sit between routes and services, handling request/response shaping
- Always return consistent JSON response shapes: `{ data, error, meta }`
- Use `async/await` — no raw `.then()` chains
- Validate incoming request bodies before they reach the service layer
- Use environment variables for all secrets and config — never hardcode

### Frontend
- Functional components only, with hooks
- Keep components small — if a component exceeds ~100 lines, consider splitting it
- Co-locate component-specific styles or keep a flat `/components` structure — no deep nesting
- Data fetching lives in custom hooks or a dedicated API utility file — not inside components directly
- No inline styles except for truly one-off dynamic values

### Database
- All schema changes go through Prisma migrations — no manual SQL edits to the schema
- Every table must have an `id` (UUID) and `created_at`. Domain entities surfaced to users (e.g. `organisation`, `system`, `organisation_system`) carry `last_updated` with `@default(now()) @updatedAt` in Prisma (ADR-011 — no `$use` middleware) — never accepted from a request body. Pure lookup tables (e.g. `organisation_type`) use `updated_at`.
- Seed data lives in `prisma/seed.js`
- Organisation type is stored as a lookup table, not a text column or enum — seed it with a fixed list.
- **Ticketing providers and CRM platforms are not separate entities.** They are records in the `system` table with a `category` field (`INTEGRATED`, `TICKETING`, or `AUDIENCE_MANAGEMENT`). The legacy `ticketing_provider` and `crm_platform` lookup tables are removed.
- **Organisations link to Systems via the `organisation_system` junction table**, never via a direct FK on `organisation`. The junction carries a `role` enum (`PRIMARY_TICKETING`, `PRIMARY_CRM`, `INTEGRATED_SUITE`, `SECONDARY`), a per-link `source_reference`, and a per-link `note` — distinct from the System's and Organisation's own source fields. `@@unique([organisation_id, system_id])` prevents duplicate links.
- The three-state `CapabilityState` enum is reused on both `organisation` and `system`. Default is `UNKNOWN` on create.
- Junction-row deletion is hard-delete with confirmation. No soft-delete, no `active` flag, no adoption-history table in MVP.
- **Migrations that move data between tables must be split into three sequential migrations: additive (new schema), backfill (data move via custom SQL with verification queries), destructive (drop legacy columns / tables). Never combine schema drops with data backfill in a single migration** — it leaves the database inconsistent on rollback.

---

## API Design Rules

- RESTful, resource-oriented routes
- Use standard HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`
- `PUT` is used for full record updates; `PATCH` may be used for partial updates if needed
- Return `404` for missing resources, `400` for validation errors, `409` for constraint conflicts (duplicate links, restricted deletes), `500` for unexpected server errors
- Paginate list endpoints from the start — default page size: 20
- All responses use the `{ data, error, meta }` envelope — `meta: null` on non-list endpoints, `error: null` on success; never omit either key.
- Junction relationships are managed via nested routes on the parent resource (e.g. `POST /api/organisations/:id/systems`, `DELETE /api/organisations/:id/systems/:linkId`). Never accept junction FKs in the parent's create/update body — links are a separate write operation from the parent record.

---

## Docker Compose Rules

- Three services: `db` (PostgreSQL), `backend` (Node/Express), `frontend` (React dev server)
- Services communicate over a shared internal Docker network
- The database must not be exposed on the host by default (internal only)
- Use `.env` files for local config; provide `.env.example` with all required keys documented

---

## What to Avoid

- No unnecessary dependencies — if the standard library or a small utility covers it, use that
- No authentication system unless explicitly instructed
- No payment functionality under any circumstances
- No external API integrations (data is entered manually)
- Use Tailwind CSS for all styling — no CSS-in-JS libraries, no plain CSS files except for global resets
- No over-engineering: this is an internal MVP, not a production SaaS product
- No new lookup tables for vendor-supplied platforms or products — they belong in `system` with the appropriate `category`. Lookup tables are reserved for orthogonal taxonomies (e.g. organisation type) that don't carry their own attributes.
- No soft-delete patterns or `active` flags on junction tables in MVP — hard-delete with confirmation only.
- No raw Prisma error objects, stack traces, or `console.error` calls in committed code — errors either surface in the UI via the response envelope or are deliberately swallowed with a comment explaining why.

---

## Documentation Rules

- Every meaningful decision must be recorded in `docs/decisions.md` with a brief rationale
- The `README.md` must be sufficient for a stranger to clone and run the project with no prior context
- Inline code comments are for *why*, not *what*