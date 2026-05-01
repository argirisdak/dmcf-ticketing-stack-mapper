---
parent: architecture.md
created: 2026-04-29
author: Winston (System Architect, BMad)
trigger: PRD v2 delta — comparison axis flips to System-to-System
inputDocuments:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/prd-v2-delta.md
  - backend/src/prisma/schema.prisma
  - backend/src/prisma/seed.js
documentType: architecture-delta
---

# Architecture v2 — Delta Document

**Scope:** This is a *delta*, not a rewrite. It lists, section-by-section, what changes in [architecture.md](architecture.md) and what stays. Anything not mentioned here is unchanged. Patterns, naming conventions, response envelopes, frontend state-management rules, deployment posture, and all v1 anti-patterns hold without modification — extended to the new entities.

**Source of the change:** [prd-v2-delta.md](prd-v2-delta.md), §3, §4, §5, §7.

---

## 1. Headline architectural impact

| Area | Direction of change |
|---|---|
| **Data model** | Add `System` and `OrganisationSystem`. Drop `TicketingProvider` and `CrmPlatform`. Drop the `ticketing_provider_id` and `crm_platform_id` FKs on `organisation`. |
| **New enums** | `SystemCategory`, `SystemRole`, `DeploymentModel`, `PricingModel`. `CapabilityState` re-used on System. |
| **API surface** | Add `/api/systems` resource (full REST). Add nested `/api/organisations/:id/systems` link management. Drop `/api/meta/ticketing-providers` and `/api/meta/crm-platforms`. Re-shape `GET /api/organisations` filter params and detail response. |
| **Frontend** | Add System list, detail, form, and Compare pages plus their hooks and api utilities. Re-shape Organisation list filter, detail panel, form, and card. Re-purpose `SelectionContext` and `/compare` for Systems. |
| **Migration risk** | Three-step Prisma migration (additive → backfill → destructive) is the only way to convert existing rows without data loss. Single-step migration would drop the FK columns before the new junction is populated. |

---

## 2. Data model changes

### 2.1 New entity — `System`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | `@default(uuid())` |
| `name` | String | yes | Unique. e.g. *"Tessitura"*, *"Spektrix"*. |
| `vendor` | String | yes | The supplier organisation, distinct from the system name (e.g. system *"Universe"*, vendor *"Ticketmaster"*). |
| `category` | `SystemCategory` enum | yes | `integrated` \| `ticketing` \| `audience_management`. |
| `deployment_model` | `DeploymentModel` enum | no | `saas` \| `self_hosted` \| `hybrid`. Optional — null when unknown. |
| `pricing_model` | `PricingModel` enum | no | `subscription` \| `transaction_fee` \| `licence` \| `hybrid` \| `unknown`. |
| `geographic_focus` | String | no | Constrained dropdown — same pattern as Organisation `country`: a seeded constant in `frontend/src/lib/system-geographic-focus.js` and `backend/src/lib/system-geographic-focus.js`. Values include `UK`, `Europe`, `North America`, `Global`, `Other`. |
| `description` | String (text) | no | Free-text prose. Carries audience-size nuance — see §2.6. |
| `membership_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. Same enum as Organisation. |
| `donation_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |
| `reserved_seating_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |
| `source_reference` | String | no | URL or citation for the System record itself. |
| `last_updated` | DateTime | yes | `@default(now()) @updatedAt` — same ADR-011 pattern as Organisation (no Prisma `$use`). |
| `created_at` | DateTime | yes | `@default(now())`. |

**Decision: `target_organisation_size` not added.** Per [prd-v2-delta.md §5](prd-v2-delta.md), audience-size nuance is carried in `description`. An enum overstates precision when most integrated platforms span multiple sizes.

**Decision: capability flags on System reuse the existing `CapabilityState` enum.** FR24 explicitly requires this. Same three-state semantics, same end-to-end serialisation rules (uppercase strings).

**Decision: `name` is unique.** Two Systems cannot share a name. Vendor disambiguation goes in the `vendor` field, not the `name` field.

### 2.2 New junction — `OrganisationSystem`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | `@default(uuid())`. Surrogate key — needed for direct link addressing in REST routes. |
| `organisation_id` | UUID | yes | FK → `organisation.id`. `onDelete: Cascade`. |
| `system_id` | UUID | yes | FK → `system.id`. `onDelete: Restrict` — deleting a System with adopters must require explicit unlink first; the UX spec treats this as deliberate. |
| `role` | `SystemRole` enum | yes | `primary_ticketing` \| `primary_crm` \| `integrated_suite` \| `secondary`. |
| `source_reference` | String | no | Per-link source — distinct from System.source_reference and Organisation.source_reference per FR22′. |
| `note` | String | no | Per-link note. |
| `last_updated` | DateTime | yes | `@default(now()) @updatedAt`. |
| `created_at` | DateTime | yes | `@default(now())`. |

**Constraints:**
- `@@unique([organisation_id, system_id])` — an organisation cannot link to the same System twice. Role distinctions across links must be expressed as different Systems, not duplicate links.
- `@@index([system_id])` — supports the System-detail "adoption evidence" query (FR-S8).
- `@@index([organisation_id])` — supports Organisation detail's linked-systems panel.

**Open question parked:** Open question 4 in the PRD delta (soft-delete vs hard-delete of links) is resolved as **hard-delete with confirmation**. No `active` flag, no historical-adoption table. If adoption history becomes a requirement, an `OrganisationSystemHistory` write-only table is the upgrade path.

### 2.3 New enums

```prisma
enum SystemCategory {
  integrated
  ticketing
  audience_management
}

