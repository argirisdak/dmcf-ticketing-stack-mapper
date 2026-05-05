---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
  - v2-delta-appended
  - v3-delta-appended
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd-v2-delta.md
  - _bmad-output/planning-artifacts/architecture-v2-delta.md
  - _bmad-output/planning-artifacts/prd-v3-delta.md
  - _bmad-output/planning-artifacts/architecture-v3-delta.md
v2DeltaAppendedDate: 2026-04-29
v3DeltaAppendedDate: 2026-05-03
---

# dmcf-ticketing-stack-mapper — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **dmcf-ticketing-stack-mapper**, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A staff member can create a new organisation record with required and optional fields.
FR2: A staff member can view the full detail of a single organisation.
FR3: A staff member can update an existing organisation record.
FR4: A staff member can delete an organisation record after confirming the action.
FR5: A staff member can view a tabular list of organisations with key fields visible at a glance.
FR6: A staff member can search for organisations using text across designated searchable fields (for example name, city, provider, notes, and other fields agreed for search).
FR7: A staff member can navigate between list, detail, create, edit, and comparison flows in a predictable way.
FR8: A staff member can filter organisations by country.
FR9: A staff member can filter organisations by organisation type.
FR10: A staff member can filter organisations by ticketing provider.
FR11: A staff member can filter organisations by CRM platform.
FR12: A staff member can filter organisations by capability attributes (membership, donation, reserved seating) where those attributes exist on a record.
FR13: A staff member can apply multiple filters together to narrow the result set.
FR14: A staff member can select multiple organisations from the current results for comparison.
FR15: A staff member can open a side-by-side comparison view for the selected organisations.
FR16: A staff member can compare aligned attributes across selected organisations in a readable layout.
FR17: A staff member can view a source reference for each organisation.
FR18: A staff member can create or edit a source reference for each organisation.
FR19: A staff member can view a last updated time for each organisation.
FR20: The product automatically maintains last updated metadata when an organisation record is created or changed, without staff manually setting a timestamp.
FR21: A staff member can choose a ticketing provider from a controlled set of provider options when creating or editing an organisation.
FR22: A staff member can choose a CRM platform from a controlled set of CRM options when creating or editing an organisation.
FR23: A staff member can choose an organisation type from a controlled set of type options when creating or editing an organisation.
FR24: A staff member can set capability attributes using a consistent model that distinguishes unknown, yes, and no (or an equivalent agreed model) for membership, donation, and reserved seating.
FR25: A staff member can browse organisation list results in segments when the dataset is large, rather than being required to load the entire catalogue at once.
FR26: A team member can run the full application locally using a single documented stack definition and steps.
FR27: A team member can load or reset sample organisations using a documented command or process so demos and learning do not depend on manual entry.
FR28: Documentation enables a second team member to run the stack and perform basic smoke checks without undocumented steps.
FR29: A staff member receives clear, actionable feedback when input fails validation or when a requested organisation cannot be found.
FR30: A staff member can optionally enter free-text notes on an organisation.
FR31: A staff member can optionally record venue capacity when known.

### NonFunctional Requirements

P1: For expected catalogue sizes (hundreds to low thousands of organisations), routine list interactions (apply filters, change page, run text search, open detail) complete fast enough that a typical staff member does not perceive avoidable lag during normal work.
P2: Opening the comparison view for a small number of selected organisations does not introduce noticeable multi-second waits attributable to avoidable round trips or unbounded data loading.
P3: Organisation list retrieval supports segmented retrieval appropriate to the dataset so the client is not required to download the entire catalogue to render or filter.
S1: Secrets and environment-specific configuration are not committed to source control; only documented placeholders appear in example env files.
S2: The MVP assumes internal/trusted-network deployment consistent with no production-grade authentication; documentation states the threat model.
S3: Because free-text notes may accidentally contain personal data, the product and documentation encourage minimal necessary content aligned with organisational data-handling expectations.
SC1: The system is designed for small concurrent staff usage (internal tool), not public-scale traffic spikes.
SC2: Architecture and indexing assumptions support at least hundreds to low thousands of organisation rows without requiring a redesign of core list/filter behaviour.
A1: Primary flows support keyboard operation at a basic level, visible focus, and readable contrast for long sessions on desktop browsers.
A2: A full WCAG 2.x formal audit as a release gate is out of scope for MVP unless DMCF explicitly requires it.

### Additional Requirements

- **Project scaffold (Architecture — First Story):** Each layer initialised independently: frontend via `npm create vite@latest frontend -- --template react`; backend via `npm init -y` + Express + Prisma v6. Project initialisation is the first implementation story.
- **Tailwind CSS v3:** Pin to `tailwindcss@3` (not v4); `tailwind.config.js` syntax. Install via `npm install -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p`.
- **shadcn/ui JavaScript copy-paste setup:** Install base utilities (`radix-ui class-variance-authority clsx tailwind-merge lucide-react`); copy components manually into `frontend/src/components/ui/` — do NOT use the `npx shadcn@latest add` CLI.
- **React Router v6:** Install `react-router-dom@6` (not `react-router@6`); all imports from `react-router-dom`.
- **TanStack Query v5:** `QueryClientProvider` at app root (`main.jsx`); `SelectionProvider` wrapping route tree in `App.jsx`.
- **CORS middleware:** `cors` npm package on Express (`cors` v2.8.6); `CORS_ORIGIN` env var; `VITE_API_BASE_URL` in frontend `.env`.
- **Prisma schema foundation:** `CapabilityState` enum (`YES`/`NO`/`UNKNOWN`); `organisation.last_updated` with `@default(now()) @updatedAt` (ADR-011 — no Prisma `$use`); `source_reference` field; lookup tables `ticketing_provider`, `crm_platform`, `organisation_type`; UUID `id` and timestamps per table (`organisation`: `last_updated` + `created_at`; lookups: `created_at` + `updated_at`).
- **Freshness rule:** `last_updated` is never accepted from request bodies; Prisma maintains it via `@updatedAt` on the `organisation` model.
- **`pg_trgm` extension migration:** `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in initial migration; GIN index on `name` and `city`; `ILIKE '%term%'` search on name, city, notes.
- **Seed script:** `backend/src/prisma/seed.js` seeds ticketing providers, CRM platforms, organisation types, sample organisations, and drives the country list. Runs automatically on `prisma migrate dev` and `prisma migrate reset`.
- **Country list:** Static exported constant `COUNTRIES` in `frontend/src/lib/countries.js`; no `/api/meta/countries` endpoint; application-layer validation on backend. Both files must be updated together if the list changes — document in `docs/decisions.md`.
- **Meta API endpoints:** `GET /api/meta/ticketing-providers`, `GET /api/meta/crm-platforms`, `GET /api/meta/organisation-types` — served from `meta-controller.js`; direct Prisma queries, no service layer.
- **API response envelope:** `{ data, error, meta }` on every endpoint without exception; `meta: null` on non-list endpoints; `fields: []` on non-validation errors; never raw stack traces.
- **Manual controller validation:** No external validation library; controller validates request body, returns `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field, message }] }, meta: null }`.
- **Offset pagination:** `page` + `limit` query params; response `meta: { page, limit, total, totalPages }`.
- **Docker Compose:** Three services (`db`, `backend`, `frontend`); `DATABASE_URL`, `CORS_ORIGIN`, `PORT` in backend `.env`; `VITE_API_BASE_URL` in frontend `.env`; DB not exposed on host; `.env.example` files for both layers.
- **Security posture documentation:** README must explicitly state threat model (no auth, internal trusted-network only, risk of public mis-deployment).
- **`docs/decisions.md`:** All meaningful architectural decisions must be recorded here with rationale.
- **No testing framework for MVP:** Vitest is the preferred addition post-MVP for both layers.

### UX Design Requirements

UX-DR1: Implement horizontal filter bar above results table with reactive filtering (no "Apply" button) — results narrow on each filter selection using URL query params via `useSearchParams`.
UX-DR2: Implement `ActiveFilterChips` component — horizontal strip of removable chips per applied filter (`[Dimension]: [Value]` + dismiss button), result count, and "Clear all" link; `role="status"` for live region announcements; chip style: `bg-blue-50 border border-blue-300 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full`.
UX-DR3: Implement `CapabilityBadge` component with three visually distinct states: Yes (`emerald-600` + CheckIcon, `aria-label="Yes"`), No (`slate-500` + XIcon, `aria-label="No"`), Unknown (`slate-300` + MinusIcon, `aria-label="Not recorded"`); compact (icon-only) and labelled (icon + text) variants; never blank.
UX-DR4: Implement `CompareSelectionBar` sticky bar at viewport bottom — activates at ≥1 checked row, shows selection count, `CompareSelected (N) →` primary action; disabled with tooltip "Select up to 4 organisations to compare" at 5+; `role="region"` with `aria-label="Compare selection"`.
UX-DR5: Implement `OrganisationCard` component for compare page — sticky card header (name, type badge, country); all attribute rows with explicit values (never blank); `CapabilityBadge` per capability; provenance footer (source reference + last updated); Edit and Remove from comparison links.
UX-DR6: Implement delete confirmation `Dialog` (shadcn/ui) — organisation name in bold, "This cannot be undone." warning, red `bg-red-600` "Delete organisation" button, "Cancel" secondary button; triggered from detail view only; Escape/overlay click dismisses without action (Radix default).
UX-DR7: Implement GOV.UK-pattern form validation — error summary at page top on submit failure with heading "There is a problem." and links to each offending field; inline error per field below input (`text-sm text-red-600` + `border-red-500`); messages are specific ("Enter the organisation name", not "Required").
UX-DR8: Implement empty state messages with recovery actions for: no filter results ("No organisations match these filters. Try removing a filter or clearing all." + "Clear all filters" link), no search results, empty catalogue ("No organisations yet. Add the first one to get started." + "Add organisation" button), compare with no selection.
UX-DR9: Implement skeleton row loading states (slate-100 shimmer) in table body during initial data fetch (`isLoading` only — not `isFetching`); primary button shows loading indicator and is `disabled` during form submission; never a full-page spinner.
UX-DR10: Implement inline success banner after create/update and after delete — `bg-emerald-50 border border-emerald-200 text-emerald-800`; "Organisation saved." or "Organisation deleted."; auto-dismisses after 5 seconds; manually dismissable.
UX-DR11: Implement top navigation bar (`bg-slate-800`) with app name and "Organisations" nav link; all sub-pages include `← Back to organisations` back link (`text-sm text-blue-600`); white page header with page title left and primary action button right.
UX-DR12: Implement colour-coded `Badge` tags for ticketing provider, CRM platform, and organisation type in list table and compare cards — muted, functional Tailwind token palette, legible at table density.
UX-DR13: Implement filter state persistence in URL query params (e.g. `?country=UK&provider=Tessitura`) so browser back restores the filtered list; filter state must survive list → detail → back navigation without reset.
UX-DR14: Implement debounced text search (~300ms) with placeholder "Search organisations…" across name, city, notes, and provider name; results update reactively; search field always visible without clearing filters.
UX-DR15: Implement compare page at `/compare?ids=...` with stable shareable URL — fixed attribute label column on left, one `OrganisationCard` per selected organisation, sticky card headers; data via `Promise.all` parallel `GET /api/organisations/:id` fetches.
UX-DR16: Implement consistent button hierarchy — at most one primary per page section; primary `bg-blue-600 text-white hover:bg-blue-700`, secondary `border border-slate-300 text-slate-700 hover:bg-slate-50`, ghost/destructive `text-red-600 hover:text-red-700`; labels as plain British English verbs.
UX-DR17: Implement GOV.UK-pattern form field anatomy throughout — label above (`text-sm font-medium text-slate-700`), optional hint text below label (`text-sm text-slate-500`), full-width input, inline error below on failure; optional fields append "(optional)" in muted text; no asterisks.
UX-DR18: Apply three-state capability rendering consistently across list table, detail view, and compare cards — `CapabilityBadge` used everywhere; never text alone at table density; visible legend on first encounter.
UX-DR19: Apply Tailwind slate colour system throughout — `slate-50` app background, `white` surfaces/cards, `slate-800` primary text + top nav, `slate-500` metadata/muted, `blue-600` interactive accent, `ring-2 ring-blue-500 ring-offset-2` focus ring on all interactive elements.
UX-DR20: Implement responsive table wrapper with `overflow-x-auto` for tablet/narrow desktop; filter bar uses `flex flex-wrap gap-3` for natural wrapping; `max-w-7xl mx-auto` container on all page content; `min-w-[Xpx]` on table columns to enforce readable minimums before scroll.

### FR Coverage Map

```
FR1:  Epic 2 — Create organisation record
FR2:  Epic 2 — View organisation detail
FR3:  Epic 2 — Update organisation record
FR4:  Epic 2 — Delete with confirmation
FR5:  Epic 2 — Tabular list view (basic; filters added in Epic 3)
FR6:  Epic 3 — Text search across designated fields
FR7:  Epic 2 — Navigation between list/detail/create/edit flows
FR8:  Epic 3 — Filter by country
FR9:  Epic 3 — Filter by organisation type
FR10: Epic 3 — Filter by ticketing provider
FR11: Epic 3 — Filter by CRM platform
FR12: Epic 3 — Filter by capability attributes
FR13: Epic 3 — Apply multiple filters simultaneously
FR14: Epic 4 — Select organisations for comparison
FR15: Epic 4 — Open side-by-side comparison view
FR16: Epic 4 — Compare aligned attributes in readable layout
FR17: Epic 2 — View source reference
FR18: Epic 2 — Create/edit source reference
FR19: Epic 2 — View last updated time
FR20: Epic 2 — Automatic last_updated maintenance via Prisma `@updatedAt` (ADR-011)
FR21: Epic 2 — Choose ticketing provider from controlled set
FR22: Epic 2 — Choose CRM platform from controlled set
FR23: Epic 2 — Choose organisation type from controlled set
FR24: Epic 2 — Set three-state capability attributes
FR25: Epic 3 — Server-backed segmented list retrieval (pagination)
FR26: Epic 1 — Run full application locally from documented steps
FR27: Epic 5 — Load/reset sample organisations via seed command
FR28: Epic 5 — README enables second team member to smoke-test stack
FR29: Epic 2 — Clear validation feedback and 404 handling
FR30: Epic 2 — Optional free-text notes
FR31: Epic 2 — Optional venue capacity field
```

## Epic List

### Epic 1: Project Foundation — Runnable Local Stack
Staff and team members can clone the repository, run one command, and have the full application stack running locally — backend, frontend, and database — with all reference lookup data seeded (ticketing providers, CRM platforms, organisation types, country list) so that subsequent development and testing can begin immediately.
**FRs covered:** FR26
**Includes:** Vite + React scaffold, Express + Prisma v6 backend, Docker Compose (3 services), `.env` / `.env.example` for both layers, CORS middleware, React Router v6 routes skeleton, TanStack Query `QueryClientProvider`, `SelectionContext`, Tailwind CSS v3, shadcn/ui base utilities, Prisma schema (full data model + `CapabilityState` enum + `@updatedAt` on `organisation.last_updated` per ADR-011 + `pg_trgm` extension migration), seed script seeding all reference data (providers, CRMs, types, countries), health endpoint, README skeleton with setup steps, `docs/decisions.md` stub.

---

## Epic 2: Organisation Catalogue — Full CRUD with Provenance
Staff can create, view, update, and delete organisation records with all field data — reference lookups (provider, CRM, type), three-state capability attributes, source references, automatic last-updated timestamps, optional notes and capacity — with clear validation feedback and predictable navigation between list, detail, create, and edit flows.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR7, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR29, FR30, FR31

### Epic 3: Discovery & Filtering
Staff can search by text and apply multiple filters (country, provider, type, CRM, capability states) to narrow the catalogue to exactly the slice they need — with results updating reactively, active filters always visible as removable chips, and server-backed pagination keeping the dataset navigable.
**FRs covered:** FR6, FR8, FR9, FR10, FR11, FR12, FR13, FR25
*(FR7 navigation for filter → list flow also reinforced here)*

### Epic 4: Side-by-Side Comparison
Staff can select organisations from the filtered list and compare their full attribute sets in an aligned, side-by-side view — with capability states, source references, and last-updated dates visible per organisation, on a stable shareable URL.
**FRs covered:** FR14, FR15, FR16

### Epic 5: Seed Data & Demo Readiness
The application is fully demonstrable end-to-end with curated, credible sample organisation records. A second team member can clone, run, and smoke-test the full stack from the README alone, without prior knowledge or undocumented steps.
**FRs covered:** FR27, FR28

---

## Epic 1: Project Foundation — Runnable Local Stack

Staff and team members can clone the repository, run one command, and have the full application stack running locally — backend, frontend, and database — with all reference lookup data seeded (ticketing providers, CRM platforms, organisation types, country list) so that subsequent development and testing can begin immediately.

**FRs covered:** FR26

### Story 1.1: Backend Scaffold, Data Model, and Reference Data Seed

As a team member,
I want the backend application initialised with the full data model, Docker database and backend services, and seeded reference data,
So that the API server starts in Docker with a working health endpoint and all lookup tables populated.

**Acceptance Criteria:**

**Given** the repository is cloned and `backend/.env` is created from `backend/.env.example`
**When** `docker compose up` is run
**Then** the `db` and `backend` services start without errors — no frontend service is defined yet in `docker-compose.yml` at this point
**And** `GET /api/health` returns HTTP 200 with `{ "data": { "status": "ok" }, "error": null, "meta": null }`

**Given** migrations complete and the seed script runs
**When** `GET /api/meta/ticketing-providers` is called
**Then** it returns `{ data: [...], error: null, meta: null }` with at least 8 seeded ticketing providers including Tessitura, Spektrix, Ticketmaster, PatronBase, Eventbrite, AudienceView, TicketSolve, and Universe

**Given** migrations complete and the seed script runs
**When** `GET /api/meta/crm-platforms` and `GET /api/meta/organisation-types` are called
**Then** each returns `{ data: [...], error: null, meta: null }` with at least 5 CRM platforms (including Salesforce, HubSpot, Spektrix, Tessitura CRM, Donorfy) and at least 4 organisation types (including Venue, Festival, Promoter, Cultural Organisation) respectively

**Given** the Prisma schema is applied
**When** the `organisation` table structure is inspected
**Then** it contains: `id` (UUID PK), `name` (required string), `country` (required string), `organisation_type_id` (FK to `organisation_type`), `ticketing_provider_id` (nullable FK to `ticketing_provider`), `crm_platform_id` (nullable FK to `crm_platform`), `membership_capability` (`CapabilityState` default `UNKNOWN`), `donation_capability` (`CapabilityState` default `UNKNOWN`), `reserved_seating_capability` (`CapabilityState` default `UNKNOWN`), `source_reference` (nullable string), `notes` (nullable text), `capacity` (nullable integer), `last_updated` (timestamp, `@default(now()) @updatedAt`), `created_at` (timestamp) — **no** separate `updated_at` on `organisation` (ADR-011)
**And** the `CapabilityState` enum is defined with values `YES`, `NO`, `UNKNOWN`
**And** the `pg_trgm` extension is enabled via an initial migration

**Given** an update operation is executed on the `organisation` model via the Prisma client
**When** the schema maps `last_updated` with `@updatedAt` (ADR-011)
**Then** `last_updated` advances to the current timestamp automatically without `last_updated` being present in the calling code's data payload

**Given** the `backend/.env.example` file
**When** it is inspected
**Then** it documents `DATABASE_URL`, `CORS_ORIGIN`, and `PORT` with placeholder values only — no real credentials are committed to source control

### Story 1.2: Frontend Scaffold and Application Shell

As a team member,
I want the frontend application initialised with routing, data-fetching infrastructure, and the application shell — and the frontend Docker service added to complete the three-service stack,
So that the browser shows a working navigation structure connected to the backend API.

**Acceptance Criteria:**

**Given** the frontend service is added to `docker-compose.yml` and `frontend/.env` is created from `frontend/.env.example`
**When** `docker compose up` is run
**Then** all three services (`db`, `backend`, `frontend`) start without errors
**And** `http://localhost:5173` is accessible in a supported browser

**Given** the frontend is running
**When** `http://localhost:5173` is accessed
**Then** the page loads showing a dark (`bg-slate-800`) top navigation bar with the app name and an "Organisations" nav link
**And** the page background is `slate-50` with a `max-w-7xl mx-auto` content container
**And** navigating to `/organisations`, `/organisations/new`, `/organisations/:id`, `/organisations/:id/edit`, and `/compare` each renders a page (placeholder content is acceptable) without a JavaScript console error

**Given** the application root is mounted
**When** the component tree is inspected
**Then** `QueryClientProvider` (TanStack Query v5) wraps the application at `main.jsx`
**And** `SelectionProvider` (from `context/SelectionContext.jsx`) wraps the route tree in `App.jsx`, exporting `selectedIds`, `toggleSelection`, and `clearSelection` via `useSelection`
**And** React Router v6 (`react-router-dom@6`) provides all routing — no `window.location` manipulation

**Given** the Tailwind and shadcn/ui base setup
**When** the frontend builds without errors
**Then** Tailwind CSS v3 is configured with a `tailwind.config.js` (not v4 CSS-based config)
**And** `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` are installed as production dependencies
**And** the `Button` shadcn/ui component is present in `frontend/src/components/ui/button.jsx` and renders with correct Tailwind styling

**Given** the `frontend/.env.example` file
**When** it is inspected
**Then** `VITE_API_BASE_URL` is documented with a placeholder value and no real secrets are committed

**Given** any interactive element on any page
**When** it receives keyboard focus
**Then** the focus indicator `ring-2 ring-blue-500 ring-offset-2` is visibly rendered

### Story 1.3: README and Project Documentation

As a team member,
I want complete setup documentation covering every step from clone to smoke test,
So that a second team member can get the full stack running without prior knowledge or undocumented steps.

**Acceptance Criteria:**

**Given** a machine with Docker, Node.js, and Git installed
**When** following the README from start to finish without outside help
**Then** the reader can: clone the repo, create `.env` files for both layers from `.env.example`, run `docker compose up`, and confirm the stack is running — all without consulting anyone
**And** the README documents all service ports (backend: 3001, frontend: 5173)
**And** the README includes a smoke-test checklist (e.g. health endpoint returns OK, meta endpoints return reference data, frontend loads at port 5173)
**And** the README includes an explicit threat model note: the application has no authentication and must not be exposed to the public internet

