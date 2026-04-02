---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# dmcf-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for dmcf-app, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

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
- **Prisma schema foundation:** `CapabilityState` enum (`YES`/`NO`/`UNKNOWN`); `last_updated` field on `organisation`; `source_reference` field; lookup tables `ticketing_provider`, `crm_platform`, `organisation_type`; every table has UUID `id`, `created_at`, `updated_at`.
- **Prisma `$use` middleware:** Registered on the Prisma client singleton in `backend/src/lib/prisma.js`; sets `last_updated = new Date()` on every `update` operation on `organisation`; `last_updated` never accepted from request body.
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
FR20: Epic 2 — Automatic last_updated maintenance via Prisma middleware
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
**Includes:** Vite + React scaffold, Express + Prisma v6 backend, Docker Compose (3 services), `.env` / `.env.example` for both layers, CORS middleware, React Router v6 routes skeleton, TanStack Query `QueryClientProvider`, `SelectionContext`, Tailwind CSS v3, shadcn/ui base utilities, Prisma schema (full data model + `CapabilityState` enum + `$use` middleware + `pg_trgm` extension migration), seed script seeding all reference data (providers, CRMs, types, countries), health endpoint, README skeleton with setup steps, `docs/decisions.md` stub.

#---

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
**Then** it contains: `id` (UUID PK), `name` (required string), `country` (required string), `organisation_type_id` (FK to `organisation_type`), `ticketing_provider_id` (nullable FK to `ticketing_provider`), `crm_platform_id` (nullable FK to `crm_platform`), `membership_capability` (`CapabilityState` default `UNKNOWN`), `donation_capability` (`CapabilityState` default `UNKNOWN`), `reserved_seating_capability` (`CapabilityState` default `UNKNOWN`), `source_reference` (nullable string), `notes` (nullable text), `capacity` (nullable integer), `last_updated` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
**And** the `CapabilityState` enum is defined with values `YES`, `NO`, `UNKNOWN`
**And** the `pg_trgm` extension is enabled via an initial migration

**Given** an update operation is executed on the `organisation` model via the Prisma client
**When** the `$use` middleware registered in `backend/src/lib/prisma.js` is active
**Then** `last_updated` is set to the current timestamp automatically without `last_updated` being present in the calling code's data payload

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
**And** `last_updated` is automatically set to the current timestamp by the Prisma `$use` middleware — not accepted from the request body

**Given** a successful update
**When** the response is received
**Then** the staff member is navigated to the detail page at `/organisations/:id`
**And** an inline success banner "Organisation saved." appears and auto-dismisses after 5 seconds

**Given** the edit form is submitted with invalid data
**When** client-side or server-side validation fails
**Then** the same GOV.UK error pattern applies as in Story 2.2 — error summary at top, inline errors per field, specific messages

**Given** a `PUT` request is sent with `last_updated` in the request body
**When** the controller processes the request
**Then** the `last_updated` value from the request body is ignored — the middleware value always wins

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