enum SystemRole {
  primary_ticketing
  primary_crm
  integrated_suite
  secondary
}

enum DeploymentModel {
  saas
  self_hosted
  hybrid
}

enum PricingModel {
  subscription
  transaction_fee
  licence
  hybrid
  unknown
}
```

**Naming note:** Per the v1 architecture's Naming Patterns — Prisma enum *type* is PascalCase, values are SCREAMING_SNAKE_CASE. The delta uses lowercase enum values intentionally because these values are persisted strings and surface in API JSON. To stay consistent with v1's `CapabilityState { YES NO UNKNOWN }`, **switch to SCREAMING_SNAKE_CASE on values**: `INTEGRATED`, `TICKETING`, `AUDIENCE_MANAGEMENT`, `PRIMARY_TICKETING`, etc. Update query-param contract (§3.1) and frontend rendering accordingly. *This is the binding decision.*

### 2.4 Changes to `Organisation`

**Remove:**
- `ticketing_provider_id` column
- `crm_platform_id` column
- `ticketing_provider` relation
- `crm_platform` relation

**Add:**
- `systems  OrganisationSystem[]` — back-relation to the junction.

All other Organisation fields are unchanged. The model retains its surrogate `id`, scalar fields, capability flags, country string, source_reference, notes, capacity, last_updated, created_at.

### 2.5 Removed entities

- `TicketingProvider` — dropped after data migration completes.
- `CrmPlatform` — dropped after data migration completes.

### 2.6 Custom attributes (deferred from MVP)

The PRD delta places the custom-attribute editor in Growth. For MVP, custom attributes display read-only inside System detail and Compare. Two implementation options:

**Option A (recommended for MVP):** Persist custom attributes inline as a JSON column on `System.custom_attributes` with shape `[{ label, value, source_reference }]`. No separate table. The editor in Growth replaces the seeded JSON with a CRUD UI. Pros: zero schema churn at the Growth boundary; matches FR-S9's read-only contract exactly; simple to seed.

**Option B:** Separate `SystemCustomAttribute` table. Pros: relational integrity. Cons: full table for read-only data the user can't edit yet — premature abstraction, violates the project-context "no over-engineering" rule.

**Decision: Option A.** Add `custom_attributes Json?` to `System`. Document the shape in `docs/decisions.md`. Re-evaluate at the Growth boundary.

---

## 3. API surface changes

### 3.1 Re-shaped — `GET /api/organisations`

**Removed query params:** `provider`, `crm`.

**Added query params:**

| Param | Type | Notes |
|---|---|---|
| `system` | UUID | Filter to organisations with at least one link to this System. |
| `system_role` | `PRIMARY_TICKETING\|PRIMARY_CRM\|INTEGRATED_SUITE\|SECONDARY` | Optional sub-filter; only valid when `system` is also present. Maps to the linked-systems table's `role` column. |

All other query params (`q`, `page`, `limit`, `country`, `type`, `membership`, `donation`, `seating`) are unchanged.

**Implementation:** Service joins `organisation_system` and filters with `WHERE EXISTS (SELECT 1 FROM organisation_system os WHERE os.organisation_id = organisation.id AND os.system_id = $1 AND ($2 IS NULL OR os.role = $2))`. Exists-subquery (not join) avoids row duplication when an organisation has multiple Systems matched by other filters.

### 3.2 Re-shaped — `GET /api/organisations/:id`

**Removed from response:** `ticketingProvider`, `crmPlatform`.

**Added to response:**
```json
"systems": [
  {
    "id": "<junction.id>",
    "role": "INTEGRATED_SUITE",
    "sourceReference": "https://...",
    "note": "Migrated from PatronManager 2025-Q3",
    "lastUpdated": "2026-04-12T10:14:00.000Z",
    "system": { "id": "...", "name": "Tessitura", "vendor": "Tessitura Network", "category": "INTEGRATED" }
  }
]
```

The junction `id` is included so the frontend can address links directly for edit and delete (see §3.5).

### 3.3 Re-shaped — `POST /api/organisations`, `PUT /api/organisations/:id`

Body fields `ticketing_provider_id` and `crm_platform_id` are **rejected** (validation error, not silent ignore). Linking is a separate operation per §3.5 — this keeps the resource-write surface narrow and avoids the "save-cascades-into-deletes" pattern that's hard to reason about. The Organisation form's UI orchestrates: save the Organisation first, then call link endpoints.

*Alternative considered and rejected:* accepting a `systems: [...]` array in the body. Tempting for atomicity, but it forces a "diff and reconcile" controller — unwarranted complexity for an internal MVP. Per project-context: "no over-engineering."

### 3.4 New — `/api/systems` resource

| Endpoint | Description | Service file |
|---|---|---|
| `GET /api/systems` | Paginated list with filters and search. | `system-service.js` |
| `GET /api/systems/:id` | Single System + adoption evidence (linked organisations + role). | `system-service.js` |
| `POST /api/systems` | Create. Validates required fields per FR-S1. | `system-service.js` |
| `PUT /api/systems/:id` | Update. `last_updated` auto-set by `@updatedAt`. | `system-service.js` |
| `DELETE /api/systems/:id` | Delete-with-confirmation. Returns `409 Conflict` if any `organisation_system` rows reference it (the FK is `Restrict` — caller must unlink first). | `system-service.js` |

**Query params for `GET /api/systems`:**

| Param | Type | Notes |
|---|---|---|
| `q` | string | Free-text search across `name`, `vendor`, `description`. `ILIKE` + `pg_trgm` GIN index, mirroring Organisation search. |
| `page` | int | 1-based; default 1. |
| `limit` | int | Default 20. |
| `category` | `INTEGRATED\|TICKETING\|AUDIENCE_MANAGEMENT` | Multi-value via repeated param: `?category=INTEGRATED&category=TICKETING`. |
| `deployment_model` | enum | Single value. |
| `pricing_model` | enum | Single value. |
| `geographic_focus` | string | Exact match against seeded list. |
| `membership` / `donation` / `seating` | `YES\|NO\|UNKNOWN` | Capability filters, identical contract to Organisation. |

**Note on multi-value `category`:** This is the first multi-value list filter in the system. The Organisation filter contract is single-value-per-param. Document this in `docs/decisions.md`. The frontend must serialise repeated params; `URLSearchParams` handles this natively.

### 3.5 New — `/api/organisations/:id/systems` link management

| Endpoint | Description |
|---|---|
| `GET /api/organisations/:id/systems` | List the organisation's links. Identical shape to the `systems` array embedded in the org-detail response. Useful when the form re-fetches links after a write. |
| `POST /api/organisations/:id/systems` | Body: `{ systemId, role, sourceReference?, note? }`. Returns the created junction row with embedded System. `409 Conflict` on `(organisation_id, system_id)` unique violation. |
| `PUT /api/organisations/:id/systems/:linkId` | Body: any of `{ role, sourceReference, note, systemId }`. The `systemId` change is permitted but unusual — prefer delete + add for a system swap. |
| `DELETE /api/organisations/:id/systems/:linkId` | Hard delete. Returns `{ data: { id }, error: null, meta: null }` matching the Organisation delete contract. |

The `:linkId` in PUT/DELETE is the junction's `id`, not the System ID. This avoids ambiguity if the frontend ever needs to address two notional links to the same System (the unique constraint prevents it today, but the URL shape is forward-compatible).

### 3.6 Removed endpoints

- `GET /api/meta/ticketing-providers` — deleted along with the lookup table.
- `GET /api/meta/crm-platforms` — deleted along with the lookup table.

The Organisation list filter sidebar uses `GET /api/systems?limit=200` (or a paged search-as-you-type) to populate the "Adopted system" picker. `/api/meta/organisation-types` stays.

### 3.7 Unchanged

- `GET /api/health`
- `GET /api/meta/organisation-types`
- All response-envelope rules (`{ data, error, meta }`)
- All naming, date format, capability-string, and JSON-camelCase rules

---

## 4. Frontend changes

### 4.1 New pages

| Page | Path | Notes |
|---|---|---|
| `SystemListPage.jsx` | `/systems` | Filter sidebar, table, pagination, **selection bar shared with Organisation list via `SelectionContext`** — but selection scope is namespaced (see §4.5). |
| `SystemDetailPage.jsx` | `/systems/:id` | System facts + "Adoption evidence" panel (linked organisations grouped by role) + custom-attributes panel (read-only, from JSON). |
| `SystemFormPage.jsx` | `/systems/new`, `/systems/:id/edit` | Single page handles both create and edit, mirroring `OrganisationFormPage` pattern. Category-aware field hints on the description field per the PRD delta's "category-aware required fields" wording — soft hints only, no hard validation differences in MVP. |
| `SystemComparePage.jsx` | `/compare/systems?ids=...` | System compare. See §4.4 on the route choice. |

### 4.2 Re-shaped pages

| Page | What changes |
|---|---|
| `OrganisationListPage.jsx` | Filter sidebar: drop the two provider/CRM dropdowns, add a single **Adopted system** combobox + an **Adopted-system role** sub-filter that appears only when a System is selected. |
| `OrganisationDetailPage.jsx` | Replace the flat "Ticketing provider / CRM platform" rows with a **Linked systems** panel grouped by `role`, each row showing system name + per-link source + per-link note + per-link `last_updated`. Each row is editable (opens an inline editor or a dialog) and removable (with confirmation). |
| `OrganisationFormPage.jsx` | Replace the two single-select dropdowns with a **Linked systems editor**: a list of rows where each row is `{ system combobox, role select, per-link source input, per-link note textarea, remove button }`, plus an "Add system" button. Form submission orchestrates: PUT the org first, then diff the link rows against existing links and POST/PUT/DELETE accordingly. |
| `OrganisationCard.jsx` | Replace `ticketingProvider` / `crmPlatform` text with a compact list of `{ role-icon, system name }` chips, capped at 3 with a "+N more" overflow. Used in Compare; the v1 Compare flow for Organisations is no longer the headline use case but card layout still works for organisation detail/list summaries. |
| `ActiveFilterChips.jsx` | Add chips for `system` (rendered as the System's name, looked up from cache) and `system_role`. Drop chips for `provider` and `crm`. |
| `ComparePage.jsx` | **Repurposed for System compare.** See §4.4. |

### 4.3 New hooks and api utilities

```
frontend/src/api/
  systems.js                  ← fetchSystems, fetchSystem, createSystem,
                                updateSystem, deleteSystem
  organisation-systems.js     ← fetchOrganisationSystems, linkSystem,
                                updateLink, unlinkSystem

