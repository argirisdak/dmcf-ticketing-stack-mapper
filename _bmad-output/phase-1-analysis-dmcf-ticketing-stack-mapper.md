# Phase 1 Analysis — DMCF Ticketing Stack Mapper

## TASK 1 — Requirements Analysis

### Functional requirements

| ID | Description | Priority |
|----|-------------|----------|
| FR-01 | Create a new organisation record with all required and optional fields via a form or equivalent UI. | Must |
| FR-02 | Read/view a single organisation’s full detail, including source and last updated metadata. | Must |
| FR-03 | Update an existing organisation record and persist changes to the database. | Must |
| FR-04 | Delete an organisation record with a confirmation step to prevent accidental loss. | Must |
| FR-05 | List organisations in a dashboard or table view with key columns visible at a glance. | Must |
| FR-06 | Search organisations by text across name, city, provider, notes, or other designated searchable fields. | Must |
| FR-07 | Filter the list by country, organisation type, ticketing provider, CRM platform, and capability flags (membership, donation, seating) where data exists. | Must |
| FR-08 | Select multiple organisations and open a side-by-side comparison view showing aligned attributes. | Must |
| FR-09 | Store and display a source link or reference for each record to support provenance and verification. | Must |
| FR-10 | Display and maintain a last updated date per record (visibility in detail and optionally in list). | Must |
| FR-11 | Load seed/sample data on first setup or via a documented command so demos and testing work without manual entry. | Must |
| FR-12 | Run the full stack locally via Docker Compose with documented ports and environment variables. | Must |
| FR-13 | Provide a README covering setup, seeding, running tests (if any), and basic troubleshooting. | Must |
| FR-14 | [INFERRED] Export comparison or list view to CSV or clipboard for use in reports—optional stretch; not required for MVP if time-bound. | Could |
| FR-15 | [INFERRED] Basic validation on URLs and required fields so staff cannot save obviously broken records. | Should |
| FR-16 | [INFERRED] Unauthenticated or single shared “internal” access acceptable; no user accounts or roles for MVP. | Must |

### Non-functional requirements

| ID | Description | Concern |
|----|-------------|---------|
| NFR-01 | The UI must be understandable by non-technical internal staff without developer support for routine tasks. | Usability |
| NFR-02 | List and search responses should feel responsive for expected dataset sizes (hundreds to low thousands of rows) without noticeable lag. | Performance |
| NFR-03 | Codebase must follow a predictable structure and conventions so future phases can extend features without rewrite. | Maintainability |
| NFR-04 | Data for provider, CRM, and capabilities should be stored consistently to support accurate filter and compare behaviour. | Data integrity |
| NFR-05 | [INFERRED] Docker images and Compose file should pin major versions or use stable tags to reduce “works on my machine” drift. | Deployability / reproducibility |
| NFR-06 | [INFERRED] API should validate input and return clear error messages or codes for invalid payloads or not-found resources. | Reliability |
| NFR-07 | [INFERRED] README and env examples must not commit secrets; any future API keys stay in local `.env` (ignored by Git). | Security hygiene |

---

## TASK 2 — User Story Mapping

### Persona card

| Attribute | Detail |
|-----------|--------|
| **Name** | Sam Rivera |
| **Role** | DMCF programme or research staff member who maintains knowledge about venues’ ticketing and audience systems |
| **Goals** | Quickly find how organisations compare on stack and capabilities; keep records trustworthy with sources; update information as the field changes |
| **Frustrations** | Scattered spreadsheets; inconsistent naming of tools; hard to see two venues side by side; forgetting where information came from |
| **Tech comfort** | Comfortable with web apps and forms; not a developer; prefers clear labels, defaults, and forgiving search |

### User stories (with story points)

**Organisation management (CRUD)**

| Story | Points |
|-------|--------|
| As Sam, I want to add a new organisation with all relevant fields, so that our internal map stays current. | 3 |
| As Sam, I want to open an organisation’s detail page, so that I can read everything we know in one place. | 2 |
| As Sam, I want to edit an organisation and save changes, so that I can correct mistakes or refresh data. | 3 |
| As Sam, I want to delete an organisation after confirming, so that we can remove duplicates or obsolete entries. | 2 |

**Search and discovery**

| Story | Points |
|-------|--------|
| As Sam, I want to search by keywords across names and notes (and related text), so that I can find a venue quickly. | 3 |
| As Sam, I want the dashboard to show a clear list of organisations, so that I can scan what we already have. | 2 |

**Filtering**