**Given** the `docs/decisions.md` file
**When** it is opened
**Then** it records the following decisions with brief rationale: Prisma v6 (not v7) choice, Tailwind CSS v3 (not v4) pin, shadcn/ui copy-paste approach (not CLI), React Router v6 package name (`react-router-dom@6`), country list dual-maintenance rule (frontend constant + seed script must be updated together)

**Given** the `.gitignore` at the repository root
**When** it is inspected
**Then** `.env` files, `node_modules/` directories, and Prisma-generated client output are excluded from source control

---

## Epic 2: Organisation Catalogue — Full CRUD with Provenance

Staff can create, view, update, and delete organisation records with all field data — reference lookups (provider, CRM, type), three-state capability attributes, source references, automatic last-updated timestamps, optional notes and capacity — with clear validation feedback and predictable navigation between list, detail, create, and edit flows.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR7, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR29, FR30, FR31

### Story 2.1: Organisation List Page

As a staff member,
I want to see a paginated table of all organisations with key fields visible at a glance,
So that I have a home base for browsing and navigating the catalogue.

**Acceptance Criteria:**

**Given** the application is running and `GET /api/organisations` is implemented
**When** a staff member navigates to `/organisations`
**Then** a paginated table renders with columns: Name, Type, Country, Ticketing Provider, CRM Platform, Membership, Donation, Reserved Seating, Last Updated
**And** Type, Ticketing Provider, and CRM Platform values are rendered as colour-coded `Badge` components
**And** Membership, Donation, and Reserved Seating are rendered using the `CapabilityBadge` component in compact (icon-only) variant — `CapabilityBadge` is first built in this story with its compact variant
**And** a subtle inline legend is visible near the capability columns (e.g. below the column headers or as a small key) explaining the three states: ✓ = Yes, ✕ = No, – = Not recorded — this satisfies the UX-DR18 requirement for a visible legend on first encounter with the three-state model
**And** an "Add organisation" primary button (`bg-blue-600`) is visible in the page header

**Given** the organisation list endpoint
**When** `GET /api/organisations?page=1&limit=20` is called
**Then** it returns `{ data: [...organisations], error: null, meta: { page: 1, limit: 20, total: N, totalPages: N } }`
**And** the response uses camelCase field names (e.g. `ticketingProvider`, `lastUpdated`, `createdAt`)

**Given** the list table
**When** it renders on any viewport
**Then** the table wrapper has `overflow-x-auto` so the table scrolls horizontally on narrow screens rather than breaking layout
**And** each table column has a `min-w-[Xpx]` value sufficient to remain readable before horizontal scroll activates (e.g. Name `min-w-[200px]`, Provider `min-w-[140px]`, capability columns `min-w-[80px]`)

**Given** the list is loading
**When** data has not yet returned from the API
**Then** skeleton rows (slate-100 shimmer) render in the table body with the same column count as the loaded table — no full-page spinner

**Given** the catalogue contains no organisations
**When** the list page renders
**Then** an empty state message reads "No organisations yet. Add the first one to get started." with an "Add organisation" button

**Given** the list contains more than 20 organisations
**When** the page renders
**Then** pagination controls appear below the table with page buttons
**And** the result count is displayed (e.g. "Showing 1–20 of 47 organisations")

**Given** a staff member clicks on an organisation row
**When** the click is registered
**Then** they navigate to `/organisations/:id`

### Story 2.2: Create Organisation

As a staff member,
I want to create a new organisation record with all required and optional fields,
So that I can add a new entry to the catalogue with full provenance.

**Acceptance Criteria:**

**Given** a staff member clicks "Add organisation" from the list page
**When** the create form at `/organisations/new` loads
**Then** the form renders with the following fields: Name (required), Country (required, dropdown from `COUNTRIES` constant), Organisation Type (required, dropdown from `GET /api/meta/organisation-types`), Ticketing Provider (optional, dropdown from `GET /api/meta/ticketing-providers`), CRM Platform (optional, dropdown from `GET /api/meta/crm-platforms`), Membership Capability (required, three-state: Unknown/Yes/No), Donation Capability (required, three-state: Unknown/Yes/No), Reserved Seating Capability (required, three-state: Unknown/Yes/No), Source Reference (optional), Notes (optional, textarea), Capacity (optional, number)
**And** each required field has a label above with no asterisk — optional fields append "(optional)" in muted `text-slate-500` text per GOV.UK pattern
**And** a `← Back to organisations` link (`text-sm text-blue-600`) appears at the top of the page

**Given** a staff member clicks the "Save" primary submit button
**When** the form submission is in progress (API call pending)
**Then** the "Save" button displays a loading indicator and is `disabled` — preventing double submission
**And** the button returns to its normal enabled state once the API responds (success or error)

**Given** a staff member submits the form with all required fields valid
**When** `POST /api/organisations` is called
**Then** the server creates the record and returns `{ data: { ...organisation }, error: null, meta: null }` with HTTP 201
**And** `last_updated` and `created_at` are set automatically — neither is accepted from the request body
**And** `membership_capability`, `donation_capability`, and `reserved_seating_capability` default to `"UNKNOWN"` if not explicitly set

**Given** a successful create
**When** the response is received
**Then** the staff member is navigated to the detail page for the new organisation at `/organisations/:id`
**And** an inline success banner "Organisation saved." appears at the top (`bg-emerald-50 border border-emerald-200 text-emerald-800`) and auto-dismisses after 5 seconds
**And** the banner has a visible dismiss button (`×`) that removes it immediately when clicked — this manual dismiss pattern applies to all success banners across Stories 2.2, 2.4, and 2.5

**Given** a staff member submits the form with one or more required fields missing or invalid
**When** client-side validation fires on submit
**Then** an error summary appears at the top of the form with heading "There is a problem." listing each invalid field as a link that focuses the offending input
**And** each offending field shows an inline error message below it with a red border (`border-red-500`) — message is specific (e.g. "Enter the organisation name", "Select a country")
**And** the API is not called until client-side validation passes

**Given** the server returns a `400` validation error
**When** the API response is received
**Then** the field-level errors from `error.fields` are mapped to the form, the error summary is displayed, and the submit button is re-enabled

### Story 2.3: Organisation Detail Page

As a staff member,
I want to view the full details of a single organisation including its source reference and last updated date,
So that I can read the record and assess its provenance before acting on it.

**Acceptance Criteria:**

**Given** a staff member navigates to `/organisations/:id`
**When** the detail page loads
**Then** all organisation fields are displayed: Name, Country, Type, Ticketing Provider, CRM Platform, Membership Capability, Donation Capability, Reserved Seating Capability, Source Reference, Notes (if present), Capacity (if present), Last Updated, Created At
**And** each capability is rendered using the `CapabilityBadge` component in its labelled variant (icon + text) — the labelled variant is first built in this story
**And** Source Reference and Last Updated are displayed prominently — not buried at the bottom
**And** a `← Back to organisations` link (`text-sm text-blue-600`) appears at the top of the page

**Given** the detail page is loading
**When** data has not yet returned from `GET /api/organisations/:id`
**Then** a skeleton matching the detail layout renders — no full-page spinner

**Given** `GET /api/organisations/:id` is called
**When** the organisation exists
**Then** the API returns `{ data: { ...organisation }, error: null, meta: null }` with camelCase field names and ISO 8601 timestamps

**Given** a staff member navigates to `/organisations/:id` for a non-existent ID
**When** the API returns `404`
**Then** the page renders a clear "Organisation not found" message with a link back to `/organisations` — not a blank page

**Given** the detail page
**When** a staff member clicks the "Edit" button in the page header
**Then** they navigate to `/organisations/:id/edit`

### Story 2.4: Edit Organisation

As a staff member,
I want to update an existing organisation record,
So that I can correct stale or inaccurate data and update the source reference.

**Acceptance Criteria:**

**Given** a staff member navigates to `/organisations/:id/edit`
**When** the edit form loads
**Then** the form pre-fills with all existing field values for that organisation
**And** a `← Back to organisations detail` link (`text-sm text-blue-600`) navigates back to `/organisations/:id` — not to the list — since the user arrived from the detail page
**And** `OrganisationFormPage` handles both create (`/organisations/new`) and edit (`/organisations/:id/edit`) modes — determined by the presence of `:id` in the route params

**Given** a staff member clicks the "Save" primary submit button
**When** the form submission is in progress (API call pending)
**Then** the "Save" button displays a loading indicator and is `disabled` — preventing double submission
**And** the button returns to its normal enabled state once the API responds (success or error)

**Given** a staff member changes one or more fields and submits
**When** `PUT /api/organisations/:id` is called
**Then** the server updates the record and returns `{ data: { ...organisation }, error: null, meta: null }` with HTTP 200
**And** `last_updated` is automatically set to the current timestamp by Prisma `@updatedAt` — not accepted from the request body

**Given** a successful update
**When** the response is received
**Then** the staff member is navigated to the detail page at `/organisations/:id`
**And** an inline success banner "Organisation saved." appears and auto-dismisses after 5 seconds

**Given** the edit form is submitted with invalid data
**When** client-side or server-side validation fails
**Then** the same GOV.UK error pattern applies as in Story 2.2 — error summary at top, inline errors per field, specific messages

**Given** a `PUT` request is sent with `last_updated` in the request body
**When** the controller processes the request
**Then** the `last_updated` value from the request body is ignored — the server-maintained `@updatedAt` value always wins

### Story 2.5: Delete Organisation

As a staff member,
I want to delete an organisation record after explicitly confirming the action,
So that accidental deletions cannot happen and the catalogue remains trustworthy.

**Acceptance Criteria:**

**Given** a staff member is on the detail page at `/organisations/:id`
**When** they click the "Delete organisation" ghost/destructive button
**Then** a confirmation `Dialog` opens (shadcn/ui `Dialog`) showing the organisation name in bold and the text "This cannot be undone."
**And** the dialog contains a red "Delete organisation" button (`bg-red-600`) and a "Cancel" secondary button
**And** the dialog is triggered from the detail page only — not from the list table

**Given** the confirmation dialog is open
**When** a staff member clicks "Cancel" or presses Escape or clicks the overlay
**Then** the dialog closes without any deletion occurring
**And** focus returns to the trigger button on the detail page

**Given** a staff member confirms deletion by clicking "Delete organisation"
**When** `DELETE /api/organisations/:id` is called
**Then** the server deletes the record and returns `{ data: { id }, error: null, meta: null }` with HTTP 200
**And** the staff member is navigated to `/organisations`
**And** an inline success banner "Organisation deleted." appears at the top of the list page and auto-dismisses after 5 seconds

**Given** `DELETE /api/organisations/:id` is called for a non-existent ID
**When** the API processes the request
**Then** it returns HTTP 404 with `{ data: null, error: { message: "Organisation not found", fields: [] }, meta: null }`

---

## Epic 3: Discovery & Filtering

Staff can search by text and apply multiple filters (country, provider, type, CRM, capability states) to narrow the catalogue to exactly the slice they need — with results updating reactively, active filters always visible as removable chips, and server-backed pagination keeping the dataset navigable.

**FRs covered:** FR6, FR8, FR9, FR10, FR11, FR12, FR13, FR25

### Story 3.1: Text Search

As a staff member,
I want to search for organisations by name, city, notes, or ticketing provider name,
So that I can quickly locate a specific organisation without scrolling through the full catalogue.

**Acceptance Criteria:**

**Given** a staff member is on `/organisations`
**When** the page loads
**Then** a search input with placeholder "Search organisations…" is visible above the results table at all times — it does not disappear when filters are applied

**Given** a staff member types a search term into the search input
**When** the input value changes
**Then** the query is debounced (~300ms) before being sent to the API — no request fires on every keystroke
**And** `GET /api/organisations?q=<term>&page=1&limit=20` is called with the search term as the `q` param
**And** results update reactively without a page reload or "Search" button

**Given** `GET /api/organisations?q=<term>` is called on the backend
**When** the service executes the query
**Then** it searches across `name`, `city`, and `notes` columns on the `organisation` table, plus the `name` column on the joined `ticketing_provider` table — provider name search requires a JOIN on `ticketing_provider`; all four fields use `ILIKE '%term%'` with the `pg_trgm` GIN index
**And** results are filtered server-side — the full catalogue is never sent to the client

**Given** a search term returns no matching organisations
**When** the results table renders
**Then** the empty state message reads "No organisations found for '[term]'. Try a shorter search or check the spelling." with a clear search action

**Given** a staff member clears the search input
**When** the input is emptied
**Then** the full paginated list is restored — results are not stuck on the previous search

### Story 3.2: Filter Bar and Active Filter Chips

As a staff member,
I want to see filter controls above the results table and have my applied filters shown as removable chips,
So that I always know which filters are active and can remove individual ones without reopening a panel.

**Note:** This story builds the filter bar UI and manages filter state in URL params. Selecting a filter writes the value to the URL via `useSearchParams` and renders the corresponding chip, but the `useOrganisations` hook does not yet pass filter params to the API — the list continues to show unfiltered results until Story 3.3 wires the URL params to the API call.

**Acceptance Criteria:**

**Given** a staff member is on `/organisations`
**When** the page loads
**Then** a horizontal filter bar renders above the table with dropdowns in order: Country, Provider, Type, CRM, Membership, Donation, Reserved Seating
**And** each dropdown defaults to an "All [dimension]s" unset state
**And** the filter bar uses `flex flex-wrap gap-3` so dropdowns wrap naturally on narrow viewports rather than overflowing

**Given** a staff member selects a value from any filter dropdown
**When** the selection is made
**Then** the corresponding URL query param is written immediately via `useSearchParams` (e.g. selecting "United Kingdom" for Country sets `?country=United+Kingdom`)
**And** an `ActiveFilterChips` strip appears below the filter bar showing a chip for each applied filter in the format `[Dimension]: [Value]`
**And** each chip has a dismiss `×` button with `aria-label="Remove [dimension] filter"`
**And** a "Clear all" link appears on the right of the chips strip when at least one filter is active
**And** the strip has `role="status"` so screen readers announce filter changes

**Given** the `ActiveFilterChips` strip is visible
**When** a staff member clicks a chip's dismiss button
**Then** the corresponding URL query param is removed via `setSearchParams` — no page reload required
**And** the chip disappears from the strip

**Given** the "Clear all" link is clicked
**When** the action fires
**Then** all filter query params are cleared from the URL via `setSearchParams({})`

**Given** no filters are active
**When** the `ActiveFilterChips` strip is inspected
**Then** the strip is hidden or renders as empty — it does not show a blank row

### Story 3.3: Multi-Filter API Integration and URL State

As a staff member,
I want my applied filters and search to actually narrow the results list, persist across navigation, and reset pagination on change,
So that my filtered view is trustworthy, shareable, and predictable.

**Acceptance Criteria:**

**Given** the filter bar and search input from Stories 3.1 and 3.2 are in place
**When** `useOrganisations` is updated to read all filter and search params from `useSearchParams`
**Then** the TanStack Query key becomes `['organisations', { page, q, country, provider, type, crm, membership, donation, seating }]` — each unique filter combination has its own cache entry
**And** `GET /api/organisations` is called with all active URL params passed as query string arguments

**Given** filter params are present in the URL
**When** `GET /api/organisations` is called on the backend
**Then** all provided filter params are applied as server-side `WHERE` clauses in a single Prisma query — `q`, `page`, `limit`, `country`, `provider`, `type`, `crm`, `membership`, `donation`, and `seating` are all parsed and applied simultaneously (FR13)

**Given** any filter dropdown value changes or the search input changes
**When** the new value is applied to the URL params
**Then** `page` resets to `1` — the user is always returned to the first page of results when the filter set changes

**Given** a staff member has active filters and navigates to a detail page
**When** they press browser back
**Then** they return to `/organisations` with all previously applied filters intact — the URL restores the full filter and search state

**Given** a search term and one or more filter dropdowns are both active simultaneously
**When** `GET /api/organisations?q=royal&country=United+Kingdom` is called
**Then** results match both the search term and all filter conditions — combined with `AND` logic server-side

**Given** capability filter params (`membership`, `donation`, `seating`) are set
**When** the backend processes them
**Then** values are matched against the `CapabilityState` enum as uppercase strings: `YES`, `NO`, or `UNKNOWN`

**Given** a filter combination returns no organisations
**When** the results table renders
**Then** the empty state message reads "No organisations match these filters. Try removing a filter or clearing all." with a "Clear all filters" link that clears all URL filter params

---

## Epic 4: Side-by-Side Comparison

Staff can select organisations from the filtered list and compare their full attribute sets in an aligned, side-by-side view — with capability states, source references, and last-updated dates visible per organisation, on a stable shareable URL.

**FRs covered:** FR14, FR15, FR16

### Story 4.1: Compare Selection Bar

As a staff member,
I want to select organisations from the list and see a persistent bar that lets me open the comparison view,
So that I can build a comparison set naturally while scanning results.

**Acceptance Criteria:**

**Given** a staff member is on the organisation list page
**When** the page renders
**Then** each table row has a checkbox at the far left column
**And** the `CompareSelectionBar` is hidden when no rows are checked

**Given** a staff member checks one or more row checkboxes
**When** `toggleSelection(id)` is called on `SelectionContext`
**Then** the `CompareSelectionBar` appears as a sticky bar at the bottom of the viewport (`bg-slate-800`)
**And** it displays the count of selected organisations and a "Compare selected (N) →" primary button
**And** `role="region"` and `aria-label="Compare selection"` are present on the bar

**Given** a staff member has selected organisations and navigates to a detail page and back
**When** they return to the list
**Then** their selection is preserved — `SelectionContext` persists across route transitions within the SPA

**Given** 5 or more organisations are selected
**When** the `CompareSelectionBar` renders
**Then** the "Compare selected" button is `aria-disabled` with a tooltip "Select up to 4 organisations to compare" — the button does not navigate

**Given** a staff member clicks "Compare selected (N) →" with 1–4 organisations selected
**When** the button is clicked
**Then** the app navigates to `/compare?ids=<id1>,<id2>,...` — IDs are comma-separated in the URL query param
**And** `clearSelection()` is NOT called on navigation to the compare page — selection is preserved so that pressing browser back returns to a list with the original checkboxes still ticked
**And** ⚠️ **Architecture override note:** the architecture document states selection is "cleared on compare or explicit clear"; this story consciously overrides that to preserve back-navigation UX. Record the decision and rationale in `docs/decisions.md`.

**Given** a staff member clicks "Clear selection" in the `CompareSelectionBar`
**When** the action fires
**Then** `clearSelection()` is called, all checkboxes uncheck, and the bar hides

### Story 4.2: Compare Page

As a staff member,
I want to view selected organisations side by side with their attributes aligned in labelled rows,
So that I can compare their ticketing stacks, capabilities, and provenance at a glance.

**Acceptance Criteria:**

**Given** a staff member navigates to `/compare?ids=<id1>,<id2>,...`
**When** the compare page loads
**Then** the IDs are read from `useSearchParams` on the `/compare` route
**And** a parallel `Promise.all` fires one `GET /api/organisations/:id` request per ID — no batch endpoint; individual fetches reuse the existing single-org endpoint
**And** each fetch result is cached under `['organisations', id]` in TanStack Query

**Given** the parallel fetches are in progress
**When** data has not yet returned for one or more organisations
**Then** skeleton card placeholders matching the compare column layout render in place of each pending card — no full-page spinner
**And** the fixed attribute label column on the left renders immediately (labels are static, not fetched)

**Given** the fetches complete successfully
**When** the compare page renders
**Then** a fixed attribute label column renders on the left listing each attribute name; one `OrganisationCard` value column renders per organisation to the right of the labels
**And** each card has a sticky header showing the organisation's name, type badge, and country
**And** the attribute rows in order are: Country, Type, Ticketing Provider, CRM Platform, Membership Capability, Donation Capability, Reserved Seating Capability, Source Reference, Last Updated
**And** capability attributes use the `CapabilityBadge` component in its labelled variant (icon + text)

**Given** any attribute cell in a card
**When** the card renders
**Then** no cell is ever blank — a `CapabilityBadge` unknown state (`–` MinusIcon, `slate-300`, `aria-label="Not recorded"`) renders for unset capabilities, and "Not recorded" renders for absent optional text fields

**Given** one of the parallel `GET /api/organisations/:id` fetches returns `404`
**When** the compare page renders
**Then** the remaining valid organisation cards render normally
**And** a notice is shown in place of the missing card reading "This organisation could not be found" — not a full-page error
**And** the staff member can continue using the comparison with the remaining cards

**Given** the compare page on a viewport narrower than 1280px
**When** the page renders
**Then** the card columns scroll horizontally within a wrapper that has `overflow-x-auto`
**And** card headers remain sticky as the user scrolls vertically — they do not scroll off screen

**Given** the compare page
**When** a staff member clicks "Edit" on an `OrganisationCard`
**Then** they navigate to `/organisations/:id/edit` for that organisation

**Given** the compare page
**When** a staff member clicks "Remove" on an `OrganisationCard`
**Then** that organisation's ID is removed from the `ids` URL param via `setSearchParams` — the card disappears and the remaining cards reflow

**Given** the compare page has a stable URL
**When** the URL `/compare?ids=abc,def` is shared and opened in a new tab
**Then** the same two organisation cards render — the compare view is fully derived from the URL with no session state required

**Given** the compare page is opened with no `ids` param or an empty `ids` param
**When** the page renders
**Then** an empty state message reads "Select organisations from the list to compare them here." with a "Go to organisations" link

**Given** a staff member clicks browser back from the compare page
**When** they return to `/organisations`
**Then** their filter state is preserved in the URL and the list renders the previously filtered view

---

## Epic 5: Seed Data & Demo Readiness

The application is fully demonstrable end-to-end with curated, credible sample organisation records. A second team member can clone, run, and smoke-test the full stack from the README alone, without prior knowledge or undocumented steps.

**FRs covered:** FR27, FR28

### Story 5.1: Sample Organisation Seed Data

As a team member,
I want a set of curated sample organisation records loaded into the application,
So that demos, onboarding, and smoke tests do not depend on manual data entry.