frontend/src/hooks/
  useSystems.js               ← list query
  useSystem.js                ← single system + adoption evidence
  useSystemMutation.js        ← create/update/delete
  useOrganisationSystems.js   ← list + link/update/unlink mutations,
                                invalidates ['organisations', orgId]
                                and ['systems', systemId] on success
```

`useMetaData.js` loses `fetchProviders` and `fetchCrms`. The "Adopted system" combobox uses `useSystems` directly (or a thin `useSystemSearch` wrapper if debounced search-as-you-type is needed for the picker — recommend the wrapper to keep filter cache and picker cache from colliding).

### 4.4 Compare — route and selection re-design

**v1:** `/compare?ids=<orgId>,<orgId>,...` — selection from the Organisation list.

**v2:** Two routes:
- `/compare/systems?ids=<systemId>,<systemId>,...` — Mode A, the headline System-to-System compare (PRD delta Journey 1).
- `/compare/organisations?ids=<orgId>,<orgId>,...` — *deprecated visibility but path retained* for any internal links and to keep the page available. Mode B (organisation-filtered System compare) is Growth, not MVP.

The shorter `/compare?ids=...` (no entity segment) is dropped to avoid ambiguity. Bookmarks from v1 break — acceptable for an internal MVP per PRD delta §6.

The data-fetching pattern is identical to v1: `Promise.all` over individual `GET /api/systems/:id` calls. Same parallel-fetch decision, same TanStack Query key shape (`['systems', id]`).

### 4.5 `SelectionContext` — namespacing

v1's `SelectionContext` exposed a flat `selectedIds: string[]`. With two list pages now feeding two compare pages, that's ambiguous. Two options:

- **Option A:** Two contexts — `OrganisationSelectionContext` and `SystemSelectionContext`. Pros: clean, each list page only depends on the one it needs. Cons: two providers wrapping the route tree.
- **Option B:** Single `SelectionContext` keyed by entity: `selectedIds: { organisations: string[], systems: string[] }`, `toggleSelection(entity, id)`, `clearSelection(entity)`. Pros: one provider. Cons: API bigger; consumers must always pass the entity.

**Decision: Option A.** Two providers, each focused. The cost is one extra provider in `App.jsx`; the benefit is that components stay decoupled and the v1 selection contract for Organisations doesn't change. This also makes it natural to deprecate the Organisation selection later without touching System code.

### 4.6 Routing

```
/                          → redirect to /organisations (unchanged)
/organisations             → list (re-shaped)
/organisations/new         → create (re-shaped)
/organisations/:id         → detail (re-shaped)
/organisations/:id/edit    → edit (re-shaped)
/systems                   → list (new)
/systems/new               → create (new)
/systems/:id               → detail (new)
/systems/:id/edit          → edit (new)
/compare/systems           → compare (new)
/compare/organisations     → compare (legacy path, retained)
```

A top-level navigation switcher between **Organisations** and **Systems** is required — this is the most visible UX delta from v1's single-resource navigation.

---

## 5. Project-structure changes

```
backend/src/
  routes/
    organisations.js          ← unchanged location; mounts new nested system-link routes
    systems.js                ← NEW
    organisation-systems.js   ← NEW (mounted under /api/organisations/:id/systems)
    meta.js                   ← shrinks (only organisation-types remains)
  controllers/
    organisation-controller.js          ← updated (filter param shape, response shape)
    system-controller.js                ← NEW
    organisation-system-controller.js   ← NEW
    meta-controller.js                  ← shrinks
  services/
    organisation-service.js             ← updated (joins, filter logic)
    system-service.js                   ← NEW
    organisation-system-service.js      ← NEW
  prisma/
    schema.prisma                       ← updated
    seed.js                             ← updated (see §6)
    migrations/
      <timestamp>_add_system_and_junction/migration.sql       ← NEW (additive)
      <timestamp>_backfill_systems_and_links/migration.sql    ← NEW (data backfill, custom SQL)
      <timestamp>_drop_legacy_lookups/migration.sql           ← NEW (destructive)