| Story | Points |
|-------|--------|
| As Sam, I want to filter by country, type, provider, CRM, and capabilities, so that I can narrow to a relevant subset. | 5 |

**Comparison**

| Story | Points |
|-------|--------|
| As Sam, I want to select several organisations and see them side by side, so that I can compare stacks and capabilities without switching tabs. | 5 |

**Source tracking**

| Story | Points |
|-------|--------|
| As Sam, I want to see and edit the source link or reference for each record, so that I can trust and revisit the original information. | 2 |

**General navigation and usability**

| Story | Points |
|-------|--------|
| As Sam, I want obvious navigation between list, detail, compare, and create flows, so that I never feel lost in the app. | 3 |
| As Sam, I want the app to run locally via Docker with steps in the README, so that I (or IT) can start it without guessing. | 3 |
| As Sam, I want sample data preloaded, so that I can learn the UI before entering real records. | 2 |

---

## TASK 3 — Data Model Design

### Entity: `organisation`

| Field | Type | Constraints / default | Notes |
|-------|------|------------------------|-------|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Surrogate key |
| `name` | `VARCHAR(255)` | `NOT NULL` | Organisation name |
| `country` | `VARCHAR(100)` | `NOT NULL` | ISO-like or free text; [INFERRED] store as text for MVP flexibility |
| `city` | `VARCHAR(100)` | nullable | |
| `organisation_type` | `VARCHAR(100)` or FK | `NOT NULL` if using lookup; see design decisions | |
| `capacity` | `INTEGER` | nullable, optional `CHECK (capacity >= 0)` | Venue/event capacity if known |
| `ticketing_provider_id` | `UUID` | nullable, `FK → ticketing_provider(id)` | Or substitute text column—see below |
| `crm_platform_id` | `UUID` | nullable, `FK → crm_platform(id)` | |
| `membership_capability` | `capability_enum` | `NOT NULL`, default `'UNKNOWN'` | Enum: `YES` / `NO` / `UNKNOWN` |
| `donation_capability` | `capability_enum` | `NOT NULL`, default `'UNKNOWN'` | Same enum |
| `reserved_seating_capability` | `capability_enum` | `NOT NULL`, default `'UNKNOWN'` | Same enum |
| `notes` | `TEXT` | nullable | Free text |
| `source_reference` | `TEXT` | nullable | URL or citation text |
| `last_updated` | `TIMESTAMPTZ` | `NOT NULL`, default + trigger | System-maintained on update |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | [INFERRED] audit aid |

**Primary key:** `id`

### Entity: `organisation_type` (lookup) — optional normalisation

| Field | Type | Constraints / default |
|-------|------|------------------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` |
| `label` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` |

**Foreign keys:** `organisation.organisation_type_id` → `organisation_type.id)` if this table is used instead of a text/enum column on `organisation`.

*Alternative MVP:* single `organisation_type` text column on `organisation` without this table; migration path to lookup later.

### Entity: `ticketing_provider` (lookup)

| Field | Type | Constraints / default |
|-------|------|------------------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` |
| `name` | `VARCHAR(150)` | `NOT NULL`, `UNIQUE` |

**Relationships:** One provider → many organisations.

### Entity: `crm_platform` (lookup)

| Field | Type | Constraints / default |
|-------|------|------------------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` |
| `name` | `VARCHAR(150)` | `NOT NULL`, `UNIQUE` |

**Relationships:** One CRM platform → many organisations.

### Entity-Relationship summary (plain text)

- Each **organisation** optionally references one **ticketing_provider** and one **crm_platform** via foreign keys.  
- If **organisation_type** is normalised, each organisation references one **organisation_type** row; otherwise type is stored as text on **organisation** only.  
- No many-to-many in MVP: one primary ticketing provider and one primary CRM per organisation (matches “the” provider fields in the brief).

### Design decision — capability fields (membership, donation, seating)

**Recommendation:** PostgreSQL `ENUM` type (or a small lookup table) with values **`YES`**, **`NO`**, **`UNKNOWN`**.

**Why:** Booleans force a false binary when knowledge is genuinely missing; staff need to distinguish “we know they don’t” from “we haven’t verified.” Enums keep filters and compare views consistent; free text would break aggregations and filters.

### Design decision — ticketing provider and CRM platform

**Recommendation:** **Reference tables** (`ticketing_provider`, `crm_platform`) plus optional “other” or seed aliases; allow admin-style seed list, with API accepting `providerId` or **create-on-the-fly** with normalised name for MVP agility.