**Acceptance Criteria:**

**Given** `npx prisma db seed` or `npx prisma migrate reset` is run
**When** the seed script completes
**Then** at least 15 sample organisation records exist in the database — a mix of venues, festivals, promoters, and cultural organisations across multiple countries
**And** each record has: a realistic name, a country from the seeded `COUNTRIES` list, an organisation type, at least one with a ticketing provider, at least one with a CRM platform, a variety of capability states (some `YES`, some `NO`, some `UNKNOWN`), and a plausible source reference (e.g. a URL or citation format)
**And** `last_updated` and `created_at` are set to realistic past dates — not all identical timestamps

**Given** the sample data is loaded
**When** a staff member applies the filter Country = "United Kingdom" and Provider = "Tessitura"
**Then** at least one organisation matches — the seed data is designed to make the primary filter → compare journey demonstrable without additional manual entry

**Given** the sample data is loaded
**When** a staff member selects 2–4 organisations and opens the compare page
**Then** the comparison renders meaningfully — the selected records have sufficient variation in their attributes (different providers, CRM platforms, capability states) to demonstrate the value of side-by-side comparison

**Given** the seed script is run a second time (reset scenario)
**When** `npx prisma migrate reset` completes
**Then** the database is reset to the same clean seeded state — the seed script is idempotent with respect to reference data and deterministic for sample organisations

### Story 5.2: README Completion and Demo Smoke Test

As a team member,
I want the README and docs to be complete for the fully-featured application,
So that the product can be handed off or demonstrated without the original author present.

**Note:** Story 1.3 established the README structure, setup steps, ports, and threat model. This story extends it with seed command documentation, full-feature smoke-test steps, known limitations, and a final `docs/decisions.md` completeness check.

**Acceptance Criteria:**

**Given** the README from Story 1.3 is in place
**When** this story is complete
**Then** the README additionally documents: the seed command (`npx prisma db seed`), the reset command (`npx prisma migrate reset`), and a note that both commands restore the sample organisation dataset

**Given** the README smoke-test section
**When** a team member follows it after running the seed
**Then** it confirms all of the following in sequence: the organisations list shows seeded records, at least one filter combination (e.g. Country + Provider) returns a non-empty result set, the compare page loads and renders cards for 2 selected organisations, and creating a new organisation saves successfully and redirects to the detail page

**Given** the README
**When** it is reviewed for completeness
**Then** it includes a known limitations section stating: no authentication (internal deployment only), desktop-optimised (no mobile layout for MVP), no CSV export (post-MVP), no external integrations

**Given** `docs/decisions.md`
**When** it is reviewed as a final completeness check
**Then** it contains all decisions recorded across all five epics — at minimum: Prisma v6 rationale, Tailwind v3 pin, shadcn/ui copy-paste approach, React Router v6 package name, country list dual-maintenance rule, and the Epic 4 `clearSelection()` override (preserve selection on compare navigation, rationale: back-navigation UX)

---

# v2 Delta — System Catalogue Pivot

**Source:** [prd-v2-delta.md](prd-v2-delta.md), [architecture-v2-delta.md](architecture-v2-delta.md), [ux-design-specification.md](ux-design-specification.md) §§D1–D11.

**Scope:** This v2 block *appends* five epics (Epic 6–10) to the v1 plan above. The v1 epics and their stories remain authoritative for what has already been built. The pivot in one line: the comparison axis flips from *"compare Organisations on their stack"* to *"compare ticketing / audience-management **Systems**, with the Organisation catalogue as the adoption-evidence layer."*

## Requirements Inventory — v2 Delta

### Modified Functional Requirements

- **FR21′** *(replaces v1 FR21)*: A staff member can link an Organisation to one or more **Systems** via an explicit `role` (`PRIMARY_TICKETING`, `PRIMARY_CRM`, `INTEGRATED_SUITE`, `SECONDARY`).
- **FR22′** *(replaces v1 FR22)*: A staff member can attach a **per-link source reference** and a **per-link note**, distinct from the System's own source and the Organisation's own source.
- **FR10 (reframed)** + **FR11 (folded into FR10)**: A staff member can filter Organisations by **Adopted system** (single combobox replaces the v1 provider/CRM dropdowns). The link's `role` is exposed as a sub-filter when an adopted System is selected.

### New System Catalogue Functional Requirements

```
FR-S1:  A staff member can create a System record with required fields (name, vendor, category)
        and optional universal-core attributes (deployment_model, pricing_model, geographic_focus,
        description, capability flags).
FR-S2:  A staff member can view, update, and delete (with confirmation) a System record.
FR-S3:  A staff member can view a tabular System list with key fields visible at a glance.
FR-S4:  A staff member can search Systems by text across designated fields (name, vendor, description).
FR-S5:  A staff member can filter Systems by category, deployment_model, pricing_model,
        geographic_focus, and capability flags.
FR-S6:  A staff member can apply multiple System filters together.
FR-S7:  A staff member can select 2–4 Systems and open a side-by-side Compare view that aligns
        universal-core attributes plus a union panel of custom attributes.
FR-S8:  A staff member can view a System's adoption evidence — the list of Organisations linked
        to it, with each link's role.
FR-S9:  A staff member can view a System's custom attributes as { label, value, source_reference }
        triples (read-only display in MVP; full editor is Growth).
FR-S10: The product automatically maintains last_updated on Systems and on OrganisationSystem
        links — no manual clock fields.
```

### Additional Requirements (Architecture v2)

- **Three-migration sequence is mandatory:** additive (`add_system_and_junction`) → backfill (`backfill_systems_and_links`, custom SQL) → destructive (`drop_legacy_lookups`). A single migration would drop the legacy FKs before the junction is populated.
- **Four new Prisma enums:** `SystemCategory { INTEGRATED, TICKETING, AUDIENCE_MANAGEMENT }`, `SystemRole { PRIMARY_TICKETING, PRIMARY_CRM, INTEGRATED_SUITE, SECONDARY }`, `DeploymentModel { SAAS, SELF_HOSTED, HYBRID }`, `PricingModel { SUBSCRIPTION, TRANSACTION_FEE, LICENCE, HYBRID, UNKNOWN }`. All values SCREAMING_SNAKE_CASE end-to-end (matching the v1 `CapabilityState` rule).
- **`System` table fields:** `id`, `name` (unique), `vendor`, `category`, `deployment_model?`, `pricing_model?`, `geographic_focus?`, `description?`, `membership_capability` (default `UNKNOWN`), `donation_capability` (default `UNKNOWN`), `reserved_seating_capability` (default `UNKNOWN`), `source_reference?`, `custom_attributes Json?`, `last_updated`, `created_at`. `pg_trgm` GIN index on `(name, vendor, description)`.
- **`OrganisationSystem` junction:** `id`, `organisation_id` (FK Cascade), `system_id` (FK Restrict), `role`, `source_reference?`, `note?`, `last_updated`, `created_at`. `@@unique([organisation_id, system_id])`. Indexes on both FKs.
- **Prisma `@updatedAt` on `last_updated`:** Extended from `Organisation` to `System` and `OrganisationSystem` in schema; `last_updated` never accepted from request bodies on any of the three.
- **System `geographic_focus`** is a constrained dropdown sourced from a seeded constant in **both** `frontend/src/lib/system-geographic-focus.js` and `backend/src/lib/system-geographic-focus.js` — same dual-maintenance rule as `COUNTRIES`.
- **Custom attributes** stored as JSON on `System.custom_attributes` with shape `[{ label, value, source_reference }]`. Read-only in MVP per FR-S9; editor deferred to Growth.
- **`SelectionContext` split** into two providers: `OrganisationSelectionContext` and `SystemSelectionContext`. Both wrap the route tree in `App.jsx`. Contexts are independent.
- **Compare paths:** `/compare/systems?ids=...` (headline) and `/compare/organisations?ids=...` (legacy retained). The v1 `/compare?ids=...` shape is dropped; bookmarks break — acceptable for an internal MVP.
- **Multi-value query param** introduced for the first time: `GET /api/systems?category=INTEGRATED&category=TICKETING`. Document this in `docs/decisions.md`.
- **Backup is mandatory before applying Migration C** in any non-throwaway environment — Migration C is forward-only with no SQL inverse for the moved FK data.
- **Top-level navigation** gains a "Systems" link alongside "Organisations". Active state: `text-white font-medium`; inactive: `text-slate-400 hover:text-white`.

### UX Design Requirements (v2 Delta — D1–D11)

```
UX-DR21: Mount two SelectionContext providers in App.jsx (OrganisationSelectionContext,
         SystemSelectionContext); render CompareSelectionBar once per list page bound to its own
         context, accepting an `entityLabel` prop ("organisations" | "systems") (D1).
UX-DR22: Implement top navigation with both "Organisations" and "Systems" links sharing the
         active/inactive treatment (active text-white font-medium; inactive text-slate-400
         hover:text-white) (D1).
UX-DR23: Implement System list filter bar — search input (debounced ~300ms across name/vendor/
         description), Category multi-toggle chips (active bg-blue-600 text-white; inactive
         bg-white border-slate-300), Deployment select, Pricing select, Geographic focus select,
         three Capability selects (D2.1).
UX-DR24: Implement category Badge colour tokens — Integrated (blue-50 / blue-700 / blue-200),
         Ticketing (amber-50 / amber-700 / amber-200), Audience management (purple-50 /
         purple-700 / purple-200) — applied across list, detail, and compare (D2.3).
UX-DR25: Implement System list table with columns Checkbox, Name, Vendor, Category, Deployment,
         Pricing, Membership, Donation, Reserved seating, Last updated; capability columns use
         CapabilityBadge compact; null deployment/pricing render as "—" (D2.3).
UX-DR26: Implement System list empty states — no filter results, no search results, empty
         catalogue with "Add system" button (D2.5).
UX-DR27: Implement System detail facts panel as two-column label/value grid; null optional
         values render "Not recorded" in text-slate-400; source reference renders as link if
         http; capability rows use CapabilityBadge labelled variant (D3.1).
UX-DR28: Implement System detail Adoption evidence panel — heading "Organisations using this
         system (N)"; rows grouped by role with role-badge headings (text-xs font-medium
         text-slate-500 uppercase tracking-wide); per-row org name link, type badge, country,
         per-link source, per-link note, per-link last_updated; empty: "No organisations have
         linked to this system yet." (D3.2).
UX-DR29: Implement System detail Custom attributes panel — read-only table (label / value /
         source); source link if http; panel hidden entirely when custom_attributes null/empty
         (no empty state) (D3.3).
UX-DR30: Implement System form fields per GOV.UK anatomy: Name (required, max-w-md), Vendor
         (required, max-w-md), Category (required select), Deployment / Pricing / Geographic
         focus (optional selects), Description (optional textarea full width), three Capability
         selects (required, default Unknown), Source reference (optional), plus a slate-50
         read-only note about custom attributes (D4.1).
UX-DR31: Implement System form validation messages — "Enter the system name" (empty),
         "A system with this name already exists" (409), "Enter the vendor name", "Select a
         category"; error summary heading "There is a problem." (D4.2).
UX-DR32: Implement System Compare layout — fixed left attribute label column with sectioned
         rows (Identity / Capabilities / Description / Provenance / Additional attributes /
         Adopted by); SystemCard column per system with sticky header; max-w-7xl horizontal
         scroll on narrow viewports (D5.1, D5.2).
UX-DR33: Implement SystemCard component — sticky header (name / category badge / vendor); Edit
         and × remove actions; CapabilityBadge labelled variant; Description truncation at 4
         lines with "Show more"; "—" in text-slate-300 for null cells; "Adopted by N
         organisations" footer linked to /systems/:id (D5.2, D5.3).
UX-DR34: Implement Custom attributes union panel on System Compare — labels merged
         case-insensitively across selected systems; absent system shows "—"; each system's
         own value rendered with its source where available (D5.1, D10 §2).
UX-DR35: Implement Compare page error states — fewer than 2 valid systems → error with
         "Return to systems list" link; no `ids` → empty state "Select systems from the list
         to compare them here." (D5.3).
UX-DR36: Implement OrganisationCard system chips — replace ticketingProvider / crmPlatform
         text with role-icon + system-name chips (Lucide icons: Ticket / Users / Layers /
         Link2 by role); cap at 3 with "+N more" overflow; "No systems linked" muted italic
         when empty (D6.1).
UX-DR37: Implement Organisation list filter sidebar — drop Provider and CRM dropdowns; add
         Adopted system combobox (search-as-you-type via GET /api/systems?q=&limit=20) and a
         Role sub-filter visible only when system selected (Any / Primary ticketing / Primary
         CRM / Integrated suite / Secondary) (D6.2).
UX-DR38: Implement ActiveFilterChips v2 — drop `provider` / `crm` handlers; add `system`
         (label "Adopted system: [name]" with name lookup from cache), `system_role` (only
         when `system` active), `category` (multi, one chip per active value),
         `deployment_model`, `pricing_model`, `geographic_focus` (D2.2, D6.2, D9).
UX-DR39: Implement Organisation detail Linked Systems panel — grouped by role with role-badge
         group headings; per-row system-name link, vendor, source link, truncated note,
         last_updated, Edit + Remove actions; "Add system" button below all groups; Edit opens
         inline dialog (system combobox / role select / source / note); Remove shows
         confirmation dialog "[System] will be unlinked from [Org]. This cannot be undone."
         with destructive Remove link button; empty: "No systems linked yet. [Add system →]"
         (D6.3).
UX-DR40: Implement Organisation form Linked Systems editor — section below core fields with
         heading "Linked systems" and hint copy; row anatomy { system combobox, role select,
         source input, note textarea, × remove }; "Add system" appends empty row; row-level
         validation ("Select a role for [System name]", "This system is already linked.
         Remove the duplicate row."); save orchestration: PUT org → diff vs initial links →
         POST/PUT/DELETE links → page-level partial-failure banner (D6.4).
UX-DR41: Implement contextual compare entry points — Organisation detail "Compare these
         systems →" ghost link below Linked Systems panel when ≥2 systems; if 5+, link copy
         changes to "Compare the 4 most recently updated systems →"; Organisation compare
         "Compare systems used by these organisations →" ghost link below cards when union
         of system IDs across compared orgs is 2–4; muted note when union is 5+ (D7).
UX-DR42: Implement two-step delete flow for Systems with adopters — "Delete system" always
         visible on detail header; on 409 the dialog is replaced with an error state "This
         system is linked to [N] organisations. Remove all organisation links before
         deleting." with a "View linked organisations" link to the Adoption evidence panel.
         No cascade-delete shortcut (D10 §4).
```

## Epic List — v2 Additions

### Epic 6: Foundational Schema Migration to Systems Model
The `system` and `organisation_system` tables exist, are populated from existing provider/CRM lookups via a deterministic backfill, and the seed script produces a green `prisma migrate reset` against the new world. Legacy lookup tables and FKs still co-exist — Migration C is deferred to Epic 10. `System` and `OrganisationSystem` use `last_updated` with `@updatedAt` so freshness matches the Organisation pattern (ADR-011).
**FRs covered:** FR-S10 (auto last_updated)
**Includes:** Migration A (additive schema + four new enums + `pg_trgm` GIN index on system search columns), Migration B (custom-SQL data backfill from `ticketing_provider` + `crm_platform` FKs into `organisation_system` rows with INTEGRATED collapse and dedup, plus four invariant verification queries), `@updatedAt` on `system.last_updated` and `organisation_system.last_updated`, full seed re-shape (11 Systems + translated `links: [...]` array on sample organisations + AC3 invariant restated as a UK org → Tessitura `INTEGRATED_SUITE` link), `system-geographic-focus.js` constants in both layers, `docs/decisions.md` entries for the binding architectural calls.

### Epic 7: System Catalogue — Full CRUD with Provenance
Staff can browse, search, filter, view, create, edit, and delete System records — with adoption evidence (Organisations linked to each System grouped by role) and read-only custom attributes surfaced on detail. The top navigation gains a "Systems" link and `SelectionContext` is split into Organisation- and System-scoped providers so the existing compare flow keeps working untouched.
**FRs covered:** FR-S1, FR-S2, FR-S3, FR-S4, FR-S5, FR-S6, FR-S8, FR-S9
**Includes:** `/api/systems` REST resource (list with `q`, `category` multi-value, deployment/pricing/geographic-focus/capability filters, pagination; detail with adoption evidence; create with name-uniqueness validation; update; delete with `409 Conflict` when adopters exist), `SystemListPage`, `SystemDetailPage`, `SystemFormPage` (create + edit), `useSystems` / `useSystem` / `useSystemMutation` hooks, `frontend/src/api/systems.js`, top-nav switcher (UX-DR22), `SelectionContext` split into two providers (UX-DR21), category Badge colour tokens (UX-DR24).

### Epic 8: Organisation–System Linking & Organisation Re-shape
Staff can link Organisations to Systems via the junction with explicit roles, per-link source references, and per-link notes — and every Organisation surface (list filter sidebar, detail page, form, compare card) is re-shaped to surface system links instead of the old flat provider/CRM fields. The `GET /api/organisations` filter contract and `GET /api/organisations/:id` response shape change in this epic; the legacy `/api/meta/ticketing-providers` and `/api/meta/crm-platforms` endpoints continue to coexist (their removal is in Epic 10).
**FRs covered:** FR21′, FR22′, FR10 (reframed as Adopted system), FR11 (folded into FR10)
**Includes:** `/api/organisations/:id/systems` link CRUD (GET / POST / PUT / DELETE keyed by junction `linkId`, not System id), Organisation list query-param re-shape (drop `provider` / `crm`, add `system` + `system_role` with EXISTS-subquery filter), Organisation detail response re-shape (remove `ticketingProvider` / `crmPlatform`, add `systems[]` with embedded System), POST/PUT body validation that *rejects* `ticketing_provider_id` / `crm_platform_id` (not silent ignore), Organisation form Linked Systems editor with diff orchestration on save, Organisation detail Linked Systems panel (grouped by role, inline edit dialog + remove confirmation), Organisation list filter sidebar swap (Adopted system combobox + Role sub-filter), `ActiveFilterChips` v2 (UX-DR38), `OrganisationCard` system chips (UX-DR36).

### Epic 9: System-to-System Compare
Staff select 2–4 Systems from the System list, navigate to a stable shareable `/compare/systems?ids=...` URL, and read aligned universal-core attributes plus a union panel of custom attributes — closing the headline 60-second anchor journey from PRD v2 Journey 1. Two contextual entry points (from Organisation detail and from Organisation compare) pre-populate the System compare URL when there's a meaningful System set to compare.
**FRs covered:** FR-S7
**Includes:** `/compare/systems` and `/compare/organisations` routes (Story 9.1 removes ambiguous v1 `/compare`), `SystemComparePage`, `SystemCard` component (sticky header, never-blank cells, "Adopted by N organisations" footer, custom attributes section), parallel `Promise.all` `GET /api/systems/:id` fetch (TanStack Query keyed by `['systems', id]`), URL-as-source-of-truth (removing a column updates `ids`), custom-attribute union panel with case-insensitive label merge, error and empty states (fewer than 2 valid systems, no `ids`), contextual compare entry points from Organisation detail and Organisation compare (UX-DR41).

### Epic 10: Legacy Schema Decommission & v2 Documentation
Migration C drops the legacy FK columns and the `ticketing_provider` / `crm_platform` lookup tables. The corresponding meta endpoints and frontend hook helpers are removed in the same window. README and `docs/decisions.md` are updated for the v2 world — including the mandatory pre-Migration-C backup note and seven new architectural decision records.
**FRs covered:** *(no new FRs — completes the structural pivot)*
**Includes:** Migration C (auto-generated via `prisma migrate dev --create-only` after schema edit, reviewed before apply), removal of `GET /api/meta/ticketing-providers` and `GET /api/meta/crm-platforms` endpoints + controllers + service rows + frontend `fetchProviders` / `fetchCrms` helpers, README updates (backup-before-Migration-C deployment note, two-catalogue smoke-test path, navigation reference, known-limitations refresh), `docs/decisions.md` additions (7 entries per architecture-v2-delta §8), implementation-readiness re-run handoff note.

---

### v2 Recommended sequencing & story dependencies

The table below mirrors [architecture-v2-delta §10 (implementation sequencing)](architecture-v2-delta.md) and gives explicit **blocking prerequisites** per story. Stories not listed depend only on earlier rows in the same epic (sequential story number).

| Story | Depends on (hard prerequisites) |
|------|-----------------------------------|
| **6.1** | — |
| **6.2** | 6.1 |
| **6.3** | 6.2 |
| **7.1** | 6.3 |
| **7.2** | 7.1 |
| **7.3** | 6.3, 9.1 *(compare URLs require `/compare/systems` and `/compare/organisations` routes from 9.1)* |
| **7.4** | 7.1, 7.3 |
| **7.5** | 7.1, 7.3, 7.4 |
| **7.6** | 7.2, 7.3, 7.4, 7.5 |
| **8.1** | 6.3, 7.1 |
| **8.2** | 6.3, 7.1, 8.1 *(8.1 required so link writes and DTO alignment are available before or with the breaking org API PR)* |
| **8.3** | 7.1, 8.2 |
| **8.4** | 8.2, 8.1 |
| **8.5** | 8.2, 8.1 |
| **8.6** | 8.2 |
| **9.1** | 7.1 *(System compare fetch needs `GET /api/systems/:id`; Organisation compare reuses existing org detail API)* |
| **9.2** | 9.1 |
| **9.3** | 9.1, 9.2, 8.4, 8.6 *(contextual entry points need org detail + org compare card data)* |
| **10.1** | 6.1, 6.2, 6.3, 7.x *(System catalogue stable)*, 8.x *(org reshape + link API stable)*, 9.x *(compare stable)* |
| **10.2** | 10.1 |
| **10.3** | 10.2 |

**Parallel tracks (after 6.3):** Run **7.1 → 7.2** in parallel with early routing if desired, but **9.1 must land before 7.3** so `CompareSelectionBar` targets valid `/compare/*` paths. **7.4–7.6** (System list/detail/form) follow **7.3**; **8.x** after **7.x** per architecture §10. **Epic 9** stories 9.2–9.3 build on 9.1's route shell.

