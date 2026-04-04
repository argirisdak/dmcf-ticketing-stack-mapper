# Story 2.1: Organisation List Page

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming conventions, coding standards, British English spelling rules, API response shape, and what to avoid
- `_bmad-output/planning-artifacts/architecture.md` — full architecture decisions; authoritative reference for envelopes, pagination, and format patterns

## Story

As a staff member,
I want to see a paginated table of all organisations with key fields visible at a glance,
so that I have a home base for browsing and navigating the catalogue.

## Acceptance Criteria

1. **Given** the application is running and `GET /api/organisations` is implemented  
   **When** a staff member navigates to `/organisations`  
   **Then** a paginated table renders with columns: Name, Type, Country, Ticketing Provider, CRM Platform, Membership, Donation, Reserved Seating, Last Updated  
   **And** Type, Ticketing Provider, and CRM Platform values are rendered as colour-coded `Badge` components  
   **And** Membership, Donation, and Reserved Seating are rendered using the `CapabilityBadge` component in **compact (icon-only)** variant — `CapabilityBadge` is **first introduced in this story** with compact variant only  
   **And** a subtle inline legend is visible near the capability columns (e.g. below headers or small key) explaining: ✓ = Yes, ✕ = No, – = Not recorded (UX-DR18 — visible legend on first encounter)  
   **And** an "Add organisation" primary button (`bg-blue-600`) is visible in the page header (right side per UX-DR11 pattern)

2. **Given** the organisation list endpoint  
   **When** `GET /api/organisations?page=1&limit=20` is called  
   **Then** it returns `{ data: [...organisations], error: null, meta: { page: 1, limit: 20, total: N, totalPages: N } }`  
   **And** every organisation in `data` uses **camelCase** keys end-to-end — e.g. `organisationType`, `ticketingProvider`, `crmPlatform`, `lastUpdated`, `createdAt`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `sourceReference` — **not** the snake_case field names from `schema.prisma` (`organisation_type`, `last_updated`, etc.). Raw `res.json(findMany())` does **not** satisfy this AC; a **list DTO mapper** is required (see Tasks and Dev Notes).

3. **Given** the list table  
   **When** it renders on any viewport  
   **Then** the table wrapper has `overflow-x-auto`  
   **And** columns use `min-w-[Xpx]` (e.g. Name `min-w-[200px]`, Provider `min-w-[140px]`, capability columns `min-w-[80px]`) — UX-DR20

4. **Given** the list is loading  
   **When** data has not yet returned from the API  
   **Then** skeleton rows (`slate-100` shimmer) fill the table body with the **same column count** as the loaded table — **no full-page spinner**; use TanStack Query **`isLoading` only**, not `isFetching` (UX-DR9, architecture loading patterns)

5. **Given** the catalogue contains no organisations  
   **When** the list page renders  
   **Then** empty state: "No organisations yet. Add the first one to get started." with an "Add organisation" button linking to `/organisations/new` (UX-DR8)

6. **Given** the list contains more than 20 organisations  
   **When** the page renders  
   **Then** pagination controls appear below the table with page buttons  
   **And** result count text e.g. "Showing 1–20 of 47 organisations"

7. **Given** a staff member clicks an organisation row  
   **When** the click is registered  
   **Then** they navigate to `/organisations/:id`

## Tasks / Subtasks

- [x] **Backend — list API** (AC: 2, supports 5–6)
  - [x] Add `backend/src/routes/organisations.js` — mount only; wire in `app.js` as `app.use('/api/organisations', ...)`
  - [x] Add `backend/src/controllers/organisation-controller.js` — parse `page` (default 1, min 1) and `limit` (default 20, sensible max e.g. 100); invalid values → `400` with `{ data: null, error: { message, fields: [...] }, meta: null }` per architecture; **send only mapped DTOs** in `data`, never raw Prisma rows
  - [x] Add `backend/src/services/organisation-service.js` — `findMany` with `include` for type / ticketing provider / CRM relations (use **actual Prisma relation names** from `schema.prisma` — snake_case); `skip`/`take` for offset pagination, `count` for `total`; compute `totalPages` = `Math.ceil(total / limit)`
  - [x] **List DTO mapper (required):** Implement an explicit mapper in the service layer and/or a small dedicated module (e.g. `toOrganisationListDto(prismaRow)`) so each list item is a plain object with **camelCase** keys and nested objects named `organisationType`, `ticketingProvider`, `crmPlatform` (each exposing at least `id` and `name` as needed for the UI). Map all scalar fields the list needs (`id`, `name`, `country`, capability enums, timestamps, optional `notes`/`capacity`/`sourceReference` if present on the model). Serialise dates as ISO 8601 strings in the DTO output.
  - [x] Ensure response envelope and ISO 8601 dates; **never** expose raw Prisma errors or stack traces
  - [x] Add Jest tests mirroring existing style (`backend/src/__tests__/meta-controller.test.js`, `health.test.js`) — happy path pagination, empty list, invalid page/limit; **assert response JSON uses camelCase** keys on list items (e.g. `lastUpdated`, `organisationType`), not snake_case Prisma fields

