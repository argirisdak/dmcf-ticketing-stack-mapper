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
- **Environment variables:** `SCREAMING_SNAKE_CASE`
- **API route paths:** lowercase, hyphenated, plural nouns (e.g. `/api/organisations`, `/api/organisations/:id/compare`)
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
- Every table must have an `id` (UUID), `created_at`, and `updated_at`
- Seed data lives in `prisma/seed.js`
- Organisation type is stored as a lookup table, not a text column or enum — seed it with a fixed list.

---

## API Design Rules

- RESTful, resource-oriented routes
- Use standard HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`
- `PUT` is used for full record updates; `PATCH` may be used for partial updates if needed
- Return `404` for missing resources, `400` for validation errors, `500` for unexpected server errors
- Paginate list endpoints from the start — default page size: 20

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

---

## Documentation Rules

- Every meaningful decision must be recorded in `docs/decisions.md` with a brief rationale
- The `README.md` must be sufficient for a stranger to clone and run the project with no prior context
- Inline code comments are for *why*, not *what*