### v2 FR Coverage Map

```
FR21′:  Epic 8 — OrganisationSystem link CRUD with role enum
FR22′:  Epic 8 — per-link source_reference and note
FR10 (reframed) + FR11 (folded): Epic 8 — single "Adopted system" filter with role sub-filter
FR-S1:  Epic 7 — System CRUD create with required + optional fields
FR-S2:  Epic 7 — System view, update, delete-with-confirmation
FR-S3:  Epic 7 — System list page with key fields visible
FR-S4:  Epic 7 — System text search across name, vendor, description
FR-S5:  Epic 7 — System filtering (category, deployment, pricing, geographic focus, capabilities)
FR-S6:  Epic 7 — System multi-filter combination
FR-S7:  Epic 9 — System-to-System compare 2–4 with universal core + custom attribute union
FR-S8:  Epic 7 — System detail Adoption evidence panel
FR-S9:  Epic 7 — System detail Custom attributes panel (read-only)
FR-S10: Epic 6 — automatic last_updated on System and OrganisationSystem via Prisma `@updatedAt`
```

---

## Epic 6: Foundational Schema Migration to Systems Model

The `system` and `organisation_system` tables exist, are populated from existing provider/CRM lookups via a deterministic backfill, and the seed script produces a green `prisma migrate reset` against the new world. Legacy lookup tables and FKs still co-exist — Migration C is deferred to Epic 10.

**FRs covered:** FR-S10

### Story 6.1: Migration A — Add System and OrganisationSystem Schema (Additive)

As a backend developer,
I want the new `system` and `organisation_system` tables, their four enums, and search indexes added without touching the legacy schema,
So that the new entities can be populated by Migration B before the legacy structures are removed.

**Acceptance Criteria:**

**Given** `backend/src/prisma/schema.prisma` is edited to add the four new enums (`SystemCategory`, `SystemRole`, `DeploymentModel`, `PricingModel`) plus the `System` and `OrganisationSystem` models — and to add `systems OrganisationSystem[]` back-relation on `Organisation`
**When** `npx prisma migrate dev --name add_system_and_junction --create-only` is run
**Then** a new migration directory `<timestamp>_add_system_and_junction/migration.sql` is generated containing only `CREATE TYPE`, `CREATE TABLE`, `CREATE UNIQUE INDEX`, and `CREATE INDEX` statements — no `DROP`, no `ALTER ... DROP COLUMN` for any legacy table

**Given** the generated migration is reviewed and applied with `npx prisma migrate dev`
**When** the database schema is inspected
**Then** the `system` table contains columns: `id` (UUID PK), `name` (text NOT NULL UNIQUE), `vendor` (text NOT NULL), `category` (`SystemCategory` NOT NULL), `deployment_model` (`DeploymentModel` nullable), `pricing_model` (`PricingModel` nullable), `geographic_focus` (text nullable), `description` (text nullable), `membership_capability` (`CapabilityState` NOT NULL DEFAULT `UNKNOWN`), `donation_capability` (`CapabilityState` NOT NULL DEFAULT `UNKNOWN`), `reserved_seating_capability` (`CapabilityState` NOT NULL DEFAULT `UNKNOWN`), `source_reference` (text nullable), `custom_attributes` (jsonb nullable), `last_updated` (timestamp NOT NULL), `created_at` (timestamp NOT NULL)
**And** the `organisation_system` table contains: `id` (UUID PK), `organisation_id` (UUID NOT NULL FK to `organisation.id` ON DELETE CASCADE), `system_id` (UUID NOT NULL FK to `system.id` ON DELETE RESTRICT), `role` (`SystemRole` NOT NULL), `source_reference` (text nullable), `note` (text nullable), `last_updated` (timestamp NOT NULL), `created_at` (timestamp NOT NULL)
**And** a `UNIQUE (organisation_id, system_id)` constraint exists on `organisation_system`
**And** non-unique indexes exist on `organisation_system(system_id)` and `organisation_system(organisation_id)`

**Given** the four new enums are created
**When** their values are inspected
**Then** `SystemCategory` has values `INTEGRATED`, `TICKETING`, `AUDIENCE_MANAGEMENT`
**And** `SystemRole` has values `PRIMARY_TICKETING`, `PRIMARY_CRM`, `INTEGRATED_SUITE`, `SECONDARY`
**And** `DeploymentModel` has values `SAAS`, `SELF_HOSTED`, `HYBRID`
**And** `PricingModel` has values `SUBSCRIPTION`, `TRANSACTION_FEE`, `LICENCE`, `HYBRID`, `UNKNOWN`
**And** all enum values are SCREAMING_SNAKE_CASE — matching the v1 `CapabilityState` rule and surfacing unchanged in API JSON

**Given** the `pg_trgm` extension is already enabled (from v1 Story 1.1)
**When** the migration completes
**Then** a GIN trigram index exists covering `system.name`, `system.vendor`, and `system.description` for `ILIKE '%term%'` search parity with Organisation

**Given** the legacy schema is intentionally untouched
**When** the migration completes
**Then** `organisation.ticketing_provider_id` and `organisation.crm_platform_id` columns still exist
**And** the `ticketing_provider` and `crm_platform` lookup tables still exist with all their rows
**And** all existing organisation rows are unchanged (count + content match a pre-migration snapshot)
**And** the new `system` and `organisation_system` tables are empty

**Given** the migration is committed
**When** `docs/decisions.md` is reviewed
**Then** an entry records the binding three-migration sequence (additive → backfill → destructive) with rationale: "Single migration would drop FKs before the junction is populated."

### Story 6.2: Migration B — Backfill Systems and Organisation Links (Custom SQL)

As a backend developer,
I want a deterministic data backfill that converts every existing provider/CRM FK into a populated `organisation_system` row,
So that no organisation loses its stack association during the v2 pivot and Migration C can later drop the legacy columns safely.

**Acceptance Criteria:**

**Given** Migration A has been applied and `system` + `organisation_system` are empty
**When** `npx prisma migrate dev --name backfill_systems_and_links --create-only` is run and the empty SQL file is replaced with the custom backfill SQL
**Then** the migration file contains a single transactional script with five labelled steps: (1) insert 11 System rows, (2) build temp translation tables, (3) insert ticketing-provider→link rows, (4) insert CRM→link rows with dedup, (5) drop temp tables; verification queries are included as comments showing expected counts

**Given** the backfill applies cleanly
**When** `system` is queried
**Then** exactly 11 rows exist with the canonical (name, vendor, category) tuples per architecture-v2-delta §6.2 — Tessitura / Spektrix / AudienceView as `INTEGRATED`; Ticketmaster / PatronBase / Eventbrite / Ticketsolve / Universe as `TICKETING`; Salesforce / HubSpot / Donorfy as `AUDIENCE_MANAGEMENT`
**And** the legacy `Tessitura CRM` and `Spektrix` (CRM) lookup rows have been collapsed into the single `Tessitura` and `Spektrix` System rows respectively — they do not produce duplicate System rows
**And** every System row has `last_updated` and `created_at` set to `NOW()`; capability flags default to `UNKNOWN`; deployment_model / pricing_model / geographic_focus / description / source_reference / custom_attributes are null (the seed script populates these in Story 6.3)

**Given** the translation tables `tp_to_system` and `crm_to_system` are constructed
**When** the link-insertion steps run
**Then** for every Organisation row with a non-null `ticketing_provider_id`, exactly one `organisation_system` row exists with `system_id` matching the mapped System and `role` set to `INTEGRATED_SUITE` if the System's category is `INTEGRATED` else `PRIMARY_TICKETING`
**And** the inherited `source_reference` on each migrated link is copied from the Organisation's own `source_reference` column; `note` is NULL; `last_updated` and `created_at` are copied from the Organisation
**And** for every Organisation row with a non-null `crm_platform_id`, exactly one `organisation_system` row exists with `role` set to `INTEGRATED_SUITE` if the System's category is `INTEGRATED` else `PRIMARY_CRM` — *unless* a row already exists for `(organisation_id, system_id)` from the ticketing-provider step, in which case the CRM-side insert is silently skipped (the integrated collapse case)

**Given** all four verification queries from architecture-v2-delta §6.2 Step 4 are run inside the migration transaction
**When** any query returns an unexpected value
**Then** the transaction raises an error and aborts — no partially-migrated state is persisted
**And** the four invariants are: (a) zero orphan link rows missing an organisation, (b) zero orphan link rows missing a system, (c) total link count equals `(orgs with ticketing FK) + (orgs with crm FK) - (orgs where both FKs map to the same INTEGRATED system)`, (d) at least one UK organisation is linked to Tessitura (the v1 AC3 invariant restated)

**Given** the backfill completes
**When** the temp tables are dropped at Step 5
**Then** `tp_to_system` and `crm_to_system` no longer exist in the schema (they are TEMP tables, dropped by name)
**And** the migration file ends without any `DROP TABLE ticketing_provider` or `DROP TABLE crm_platform` — those drops are deferred to Migration C (Story 10.1)

**Given** `pgcrypto` may not be present in older databases
**When** the migration file is reviewed
**Then** it begins with `CREATE EXTENSION IF NOT EXISTS pgcrypto;` so `gen_random_uuid()` is guaranteed available — even if `pgcrypto` was already enabled the statement is a no-op

### Story 6.3: `@updatedAt` on System / OrganisationSystem and seed re-shape

As a backend developer,
I want `System` and `OrganisationSystem` to use the same Prisma `@updatedAt` pattern as `Organisation` for `last_updated`, and the seed script re-shaped to populate the v2 world,
So that `last_updated` is automatic on all v2 entities and `prisma migrate reset` produces a fully demonstrable seeded state.

**Acceptance Criteria:**

**Given** `Organisation` already uses `last_updated` with `@default(now()) @updatedAt` (ADR-011)
**When** `system` and `organisation_system` models are added in Migration A
**Then** each defines `last_updated DateTime @default(now()) @updatedAt` — no Prisma `$use` middleware
**And** an `update` via Prisma on `System` or `OrganisationSystem` advances `last_updated` without the caller supplying it
**And** an `update` on lookup tables (`ticketing_provider`, `crm_platform`, `organisation_type`) and other models is unaffected by this rule — they keep their existing timestamp columns as defined in schema

**Given** any controller call attempts to write `last_updated` from a request body via `POST /api/systems`, `PUT /api/systems/:id`, `POST /api/organisations/:id/systems`, or `PUT /api/organisations/:id/systems/:linkId`
**When** the controller-layer validation runs
**Then** `last_updated` is stripped from the body before reaching the service — matching the v1 rule on `Organisation`

**Given** `backend/src/prisma/seed.js` is re-shaped for v2
**When** `npx prisma db seed` runs against an empty database after Migrations A + B
**Then** an upsert pass populates 11 Systems with full enrichment fields: deployment_model (e.g. Tessitura `SAAS`, Spektrix `SAAS`), pricing_model (e.g. Tessitura `LICENCE`, Eventbrite `TRANSACTION_FEE`), geographic_focus (e.g. Tessitura `Global`, Ticketsolve `UK`), a 1–3 sentence `description` per system carrying audience-size nuance, the three capability flags, `source_reference` (a plausible URL), and `custom_attributes` populated for at least 3 systems with the canonical shape `[{ "label": "...", "value": "...", "source_reference": "..." }]`
**And** the seed is idempotent: running it a second time updates the 11 Systems in place rather than creating duplicates (Prisma `upsert` keyed by unique `name`)

**Given** the existing `sample-organisations-seed-data.js` previously encoded `ticketingProviderName` and `crmPlatformName` per row
**When** the file is updated for v2
**Then** each sample organisation row carries a `links: [{ systemName, role, sourceReference?, note? }]` array instead of the two flat provider fields
**And** the seed inserts every link with the same dedup rule from Migration B (skip if `(organisation_id, system_id)` is already linked) — runs of `prisma migrate reset` followed by `prisma db seed` never throw a unique-constraint violation

**Given** the seed has run
**When** the AC3 invariant is queried (`SELECT count(*) FROM organisation_system os JOIN organisation o ON o.id = os.organisation_id JOIN system s ON s.id = os.system_id WHERE o.country = 'United Kingdom' AND s.name = 'Tessitura' AND os.role = 'INTEGRATED_SUITE'`)
**Then** the count is at least 1 — the v1 AC3 invariant is restated for the v2 world (UK organisation linked to Tessitura specifically with `INTEGRATED_SUITE` role)

**Given** the seed populates link rows
**When** the resulting catalogue is inspected
**Then** at least one organisation has 2+ linked Systems (multi-system case for Journey 3 and the contextual compare entry point in UX-DR41)
**And** at least one organisation has a `SECONDARY` link (so role-grouped detail rendering can be exercised end-to-end)
**And** at least one organisation has both an `INTEGRATED_SUITE` link and a separate `PRIMARY_CRM` link — exercising the "single integrated system + supplementary CRM" pattern

**Given** the `system-geographic-focus.js` constants file is added
**When** both `frontend/src/lib/system-geographic-focus.js` and `backend/src/lib/system-geographic-focus.js` are inspected
**Then** they export the same `SYSTEM_GEOGRAPHIC_FOCUS` constant (e.g. `['UK', 'Europe', 'North America', 'Global', 'Other']`) — same dual-maintenance contract as `COUNTRIES`
**And** `docs/decisions.md` records the dual-maintenance rule: "system-geographic-focus.js must be updated in both layers in the same commit when the list changes."

**Given** `npx prisma migrate reset` is run end-to-end
**When** the command completes
**Then** the database has 11 Systems, the v1 sample organisation count, and a fully populated `organisation_system` table — and a developer can navigate the seeded data without manual entry

---

## Epic 7: System Catalogue — Full CRUD with Provenance

Staff can browse, search, filter, view, create, edit, and delete System records — with adoption evidence and read-only custom attributes surfaced on detail. The top navigation gains a "Systems" link and `SelectionContext` is split into two providers so the existing Organisation compare flow keeps working untouched.

**FRs covered:** FR-S1, FR-S2, FR-S3, FR-S4, FR-S5, FR-S6, FR-S8, FR-S9

### Story 7.1: System REST API — List, Detail, Search, Filters

As a frontend developer,
I want `/api/systems` to return paginated, filterable, searchable System records and a detail endpoint that includes adoption evidence,
So that the System list, detail, and combobox surfaces have a single backend to consume.

**Acceptance Criteria:**

**Given** the backend layering rules (routes → controller → service)
**When** the `/api/systems` resource is implemented
**Then** the layout is: `backend/src/routes/systems.js` (routing only), `backend/src/controllers/system-controller.js` (validation + response shaping), `backend/src/services/system-service.js` (Prisma calls + filter SQL); a `system-list-dto.js` (also used for create/update/detail) maps Prisma snake_case rows to camelCase API output

**Given** `GET /api/systems` is called with no query params
**When** the response is returned
**Then** it has shape `{ data: [...systems], error: null, meta: { page: 1, limit: 20, total: N, totalPages: N } }`
**And** each System object exposes `id`, `name`, `vendor`, `category`, `deploymentModel`, `pricingModel`, `geographicFocus`, `description`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `sourceReference`, `customAttributes`, `lastUpdated`, `createdAt` — all camelCased; enum values surface as their SCREAMING_SNAKE_CASE strings; timestamps as ISO 8601

**Given** `GET /api/systems?q=spektrix`
**When** the search runs
**Then** results match where `name`, `vendor`, or `description` contain the term via `ILIKE '%term%'` against the `pg_trgm` GIN index from Story 6.1
**And** the search is case-insensitive

**Given** `GET /api/systems?category=INTEGRATED&category=TICKETING`
**When** the multi-value param is parsed
**Then** the controller accepts repeated `category` params, validates each is a valid `SystemCategory` enum value, and the service filters with `category IN ($1, $2, ...)`
**And** any single invalid enum value returns `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field: "category", message: "Invalid category value" }] }, meta: null }`

**Given** `GET /api/systems?deployment_model=SAAS&pricing_model=SUBSCRIPTION&geographic_focus=UK&membership=YES&donation=UNKNOWN&seating=NO`
**When** the request is processed
**Then** results match all six predicates simultaneously (AND semantics across distinct filters; no OR collapse)
**And** capability params are validated against `CapabilityState`, deployment against `DeploymentModel`, pricing against `PricingModel`, and `geographic_focus` against the seeded constant (returns `400` with a specific `fields[]` error otherwise)

**Given** pagination is requested via `?page=2&limit=10`
**When** the response is returned
**Then** `meta.page = 2`, `meta.limit = 10`, `meta.total` is the unfiltered-by-pagination count, `meta.totalPages = Math.ceil(total / limit)`
**And** `page` and `limit` default to 1 and 20 respectively when omitted

**Given** `GET /api/systems/:id` is called for an existing System
**When** the response is returned
**Then** it has shape `{ data: { ...system, organisations: [...] }, error: null, meta: null }`
**And** the embedded `organisations` array is the System's adoption evidence: each entry has `{ id (junction), role, sourceReference, note, lastUpdated, organisation: { id, name, type, country } }`
**And** the array is sorted by `role` then by `organisation.name` ascending — so role-grouped rendering on the detail page is deterministic

**Given** `GET /api/systems/:id` is called for a non-existent ID
**When** the service finds no row
**Then** the controller returns `404` with `{ data: null, error: { message: "System not found" }, meta: null }`

### Story 7.2: System REST API — Create, Update, Delete

As a frontend developer,
I want `POST`, `PUT`, and `DELETE` endpoints for Systems with the right validation, conflict, and constraint behaviour,
So that the System form and detail-header actions can write to the catalogue safely.

**Acceptance Criteria:**

**Given** `POST /api/systems` is called with a valid body containing `{ name, vendor, category }` plus any optional fields
**When** the controller validates the body
**Then** required-field validation requires `name` (non-empty string), `vendor` (non-empty string), and `category` (one of the `SystemCategory` enum values)
**And** the response is `201` with `{ data: { ...system }, error: null, meta: null }`
**And** `last_updated` and `created_at` are set automatically — both are stripped from the request body if present (silently — they are server-managed)
**And** capability fields default to `"UNKNOWN"` when omitted

**Given** `POST /api/systems` is called with `name` matching an existing System (case-sensitive, since DB unique constraint is case-sensitive)
**When** the database returns a unique-constraint violation
**Then** the controller returns `409` with `{ data: null, error: { message: "A system with this name already exists", fields: [{ field: "name", message: "A system with this name already exists" }] }, meta: null }`
**And** no row is inserted

**Given** `POST /api/systems` is called with an invalid `category` value (e.g. `INTEGRATEDX`)
**When** the controller validates
**Then** the response is `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field: "category", message: "Select a category" }] }, meta: null }`

**Given** `PUT /api/systems/:id` is called with any subset of mutable fields
**When** the row is updated via Prisma
**Then** the response is `200` with `{ data: { ...updatedSystem }, error: null, meta: null }`
**And** `last_updated` is set automatically by Prisma `@updatedAt` (Story 6.3) — not from the request body
**And** `name` collisions still return `409` with the duplicate-name `fields[]` shape

**Given** `PUT /api/systems/:id` is called for a non-existent ID
**When** Prisma reports `P2025`
**Then** the response is `404` with the `"System not found"` envelope

**Given** `DELETE /api/systems/:id` is called for a System with no `organisation_system` rows referencing it
**When** the row is deleted
**Then** the response is `200` with `{ data: { id }, error: null, meta: null }`

**Given** `DELETE /api/systems/:id` is called for a System with one or more `organisation_system` rows referencing it
**When** Prisma honours the `onDelete: Restrict` FK from Story 6.1 and raises `P2003`
**Then** the response is `409` with `{ data: null, error: { message: "This system is linked to N organisations. Remove all organisation links before deleting.", linkedOrganisationCount: N }, meta: null }`
**And** `N` is computed by counting `organisation_system` rows where `system_id = :id` — surfaced to the frontend so the UX-DR42 two-step dialog can render the count

**Given** any write endpoint receives a body containing keys that are server-managed (`id`, `last_updated`, `created_at`, `custom_attributes`)
**When** the controller validates
**Then** those keys are stripped silently before reaching the service — `custom_attributes` is read-only via API in MVP per FR-S9 (it is populated only by the seed script in Story 6.3); the editor is a Growth concern

### Story 7.3: Navigation Shell — Organisations + Systems Switch and SelectionContext Split

As a staff member,
I want a top-level navigation that lets me move between the Organisations and Systems catalogues without losing my place,
So that I can curate either side of the catalogue without one workflow's state interfering with the other.

**Acceptance Criteria:**

**Given** the v1 top navigation bar (`bg-slate-800`) shows only the app name and an "Organisations" link
**When** the v2 navigation update is applied
**Then** the nav also renders a "Systems" link to the right of "Organisations" sharing the same active/inactive treatment: active is `text-white font-medium`; inactive is `text-slate-400 hover:text-white`
**And** the active treatment is determined from the current pathname — `/organisations*` activates the Organisations link; `/systems*` activates the Systems link; the legacy `/compare/organisations*` activates Organisations; `/compare/systems*` activates Systems

**Given** the v1 application mounts a single `SelectionProvider` from `context/SelectionContext.jsx`
**When** the context is split for v2
**Then** two providers exist: `OrganisationSelectionContext` (file: `context/OrganisationSelectionContext.jsx`) and `SystemSelectionContext` (file: `context/SystemSelectionContext.jsx`)
**And** each exports the same shape `{ selectedIds: string[], toggleSelection(id), clearSelection() }` via dedicated hooks `useOrganisationSelection` and `useSystemSelection`
**And** both providers wrap the route tree in `App.jsx` — order is irrelevant, they are independent

**Given** a staff member toggles selection on the Organisation list
**When** the staff member then navigates to the System list and toggles selection there
**Then** the Organisation selection set is preserved untouched
**And** the System selection set is independent
**And** clearing one context never clears the other

**Given** the existing v1 `useSelection` hook usages on Organisation list, Compare bar, and Compare page
**When** the migration to `useOrganisationSelection` is complete
**Then** every previous `useSelection` import is replaced with `useOrganisationSelection`
**And** no file imports the old `SelectionContext` after the migration (old file deleted)