- [x] **Frontend — API + query** (AC: 2, 4)
  - [x] Add `frontend/src/api/organisations.js` — `fetchOrganisations({ page, limit })` using `VITE_API_BASE_URL`; parse `{ data, error, meta }`
  - [x] Add `frontend/src/hooks/useOrganisations.js` — TanStack Query `useQuery` with key `['organisations', { page, limit }]` (Epic 3 will extend key with filters/search — keep shape easy to extend)

- [x] **Frontend — CapabilityBadge** (AC: 1)
  - [x] Add `frontend/src/components/CapabilityBadge.jsx` — props: `value` in `YES` | `NO` | `UNKNOWN` (uppercase strings from API)
  - [x] **Compact variant only** in this story: icon-only; **UX-DR3** — Yes: `emerald-600` + Check, `aria-label="Yes"`; No: `slate-500` + X, `aria-label="No"`; Unknown: `slate-300` + Minus, `aria-label="Not recorded"`; use `lucide-react` icons (already in stack)
  - [x] Labelled variant is **Story 2.3** — do not block on it here

- [x] **Frontend — Badge** (AC: 1)
  - [x] Add shadcn-style `Badge` under `frontend/src/components/ui/badge.jsx` (manual copy-paste; **do not** use `npx shadcn` CLI — ADR-006)
  - [x] **UX-DR12** — muted, functional palette for Type, Ticketing Provider, CRM in the table (distinct hues, legible at table density)

- [x] **Frontend — OrganisationListPage** (AC: 1, 3–7)
  - [x] Replace placeholder in `frontend/src/pages/OrganisationListPage.jsx`
  - [x] **UX-DR11** — white page header row: title "Organisations" left, primary "Add organisation" (`Link` to `/organisations/new`) right; page content in `max-w-7xl mx-auto` (already on `main` in `App.jsx` — align inner layout)
  - [x] Table + `overflow-x-auto`; header row with column labels; capability legend as specified
  - [x] Skeleton rows during `isLoading`
  - [x] Empty state copy and CTA
  - [x] Pagination UI + range text when `meta.totalPages > 1` or whenever `total > limit` per AC
  - [x] Row `onClick` or clickable row → `useNavigate(\`/organisations/${id}\`)`; keyboard: row should be focusable or use explicit link pattern — at minimum ensure primary flow works with mouse per AC
  - [x] **Out of scope for 2.1:** compare checkboxes, filter bar, text search — Epic 3 / 4

- [x] **Documentation**
  - [x] If list API or serialisation choices are non-obvious, add a short note to `docs/decisions.md` (optional for straightforward CRUD list)

### Review Findings

- [x] [Review][Decision] Out-of-range `page` returns 200 with empty `data` — **Resolved 2026-04-02:** Option **A** — keep HTTP 200 with `data: []` and `meta` reflecting the requested `page` (and computed `totalPages`). Documented in `docs/decisions.md` (ADR-010).

- [x] [Review][Patch] Harden `page` / `limit` when Express provides array query values — Repeated keys can yield `string[]`; validate with `typeof === 'string'` (or take first element explicitly) before `Number()` so behaviour is deterministic. [`backend/src/controllers/organisation-controller.js`] — fixed 2026-04-02 (batch review)

- [x] [Review][Patch] Treat non-enum capability values as UNKNOWN in `CapabilityBadge` — If API ever sends `null`, wrong casing, or an unexpected string, the UI should not mis-render; default to the same presentation as `UNKNOWN`. [`frontend/src/components/CapabilityBadge.jsx`] — fixed 2026-04-02 (batch review)