frontend/src/
  api/
    organisations.js              ← updated (response shape)
    systems.js                    ← NEW
    organisation-systems.js       ← NEW
    meta.js                       ← shrinks
  pages/
    SystemListPage.jsx            ← NEW
    SystemDetailPage.jsx          ← NEW
    SystemFormPage.jsx            ← NEW
    SystemComparePage.jsx         ← NEW
  hooks/
    useSystems.js                 ← NEW
    useSystem.js                  ← NEW
    useSystemMutation.js          ← NEW
    useOrganisationSystems.js     ← NEW
  context/
    SelectionContext.jsx          ← refactored: split into two contexts (§4.5)
  lib/
    system-geographic-focus.js    ← NEW (constrained dropdown values)
```

---

## 6. Prisma schema migration plan — data-loss-free conversion

This is the binding execution sequence. **Three Prisma migrations**, in order. Each is generated with `npx prisma migrate dev --create-only` and the SQL is reviewed before apply.

### 6.1 Migration A — `add_system_and_junction` (additive, non-destructive)

Generated automatically by Prisma after editing `schema.prisma` to:

1. Add the four new enums (`SystemCategory`, `SystemRole`, `DeploymentModel`, `PricingModel`).
2. Add the `system` table.
3. Add the `organisation_system` table with FKs to both `organisation.id` (`onDelete: Cascade`) and `system.id` (`onDelete: Restrict`), plus the unique constraint and indexes from §2.2.
4. Add the `pg_trgm` GIN index on `system(name, vendor, description)` for search parity with Organisation.

**Critically: do NOT remove `ticketing_provider_id` / `crm_platform_id` from the Organisation model in this migration.** Keep `TicketingProvider` and `CrmPlatform` models intact in the schema for now. The schema after this migration represents a transitional state where both systems coexist.

After review, apply with `npx prisma migrate dev`. Verify: existing Organisation rows are untouched; new tables are empty.

### 6.2 Migration B — `backfill_systems_and_links` (data backfill)

Generated as `--create-only` with no schema changes (Prisma will create an empty migration). **Replace the file contents with custom SQL** that runs the deterministic backfill below.

#### Step 1 — Insert one System row per unique platform

The conversion uses a fixed mapping table. The seed data defines exactly 8 ticketing providers and 5 CRMs, with two collapses (Spektrix appears in both; Tessitura ↔ Tessitura CRM):

| Source row | Source table | Target System name | Target vendor | Target category |
|---|---|---|---|---|
| `Tessitura` | ticketing_provider | Tessitura | Tessitura Network | `INTEGRATED` |
| `Tessitura CRM` | crm_platform | *(collapsed into Tessitura)* | — | — |
| `Spektrix` | ticketing_provider | Spektrix | Spektrix Ltd | `INTEGRATED` |
| `Spektrix` | crm_platform | *(collapsed into Spektrix)* | — | — |
| `AudienceView` | ticketing_provider | AudienceView | AudienceView | `INTEGRATED` |
| `Ticketmaster` | ticketing_provider | Ticketmaster | Live Nation Entertainment | `TICKETING` |
| `PatronBase` | ticketing_provider | PatronBase | PatronBase | `TICKETING` |
| `Eventbrite` | ticketing_provider | Eventbrite | Eventbrite, Inc. | `TICKETING` |
| `TicketSolve` | ticketing_provider | Ticketsolve | Ticketsolve | `TICKETING` |
| `Universe` | ticketing_provider | Universe | Live Nation Entertainment | `TICKETING` |
| `Salesforce` | crm_platform | Salesforce | Salesforce, Inc. | `AUDIENCE_MANAGEMENT` |
| `HubSpot` | crm_platform | HubSpot | HubSpot, Inc. | `AUDIENCE_MANAGEMENT` |
| `Donorfy` | crm_platform | Donorfy | Donorfy | `AUDIENCE_MANAGEMENT` |

This produces **11 System rows** post-collapse — clearing the FR-S1 ≥ 8 threshold (3 integrated, 5 ticketing, 3 audience-management).

Capability flags, deployment_model, pricing_model, geographic_focus, description, source_reference, custom_attributes are left at their defaults (UNKNOWN / null) by the migration. The seed script populates them in a follow-up step (§6.4).

SQL pattern:

```sql
INSERT INTO system (id, name, vendor, category, last_updated, created_at)
VALUES
  (gen_random_uuid(), 'Tessitura',    'Tessitura Network',         'INTEGRATED',          NOW(), NOW()),
  (gen_random_uuid(), 'Spektrix',     'Spektrix Ltd',              'INTEGRATED',          NOW(), NOW()),
  (gen_random_uuid(), 'AudienceView', 'AudienceView',              'INTEGRATED',          NOW(), NOW()),
  (gen_random_uuid(), 'Ticketmaster', 'Live Nation Entertainment', 'TICKETING',           NOW(), NOW()),
  (gen_random_uuid(), 'PatronBase',   'PatronBase',                'TICKETING',           NOW(), NOW()),
  (gen_random_uuid(), 'Eventbrite',   'Eventbrite, Inc.',          'TICKETING',           NOW(), NOW()),
  (gen_random_uuid(), 'Ticketsolve',  'Ticketsolve',               'TICKETING',           NOW(), NOW()),
  (gen_random_uuid(), 'Universe',     'Live Nation Entertainment', 'TICKETING',           NOW(), NOW()),
  (gen_random_uuid(), 'Salesforce',   'Salesforce, Inc.',          'AUDIENCE_MANAGEMENT', NOW(), NOW()),
  (gen_random_uuid(), 'HubSpot',      'HubSpot, Inc.',             'AUDIENCE_MANAGEMENT', NOW(), NOW()),
  (gen_random_uuid(), 'Donorfy',      'Donorfy',                   'AUDIENCE_MANAGEMENT', NOW(), NOW());