**Why:** Filters and compare columns stay consistent (“Tessitura” vs “tessitura”); seed data can pre-populate common vendors. Pure free text is faster to build but duplicates and weak filters; reference tables pay off immediately for filter/compare MVP features.

### Design decision — organisation type

**Recommendation:** Start with **lookup table** seeded from a fixed list (theatre, festival, museum, orchestra, etc.) **or** a `CHECK` constraint on a short enum in MVP; avoid unconstrained free text for the main “type” filter.

**Why:** Non-technical users benefit from picklists; unconstrained text causes the same inconsistency problem as provider names. If the list is unstable, use lookup table without migration pain.

### Design decision — source tracking

**Recommendation:** **Record-level fields** only for MVP: `source_reference` (and optionally `source_title` [INFERRED]) on `organisation`.

**Why:** The brief asks for “source link or reference” per record, not multi-source historiography. A separate `organisation_sources` table with history is valuable later for audit trails but adds CRUD and UI complexity without MVP requirement.

### Design decision — `last_updated`

**Recommendation:** **System-automated**: set `last_updated = now()` on `INSERT` and `UPDATE` via DB trigger or ORM hooks; **display-only** in UI (no manual date picker for “last updated”).

**Why:** Trust and comparability; staff edit content fields, not the clock. If a manual “as of” date is ever needed, add a separate optional `information_valid_as_of` field later—do not overload `last_updated`.

---

## TASK 4 — Architecture Proposal

### High-level directory structure

**Backend (Node.js + Express) [chosen for MVP]**

```
backend/
  src/
    app.ts                 # Express app, middleware
    server.ts              # listen
    config/                # env, db connection
    routes/
      organisations.ts
      meta.ts              # providers, crms, types for dropdowns
    services/
    repositories/          # or models/ if using ORM
    db/
      migrations/
      seeds/
    types/
  package.json
  Dockerfile
```

**Frontend (React)**

```
frontend/
  src/
    api/                   # fetch wrappers
    components/
    pages/                 # List, Detail, Form, Compare, Dashboard
    hooks/
    routes/
    styles/                # CSS modules or one global + tokens
    main.tsx
    App.tsx
  package.json
  Dockerfile
```

### REST API (MVP)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness check for Docker/orchestration. |
| `GET` | `/api/organisations` | List with query params: `q`, filters, `sort`, `page`, `limit`. |
| `GET` | `/api/organisations/:id` | Single organisation with resolved provider/CRM labels. |
| `POST` | `/api/organisations` | Create organisation (validate body, resolve or create lookup names if designed that way). |
| `PUT` | `/api/organisations/:id` | Full or partial update (document choice; prefer `PATCH` if partial—either is fine if consistent). |
| `DELETE` | `/api/organisations/:id` | Delete by id. |
| `GET` | `/api/meta/ticketing-providers` | List providers for dropdowns and filters. |
| `GET` | `/api/meta/crm-platforms` | List CRM platforms for dropdowns and filters. |
| `GET` | `/api/meta/organisation-types` | List types if normalised. |

*[INFERRED]* `POST` on meta endpoints omitted for MVP to avoid unauthenticated admin surface; seed via migrations.

### Docker Compose topology

| Service | Image / build | Ports | Connects to |
|---------|---------------|-------|-------------|
| `db` | `postgres:16` (or pinned) | `5432` (internal); expose only if local debugging | — |
| `api` | Build `backend` Dockerfile | `3001:3001` (example) | `db` on hostname `db` |
| `web` | Build `frontend` Dockerfile (static + nginx **or** dev server for local only) | `5173` or `80:80` | `api` via browser and `VITE_API_URL` / proxy |

**Volumes:** Postgres data volume for persistence across restarts.

**Environment:** `DATABASE_URL` for API; frontend public API base URL for browser calls.

### Data flow (typical action: filter and open compare)

1. User adjusts filters in React; state updates query string or client params.  
2. React calls `GET /api/organisations?country=…&membership=YES`.  
3. Express route validates params, runs query (ORM/SQL) with joins to lookup tables.  
4. PostgreSQL returns rows; API serialises JSON.  
5. UI renders table; user checks rows and clicks “Compare.”  
6. UI navigates to compare route with selected ids, calls `GET /api/organisations/:id` for each (or a batch endpoint [INFERRED] `GET /api/organisations?ids=...` for efficiency—optional optimisation).  
7. Compare view renders aligned columns.