**Given** `CompareSelectionBar` from v1 was bound implicitly to the single context
**When** v2 instantiates it twice (once per list page)
**Then** the component accepts an `entityLabel` prop with values `"organisations"` or `"systems"` and uses it to populate the "Compare selected (N) →" copy and the disabled-state tooltip ("Select up to 4 organisations to compare" vs. "Select up to 4 systems to compare")
**And** the component reads selection state from whichever context provider is in scope — the consumer hook is passed in (or chosen via the `entityLabel` prop) so the bar stays decoupled
**And** the Organisation list instance navigates to `/compare/organisations?ids=<id1>,<id2>,...` (comma-separated UUIDs) — the v1 `/compare?ids=...` path is no longer used for Organisation compare (that legacy path is removed in Story 9.1)
**And** the System list instance navigates to `/compare/systems?ids=...` as specified in Story 7.4

**Given** any keyboard user navigates the app
**When** the focus traverses the top-nav links
**Then** focus indicators on both links use `ring-2 ring-blue-500 ring-offset-2` consistent with v1 UX-DR19

### Story 7.4: System List Page

As a staff member,
I want a paginated, searchable, filterable table of all Systems with selection for compare,
So that I have a primary working surface for the Systems catalogue.

**Acceptance Criteria:**

**Given** a staff member navigates to `/systems`
**When** the page renders
**Then** a horizontal filter bar above the table contains: a search input ("Search systems…", debounced ~300ms calling `GET /api/systems?q=` on every keystroke after the debounce), three Category toggle chips ("Integrated" / "Ticketing" / "Audience management" — multi-value, active state `bg-blue-600 text-white`, inactive `bg-white border-slate-300 text-slate-600 hover:bg-slate-50`), a Deployment select (SaaS / Self-hosted / Hybrid / All deployments), a Pricing select (Subscription / Transaction fee / Licence / Hybrid / Unknown / All pricing), a Geographic focus select (sourced from the seeded `SYSTEM_GEOGRAPHIC_FOCUS` constant + an "All regions" default), and three Capability selects (Membership / Donation / Reserved seating — each Yes / No / Unknown / Any)
**And** filter changes do *not* require an "Apply" button; results narrow reactively as filters change

**Given** a Category chip is toggled on
**When** the URL is inspected
**Then** the selected category is encoded into the URL via `useSearchParams` as a repeated `category` param (e.g. `?category=INTEGRATED&category=TICKETING`) — multi-value semantics
**And** browser back navigation restores the exact filter state
**And** all other filter params (`q`, `deployment_model`, `pricing_model`, `geographic_focus`, `membership`, `donation`, `seating`, `page`, `limit`) are also encoded into the URL and restored on back navigation

**Given** any filter is active
**When** the active filter chips strip renders below the filter bar
**Then** one chip per active filter value is shown using the v1 `ActiveFilterChips` shell with the v2 chip handlers from UX-DR38: `category` (one chip per value: "Category: Integrated"), `deployment_model` ("Deployment: SaaS"), `pricing_model` ("Pricing: Subscription"), `geographic_focus` ("Region: UK"), `membership` / `donation` / `seating` (e.g. "Membership: Yes"), and `q` ("Search: [term]")
**And** clicking the dismiss `×` on a chip removes that param only; "Clear all" removes every filter param simultaneously

**Given** the System table renders
**When** the columns are inspected
**Then** they are: a checkbox (row selection for compare, bound to `SystemSelectionContext`), Name (link to `/systems/:id`, `font-medium text-slate-800`), Vendor (`text-sm text-slate-500`; on narrow widths flows to a second line under Name), Category (Badge with v2 colour tokens: Integrated `bg-blue-50 text-blue-700 border-blue-200`; Ticketing `bg-amber-50 text-amber-700 border-amber-200`; Audience management `bg-purple-50 text-purple-700 border-purple-200`), Deployment (`text-sm text-slate-600`; "—" if null), Pricing (`text-sm text-slate-600`; "—" if null), Membership / Donation / Reserved seating (`CapabilityBadge` compact icon-only), Last updated (`text-xs text-slate-500`, relative date)
**And** the table wrapper has `overflow-x-auto` for narrow viewports
**And** each column has a sufficient `min-w-[Xpx]` so it remains readable before horizontal scroll activates

**Given** the list is loading and `useSystems` has `isLoading === true`
**When** the table body renders
**Then** skeleton rows (slate-100 shimmer) are shown matching the column count — no full-page spinner; `isFetching` (refetches from cache) does not trigger skeletons

**Given** the catalogue is empty after a filter combination
**When** the table body renders
**Then** the empty state reads "No systems match these filters. Try removing a filter or clearing all." with a "Clear all filters" link
**And** when the search returns nothing, the empty state reads "No systems found for '[term]'. Try a shorter search or check the spelling." with a Clear search action
**And** when the catalogue itself is empty (no Systems yet), the empty state reads "No systems yet. Add the first one to get started." with an "Add system" primary button

**Given** a staff member checks ≥1 System row
**When** the `CompareSelectionBar` is rendered (bound to `SystemSelectionContext` via UX-DR21 / Story 7.3)
**Then** the bar displays "Compare selected (N) →" as a primary blue button — clicking navigates to `/compare/systems?ids=<id1>,<id2>,...`
**And** at 5+ selected the button is `disabled` with a tooltip "Select up to 4 systems to compare"
**And** the bar exposes a "Clear selection" link that resets `SystemSelectionContext`

**Given** a staff member opens System detail and uses browser back
**When** they return to `/systems`
**Then** the filter state (URL params) and selection state (context) are both preserved — matching the v1 Organisation list behaviour and ADR-013

**Given** the page header
**When** it renders
**Then** the page title is "Systems" left-aligned and an "Add system" primary button (`bg-blue-600`) is right-aligned, mirroring the v1 Organisation list header

### Story 7.5: System Detail Page (Adoption Evidence + Custom Attributes)

As a staff member,
I want to view the full details of a single System, the Organisations that adopt it grouped by role, and any seeded custom attributes,
So that I can verify a System's profile and see who is using it without leaving the page.

**Acceptance Criteria:**

**Given** a staff member navigates to `/systems/:id`
**When** the page loads via `useSystem(id)` calling `GET /api/systems/:id`
**Then** the page header renders: System name (`text-2xl font-semibold`); Vendor subtitle (`text-base text-slate-500`); Category Badge inline (using the v2 colour tokens); a `← Back to systems` link (`text-sm text-blue-600`) at the top
**And** the header right-aligned actions are "Edit system" (secondary outlined button → `/systems/:id/edit`) and "Delete system" (ghost destructive)

**Given** the System facts panel renders
**When** its contents are inspected
**Then** it is a two-column label/value grid (`grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3`) with rows: Vendor (plain text); Category (Category Badge); Deployment (plain text or "Not recorded" in `text-slate-400` when null); Pricing model (same null handling); Geographic focus (same null handling); Description (full prose `text-sm text-slate-700`; the row is hidden entirely if null); Membership / Donation / Reserved seating (each `CapabilityBadge` labelled variant); Source reference (rendered as `<a target="_blank">` with the link if it starts with `http`, otherwise plain text; "None recorded" when null); Last updated (absolute date plus relative in parentheses, `text-xs text-slate-500`)

**Given** the Adoption evidence panel renders below the facts panel
**When** its contents are inspected
**Then** the heading reads "Organisations using this system (N)" where N is the count from the API response
**And** rows are grouped by `role` — each role group has a heading rendered as a muted badge (`text-xs font-medium text-slate-500 uppercase tracking-wide`) showing the humanised role label ("Primary ticketing", "Primary CRM", "Integrated suite", "Secondary"); only roles with at least one row appear
**And** within each group, rows show: Organisation name (link to `/organisations/:id`) | Organisation type Badge | Country | per-link source reference (link if `http`, plain text otherwise, `—` if null) | per-link note (truncated to one line with full text in a tooltip; `—` if null) | per-link last updated
**And** if zero organisations are linked, the panel shows "No organisations have linked to this system yet."
**And** this panel is read-only — adding/removing links is done from the Organisation side per Story 8.4

**Given** the System has non-null `custom_attributes`
**When** the Custom attributes panel renders
**Then** the panel heading is "Additional attributes" and the body is a compact table with columns: Label, Value, Source
**And** each row maps a `{ label, value, sourceReference }` triple from the JSON
**And** the source column renders as a link if the value starts with `http`; the cell is omitted if `sourceReference` is null
**And** if `custom_attributes` is null or an empty array, the entire panel is hidden — no empty state is shown (absence means no additional attributes, not missing data)

**Given** the page is loading
**When** the data has not yet returned
**Then** a skeleton matching the layout (header + facts + adoption + custom attributes) is shown — no full-page spinner

**Given** a staff member navigates to `/systems/:id` for a non-existent ID
**When** the API returns `404`
**Then** the page renders "System not found" with a `← Back to systems` link

### Story 7.6: System Create / Edit Form

As a staff member,
I want a single form that handles creating a new System and editing an existing one,
So that the catalogue can be curated end-to-end with the same field set, validation, and provenance pattern.

**Acceptance Criteria:**

**Given** a staff member navigates to `/systems/new`
**When** the form renders
**Then** the back link reads `← Back to systems` and the page title is "Add system"
**And** the form fields are laid out per UX-DR30 with GOV.UK anatomy throughout: Name (required text, `max-w-md`, hint "Must be unique. Use the canonical product name (e.g. \"Tessitura\", not \"Tess\")."); Vendor (required text, `max-w-md`, hint "The supplier organisation (e.g. \"Tessitura Network\")."); Category (required select, `max-w-xs`, options Integrated / Ticketing / Audience management); Deployment model (optional select, `max-w-xs`, options SaaS / Self-hosted / Hybrid, default "Select deployment model (optional)"); Pricing model (optional select, options Subscription / Transaction fee / Licence / Hybrid / Unknown); Geographic focus (optional select, sourced from `SYSTEM_GEOGRAPHIC_FOCUS`); Description (optional textarea full-width, hint "Include typical audience size and sector specialisation."); Membership capability / Donation capability / Reserved seating capability (each required select default Unknown, options Yes / No / Unknown); Source reference (optional, full-width, hint "URL or citation for this record.")
**And** below Source reference a `bg-slate-50 rounded p-3 text-sm text-slate-600` note reads: "Custom attributes are managed via seed data. Full editing will be available in a future update."
**And** required fields use no asterisks; optional fields append "(optional)" in muted `text-slate-500` text — matching v1 UX-DR17

**Given** a staff member navigates to `/systems/:id/edit`
**When** the form renders
**Then** the back link reads `← Back to [System name]` and the page title is "Edit system"
**And** all fields are pre-filled from the fetched System record

**Given** a staff member submits the form with `name` empty
**When** client-side validation fires
**Then** an error summary appears at the top of the form with heading "There is a problem." and a link to the Name field that focuses the input on click
**And** the Name field shows an inline error "Enter the system name" with a red border (`border-red-500`)
**And** the API is not called

**Given** a staff member submits with all required fields populated
**When** `POST /api/systems` (or `PUT /api/systems/:id` for edit) is called
**Then** during the in-flight request the Save button shows a loading indicator and is `disabled`
**And** on success the staff member is redirected to `/systems/:id` with an inline success banner — "System added." for create, "System saved." for edit — `bg-emerald-50 border border-emerald-200 text-emerald-800`, auto-dismissing after 5 seconds with a manual dismiss `×`

**Given** the API returns `409` because `name` already exists
**When** the response is received
**Then** the inline error on the Name field reads "A system with this name already exists" and the error summary lists Name as the offending field
**And** the Save button is re-enabled

**Given** the API returns `400` for any other field-level validation issue
**When** the response is received
**Then** field-level errors from `error.fields` are mapped to the corresponding inputs, the error summary is shown, and the Save button is re-enabled

**Given** a staff member clicks "Delete system" on the detail header (Story 7.5) for a System with zero adopters
**When** the confirmation dialog renders (shadcn/ui `Dialog`)
**Then** the dialog body shows the System name in bold and "This cannot be undone. Any organisations linked to this system must be unlinked first."
**And** the destructive button (`bg-red-600`) reads "Delete system"; the secondary reads "Cancel"
**And** Escape and overlay click dismiss the dialog without action (Radix default)
**And** on confirm the staff member is navigated to `/systems` with an inline "System deleted." banner

**Given** a staff member clicks "Delete system" for a System with adopters
**When** `DELETE /api/systems/:id` returns `409` with `linkedOrganisationCount`
**Then** the dialog body is replaced (in place — no new modal opens) with an error state: "This system is linked to [N] organisations. Remove all organisation links before deleting." plus a "View linked organisations" link that closes the dialog and scrolls to the Adoption evidence panel
**And** the destructive "Delete system" button is hidden in this state; only "Close" remains
**And** no cascade-delete shortcut is exposed (UX-DR42)

---

## Epic 8: Organisation–System Linking & Organisation Re-shape

Staff can link Organisations to Systems via the junction with explicit roles and per-link provenance — and every Organisation surface (list filter sidebar, detail page, form, compare card) is re-shaped to surface system links instead of the old flat provider/CRM fields. This epic is the v1-to-v2 breaking change for the Organisation API contract.

**FRs covered:** FR21′, FR22′, FR10 (reframed), FR11 (folded into FR10)

### Story 8.1: Organisation–System Link API (Junction CRUD)

As a frontend developer,
I want nested REST endpoints under `/api/organisations/:id/systems` for managing junction rows directly,
So that the Organisation form and detail page can attach, update, and remove System links without round-tripping through the parent Organisation save.

**Acceptance Criteria:**

**Given** the v1 controller/service layering is followed
**When** the new endpoints are implemented
**Then** layout is: `backend/src/routes/organisation-systems.js` (mounted under `/api/organisations/:id/systems`), `backend/src/controllers/organisation-system-controller.js`, `backend/src/services/organisation-system-service.js`

**Given** `GET /api/organisations/:id/systems` is called for an existing Organisation
**When** the response is returned
**Then** it has shape `{ data: [...links], error: null, meta: null }` where each link has `{ id (junction.id), role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`
**And** the array is identical in shape to the `systems` array embedded in `GET /api/organisations/:id` — both are produced by the same DTO mapper to keep them aligned
**And** `404` is returned with the v1 envelope when the Organisation does not exist

**Given** `POST /api/organisations/:id/systems` is called with body `{ systemId, role, sourceReference?, note? }`
**When** the controller validates
**Then** `systemId` (UUID present in the `system` table) and `role` (one of the four `SystemRole` enum values) are required; `sourceReference` and `note` are optional
**And** missing or invalid fields return `400` with the standard `fields[]` envelope (e.g. `{ field: "role", message: "Select a role" }`)
**And** a missing Organisation (`:id`) or missing `systemId` returns `404` after the FK existence check at controller level

**Given** the body is valid and `(organisation_id, system_id)` is not yet linked
**When** the row is inserted via Prisma
**Then** the response is `201` with `{ data: { id, role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }, error: null, meta: null }`
**And** `last_updated` is set automatically by Prisma `@updatedAt` (Story 6.3)

**Given** `(organisation_id, system_id)` is already linked and `POST` is retried
**When** the Prisma write hits the `@@unique([organisation_id, system_id])` constraint
**Then** the response is `409` with `{ data: null, error: { message: "This organisation is already linked to that system", fields: [{ field: "systemId", message: "Already linked" }] }, meta: null }`

**Given** `PUT /api/organisations/:id/systems/:linkId` is called with any subset of `{ role, sourceReference, note, systemId }`
**When** the controller validates and the service updates the junction row by `linkId`
**Then** the response is `200` with the full updated link object
**And** changing `systemId` is permitted but unusual — the API does not block it (the UX-DR39 inline editor prefers remove + add for system swaps, but the endpoint itself stays general)
**And** `404` is returned when `:linkId` does not exist or does not belong to `:id`

**Given** `DELETE /api/organisations/:id/systems/:linkId` is called
**When** the row is deleted
**Then** the response is `200` with `{ data: { id }, error: null, meta: null }` mirroring the v1 Organisation delete envelope
**And** `404` is returned when the link does not exist or does not belong to `:id`
**And** delete is unconditional (no soft-delete) — the confirmation dialog lives on the frontend per UX-DR39

**Given** any of the four endpoints
**When** the request body or query attempts to write `last_updated`, `created_at`, or `id`
**Then** those keys are stripped silently before reaching the service — server-managed only

### Story 8.2: Organisation API — Filter and Response Re-shape

As a staff member using the Organisation list and detail,
I want the Organisation API to filter by adopted System (with optional role) and return embedded system links,
So that the Organisation list filter sidebar and detail page can render the v2 surfaces without a separate round-trip.

**Acceptance Criteria:**

**Given** the v1 `GET /api/organisations` accepts `provider` and `crm` query params
**When** the v2 re-shape is applied
**Then** `provider` and `crm` are removed entirely — passing them returns `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field: "provider", message: "Unknown filter" }] }, meta: null }` (not silent ignore — explicit rejection so frontend bugs surface fast)
**And** two new params are accepted: `system` (UUID matching a System) and `system_role` (one of the four `SystemRole` enum values)
**And** `system_role` is only valid when `system` is also present — passing `system_role` alone returns `400` with `{ field: "system_role", message: "Provide a system filter to use a role sub-filter" }`

**Given** `GET /api/organisations?system=<uuid>` is called
**When** the service constructs the SQL
**Then** the filter uses an EXISTS subquery: `WHERE EXISTS (SELECT 1 FROM organisation_system os WHERE os.organisation_id = organisation.id AND os.system_id = $1 AND ($2::text IS NULL OR os.role = $2::"SystemRole"))`
**And** an EXISTS subquery (rather than JOIN) is used so an Organisation linked to multiple Systems is not duplicated when other filters or pagination cross-multiply

**Given** `GET /api/organisations?system=<uuid>&system_role=PRIMARY_TICKETING` is called
**When** the response returns
**Then** only Organisations with at least one link to that System with `role = PRIMARY_TICKETING` are returned
**And** the v1 filters (`q`, `country`, `type`, `membership`, `donation`, `seating`, `page`, `limit`) continue to work unchanged with AND semantics across all filters

**Given** the v1 `GET /api/organisations/:id` response contains `ticketingProvider` and `crmPlatform` flat objects
**When** the v2 re-shape is applied
**Then** those two fields are removed from the response
**And** a new `systems` array is added — each entry has `{ id (junction), role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`
**And** the array is sorted by `role` then `system.name` ascending

**Given** the v1 `POST /api/organisations` and `PUT /api/organisations/:id` accepted `ticketing_provider_id` and `crm_platform_id` in the body
**When** the v2 re-shape is applied
**Then** those keys are *rejected* with `400` (not silently ignored): `{ data: null, error: { message: "Validation failed", fields: [{ field: "ticketing_provider_id", message: "Use POST /api/organisations/:id/systems instead" }] }, meta: null }`
**And** the same rejection applies to a hypothetical `systems: [...]` array in the body — link writes are a separate operation per Story 8.1; the architecture-v2-delta §3.3 alternative is explicitly rejected

**Given** the existing `organisation-list-dto.js` mapped `ticketingProvider` and `crmPlatform`
**When** the DTO is updated for v2
**Then** the new `systems` array is produced from the Prisma `organisation.systems` relation include with the embedded System columns
**And** field naming follows the v1 camelCase API rule

**Given** the v1 frontend hooks (`useOrganisations`, `useOrganisation`) consume the response
**When** they are updated for v2
**Then** they continue to use TanStack Query with the same query keys (`['organisations', filters]` for the list; `['organisations', id]` for detail) — only the response shape changes, and selectors / components are updated to consume `systems[]`

### Story 8.3: Organisation List — Filter Sidebar Re-shape (Adopted System + Role)

As a staff member,
I want to filter the Organisation list by which System an organisation has adopted, with an optional role sub-filter,
So that I can answer procurement-pattern questions like "which UK opera houses use Tessitura as their integrated suite?"

**Acceptance Criteria:**

**Given** the v1 Organisation list filter sidebar contains Provider and CRM dropdowns
**When** the v2 re-shape is applied
**Then** both dropdowns are removed
**And** an "Adopted system" combobox replaces them with placeholder "Search by adopted system…"
**And** typing in the combobox calls `GET /api/systems?q=[term]&limit=20` (debounced ~300ms via a `useSystemSearch` hook to keep filter cache and picker cache from colliding)
**And** each result row shows the System name in `font-medium` and the Category Badge (v2 tokens)
**And** selecting a result sets the URL `system` param to the System's UUID

**Given** an Adopted system is selected
**When** the sidebar re-renders
**Then** a "Role" sub-filter appears directly below the combobox with options: Any role / Primary ticketing / Primary CRM / Integrated suite / Secondary
**And** changing the Role select sets the URL `system_role` param to the corresponding `SystemRole` enum value (or removes it for "Any role")
**And** the Role sub-filter is hidden and `system_role` is cleared from the URL when the Adopted system is cleared (avoiding the dangling `system_role` rejection from Story 8.2)

**Given** any combination of v1 and v2 filters is active
**When** the `ActiveFilterChips` strip renders
**Then** v1 chips for `country`, `type`, `membership`, `donation`, `seating`, `q` still render via their existing handlers
**And** new chips render: `system` ("Adopted system: [System name]" — name looked up from the `useSystems` cache by ID; falls back to "Adopted system: [id]" if the cache is cold while the lookup fetches), `system_role` ("Role: [humanised role]" — only rendered when `system` is also active)
**And** the v1 `provider` and `crm` chip handlers are removed from the component
**And** dismissing the `system` chip also clears `system_role` (they travel together)

**Given** the URL contains `?system=<uuid>&system_role=INTEGRATED_SUITE&country=UK`
**When** a staff member opens this URL directly
**Then** the combobox renders the System pre-selected (with name shown), the Role select renders "Integrated suite" pre-selected, and the Country filter renders "UK" pre-selected
**And** the result table reflects the combined filter

**Given** browser back navigation
**When** a staff member opens System detail and uses back
**Then** all v2 filter state (combobox selection, role sub-filter) is restored from URL params — matching v1 ADR-013 behaviour

### Story 8.4: Organisation Detail — Linked Systems Panel