```

Requires `pgcrypto` for `gen_random_uuid()`; if not enabled, prepend `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.

#### Step 2 — Build a translation table

Two `tp_to_system` and `crm_to_system` CTE-equivalents derived by name-match:

```sql
-- Materialised once for the backfill, then dropped at the end.
CREATE TEMP TABLE tp_to_system AS
SELECT tp.id AS old_id, s.id AS system_id, s.category
FROM ticketing_provider tp
JOIN system s ON s.name = CASE tp.name
  WHEN 'TicketSolve' THEN 'Ticketsolve'   -- normalises capitalisation
  ELSE tp.name
END;

CREATE TEMP TABLE crm_to_system AS
SELECT cp.id AS old_id, s.id AS system_id, s.category
FROM crm_platform cp
JOIN system s ON s.name = CASE cp.name
  WHEN 'Tessitura CRM' THEN 'Tessitura'   -- collapse
  WHEN 'Spektrix'      THEN 'Spektrix'    -- already aligned
  ELSE cp.name
END;
```

These tables let the link-insertion step look up the new System ID for each old FK without hardcoding UUIDs.

#### Step 3 — Insert `organisation_system` rows from existing FKs

For each Organisation with a non-null `ticketing_provider_id`:

```sql
INSERT INTO organisation_system (id, organisation_id, system_id, role, source_reference, note, last_updated, created_at)
SELECT
  gen_random_uuid(),
  o.id,
  m.system_id,
  CASE m.category
    WHEN 'INTEGRATED' THEN 'INTEGRATED_SUITE'
    ELSE 'PRIMARY_TICKETING'
  END,
  o.source_reference,                    -- inherit org-level source as link source
  NULL,                                  -- no per-link note for migrated rows
  o.last_updated,
  o.created_at
FROM organisation o
JOIN tp_to_system m ON m.old_id = o.ticketing_provider_id
WHERE o.ticketing_provider_id IS NOT NULL;
```