### Key technical decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | **Express** on Node.js | Aligns with “Express preferred,” one language with tooling shared across team, fast CRUD. |
| ORM | **Prisma** or **Kysely** / **node-pg** + migrations | Prisma for speed of MVP; if team avoids ORM, typed SQL builder—pick one and migrate consistently. |
| API style | REST + JSON | Simple for internal tools; no GraphQL overhead. |
| Frontend tooling | **Vite + React** | Standard, fast dev server, easy Docker multi-stage build. |
| State / data fetching | **TanStack Query** + local UI state | Handles cache, refetch after mutations, fewer bespoke loading bugs. |
| Styling | **CSS Modules** or **simple component-scoped CSS** | Avoid heavy design-system work for MVP; keep accessible contrast and spacing. |
| Auth | **None** or IP-restricted network [INFERRED] | Matches “no production-grade auth required”; document that app is not internet-facing. |
| Compare selection | URL state or context storing selected ids | Deep-linking compare is nice-to-have; session storage acceptable for MVP. |

**Excluded as unnecessary complexity for MVP:** OAuth, multi-tenant tenancy, workflow approvals, audit log UI, GraphQL, microservices, Elasticsearch (Postgres full-text or `ILIKE` sufficient at MVP scale).

---

## TASK 5 — Risk and Assumption Register

### Assumptions

| Assumption | Confidence | If wrong |
|------------|------------|----------|
| Internal-only deployment on trusted network; no public internet exposure. | High | Requires auth, TLS, and hardening not scoped in MVP. |
| Single “primary” ticketing provider and CRM per organisation is enough (no multi-site exceptions in MVP). | Medium | Need junction tables and UI for multiple systems per org. |
| Dataset stays in the hundreds/low thousands; Postgres on single instance is enough. | High | Need pagination tuning, indexes, maybe materialised views or FTS. |
| Staff can tolerate English UI and Latin script for names. | Medium | May need i18n or locale-specific labelling. |
| Docker is acceptable for all developers and staff who run locally. | Medium | Need non-Docker fallback instructions in README. |
| “Country” and “city” as free text is acceptable without geocoding standardisation. | Medium | Filtering by country becomes messy; may need normalised country code later. |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Lookup tables (providers/CRM) lag behind real-world naming variants | Medium | Medium | Seed common aliases; document “add via migration/seed”; optional “display name” override on org [future]. |
| Compare UX cluttered with many fields | Medium | Medium | Group attributes in compare view; hide empties; sticky header row. |
| Inconsistent seed data undermines demo credibility | Low | Medium | Curate seed from realistic anonymised examples; validate seed in CI. |
| No auth invites accidental exposure if mis-deployed | Low | High | README warnings; bind services to localhost; future phase adds SSO if exposed. |
| Over-scoping filters (too many dimensions) delays MVP | Medium | Medium | Ship core filters first; treat rare dimensions as phase 2. |

---

## TASK 6 — MVP Scope Statement

The **DMCF Ticketing Stack Mapper** MVP is an **internal** web application that lets DMCF staff **maintain a central catalogue** of cultural organisations and their **ticketing stack, CRM/audience tools, and key capabilities**, with **provenance** via **source references** and **system-recorded last updated** timestamps. Staff can **search and filter** the catalogue, work from a **dashboard list**, perform **full CRUD** on organisations, and run **side-by-side comparisons** of selected entries. The product ships with **Docker Compose** for local operation, **PostgreSQL** persistence, **seed data** for immediate usefulness, and a **full README**.

The MVP **does not** include external users, payments, production-grade authentication, role-based access control, workflow approval, multi-source history per field, analytics beyond the basic list/dashboard, or mobile-native apps. It is **not** a public directory or integration platform.

**Definition of done:** All Must-level functional requirements are implemented and demonstrable end-to-end; seed script runs cleanly; Compose brings up DB, API, and UI without undocumented steps; README allows a new team member to run and smoke-test CRUD, search/filter, and compare; obvious invalid input is rejected with clear feedback.

**Three priorities to get right:** (1) **Trustworthy data entry**—clear fields, validation, and visible sources. (2) **Fast discovery**—search and filters that match how staff think about organisations. (3) **Comparison clarity**—a compare view that makes differences obvious without overwhelming non-technical users.

---

## TASK 7 — Open Questions

| Priority | Question | Why it matters |
|----------|----------|----------------|
| — | **No blocking open questions** identified under the stated MVP and assumptions. | — |

**Non-blocking clarifications** (nice to confirm with owner when convenient): official list of **organisation types** to seed; whether **capacity** should capture **seated only** vs **total attendance**; any **must-have** ticketing providers in seed data for DMCF context.