- [x] [Review][Patch] Log unexpected list errors server-side — The controller’s bare `catch` returns a safe 500 envelope but swallows the underlying error; log (without leaking to the client) to aid operations. [`backend/src/controllers/organisation-controller.js`] — fixed 2026-04-02 (batch review)

- [x] [Review][Patch] Guard successful list response shape in `fetchOrganisations` — After `res.ok`, verify `Array.isArray(body?.data)` and `body?.meta` has pagination fields before returning; avoids opaque UI failures if the server returns an unexpected 200 body. [`frontend/src/api/organisations.js`] — fixed 2026-04-02 (batch review)

- [x] [Review][Defer] No HTTP integration test through real Prisma for list — `organisation-controller.test.js` mocks `listOrganisations`, so DB + mapper + JSON are not exercised together via supertest (mirrors meta route tests). Consider a focused integration test when CI DB is available. [`backend/src/__tests__/organisation-controller.test.js`] — deferred, matches existing meta route test pattern

## Dev Notes

### Epic 2 context (cross-story)

- **2.2** adds create form and `POST /api/organisations`; **2.3** adds `GET /api/organisations/:id` and labelled `CapabilityBadge`; **2.4** edit; **2.5** delete dialog. This story establishes list + **compact** `CapabilityBadge` + list API so later stories can build on them.
- Invalidate list cache after mutations: `queryClient.invalidateQueries({ queryKey: ['organisations'] })` — implement when mutations exist (2.2+).

### Handoff from Epic 1 (Stories 1.1–1.3)

- **Stack:** Express + Prisma v6 (`backend/src/lib/prisma.js` singleton + `$use` middleware for `last_updated` already exists), Vite + React, Tailwind v3, React Router v6, TanStack Query v5 in `main.jsx`, `SelectionProvider` in `App.jsx`.
- **Routes:** `/organisations` already registered; `OrganisationListPage` is currently a **placeholder** — replace implementation.
- **`app.js`:** Only `health` + `/api/meta/*` today — **add** organisation routes.
- **Tests:** Backend uses **Jest**; frontend lint may report pre-existing `react-refresh/only-export-components` in `button.jsx` / `SelectionContext.jsx` — tracked in `deferred-work.md`; do not scope-creep fixes unless trivial.
- **Ports / env:** Backend `3001`, frontend `5173`; `VITE_API_BASE_URL`, `CORS_ORIGIN` — see `README.md`.

### API JSON vs Prisma (list endpoint)

- **`schema.prisma` uses snake_case for model fields and relation names** (e.g. `organisation_type`, `last_updated`). The Prisma client therefore returns snake_case property names on query results.
- **The public API must still match architecture and this epic:** camelCase in JSON only. **Do not** rely on `res.json(rows)` from `findMany`.
- Implement a **list DTO mapper** (single place or small helper module) called from the service after `findMany` + `count`, mapping each row to the camelCase shape the frontend expects. Reuse or extend the same mapping pattern in Story 2.2+ for `POST`/`GET`/`PUT` responses so serialisation stays consistent.
- Nested lookups in JSON: `organisationType: { id, name }`, `ticketingProvider: { id, name } | null`, `crmPlatform: { id, name } | null` (adjust if the UI only needs `name` — still use camelCase parent keys).

### Architecture compliance (must follow)

- **Envelope:** Every response `{ data, error, meta }`; list endpoints use `meta: { page, limit, total, totalPages }`; `meta: null` only for non-list success responses.
- **camelCase** in JSON (enforced by the list DTO mapper, not by Prisma defaults); capabilities as `"YES"` | `"NO"` | `"UNKNOWN"`.
- **File layout:** `routes/*.js` routing only; controllers parse/validate/shape; services hold Prisma queries — [Source: `_bmad-output/planning-artifacts/architecture.md#Structure Patterns`]
- **Prisma:** Import client only from `backend/src/lib/prisma.js`.
- **British English** in UI copy and routes: `organisation`, `Organisations`.

### Library / version guardrails

- **Tailwind v3** (not v4); **shadcn manual copy** into `frontend/src/components/ui/`.
- **react-router-dom@6** — `Link`, `useNavigate`, etc.
- **@tanstack/react-query** v5 — `useQuery`, `keepPreviousData` optional for smoother pagination (not required by AC).

### File structure (expected new/changed)