For each Organisation with a non-null `crm_platform_id`, with **deduplication** for the integrated case:

```sql
INSERT INTO organisation_system (id, organisation_id, system_id, role, source_reference, note, last_updated, created_at)
SELECT
  gen_random_uuid(),
  o.id,
  m.system_id,
  CASE m.category
    WHEN 'INTEGRATED' THEN 'INTEGRATED_SUITE'
    ELSE 'PRIMARY_CRM'
  END,
  o.source_reference,
  NULL,
  o.last_updated,
  o.created_at
FROM organisation o
JOIN crm_to_system m ON m.old_id = o.crm_platform_id
WHERE o.crm_platform_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organisation_system os
    WHERE os.organisation_id = o.id AND os.system_id = m.system_id
  );
```

The `NOT EXISTS` clause is the deduplication. The realistic case it handles: an org has both `ticketing_provider_id = Spektrix` and `crm_platform_id = Spektrix` (or `Tessitura` / `Tessitura CRM`). The first insert created the `INTEGRATED_SUITE` link; the second insert silently no-ops.

#### Step 4 — Verify invariants

```sql
-- Every link row's organisation must still exist (cascade safety).
SELECT count(*) FROM organisation_system os
LEFT JOIN organisation o ON o.id = os.organisation_id
WHERE o.id IS NULL;
-- Expected: 0

-- Every link row's system must still exist (restrict safety).
SELECT count(*) FROM organisation_system os
LEFT JOIN system s ON s.id = os.system_id
WHERE s.id IS NULL;
-- Expected: 0

-- Pre-migration FK count vs post-migration link count (allowing for dedup):
-- (orgs with ticketing FK) + (orgs with crm FK) - (orgs where both FKs map to same integrated system)
-- = COUNT(*) FROM organisation_system

-- (d) AC3 / Tessitura + UK — run only when legacy data implies it (see prose below).
SELECT count(*) FROM organisation_system os
JOIN organisation o ON o.id = os.organisation_id
JOIN system s ON s.id = os.system_id
WHERE o.country = 'United Kingdom' AND s.name = 'Tessitura';
-- Expected when precondition holds: >= 1
```