As a staff member,
I want the Organisation detail page to surface the Organisation's linked Systems grouped by role with per-link provenance and the ability to add, edit, and remove links inline,
So that I can curate the Organisation's stack in the same place I read its facts.

**Acceptance Criteria:**

**Given** the v1 Organisation detail page renders flat "Ticketing provider" and "CRM platform" rows
**When** the v2 re-shape is applied
**Then** those rows are removed from the facts panel
**And** a new "Linked systems" panel renders below the facts panel — using the embedded `systems` array from the v2 detail response (Story 8.2)

**Given** the Organisation has at least one linked System
**When** the Linked systems panel renders
**Then** rows are grouped by `role` — only roles with at least one link appear
**And** each group has a heading rendered as a muted role badge (`text-xs font-medium text-slate-500 uppercase tracking-wide`) with the humanised label ("Primary ticketing", "Primary CRM", "Integrated suite", "Secondary")
**And** within each group, each link row shows: System name as a link to `/systems/:id` (`font-medium`), Vendor (`text-sm text-slate-500`), per-link Source reference (link if `http`, plain text otherwise, "—" if null), per-link Note (truncated to one line with full text in a tooltip, "—" if null), per-link Last updated (`text-xs text-slate-500`), and right-aligned actions: "Edit" (secondary text link) and "Remove" (ghost destructive)

**Given** a staff member clicks "Edit" on a link row
**When** an inline dialog (shadcn/ui `Dialog`) opens
**Then** it contains the same fields as the form-row anatomy: a System combobox (pre-selected with the current System, search-as-you-type identical to UX-DR37), a Role select (pre-selected with the current role), a Source reference text input (pre-filled), and a Note textarea (pre-filled)
**And** the dialog actions are "Save" (primary) and "Cancel" (secondary)
**And** Save calls `PUT /api/organisations/:id/systems/:linkId` with the diff of changed fields and on success updates the panel without a full page reload (TanStack Query cache invalidation on `['organisations', orgId]`)
**And** Cancel and Escape dismiss without saving

**Given** a staff member clicks "Remove" on a link row
**When** the confirmation dialog opens
**Then** the body reads "[System name] will be unlinked from [Organisation name]. This cannot be undone."
**And** the destructive button reads "Remove link" (`bg-red-600`); the secondary reads "Cancel"
**And** Escape and overlay click dismiss without action (Radix default)
**And** on confirm `DELETE /api/organisations/:id/systems/:linkId` is called and on success the panel updates without page reload; an inline "Link removed." banner is shown above the panel for 5 seconds

**Given** the Linked systems panel renders below all role groups
**When** the "Add system" button is clicked
**Then** the same inline dialog opens with empty fields (System combobox empty, Role select empty, source and note empty)
**And** a `409 Conflict` from the API (the System is already linked to this Organisation) surfaces as an inline error on the System combobox: "This system is already linked to this organisation"

**Given** the Organisation has zero linked Systems
**When** the panel renders
**Then** the body reads "No systems linked yet." with an "Add system →" inline action that opens the same Add dialog

**Given** the Organisation has ≥2 linked Systems
**When** the panel finishes rendering
**Then** a ghost link "Compare these systems →" appears beneath the role groups (UX-DR41, fully implemented in Story 9.3)

### Story 8.5: Organisation Form — Linked Systems Editor

As a staff member,
I want to manage the Organisation's System links in a row-based editor section on the create/edit form,
So that I can stand up a new Organisation's full stack — or rework an existing one — in a single workflow.

**Acceptance Criteria:**

**Given** the v1 Organisation form had two single-select dropdowns for Provider and CRM
**When** the v2 re-shape is applied
**Then** both dropdowns are removed
**And** a new section is rendered below the core fields with heading "Linked systems" and a hint reading "Link this organisation to the systems it uses. Add a source reference and role for each."

**Given** the Linked Systems editor section renders
**When** its row anatomy is inspected
**Then** each row contains: a System combobox (search-as-you-type via `GET /api/systems?q=&limit=20`), a Role select (Primary ticketing / Primary CRM / Integrated suite / Secondary), a Source reference text input, a Note textarea, and a `× Remove` ghost destructive button
**And** an "Add system" secondary button below all rows appends a new empty row when clicked
**And** removing a row requires no confirmation (the form has not saved yet — undo is just clicking Add system again)

**Given** a row has a System selected but no Role
**When** the form is submitted
**Then** an inline error appears under that row's Role select: "Select a role for [System name]"
**And** the error summary at the page top includes a link to the Role select that focuses it on click
**And** the API is not called

**Given** two rows reference the same System
**When** the form is submitted
**Then** an inline error appears under each duplicate row's System combobox: "This system is already linked. Remove the duplicate row."
**And** the error summary lists the duplicate rows
**And** the API is not called

**Given** the form is submitted with all rows valid
**When** the orchestration runs
**Then** the sequence is: (1) `PUT /api/organisations/:id` (or `POST /api/organisations` for create) with only the Organisation core fields — server-managed keys (`ticketing_provider_id`, `crm_platform_id`, `last_updated`, `created_at`) are stripped before submission so the v2 API rejection from Story 8.2 is never tripped; (2) on success, the existing links fetched on form load are diffed against the current row state — new rows generate `POST /api/organisations/:id/systems`, changed rows generate `PUT /api/organisations/:id/systems/:linkId`, removed rows generate `DELETE /api/organisations/:id/systems/:linkId`; (3) all link writes run in parallel via `Promise.allSettled`

**Given** the orchestration completes with all writes succeeding
**When** the form save concludes
**Then** the staff member is redirected to `/organisations/:id` with the standard "Organisation saved." (or "Organisation added." for create) success banner — same v1 pattern

**Given** the Organisation `PUT`/`POST` succeeds but one or more link writes fail (e.g. a `409` on a duplicate link, a network blip)
**When** the orchestration finishes
**Then** the staff member is redirected to `/organisations/:id` with a *page-level warning banner* (`bg-amber-50 border border-amber-200 text-amber-800`): "Organisation saved, but one or more system links could not be updated. Check the linked systems panel."
**And** the banner does not auto-dismiss — it has a manual `×` only — because the user must take action

**Given** the Organisation `PUT`/`POST` itself fails
**When** the orchestration aborts before any link writes
**Then** the form remains on the page, the error summary and field-level errors are shown, no link writes are issued, and the Save button is re-enabled — same as the v1 failure pattern

### Story 8.6: OrganisationCard — System Chips and Compare-View Updates

As a staff member,
I want the Organisation card (used on Compare and as a summary surface) to show linked Systems as compact role-tagged chips,
So that I can read an Organisation's stack at a glance instead of scanning two separate flat fields.

**Acceptance Criteria:**

**Given** the v1 `OrganisationCard` renders flat "Ticketing provider" and "CRM platform" rows
**When** the v2 re-shape is applied
**Then** those two rows are removed
**And** in the *card summary* surfaces (e.g. wherever the card is used as a compact list item), a "Systems" chip strip replaces them: each chip shows a Lucide role icon + the System name in `text-xs text-slate-600 bg-slate-100 rounded px-2 py-0.5`
**And** the role icon mapping is: `PRIMARY_TICKETING` → `Ticket`, `PRIMARY_CRM` → `Users`, `INTEGRATED_SUITE` → `Layers`, `SECONDARY` → `Link2`
**And** the strip caps at 3 chips with "+N more" overflow in `text-xs text-slate-400`
**And** chips are informational — they are not links (the card itself is the navigation target)
**And** when no Systems are linked, the slot reads "No systems linked" in `text-xs text-slate-400 italic`

**Given** the *Organisation Compare view* uses the same component
**When** the compare-column variant is rendered (`/compare/organisations`)
**Then** the cap-at-3 rule is lifted — all linked systems are listed (compare is a detail-level surface)
**And** each entry shows: a role badge (`text-xs`, colour-tied to the System category badge tokens for visual consistency) + the System name as a link to `/systems/:id`
**And** the empty case still reads "No systems linked" in muted italic

**Given** the card consumers
**When** they pass the `systems` array from the v2 detail response
**Then** the component handles both summary and compare-view variants via a `variant` prop (`"summary"` | `"compare"`); the summary variant applies the cap, the compare variant does not
**And** the prop default is `"summary"` so existing v1 list-card usages render the cap-at-3 strip without changes other than the prop being optional

---

## Epic 9: System-to-System Compare

Staff select 2–4 Systems from the System list, navigate to a stable shareable `/compare/systems?ids=...` URL, and read aligned universal-core attributes plus a union panel of custom attributes — closing the headline 60-second anchor journey from PRD v2 Journey 1.

**FRs covered:** FR-S7

### Story 9.1: Compare Route Shell — `/compare/systems` and `/compare/organisations`

As a staff member,
I want a stable, shareable URL that loads a side-by-side System compare view for the IDs in the URL,
So that I can capture a comparison in a meeting note, share it, or return to it later without rebuilding selection.

**Scope:** This story wires **both** compare route families (`/compare/systems` and `/compare/organisations`) and removes the ambiguous v1 `/compare` path — enabling Story 7.3 `CompareSelectionBar` targets to resolve without 404s.

**Acceptance Criteria:**

**Given** the v2 routing adds `/compare/systems` and retains `/compare/organisations` (architecture-v2-delta §4.6)
**When** the routes are wired
**Then** the Organisation compare view is registered only at `/compare/organisations` — it reads `ids` from `useSearchParams` the same way v1 read them on `/compare`, but the path segment is explicit so bookmarks are unambiguous alongside System compare
**And** the legacy `/compare` and `/compare?ids=...` routes are removed — visiting `/compare` or `/compare?ids=...` shows a 404 page with links to `← Go to organisations` and `Go to systems` (both primary navigation targets)
**And** the System compare path accepts `?ids=<uuid1>,<uuid2>,...` with 2–4 valid Systems

**Given** a staff member navigates to `/compare/organisations?ids=<a>,<b>`
**When** the Organisation compare page loads
**Then** parallel `GET /api/organisations/:id` requests fire via `Promise.all` — TanStack Query keyed by `['organisations', id]` as in v1 Epic 4 — and all Epic 4 compare semantics (aligned cards, URL as source of truth for `ids`, error handling for missing orgs) apply unchanged apart from the path segment

**Given** a staff member navigates to `/compare/systems?ids=<a>,<b>,<c>`
**When** the page loads
**Then** three parallel `GET /api/systems/:id` requests fire via `Promise.all` — TanStack Query keyed by `['systems', id]` so each request can also satisfy a future System detail navigation cache hit
**And** the page renders only after all promises resolve
**And** any single 404 reduces the valid-systems count; if fewer than 2 valid Systems remain, an error state renders: "One or more systems could not be found. [Return to systems list →]"

**Given** the URL param is the source of truth
**When** a column is removed from the compare via the `×` action on a `SystemCard` (Story 9.2)
**Then** the URL is updated in place with the column's ID dropped from the `ids` param
**And** the page re-renders without a full reload (the data for the remaining columns is already in the TanStack Query cache)
**And** sharing the post-removal URL recreates the exact compare set

**Given** the URL `?ids=` is empty or missing
**When** the page renders
**Then** an empty state shows: "Select systems from the list to compare them here. [Go to systems →]"

**Given** the page is loading
**When** any of the parallel fetches has not yet resolved
**Then** a skeleton matching the compare layout (left attribute label column + 2–4 placeholder cards) is rendered — no full-page spinner

**Given** the layout is rendered
**When** its structure is inspected
**Then** the left attribute label column is fixed (sticky left); cards are arranged in a horizontal row to its right; card headers are sticky on vertical scroll; the page container is `max-w-7xl mx-auto`; on viewports narrower than ~1024px the cards row scrolls horizontally inside the container while the label column stays visible

### Story 9.2: SystemCard Component (Compare Column)

As a staff member,
I want each System in the compare to render as a card with sticky header, full attribute set aligned to the label column, and explicit "—" markers for missing values,
So that I can scan rows across systems without ever seeing a blank cell that I might confuse with missing data versus "not yet loaded".

**Acceptance Criteria:**

**Given** the `SystemCard` component is built
**When** its anatomy is inspected
**Then** the sticky header contains the System name (`text-lg font-semibold`), the Category Badge (v2 tokens), and the Vendor (`text-sm text-slate-500`)
**And** the right-aligned header actions are: an "Edit" link to `/systems/:id/edit` (text-sm text-blue-600) and an `×` ghost icon button that removes this System from the compare (updates URL `ids` param per Story 9.1)

**Given** the attribute cells render aligned to the left label column
**When** their values are inspected
**Then** scalar fields render as plain text; null fields render `—` in `text-slate-300` (the never-blank rule from UX-DR33)
**And** the three capability rows (Membership, Donation, Reserved seating) use `CapabilityBadge` labelled variant
**And** the Description cell truncates to 4 lines with a "Show more" affordance that expands to full prose; "Show less" collapses; truncation state is local to each card (collapsing one card does not affect another)

**Given** the System has non-null `customAttributes`
**When** the Custom attributes section of the card renders
**Then** it shows one row per label *from the union panel computed at the page level* (Story 9.3) — for labels this card has data for, the row shows `value` plus a source link if available; for labels in the union but absent on this card, the row shows `—`

**Given** the card footer renders
**When** its contents are inspected
**Then** the Source reference is rendered (link if `http`, plain text otherwise, "None recorded" if null)
**And** the Last updated is shown as absolute date + relative in parentheses (`text-xs text-slate-500`)
**And** an "Adopted by N organisations" line appears below the provenance — `N` is `system.organisations.length` from the API response; the text is a link to `/systems/:id` (where the Adoption evidence panel lists them)
**And** if N = 0 the line reads "Not yet adopted" in muted text

**Given** every cell in the card
**When** it is rendered with any value combination
**Then** no cell is ever truly blank — every row has either an explicit value, a "—", a CapabilityBadge, or "Not recorded" / "Not yet adopted" copy
**And** this rule applies uniformly across summary, capability, custom-attribute, and footer sections

### Story 9.3: Compare Union Panel and Contextual Compare Entry Points

As a staff member,
I want the Compare page's Custom Attributes panel to merge labels across all selected Systems and contextual links to take me from Organisation surfaces straight into a relevant System compare,
So that custom attributes are comparable side-by-side and I never have to re-pick Systems I have just been reading about.

**Acceptance Criteria:**

**Given** the Compare page (`/compare/systems`) has resolved 2–4 Systems
**When** the left attribute label column renders
**Then** sections appear in this order with horizontal divider rules between them: Identity (Name / Vendor / Category / Deployment / Pricing / Geographic focus), Capabilities (Membership / Donation / Reserved seating), Description, Provenance (Source reference / Last updated), Additional attributes (the union panel), Adopted by

**Given** the union panel computation
**When** it builds the label list
**Then** it gathers every distinct `label` across every selected System's `customAttributes` array, normalising via case-insensitive equality (e.g. "B Corp certified" and "b corp certified" merge to one row, presentation uses the first-seen casing)
**And** rows are ordered by first-seen across the cards (left-to-right scan), so the panel reads stably

**Given** a label is present in some Systems but not all
**When** the row renders across cards
**Then** the cards that have the label show their `value` + source link; the cards that do not show "—" in `text-slate-300`
**And** no semantic deduplication is attempted — that is a data-quality concern, not a display concern (UX D10 §2)

**Given** every selected System has `customAttributes` null or empty
**When** the union panel would render
**Then** the entire "Additional attributes" section is hidden — no empty state shown (matching the System detail rule in UX-DR29)

**Given** an Organisation detail page (Story 8.4) has ≥2 linked Systems
**When** its Linked systems panel finishes rendering
**Then** a ghost link "Compare these systems →" appears beneath the role groups (`text-sm text-blue-600 hover:text-blue-800`)
**And** clicking it collects all distinct `system.id` values from the linked rows and navigates to `/compare/systems?ids=<id1>,<id2>,...`