| Path | Action |
|------|--------|
| `backend/src/app.js` | Register organisation routes |
| `backend/src/routes/organisations.js` | New |
| `backend/src/controllers/organisation-controller.js` | New |
| `backend/src/services/organisation-service.js` | New |
| `backend/src/__tests__/organisation-*.test.js` | New (or single test file) |
| `frontend/src/api/organisations.js` | New |
| `frontend/src/hooks/useOrganisations.js` | New |
| `frontend/src/components/CapabilityBadge.jsx` | New |
| `frontend/src/components/ui/badge.jsx` | New |
| `frontend/src/pages/OrganisationListPage.jsx` | Replace placeholder |

### Testing requirements

- **Backend:** Jest tests for list endpoint — pagination metadata, empty `data` array, validation errors for bad `page`/`limit`.
- **Frontend:** No mandated test framework for MVP; manually verify AC in browser against Docker stack.
- Run `cd backend && npm test` before marking done.

### UX references

- **UX-DR3** — CapabilityBadge states and colours  
- **UX-DR8** — Empty state for empty catalogue  
- **UX-DR9** — Skeleton rows, no full-page spinner on list  
- **UX-DR11** — Top nav + page header + back links (back link not required on list page)  
- **UX-DR12** — Badge tags for provider/type/CRM  
- **UX-DR18** — Capability legend on first encounter  
- **UX-DR19** — Slate/blue palette  
- **UX-DR20** — `max-w-7xl`, table overflow, column min-widths  

[Source: `_bmad-output/planning-artifacts/epics.md#Story 2.1`]  
[Source: `_bmad-output/planning-artifacts/architecture.md#Format Patterns`, `#Implementation Patterns`]  
[Source: `_bmad-output/project-context.md`]

### Previous story intelligence (Epic 1)

- Story **1.3** completed README, `docs/decisions.md` (ADR-005–008), `.gitignore`; API examples in README use `{ data, error, meta }` — keep new endpoints consistent so smoke tests remain truthful.
- **Country list:** `COUNTRIES` exported from seed; list page does not need country dropdown yet (create form in 2.2).

### Git intelligence

- Workspace may not be a git repo in all environments; if git is available, follow existing commit/file patterns from Epic 1.

### Latest technical notes

- Prisma v6 returns **snake_case** property names matching `schema.prisma`; the list DTO mapper is what aligns responses with architecture’s camelCase contract.
- Default pagination **page size 20** per project-context and architecture.

## Project context reference

See `_bmad-output/project-context.md` for stack, naming (`kebab-case` files, `PascalCase` components), API rules, and anti-patterns (no auth, no unnecessary deps).

## Story completion status

**done** — Code review complete; decision and patch findings addressed.

---

## Dev Agent Record

### Agent Model Used

Cursor agent (Composer) — dev-story workflow

### Debug Log References

- Backend tests initially failed without Prisma generate in sandbox; `organisation-controller.test.js` mocks `lib/prisma` and `organisation-service`; DTO unit tests target `organisation-list-dto.js` to avoid loading `PrismaClient`.

### Completion Notes List

- Implemented `GET /api/organisations` with validation (`page` ≥ 1, `limit` 1–100, defaults 1/20), `{ data, error, meta }` envelope, and `toOrganisationListDto` for camelCase JSON + ISO timestamps.
- Frontend: TanStack Query `useOrganisations`, paginated table with skeletons (`isLoading` only), badges, compact `CapabilityBadge`, empty state, row navigation + keyboard, pagination with ellipsis when >15 pages.
- Documented list DTO boundary in ADR-009.
- Post-review: ADR-010; controller query coalescing + error logging; client list response validation; `CapabilityBadge` tolerant of bad API values.

### File List

- `backend/src/app.js`
- `backend/src/routes/organisations.js`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/services/organisation-list-dto.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `frontend/src/api/organisations.js`
- `frontend/src/hooks/useOrganisations.js`
- `frontend/src/components/CapabilityBadge.jsx`
- `frontend/src/components/ui/badge.jsx`
- `frontend/src/pages/OrganisationListPage.jsx`
- `docs/decisions.md` (ADR-009)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-02: Story 2.1 — organisation list API, list DTO mapper, list page UI, Jest tests, ADR-009 (dev-story workflow).
- 2026-04-02: Code review — ADR-010 (out-of-range `page`); batch patches: `asQueryString` for repeated query keys, `console.error` on list 500, `CapabilityBadge` normalisation, `fetchOrganisations` response guard; test for repeated `page`/`limit`.