**Invariant (d) and deploy order:** `prisma migrate deploy` typically runs **before** `prisma db seed`. On an empty `organisation` table, an unconditional “≥ 1 UK Tessitura link” check would fail even though the backfill is correct. The migration therefore enforces (d) only when at least one legacy organisation row qualifies (UK + Tessitura or Tessitura CRM on FKs). Populated DBs retain the v1 AC3 guarantee; greenfield installs rely on Story 6.3 seed to restate AC3 after data exists.

A migration that fails any of these checks must be rolled back (the migration is a transaction; raise an error to abort).

#### Step 5 — Drop temp tables

```sql
DROP TABLE tp_to_system;
DROP TABLE crm_to_system;
```

After Migration B applies cleanly, the database has the new schema *and* fully populated junction rows. The legacy FK columns and lookup tables still exist — but they are now redundant.

### 6.3 Migration C — `drop_legacy_lookups` (destructive)

Edit `schema.prisma`:
- Remove `ticketing_provider_id` and `crm_platform_id` from `Organisation`
- Remove the `ticketing_provider` and `crm_platform` relations from `Organisation`
- Remove the `TicketingProvider` and `CrmPlatform` models entirely

Generate with `npx prisma migrate dev --create-only`. The auto-generated SQL will:

```sql
ALTER TABLE organisation DROP CONSTRAINT organisation_ticketing_provider_id_fkey;
ALTER TABLE organisation DROP CONSTRAINT organisation_crm_platform_id_fkey;
ALTER TABLE organisation DROP COLUMN ticketing_provider_id;
ALTER TABLE organisation DROP COLUMN crm_platform_id;
DROP TABLE ticketing_provider;
DROP TABLE crm_platform;
```

Review and apply. After this, the schema represents the v2 target state.

### 6.4 Seed script changes

`backend/src/prisma/seed.js` must be re-shaped to seed the new world. Sequence:

1. **Upsert the 11 Systems** with the same name/vendor/category mapping from §6.2 Step 1, plus richer optional fields (deployment_model, pricing_model, geographic_focus, description, capability flags, source_reference, custom_attributes).
2. **Upsert OrganisationTypes** (unchanged from v1).
3. **Upsert sample organisations** (re-using the existing `SAMPLE_ORGANISATIONS` data, but with `ticketingProviderName` / `crmPlatformName` translated into a new `links: [{ systemName, role, sourceReference?, note? }]` array on each sample row).
4. **Upsert OrganisationSystem links** from the translated sample data, applying the same deduplication rule as the migration (skip if `(org, system)` already linked).
5. **Re-state the AC3 invariant** as: a UK organisation linked to Tessitura with role `INTEGRATED_SUITE`.

The existing `sample-organisations-seed-data.js` file needs a parallel update — its rows currently encode `ticketingProviderName` and `crmPlatformName`; v2 needs `links: [...]`. This is a content edit, not a schema concern, but it must land in the same PR as the migration to keep `prisma migrate reset` green.

### 6.5 Rollback strategy

Migrations B and C are forward-only. Rollback path if a problem is discovered post-deployment:

- **Before C applies:** `prisma migrate resolve --rolled-back` on B, then `TRUNCATE organisation_system; DROP TABLE organisation_system; DROP TABLE system;` (and drop the four enums). Original FKs and lookups are intact.
- **After C applies:** rollback requires restoring from backup. There is no SQL inverse for the dropped FK columns since their data has been moved into the junction. Document in `docs/decisions.md` that a database backup is mandatory before applying Migration C in any non-throwaway environment.

Per the project's "internal MVP, no production-grade hardening" posture, this is acceptable — but the README's deployment section must call it out.

---

## 7. Pattern and naming consistency

All v1 patterns hold without modification, with these specific extensions:

| v1 rule | v2 application |
|---|---|
| `{ data, error, meta }` envelope on every endpoint | All new `/api/systems` and link endpoints. `meta: null` on single-resource and mutation responses. |
| `last_updated` set only by Prisma `@updatedAt`, never accepted from request body | Extended to `system.last_updated` and `organisation_system.last_updated` in schema (ADR-011 pattern). |
| Capability values are uppercase strings end-to-end | Unchanged. System uses the same enum. |
| Filter state in URL via `useSearchParams` | New `system` and `system_role` params on the Organisation list; `category`, `deployment_model`, `pricing_model`, `geographic_focus`, capability params on the System list. |
| Search via `ILIKE` + `pg_trgm` GIN index | Index added on `system(name, vendor, description)` in Migration A. |
| Selection state in `SelectionContext`, never local | Two contexts now (Organisation and System), each with the same `{ selectedIds, toggleSelection, clearSelection }` shape. |
| Manual validation in controller | New System and link controllers follow the same pattern. Validation for `category` checks enum membership; for `role` likewise. |
| British English everywhere | `audience_management` (not `audience-management` in code; underscore is the enum separator) — but UI labels use *audience management* with a space. `organisation` not `organization` in all new field names. |

---

## 8. Decisions log additions

Add to `docs/decisions.md` as part of this delta's implementation:

1. **OrganisationSystem hard-deletes on unlink, no soft-delete or history table.** Rationale: PRD delta open question 4 resolved this way; adoption history is a Growth concern.
2. **System custom attributes stored as JSON on `System.custom_attributes`, not a separate table.** Rationale: read-only in MVP per FR-S9; Option A is the smaller surface.
3. **System name is unique; vendor disambiguation goes in `vendor`.** Rationale: prevents the v1 "Tessitura vs Tessitura CRM" duplication problem at the lookup layer.
4. **Three-migration sequence (additive → backfill → destructive) is mandatory.** Rationale: a single migration would drop FKs before the junction is populated. Document in case future agents are tempted to "simplify" via auto-generated migrations.
5. **No batch endpoint for compare; parallel `GET /api/systems/:id` calls.** Inheriting the v1 decision; same upgrade path applies.
6. **Selection context split into Organisation and System.** Rationale: two compare flows, two list pages, decoupled state.
7. **Compare paths are `/compare/systems` and `/compare/organisations`.** v1 bookmarks of `/compare?ids=...` break; acceptable for an internal MVP.

---

## 9. What stays untouched

| Section of v1 architecture.md | Reason |
|---|---|
| Starter template evaluation, language/runtime, build tooling, ORM choice | No technology change. |
| Validation strategy (manual in controller) | Generalises to the new endpoints. |
| Compare fetch strategy (parallel) | Generalises to System compare. |
| Search approach (`ILIKE` + `pg_trgm`) | Same approach, new index. |
| Pagination (offset, `page` + `limit`) | Generalises. |
| React Router v6, TanStack Query v5, shadcn/ui copy-paste, Tailwind v3 | All hold. |
| CORS, environment variables, Docker Compose service names | All hold. |
| Naming patterns (DB snake_case, API camelCase, files kebab-case, components PascalCase, hooks `useX`) | All hold. |
| Response envelope and error contract | All hold. |
| Anti-patterns list | All hold. |
| Authentication posture (none) | Unchanged. |

---

## 10. Implementation sequencing (recommended story order)

1. **Migration A** — additive schema. Ship and apply alone, in a small PR.
2. **Migration B** — data backfill with custom SQL and verification queries. Separate PR; reviewer must confirm row counts on a clone of production data.
3. **Backend `/api/systems` and link endpoints** — built against the now-coexisting schema. Old `/api/meta/ticketing-providers` and `/api/meta/crm-platforms` still work.
4. **Frontend System list, detail, form, compare** — built and merged before any change to Organisation pages, so System CRUD ships independent of the re-shape risk.
5. **Frontend Organisation re-shape** — list filter, detail "Linked systems" panel, form linked-systems editor, card.
6. **Backend `/api/organisations` re-shape** — change filter param parsing and response shape; this is the breaking-change PR; coordinate with frontend in (5).
7. **Migration C** — destructive cleanup. Drops the legacy columns and tables. Apply only after (3)–(6) are deployed and stable.
8. **Re-run [implementation-readiness-report](implementation-readiness-report-2026-04-02T17-25-47Z.md)** per the PRD delta's §7 follow-up list.

This sequence keeps every step shippable on its own and never leaves the database in an inconsistent state.

---

## 11. Open questions deferred to later artefacts

These are explicitly out of scope for this delta — handled in UX spec or epic planning:

1. The exact UI for the Linked-systems editor on the Organisation form (row-based vs dialog-based add/edit). UX spec call.
2. Whether System Compare's "custom attributes union panel" merges by `label` or always shows per-system columns. UX spec call.
3. Whether the System list shows adoption count as a column (`N organisations adopt this`). Cheap to add server-side via `_count`; UX spec call on visibility.
4. Whether deletion of a System whose only adopters are about to be deleted is a single confirmation flow or a two-step "unlink everywhere first" flow. UX spec call.