**Given** an Organisation has 5+ linked Systems
**When** the contextual link renders
**Then** the copy changes to "Compare the 4 most recently updated systems →"
**And** the `ids` param contains the IDs of the 4 Systems with the highest `lastUpdated` on their *junction row* (per-link last_updated, not the System's own — this captures most recent adoption activity)

**Given** an Organisation has 0 or 1 linked System
**When** the panel renders
**Then** the contextual link is absent — there is nothing meaningful to compare

**Given** the Organisation Compare page (`/compare/organisations`) has rendered 2–4 Organisations
**When** the union of distinct `system.id` values across the compared Organisations is computed (client-side from the already-fetched detail responses)
**Then** if the union is 2, 3, or 4: a contextual ghost link "Compare systems used by these organisations →" renders below the compare cards in a `border-t border-slate-200 pt-4 mt-6` strip, navigating to `/compare/systems?ids=<union>`
**And** if the union is 0 or 1: the link is absent
**And** if the union is 5+: a muted note replaces the link: "These organisations use [N] different systems. Open the [System list →] to select which to compare."

**Given** a staff member navigates from an Organisation surface into `/compare/systems` via a contextual link
**When** the System compare page renders
**Then** it behaves identically to a list-driven entry — the `ids` URL is the source of truth, columns are removable, and the page is shareable

---

## Epic 10: Legacy Schema Decommission & v2 Documentation

Migration C drops the legacy FK columns and the `ticketing_provider` / `crm_platform` lookup tables. The corresponding meta endpoints and frontend hook helpers are removed in the same window. README and `docs/decisions.md` are updated for the v2 world.

**FRs covered:** *(no new FRs — completes the structural pivot)*

### Story 10.1: Migration C — Drop Legacy Lookup Tables and FK Columns

As a backend developer,
I want the legacy `ticketing_provider_id` / `crm_platform_id` columns and their lookup tables dropped after Epics 6–9 are deployed and stable,
So that the schema reaches its v2 target state with no dead columns or orphan tables.

**Acceptance Criteria:**

**Given** Epics 6, 7, 8, and 9 are merged and deployed and Migration B's backfill has been verified in the target environment
**When** `backend/src/prisma/schema.prisma` is edited to remove `ticketing_provider_id`, `crm_platform_id`, the `ticketing_provider` and `crm_platform` relations on `Organisation`, and the entire `TicketingProvider` and `CrmPlatform` models
**Then** `npx prisma migrate dev --name drop_legacy_lookups --create-only` generates a migration whose SQL contains: `ALTER TABLE organisation DROP CONSTRAINT organisation_ticketing_provider_id_fkey; ALTER TABLE organisation DROP CONSTRAINT organisation_crm_platform_id_fkey; ALTER TABLE organisation DROP COLUMN ticketing_provider_id; ALTER TABLE organisation DROP COLUMN crm_platform_id; DROP TABLE ticketing_provider; DROP TABLE crm_platform;`

**Given** the migration is reviewed
**When** it is compared against the "no destructive ops in the same migration as data backfill" rule
**Then** it is purely destructive — no INSERT / UPDATE / SELECT … INTO statements, no schema additions; this matches the three-migration architecture rule (additive → backfill → destructive)

**Given** the migration is applied in a non-throwaway environment
**When** the deployment runbook is followed
**Then** a database backup is taken *before* the migration runs (per the architecture-v2-delta §6.5 rollback-strategy note); the README deployment section in Story 10.3 calls this out explicitly

**Given** Migration C has applied
**When** the schema is inspected
**Then** the `organisation` table has no `ticketing_provider_id` or `crm_platform_id` columns
**And** the `ticketing_provider` and `crm_platform` tables no longer exist
**And** all `organisation_system` rows are intact (the cascade FK on `organisation_id` was unaffected; `system_id` was untouched)
**And** all System rows are intact

**Given** any code path still references the dropped models or columns
**When** the test suite or `npx prisma generate` runs
**Then** the failure is loud — Prisma client generation fails compile-time if `TicketingProvider` / `CrmPlatform` are still imported in service code
**And** any such references must be removed in the same PR — Migration C is the *last* migration in the sequence; merging it requires the consuming code to already be clean

**Given** `prisma migrate reset` is run in a fresh environment after Migration C
**When** the seed runs
**Then** it produces the same 11 Systems + populated `organisation_system` table as Story 6.3 — without any reference to the dropped lookup tables (the seed must already be v2-only by Story 6.3, this story just verifies the reset flow stays green)

### Story 10.2: Drop Legacy Meta Endpoints and Frontend Helpers

As a frontend developer,
I want the legacy `/api/meta/ticketing-providers` and `/api/meta/crm-platforms` endpoints and the corresponding `fetchProviders` / `fetchCrms` hook helpers removed,
So that no dead surface area remains after the v2 pivot completes.

**Acceptance Criteria:**

**Given** Migration C from Story 10.1 has applied and the lookup tables no longer exist
**When** `backend/src/routes/meta.js`, `backend/src/controllers/meta-controller.js`, and any associated meta service rows are reviewed
**Then** the routes for `GET /api/meta/ticketing-providers` and `GET /api/meta/crm-platforms` are removed
**And** the controller no longer exports their handlers
**And** any imports of `TicketingProvider` or `CrmPlatform` from `@prisma/client` in the meta layer are deleted

**Given** the legacy paths are no longer mounted
**When** a client requests `GET /api/meta/ticketing-providers` or `GET /api/meta/crm-platforms`
**Then** the response is `404` with the standard envelope `{ data: null, error: { message: "Route not found" }, meta: null }` — the absence is explicit rather than silent

**Given** `GET /api/meta/organisation-types` is the only remaining meta endpoint
**When** it is called
**Then** it continues to return the seeded organisation types unchanged from v1

**Given** `frontend/src/api/meta.js` previously exported `fetchProviders` and `fetchCrms`
**When** the v2 cleanup is applied
**Then** both functions are deleted
**And** `frontend/src/hooks/useMetaData.js` (or equivalent) no longer exposes provider/CRM accessors
**And** every consumer of those hooks has already been migrated in Epic 8 — a code search confirms zero remaining imports of the deleted symbols

**Given** the System list and Organisation list filter sidebars
**When** they are inspected
**Then** the System filter sidebar uses `useSystems` directly (or the `useSystemSearch` debounced wrapper from Story 8.3) — never the deleted helpers
**And** the Organisation filter sidebar's Adopted system combobox uses `useSystemSearch` per Story 8.3

### Story 10.3: README and `docs/decisions.md` v2 Updates

As a team member taking over the project,
I want the README and decisions log updated to reflect the v2 world,
So that I can run the full app, smoke-test both catalogues, and understand the binding architectural calls without reading the delta documents.

**Acceptance Criteria:**

**Given** the v1 README contained setup steps, ports, smoke-test checklist, threat-model note, and the known-limitations section
**When** the v2 README updates are applied
**Then** the smoke-test checklist is extended to cover both catalogues: (1) `GET /api/health` returns OK; (2) `GET /api/meta/organisation-types` returns reference data; (3) `/organisations` loads with seeded sample organisations; (4) `/systems` loads with the 11 seeded Systems; (5) at least one `/api/organisations` filter combination including `system=<uuid>` returns a non-empty result; (6) `/compare/systems?ids=<a>,<b>` renders SystemCards for two seeded Systems; (7) creating a System via `/systems/new` saves and redirects to detail; (8) linking a System to an Organisation via the form saves and shows on the Organisation detail page

**Given** the architecture-v2-delta §6.5 rollback-strategy note about Migration C
**When** the README deployment section is updated
**Then** it explicitly states: "Migration C (`drop_legacy_lookups`) is forward-only. Take a database backup before applying it in any non-throwaway environment — there is no SQL inverse for the dropped FK data."
**And** the section names the three migrations in order so the operator can recognise which one is which

**Given** the v2 navigation structure
**When** the README adds a brief navigation reference
**Then** it lists the v2 routes: `/organisations`, `/organisations/new`, `/organisations/:id`, `/organisations/:id/edit`, `/systems`, `/systems/new`, `/systems/:id`, `/systems/:id/edit`, `/compare/systems`, `/compare/organisations` — with a one-line description of each

**Given** the v1 known-limitations section
**When** the v2 update is applied
**Then** the list is refreshed: no authentication (internal deployment only — unchanged); desktop-optimised, no mobile layout (unchanged); no CSV export (post-MVP, unchanged); no external integrations (unchanged); custom-attribute editing for Systems is read-only in MVP (added — points at Growth); Mode B (organisation-filtered System compare) is Growth (added)

**Given** `docs/decisions.md` already contains v1 entries
**When** the v2 entries are added per architecture-v2-delta §8
**Then** seven new entries are recorded with rationale: (1) OrganisationSystem hard-deletes on unlink — no soft-delete or history table; (2) System custom attributes stored as JSON on `System.custom_attributes`, not a separate table; (3) System name is unique — vendor disambiguation goes in `vendor`; (4) three-migration sequence (additive → backfill → destructive) is mandatory; (5) no batch endpoint for compare — parallel `GET /api/systems/:id` calls; (6) selection context split into Organisation and System; (7) Compare paths are `/compare/systems` and `/compare/organisations` — v1 `/compare?ids=` bookmarks break, acceptable for an internal MVP

**Given** Stories 6.3 (system-geographic-focus dual maintenance) and 7.1 (multi-value `category` query param) introduced their own decision-worthy choices
**When** `docs/decisions.md` is reviewed
**Then** entries also exist for: the `system-geographic-focus.js` dual-maintenance rule (mirroring the v1 country-list rule); and the multi-value query-param convention introduced by `?category=A&category=B` (the first multi-value list filter in the API)

**Given** the v2 plan is now complete
**When** an implementation-readiness re-run is needed (per prd-v2-delta §7)
**Then** the README's "After v2 changes ship" handoff section instructs: re-run the readiness check via the `bmad-check-implementation-readiness` skill against this updated [epics.md](epics.md), [prd-v2-delta.md](prd-v2-delta.md), [architecture-v2-delta.md](architecture-v2-delta.md), and the v2-extended [ux-design-specification.md](ux-design-specification.md) — the resulting report supersedes the v1 readiness report from 2026-04-02

---

## Requirements Inventory — v3 Delta

### Modified Functional Requirements

- **FR17′** *(extends v1 FR17)*: A staff member can view a per-field source reference for any data point that has one, distinct from the record-level source.
- **FR18′** *(extends v1 FR18)*: A staff member can attach a source URL alongside any data-point input on the System or Organisation form. URLs are validated as `http(s)://` schemes.
- **FR-S9′** *(replaces v2 FR-S9)*: A staff member can view, add, edit, and remove a System's custom attributes as `{ label, value, sourceReference }` triples through the System form. Attributes display read-only on the System detail and Compare pages.

### New System Capability Functional Requirements

```
FR-S11: A staff member can record a System's season subscriptions capability using YES/NO/UNKNOWN.
FR-S12: A staff member can record a System's dynamic pricing capability using YES/NO/UNKNOWN.
FR-S13: A staff member can record a System's multi-venue support capability using YES/NO/UNKNOWN.
FR-S14: A staff member can record a System's marketing automation capability using YES/NO/UNKNOWN.
FR-S15: A staff member can record a System's accessibility features capability using YES/NO/UNKNOWN.
FR-S16: A staff member can filter Systems by any of the five new capability flags.
```

### New List Sorting Functional Requirements

```
FR-32:  A staff member can sort the Organisation list by name, country, lastUpdated, capacity,
        or organisationType — ascending or descending. The sort persists in the URL.
FR-S17: A staff member can sort the System list by name, vendor, category, lastUpdated, or
        geographicFocus — ascending or descending. The sort persists in the URL.
```

### New Duplicate Prevention Functional Requirements

```
FR-33:  The system rejects an Organisation create or update that would result in two rows
        sharing the same (name, city, country). The error response is 409 Conflict with a
        clear message naming the conflicting record.
FR-34:  When a staff member types an Organisation name on the create form, the form runs
        an asynchronous fuzzy-match lookup and surfaces a non-blocking warning panel listing
        similar existing organisations (name + city). The user can dismiss the warning and
        continue, or cancel and amend.
```

### Additional Requirements (Architecture v3)

- **`field_sources` JSON column** on both `System` and `Organisation`. Shape: `{ "<fieldName>": "<url>" }`. Keys validated against per-entity allow-list; values validated as `^https?://`. Rejected at controller with 400 on shape failure.
- **Per-entity field source allow-lists** in `backend/src/lib/field-source-keys.js` (camelCase keys matching DTO output). System: 13 keys (category, vendor, deploymentModel, pricingModel, geographicFocus, plus eight capability flags). Organisation: 7 keys (country, city, organisationType, three v1 capabilities, capacity).
- **Five new System capability columns** of type `CapabilityState` defaulting to `UNKNOWN` (`season_subscriptions_capability`, `dynamic_pricing_capability`, `multi_venue_support_capability`, `marketing_automation_capability`, `accessibility_features_capability`).
- **Composite unique constraint `@@unique([name, city, country])`** on `Organisation`. PostgreSQL treats `NULL city` as distinct — accepted (looser semantics, warning UX catches the rest).
- **Three independent additive Prisma migrations** (`add_field_sources`, `add_system_capabilities_v3`, `organisation_composite_unique`). None requires backfill. Migration C requires a pre-flight collision check against existing data before applying.
- **List sort allow-lists** in `backend/src/lib/sort-allowlists.js`. Organisation: name (default), country, lastUpdated, capacity, organisationType. System: name (default), vendor, category, lastUpdated, geographicFocus. Service translates to Prisma `orderBy`. Default order: `asc`. Invalid `sort` or `order` returns 400.
- **New endpoint `GET /api/organisations/check-similar`** with `name` (required, min 2 chars) and `excludeId?` query params; returns up to 5 minimal `{ id, name, city, country }` matches. Reuses existing `pg_trgm` GIN index on `organisation.name`.
- **Custom attributes editable** via `POST` and `PUT /api/systems/:id` body field `customAttributes`. Validation: array of `{ label: non-empty string ≤200, value: non-empty string ≤200, sourceReference?: ^https?:// ≤500 }`. Empty rows stripped on submit (label and value both blank).

### UX Design Requirements (v3 Delta — UX-DR43–UX-DR50)

```
UX-DR43: Implement FieldSourceIcon component — Lucide Info icon at text-slate-400 hover:text-blue-600
         size-3.5 inline next to a field value when the record has a source URL for that field; click
         opens URL in new tab; tooltip shows URL; renders null when no source — no fallback to row-
         level source.
UX-DR44: Implement FieldWithSource form wrapper — wraps an existing field input child and exposes a
         paired half-width "Source URL (optional)" input below; updates parent fieldSources state
         keyed by camelCase fieldName; client-side validation accepts http(s):// or empty.
UX-DR45: Implement CustomAttributeEditor on SystemFormPage — repeating row component with three
         text inputs (Label max 200, Value max 200, Source URL max 500) plus ghost Remove button per
         row; "+ Add custom attribute" button below; rows where label and value are both blank are
         stripped on submit; row order preserved across edits.
UX-DR46: Implement SortDropdown — single select aligned to the right of the search input on
         OrganisationListPage and SystemListPage; options drawn from per-entity allow-list; selection
         updates URL params (?sort=&order=); changing sort writes ?page=1 explicitly.
UX-DR47: Implement five new System capability rows on SystemFormPage / SystemDetailPage / SystemCard
         / SystemListPage filter sidebar — rendered identically to existing capability rows
         (CapabilityBadge); list filter sidebar groups capability filters under a collapsible "More
         capabilities" disclosure to avoid sidebar overflow.
UX-DR48: Implement SimilarOrganisationsWarning panel on OrganisationFormPage create mode — async
         fuzzy lookup on name blur (≥3 chars, debounced 300ms); panel renders aria-live="polite"
         between fields and submit; lists up to 5 matches as "<name> — <city>, <country>"; Continue
         button sets userAcknowledgedDuplicates flag; Cancel and amend button clears name and
         refocuses; warning re-runs on next blur.
UX-DR49: Implement 409-conflict inline error on OrganisationFormPage — server response from
         Organisation composite-unique violation surfaces as inline error below name field with
         conflict message ("Conflicts with existing organisation in <city>, <country>"); distinct
         from the soft warning panel above.
UX-DR50: Implement field source icons in compare views (SystemComparePage and ComparePage) — column-
         local rendering: a record's ⓘ icon appears only on rows where that record has a source for
         that field, never inherited from row-level reference.
```

### v3 FR Coverage Map

```
FR17′:  Epic 11 — view per-field source reference (detail and compare ⓘ icons)
FR18′:  Epic 11 — attach per-field source URL on form
FR-S9′: Epic 13 — full custom-attribute CRUD via System form
FR-S11–FR-S15: Epic 12 — five new System capability flags
FR-S16: Epic 12 — filter Systems by new capabilities
FR-32:  Epic 14 — sort Organisation list
FR-S17: Epic 14 — sort System list
FR-33:  Epic 15 — composite-unique Organisation rows
FR-34:  Epic 15 — fuzzy-match warning on create
```

---

## Epic List — v3 Additions

### Epic 11: Source per Data Point
Material data points on Systems and Organisations carry their own source URL via a `field_sources` JSON column. Detail and compare pages render a small ⓘ icon next to each sourced field; forms expose an inline "Source URL" input next to each main input. Seed data is researched and populated for the 11 Systems and the sample Organisations.
**FRs covered:** FR17′, FR18′
**Includes:** Migration A (add `field_sources Json?` to System and Organisation), per-entity allow-list constants, controller validation (allow-list keys, URL scheme), DTO updates (System and Organisation list/detail expose `fieldSources`), `FieldSourceIcon` component, `FieldWithSource` form wrapper applied across SystemFormPage and OrganisationFormPage, ⓘ icon rendering on SystemDetailPage / OrganisationDetailPage / SystemComparePage / ComparePage, seed-data research pass populating field_sources for 11 systems and sample organisations.

### Epic 12: System Capability Expansion
Five sector-relevant capability flags added to System: `season_subscriptions`, `dynamic_pricing`, `multi_venue_support`, `marketing_automation`, `accessibility_features`. All reuse `CapabilityState` and integrate with Epic 11's `field_sources` so each new flag carries its own source.
**FRs covered:** FR-S11, FR-S12, FR-S13, FR-S14, FR-S15, FR-S16
**Includes:** Migration B (5 new `CapabilityState` columns on System), DTO + API filter extensions, SystemFormPage / SystemDetailPage / SystemCard / SystemListPage filter sidebar UI updates with collapsible "More capabilities" group, seed catalogue research populating values + field sources.

### Epic 13: Custom Attribute Editor
The dormant `system.custom_attributes Json?` column gains a CRUD path through the System form. No schema change. Users add, edit, and remove `{ label, value, source URL }` triples directly in the form; the existing detail and compare rendering is unchanged.
**FRs covered:** FR-S9′
**Includes:** API contract extension on `POST` and `PUT /api/systems[/:id]` accepting `customAttributes` array with shape validation, `CustomAttributeEditor` component, SystemFormPage integration, empty-row stripping on submit.

### Epic 14: List Sorting
Both Organisation and System list endpoints accept `?sort=<field>&order=<asc|desc>` against per-entity allow-lists. UI dropdowns expose the sort selection; URL persistence keeps deep-links shareable. Pagination resets to page 1 when sort changes.
**FRs covered:** FR-32, FR-S17
**Includes:** Sort allow-list constants, organisation-service / system-service `orderBy` translation including relation sorts (organisationType / vendor), `SortDropdown` component, hook updates (`useOrganisations` / `useSystems`) to pass sort params and reset page on change, OrganisationListPage and SystemListPage UI integration.

### Epic 15: Organisation Duplicate Guard
Organisation create gains a soft + hard duplicate guard: an asynchronous fuzzy-match warning panel surfaces similar existing organisations before submit, and a composite unique DB constraint `(name, city, country)` rejects exact duplicates with a 409. Systems already have unique-on-name from ADR-020 — no changes to Systems.
**FRs covered:** FR-33, FR-34
**Includes:** Migration C (`@@unique([name, city, country])` on Organisation) with pre-flight collision check task, controller mapping of Prisma P2002 to 409 with explicit conflict message, `GET /api/organisations/check-similar` endpoint reusing `pg_trgm`, `useSimilarOrganisations` hook with 300ms debounce, `SimilarOrganisationsWarning` panel on OrganisationFormPage create mode, inline 409 error mapping on submit.

---

## Epic 11: Source per Data Point

Material data points on Systems and Organisations carry their own source URL via a `field_sources` JSON column. The row-level `source_reference` stays as a general fallback but no longer auto-applies to specific claims.

**FRs covered:** FR17′, FR18′

### Story 11.1: Migration A — Add `field_sources` Column to System and Organisation

As a backend developer,
I want a nullable `field_sources Json?` column on both `System` and `Organisation`,
so that per-data-point provenance can be persisted without a schema sprawl.

**Acceptance Criteria:**

**Given** `backend/src/prisma/schema.prisma` is edited to add `field_sources Json?` on both `System` and `Organisation`
**When** `npx prisma migrate dev --name add_field_sources --create-only` runs
**Then** the generated migration SQL contains exactly two `ALTER TABLE … ADD COLUMN "field_sources" JSONB;` statements (one per table) and nothing else
**And** no other column is altered, no enum is created, no index is changed

**Given** the migration is applied with `npx prisma migrate dev`
**When** the schema is inspected
**Then** both `system.field_sources` and `organisation.field_sources` exist and accept `NULL`
**And** every existing row has `field_sources = NULL`
**And** all other columns and indexes on both tables are unchanged

**Given** the existing test suite runs after the migration
**When** `cd backend && npm test` completes
**Then** every existing test passes — the additive migration must not change runtime behaviour for any current code path

**Given** Prisma client is regenerated
**When** services attempt to read or write the new field on either model
**Then** the type system surfaces it as `Prisma.JsonValue | null` — confirming the column is wired through the generated client

### Story 11.2: API Contract — Accept and Return `fieldSources`

As a backend developer,
I want `POST` and `PUT` endpoints on both Systems and Organisations to accept a `fieldSources` object validated against a per-entity allow-list, and detail/list responses to include `fieldSources`,
so that the frontend can read and write per-field provenance through the same DTOs it already uses.

**Acceptance Criteria:**

**Given** `backend/src/lib/field-source-keys.js` is created
**When** the file is inspected
**Then** it exports `SYSTEM_FIELD_SOURCE_KEYS` (a frozen array of exactly 13 camelCase strings) and `ORGANISATION_FIELD_SOURCE_KEYS` (a frozen array of exactly 7 camelCase strings) per architecture-v3-delta §2.4
**And** both arrays contain only camelCase keys that match the corresponding DTO output field names

**Given** a `POST /api/systems` request with body containing `fieldSources: { "pricingModel": "https://example.com/page" }`
**When** the controller processes it
**Then** the request is accepted (201)
**And** the response body's `fieldSources` field equals the input object exactly
**And** the row in `system.field_sources` matches the input

**Given** a `POST /api/systems` request with `fieldSources: { "unknownField": "https://x" }`
**When** the controller validates
**Then** the response is 400 with envelope `{ data: null, error: { message: "Validation failed", fields: [{ field: "fieldSources.unknownField", message: "Unknown field source key. Allowed: ..." }] }, meta: null }`

**Given** a `POST` request with `fieldSources: { "pricingModel": "javascript:alert(1)" }` or any non-`http(s)` scheme
**When** the controller validates
**Then** the response is 400 with `fields: [{ field: "fieldSources.pricingModel", message: "Source URL must start with http:// or https://" }]`

**Given** a `PUT /api/systems/:id` request with `fieldSources: {}` (empty object)
**When** processed
**Then** the row's `field_sources` is set to an empty object — clearing all sources without setting NULL

**Given** the system list-DTO and organisation list-DTO modules
**When** mapping Prisma rows to API responses
**Then** every list and detail response includes a `fieldSources` field — `null` if the column is null, otherwise the JSON object verbatim

**Given** the same validation applies to `POST` and `PUT /api/organisations[/:id]`
**When** an Organisation is created or updated with `fieldSources` containing keys from `ORGANISATION_FIELD_SOURCE_KEYS`
**Then** the contract behaves identically — accepted shape, allow-list rejection, URL validation, empty-object semantics

### Story 11.3: Detail and Compare — `FieldSourceIcon` Rendering

As a staff member,
I want a small ⓘ icon next to each field on the System and Organisation detail pages, and on both compare pages, when that record has a per-field source URL,
so that I can verify a specific claim by clicking through to the URL that backs it.

**Acceptance Criteria:**

**Given** `frontend/src/components/FieldSourceIcon.jsx` is created per UX-DR43
**When** the component receives `{ url: null }`
**Then** it renders nothing (`return null`)

**Given** the component receives `{ url: "https://example.com/page" }`
**When** rendered
**Then** it renders a Lucide `Info` icon at `size-3.5 text-slate-400 hover:text-blue-600`
**And** the icon is wrapped in `<a target="_blank" rel="noopener noreferrer" href={url}>` so clicks open the URL in a new tab
**And** the anchor has `aria-label="View source for {fieldName}"` and a tooltip showing the URL

**Given** SystemDetailPage renders the System facts grid
**When** any field in `SYSTEM_FIELD_SOURCE_KEYS` has a corresponding non-empty entry in `system.fieldSources`
**Then** a `FieldSourceIcon` appears immediately to the right of that field's value cell
**And** if the entry is missing for that field, no icon is rendered — there is no fallback to the row-level `sourceReference`

**Given** OrganisationDetailPage renders the Organisation facts grid
**When** any field in `ORGANISATION_FIELD_SOURCE_KEYS` has a corresponding non-empty entry in `organisation.fieldSources`
**Then** the icon renders identically per the rule above

**Given** SystemComparePage renders the compare grid
**When** a row corresponds to a field with a per-field source for a specific column's System
**Then** a `FieldSourceIcon` appears in that column's cell only — not inherited from neighbouring columns; column-local rendering per UX-DR50

**Given** ComparePage (organisations) renders the compare grid
**When** a row corresponds to a field with a per-field source for a specific column's Organisation
**Then** the icon renders per the same column-local rule

### Story 11.4: Forms — `FieldWithSource` Wrapper and Source URL Inputs

As a staff member,
I want an inline "Source URL (optional)" input next to each major field on the System and Organisation forms,
so that I can record where a fact came from at the moment I'm entering it.

**Acceptance Criteria:**

**Given** `frontend/src/components/FieldWithSource.jsx` is created per UX-DR44
**When** the component receives `{ fieldName, label, children, sourceValue, onSourceChange }`
**Then** it renders the `children` (the existing field input) on its first line
**And** below it, a half-width text input with placeholder "Source URL (optional)", aria-label "Source URL for {label}"
**And** on input change, calls `onSourceChange(fieldName, newValue)` so the parent form can update its `fieldSources` state object

**Given** SystemFormPage is updated
**When** rendered
**Then** every field whose name appears in `SYSTEM_FIELD_SOURCE_KEYS` (category, vendor, deploymentModel, pricingModel, geographicFocus, all eight capability fields) is wrapped in `FieldWithSource`
**And** the form maintains a single `fieldSources` state object keyed by the camelCase fieldName

**Given** SystemFormPage is submitted
**When** the form payload is constructed
**Then** the `fieldSources` object is sent in the POST/PUT body, with empty-string values stripped (so unfilled source inputs don't pollute the JSON)

**Given** OrganisationFormPage is updated
**When** rendered
**Then** every field in `ORGANISATION_FIELD_SOURCE_KEYS` (country, city, organisationType, three v1 capabilities, capacity) is wrapped in `FieldWithSource`
**And** form payload construction follows the same empty-strip rule

**Given** the user enters a source URL with a missing scheme (e.g. `example.com/page`)
**When** the form is submitted
**Then** the client-side validator surfaces an inline error "Source URL must start with http:// or https://" — and the request is not sent
**And** if the user bypasses the client check, the server's 400 response is also surfaced inline on the offending source input

### Story 11.5: Seed Data Research — Populate `field_sources`

As a maintainer of the catalogue,
I want each of the 11 seeded Systems and the sample Organisations to carry per-field source URLs that defensibly back the recorded values,
so that the catalogue's claims can be verified by anyone reading the app.

**Acceptance Criteria:**

**Given** [system-seed-catalog.js](../../backend/src/prisma/system-seed-catalog.js) is updated
**When** each of the 11 System definitions is reviewed
**Then** every System has a `fieldSources` object populated with at least one entry for each defensibly-sourceable field (category, vendor, deploymentModel, pricingModel, geographicFocus, and the existing three capability flags) — with strict source-required policy: if no defensible URL exists for a field, that key is *omitted* (not filled with the marketing root)
**And** at minimum 80% of the 13 source-bearing fields across the 11 Systems carry a populated entry — measured as `(populated_keys_total) / (11 × 13)` ≥ 0.80
**And** the `source_reference` row-level field is preserved unchanged

**Given** [sample-organisations-seed-data.js](../../backend/src/prisma/sample-organisations-seed-data.js) is updated
**When** each sample Organisation is reviewed
**Then** every Organisation has a `fieldSources` object populated where defensible URLs exist — at minimum 60% of the 7 source-bearing fields across all sample organisations carry a populated entry
**And** Organisations where no defensible URLs exist (e.g. private records) keep `fieldSources: null`

**Given** the seed runs
**When** `npx prisma db seed` completes
**Then** `system.field_sources` is populated on each System per the catalogue file
**And** `organisation.field_sources` is populated on each sample Organisation per the data file
**And** every URL in the seeded objects matches `^https?://`

**Given** the resulting seed is exercised against the running app
**When** a developer opens any seeded System or Organisation detail page
**Then** ⓘ icons render next to fields that have sources, and clicking a sample of them opens working URLs in a new tab
**And** the compare pages also render the icons per column-local rule

**Given** [docs/system-catalogue-rationale.md](../../docs/system-catalogue-rationale.md) §4 lists per-system "Better URL for verification" recommendations
**When** the seed catalogue file is finalised
**Then** the populated URLs reflect those recommendations where they were specific (e.g. Eventbrite pricing page rather than `eventbrite.com` root)

---

## Epic 12: System Capability Expansion

Five sector-relevant capability flags added to System: `season_subscriptions`, `dynamic_pricing`, `multi_venue_support`, `marketing_automation`, `accessibility_features`. All reuse `CapabilityState`. Each integrates with Epic 11's `field_sources` so per-flag provenance is supported.

**FRs covered:** FR-S11, FR-S12, FR-S13, FR-S14, FR-S15, FR-S16

### Story 12.1: Migration B — Add Five Capability Columns to System

As a backend developer,
I want five new `CapabilityState` columns on `System` defaulting to `UNKNOWN`,
so that richer comparisons are possible without changing existing capability semantics.

**Acceptance Criteria:**

**Given** `schema.prisma` is edited
**When** the `System` model is inspected
**Then** five new fields exist: `season_subscriptions_capability`, `dynamic_pricing_capability`, `multi_venue_support_capability`, `marketing_automation_capability`, `accessibility_features_capability` — all of type `CapabilityState` with `@default(UNKNOWN)`

**Given** `npx prisma migrate dev --name add_system_capabilities_v3 --create-only` runs
**When** the generated SQL is inspected
**Then** it contains five `ALTER TABLE "system" ADD COLUMN ... "CapabilityState" NOT NULL DEFAULT 'UNKNOWN'` statements and nothing else

**Given** the migration is applied
**When** existing System rows are queried
**Then** every row has all five new columns set to `UNKNOWN`
**And** no other column is changed
**And** the existing test suite passes (`cd backend && npm test`)

**Given** the system list-DTO module is updated
**When** any `GET /api/systems` or `GET /api/systems/:id` response is inspected
**Then** the response includes the five new capability fields camelCased: `seasonSubscriptionsCapability`, `dynamicPricingCapability`, `multiVenueSupportCapability`, `marketingAutomationCapability`, `accessibilityFeaturesCapability`

### Story 12.2: API — Accept and Filter Five New Capabilities

As a backend developer,
I want `POST` and `PUT /api/systems` to accept the five new capability fields, and `GET /api/systems` to filter on them,
so that the frontend can persist and query the new flags through familiar contracts.

**Acceptance Criteria:**

**Given** a `POST /api/systems` request with one or more of the five new capability fields set to `YES`, `NO`, or `UNKNOWN`
**When** processed
**Then** the request is accepted (201) and the response reflects the values
**And** any of the five fields with an invalid value (anything other than the three enum members) returns 400 with the envelope's `fields` listing the offending capability key

**Given** controller validation for capabilities
**When** lowercase input is received (e.g. `"yes"`)
**Then** it is normalised to `YES` before passing to the service — matching existing capability handling

**Given** `GET /api/systems` is called with `?seasonSubscriptionsCapability=YES`
**When** the service builds the Prisma query
**Then** results include only Systems with `season_subscriptions_capability = YES`
**And** the same behaviour applies to each of the other four new capability filter params
**And** multiple capability filters compose with AND

**Given** `GET /api/systems` is called with a known new capability filter param set to an invalid value (e.g. `?seasonSubscriptionsCapability=MAYBE`)
**When** the controller validates query params
**Then** the response is 400 with `fields` listing that param and message `Select a valid option` — matching the three v1 capability filters (`membership`, `donation`, `seating`)

**Given** an unknown query param key is supplied (e.g. `?foo=YES`)
**When** the request is processed
**Then** the unknown key is ignored — it is not a declared capability filter

### Story 12.3: Form, Detail, Compare — Render Five New Capabilities

As a staff member,
I want SystemFormPage, SystemDetailPage, SystemCard (compare), and SystemComparePage to render the five new capability flags,
so that I can edit, view, and compare them through the same UI patterns as the existing capabilities.

**Acceptance Criteria:**

**Given** SystemFormPage is updated
**When** rendered
**Then** the form has eight capability dropdowns total (3 v1 + 5 v3), each rendering YES/NO/UNKNOWN options with default UNKNOWN, each wrapped in `FieldWithSource` per Story 11.4
**And** the layout groups them under the existing "Capabilities" section heading

**Given** SystemDetailPage is updated
**When** rendered
**Then** the facts panel includes eight capability rows using `CapabilityBadge` labelled variant
**And** each row renders a `FieldSourceIcon` when the corresponding `fieldSources` entry exists

**Given** SystemCard (compare column) is updated
**When** rendered
**Then** all eight capability rows align under the Capabilities section per the union compare layout
**And** missing values render `—` per the never-blank rule

**Given** SystemComparePage's left attribute label column
**When** rendered
**Then** the Capabilities section lists all eight capability labels in a stable order: Membership, Donation, Reserved seating, Season subscriptions, Dynamic pricing, Multi-venue support, Marketing automation, Accessibility features

### Story 12.4: SystemListPage — Filter Sidebar with Collapsible "More Capabilities" Group

As a staff member,
I want the System list filter sidebar to expose the five new capability filters under a collapsible "More capabilities" group,
so that I can filter by them without overwhelming the sidebar layout.

**Acceptance Criteria:**

**Given** SystemListPage's filter sidebar is updated
**When** rendered
**Then** the three v1 capability filters (Membership, Donation, Reserved seating) remain visible by default
**And** a collapsible disclosure labelled "More capabilities (5)" appears below them, collapsed by default

**Given** the user clicks "More capabilities (5)" to expand
**When** the disclosure opens
**Then** five additional capability dropdowns appear (Season subscriptions, Dynamic pricing, Multi-venue support, Marketing automation, Accessibility features) — each with the same YES/NO/UNKNOWN/Any selector contract as the v1 filters
**And** each filter wires through to the `useSystems` hook with the corresponding query param

**Given** any of the five new capability filters has a non-default value
**When** the page renders the active-filter chip strip (`SystemActiveFilterChips`)
**Then** a chip is rendered per active filter using existing chip styles
**And** the disclosure auto-expands when any of its contained filters is active (so the user sees what's filtering)

### Story 12.5: Seed — Populate Five New Capabilities and Field Sources

As a maintainer of the catalogue,
I want each of the 11 seeded Systems to carry honest values for the five new capability flags with corresponding `field_sources` entries where defensible URLs exist,
so that the compare page demonstrates real differentiation across the new flags.

**Acceptance Criteria:**

**Given** [system-seed-catalog.js](../../backend/src/prisma/system-seed-catalog.js) is updated
**When** each System is reviewed
**Then** all five new capability fields are populated for every System using YES/NO/UNKNOWN with strict source-required policy: a value other than UNKNOWN must be backed by a corresponding entry in `fieldSources` for that key
**And** systems where no public evidence exists default the flag to `UNKNOWN` and omit the `fieldSources` entry — `UNKNOWN` is not a failure mode

**Given** the seed runs
**When** `npx prisma db seed` completes
**Then** all 11 Systems have all five new capability columns populated per the catalogue file
**And** the resulting compare page (selecting any 2–4 Systems) renders meaningful differentiation across the new capability rows — at least three of the five new rows show different values across at least three pairings

**Given** [docs/system-catalogue-rationale.md](../../docs/system-catalogue-rationale.md) is updated
**When** the per-system sections are reviewed
**Then** each system's section reflects the new capability values and any URLs used, so the rationale document continues to function as the explanation of *why* each value was chosen

---

## Epic 13: Custom Attribute Editor

The dormant `system.custom_attributes Json?` column gains a CRUD path through the System form. No schema change.

**FRs covered:** FR-S9′

### Story 13.1: API — Accept `customAttributes` on System Create and Update

As a backend developer,
I want `POST /api/systems` and `PUT /api/systems/:id` to accept a `customAttributes` array with strict shape validation,
so that the frontend can persist editable custom attributes through the existing JSON column.

**Acceptance Criteria:**

**Given** a `POST /api/systems` request with body field `customAttributes: [{ label: "B Corp certified", value: "Yes (since 2024)", sourceReference: "https://..." }]`
**When** processed
**Then** the request is accepted (201)
**And** the response body includes the array verbatim
**And** the row's `custom_attributes` JSON column matches the input

**Given** a request with `customAttributes` containing an entry with empty `label` OR empty `value` (after trim)
**When** validated
**Then** the entry is dropped silently before persistence — empty rows are not stored
**And** the response reflects the cleaned array

**Given** a request with `customAttributes` containing an entry where `label` or `value` exceeds 200 characters
**When** validated
**Then** the response is 400 with `fields: [{ field: "customAttributes[N].label" | "customAttributes[N].value", message: "Must be 200 characters or fewer." }]`

**Given** a request with `customAttributes` containing an entry where `sourceReference` is non-empty and does not match `^https?://`
**When** validated
**Then** the response is 400 with `fields: [{ field: "customAttributes[N].sourceReference", message: "Source URL must start with http:// or https://" }]`

**Given** a request with `customAttributes` containing an entry with an unknown property (e.g. `category`)
**When** validated
**Then** the unknown property is stripped before persistence — known keys (`label`, `value`, `sourceReference`) are preserved, unknowns are dropped silently

**Given** a request with `customAttributes: []` (empty array)
**When** processed
**Then** the row's `custom_attributes` is set to `null` (not `[]`) — clearing the column rather than storing an empty array; the existing read DTO continues to render an empty/missing section the same way

### Story 13.2: SystemFormPage — `CustomAttributeEditor` Component

As a staff member,
I want to add, edit, and remove custom attributes directly on the System form through a repeating row component,
so that I can record vendor-specific traits without touching seed files.

**Acceptance Criteria:**

**Given** `frontend/src/components/CustomAttributeEditor.jsx` is created per UX-DR45
**When** the component receives `{ value: CustomAttribute[], onChange }`
**Then** it renders one row per array entry, each with three text inputs (Label / Value / Source URL) and a ghost Remove button
**And** below the rows, a "+ Add custom attribute" button appends an empty row to the array

**Given** the user clicks "Remove" on a row
**When** the array updates via `onChange`
**Then** the row is removed; sibling rows preserve their input focus and value via stable React keys (each row carries a local UUID `_key`)

**Given** input character counts
**When** Label or Value exceeds 200 characters or Source URL exceeds 500 characters
**Then** an inline character counter shows the limit and the field is `border-red-500` until the user trims
**And** the form Submit button is `disabled` while any custom attribute exceeds its limit

**Given** SystemFormPage is updated
**When** rendered in create mode
**Then** the form includes a "Custom attributes" section below the universal-core fields with the `CustomAttributeEditor` mounted to a `customAttributes` state slice
**And** the section is initially empty (no rows)

**Given** SystemFormPage is rendered in edit mode for a System with existing `customAttributes`
**When** the form loads
**Then** the editor is pre-populated with one row per existing entry
**And** the `_key` for each pre-existing row is derived deterministically from index + content hash so re-renders don't blow away input state

**Given** the form is submitted
**When** the payload is constructed
**Then** rows where label and value are both blank (after trim) are stripped from the array before sending
**And** an empty post-strip array is sent as `[]` (the API converts this to `null` per Story 13.1)
**And** `_key` is stripped from each entry — only `label`, `value`, `sourceReference` are sent

**Given** the form save succeeds
**When** the user is redirected to the System detail page
**Then** the existing detail-page custom-attribute table renders the updated list immediately (no compatibility shim needed — read path is unchanged)

---

## Epic 14: List Sorting

Both Organisation and System list endpoints accept `?sort=` and `?order=`. UI dropdowns expose the sort selection; URL persistence keeps deep-links shareable.

**FRs covered:** FR-32, FR-S17

### Story 14.1: API — `?sort` and `?order` on Both List Endpoints

As a backend developer,
I want `GET /api/organisations` and `GET /api/systems` to accept sort and order query params validated against per-entity allow-lists,
so that the frontend can drive sorting through familiar query-param contracts.

**Acceptance Criteria:**

**Given** `backend/src/lib/sort-allowlists.js` is created
**When** the file is inspected
**Then** it exports `ORGANISATION_SORT_KEYS = ['name', 'country', 'lastUpdated', 'capacity', 'organisationType']` and `SYSTEM_SORT_KEYS = ['name', 'vendor', 'category', 'lastUpdated', 'geographicFocus']` as frozen arrays

**Given** a `GET /api/organisations?sort=name&order=asc` request
**When** the controller validates
**Then** the request is accepted and the service builds `orderBy: { name: 'asc' }`
**And** results are returned in alphabetical order

**Given** a `GET /api/organisations?sort=organisationType&order=desc` request
**When** the service builds the Prisma query
**Then** `orderBy: { organisation_type: { name: 'desc' } }` — using the related table's name for sort

**Given** a request with `sort=foo` (not in allow-list)
**When** validated
**Then** the response is 400 with `fields: [{ field: "sort", message: "Sort field must be one of: name, country, lastUpdated, capacity, organisationType" }]`

**Given** a request with `order=sideways` (not asc/desc)
**When** validated
**Then** the response is 400 with `fields: [{ field: "order", message: "Order must be asc or desc" }]`

**Given** a request without `sort` or `order`
**When** processed
**Then** the default is `sort=name&order=asc` for both entities

**Given** a `GET /api/systems?sort=vendor&order=asc&page=1` request
**When** processed
**Then** results are alphabetised by vendor; pagination metadata is unchanged (no behavioural change to page/limit/total/totalPages)

**Given** sort + filter + search composition
**When** a request like `GET /api/organisations?q=opera&country=UK&sort=lastUpdated&order=desc&page=1` runs
**Then** all three apply together with the correct precedence (filter before sort before pagination)

### Story 14.2: List Pages — `SortDropdown` Component and URL Persistence

As a staff member,
I want a sort dropdown on the Organisation and System list pages with a small set of practical sort keys, persisted in the URL,
so that I can deep-link to a specific sorted view and switch sorts without losing my filters.

**Acceptance Criteria:**

**Given** `frontend/src/components/SortDropdown.jsx` is created per UX-DR46
**When** the component receives `{ options, sort, order, onChange }`
**Then** it renders a single select that combines field and direction (e.g. "Name (A→Z)", "Last updated (newest first)") to keep the UI compact
**And** options are derived from the per-entity allow-list with a sensible label per direction

**Given** OrganisationListPage is updated
**When** rendered
**Then** a `SortDropdown` appears to the right of the search input
**And** the dropdown reads from URL params `sort` and `order` (defaults: `name`, `asc`)
**And** changing the selection updates the URL via `setSearchParams` and resets `page=1`

**Given** SystemListPage is updated
**When** rendered
**Then** the `SortDropdown` is mounted analogously with the System sort allow-list
**And** the same URL contract applies

**Given** `useOrganisations` and `useSystems` hooks
**When** they read `sort` and `order` from URL params
**Then** they pass them through to the API call and the React Query cache key includes them
**And** changing sort triggers a refetch; changing back to a previously-cached sort serves from cache

**Given** the user's browser back/forward navigation
**When** they navigate between sort states
**Then** the sort dropdown reflects the URL state on each navigation — URL is the source of truth

**Given** the user has filters applied and changes sort
**When** the URL updates
**Then** all existing filter params are preserved unchanged — only `sort`, `order`, and `page` change

---

## Epic 15: Organisation Duplicate Guard

Soft + hard duplicate guard on Organisation create. Composite unique constraint at the DB level; async fuzzy-match warning on the form.

**FRs covered:** FR-33, FR-34

### Story 15.1: Migration C — Composite Unique on Organisation `(name, city, country)`

As a backend developer,
I want a composite unique index on `organisation(name, city, country)` and a pre-flight check that surfaces existing collisions,
so that duplicate organisations are blocked at the data layer without forcing legitimate name reuse across cities.

**Acceptance Criteria:**

**Given** the pre-flight check task
**When** the developer runs the diagnostic SQL `SELECT name, city, country, count(*) AS c FROM organisation GROUP BY name, city, country HAVING count(*) > 1;` against the target environment
**Then** the result is recorded in the story's Dev Agent Record
**And** if any rows return, the migration is blocked until the operator manually deduplicates

**Given** the schema is edited to add `@@unique([name, city, country])` to `Organisation`
**When** `npx prisma migrate dev --name organisation_composite_unique --create-only` runs
**Then** the generated SQL contains exactly one statement: `CREATE UNIQUE INDEX "organisation_name_city_country_key" ON "organisation"("name", "city", "country");`

**Given** the migration is applied with no existing collisions
**When** the schema is inspected
**Then** the unique index exists and Prisma's introspection matches the schema
**And** all existing rows are preserved
**And** the test suite passes

**Given** the migration is applied with existing collisions (developer ignored the pre-flight)
**When** Prisma attempts to create the unique index
**Then** the migration fails with a clear PostgreSQL error
**And** no other schema change is applied — the migration is atomic per Postgres DDL semantics

**Given** the controller for `POST /api/organisations` and `PUT /api/organisations/:id`
**When** Prisma raises `P2002` with `target` containing `name_city_country_key`
**Then** the controller maps it to a `409 Conflict` with envelope `{ data: null, error: { message: "An organisation called \"<name>\" already exists in <city>, <country>.", fields: [{ field: "name", message: "Conflicts with existing organisation in this city and country." }] }, meta: null }`
**And** any other `P2002` (different unique constraint) maps to a generic 409 without crashing

### Story 15.2: New Endpoint — `GET /api/organisations/check-similar`

As a backend developer,
I want a focused endpoint that returns up to 5 minimal similar-organisation matches for a given name,
so that the form's fuzzy-match warning has a fast, narrow query path.

**Acceptance Criteria:**

**Given** the route `GET /api/organisations/check-similar` is registered
**When** called with `?name=Royal%20Opera`
**Then** the response shape is `{ data: [{ id, name, city, country }], error: null, meta: null }`
**And** `data` contains up to 5 entries
**And** results are ordered by trigram similarity descending, matching the SQL pattern in architecture-v3-delta §3.5

**Given** `?name=` is missing or shorter than 2 characters
**When** validated
**Then** the response is 400 with `fields: [{ field: "name", message: "Name must be at least 2 characters." }]`

**Given** `?excludeId=<uuid>` is provided
**When** the query runs
**Then** the row with that id is excluded from results — used by the edit form so a record doesn't flag itself

**Given** `excludeId` is not a valid UUID
**When** validated
**Then** the response is 400 with a clear error

**Given** the endpoint runs against the seed data
**When** called with `?name=Theatre`
**Then** any seeded Organisations whose names contain "Theatre" are returned (up to 5), ordered by similarity
**And** the response time is well under 100ms (the trigram index makes this comparable to the existing search endpoint)

### Story 15.3: OrganisationFormPage — `SimilarOrganisationsWarning` and 409 Inline Error

As a staff member,
I want the create form to show a warning when I'm about to create an organisation with a name similar to an existing one, and a clear error if I bypass the warning and the server rejects the duplicate,
so that I avoid accidental duplicates without being blocked when the duplicate is legitimate (different city).

**Acceptance Criteria:**

**Given** `frontend/src/hooks/useSimilarOrganisations.js` is created
**When** invoked with a name string
**Then** it debounces input by 300ms and calls `GET /api/organisations/check-similar?name=...&excludeId=...?` (excludeId only in edit mode, but warning is create-only so excludeId is omitted)
**And** the hook returns `{ matches, isLoading, error }` with React Query caching on `['similarOrganisations', name]`

**Given** OrganisationFormPage in create mode
**When** the user enters a name and blurs the field with ≥3 characters
**Then** the hook is invoked
**And** if any matches return, a `SimilarOrganisationsWarning` panel renders between the form fields and the submit button per UX-DR48
**And** the panel renders `aria-live="polite"` so it announces without stealing focus

**Given** the warning panel is shown with matches
**When** the user clicks "Continue"
**Then** a local `userAcknowledgedDuplicates` flag is set to true and the panel hides
**And** subsequent submits proceed normally

**Given** the user clicks "Cancel and amend" on the warning panel
**When** the action fires
**Then** the name field is cleared and refocused
**And** `userAcknowledgedDuplicates` resets to false

**Given** the user changes the name after acknowledging duplicates
**When** the field blurs again
**Then** the lookup re-runs against the new name
**And** if new matches return, the warning re-displays — the acknowledgement does not persist across name changes

**Given** OrganisationFormPage in edit mode
**When** the page renders
**Then** the warning UX is **not** mounted — only the soft warning is create-only per UX-DR48
**And** the 409 inline error path still applies in edit mode (server can still reject if user changes name to collide)

**Given** the form submits and the server returns 409 with the composite-unique conflict message
**When** the response is processed
**Then** an inline error renders below the name field with the conflict message ("Conflicts with existing organisation in <city>, <country>") per UX-DR49
**And** the error summary at page top includes a link to the name field
**And** the error is distinct from the soft warning panel — both can render on the same page if the user keeps editing after a 409

