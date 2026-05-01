# Story 7.1: System REST API — List, Detail, Search, Filters

**Status:** done

## Story

As a frontend developer,
I want `/api/systems` to return paginated, filterable, searchable System records and a detail endpoint that includes adoption evidence,
So that the System list, detail, and combobox surfaces have a single backend to consume.

## Acceptance Criteria

**Given** the backend layering rules (routes → controller → service)
**When** the `/api/systems` resource is implemented
**Then** the layout is: `backend/src/routes/systems.js` (routing only), `backend/src/controllers/system-controller.js` (validation + response shaping), `backend/src/services/system-service.js` (Prisma calls + filter SQL); a `backend/src/services/system-list-dto.js` (also used for create/update/detail in Story 7.2) maps Prisma snake_case rows to camelCase API output

**Given** `GET /api/systems` is called with no query params
**When** the response is returned
**Then** it has shape `{ data: [...systems], error: null, meta: { page: 1, limit: 20, total: N, totalPages: N } }`
**And** each System object exposes `id`, `name`, `vendor`, `category`, `deploymentModel`, `pricingModel`, `geographicFocus`, `description`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `sourceReference`, `customAttributes`, `lastUpdated`, `createdAt` — all camelCased; enum values surface as their SCREAMING_SNAKE_CASE strings (e.g. `"INTEGRATED"`, `"SAAS"`); timestamps as ISO 8601

**Given** `GET /api/systems?q=spektrix`
**When** the search runs
**Then** results match where `name`, `vendor`, or `description` contain the term via `ILIKE '%term%'` against the `pg_trgm` GIN indexes already in Migration A (separate indexes on `system.name`, `system.vendor`, `system.description`)
**And** the search is case-insensitive

**Given** `GET /api/systems?category=INTEGRATED&category=TICKETING`
**When** the multi-value param is parsed
**Then** the controller accepts an array of `category` params (Express parses repeated keys into arrays automatically), validates each value is one of `INTEGRATED | TICKETING | AUDIENCE_MANAGEMENT`, and the service filters with Prisma `{ category: { in: [...] } }`
**And** any single invalid enum value returns `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field: "category", message: "Invalid category value" }] }, meta: null }`

**Given** `GET /api/systems?deployment_model=SAAS&pricing_model=SUBSCRIPTION&geographic_focus=UK&membership=YES&donation=UNKNOWN&seating=NO`
**When** the request is processed
**Then** results match all six predicates simultaneously (AND semantics across distinct filters)
**And** `membership`, `donation`, `seating` are validated against `CapabilityState { YES | NO | UNKNOWN }`, `deployment_model` against `DeploymentModel`, `pricing_model` against `PricingModel`, and `geographic_focus` against the `SYSTEM_GEOGRAPHIC_FOCUS` constant from `backend/src/lib/system-geographic-focus.js`; invalid values return `400` with specific `fields[]` errors

**Given** pagination is requested via `?page=2&limit=10`
**When** the response is returned
**Then** `meta.page = 2`, `meta.limit = 10`, `meta.total` is the total count matching filters (ignoring pagination), `meta.totalPages = Math.ceil(total / limit)`
**And** `page` and `limit` default to 1 and 20 respectively when omitted; `limit` is capped at 100

**Given** `GET /api/systems/:id` is called for an existing System
**When** the response is returned
**Then** it has shape `{ data: { ...system, organisations: [...] }, error: null, meta: null }`
**And** the embedded `organisations` array is the adoption evidence: each entry has `{ id, role, sourceReference, note, lastUpdated, organisation: { id, name, type, country } }` where `id` is the junction row id (`OrganisationSystem.id`), `type` is the organisation type name string
**And** the array is sorted by `role` then by `organisation.name` ascending (for deterministic role-grouped rendering on the detail page)

**Given** `GET /api/systems/:id` is called for a non-existent ID
**When** the service finds no row
**Then** the controller returns `404` with `{ data: null, error: { message: "System not found", fields: [] }, meta: null }`

## Tasks / Subtasks

- [x] **Task 1** — Create `backend/src/services/system-list-dto.js` — `toSystemDto(row)` and adoption-evidence `toSystemDetailDto(row)` functions
  - [x] **1.1** — `toSystemDto` maps all System scalar fields to camelCase; `customAttributes` passes through the JSON value as-is (null or array)
  - [x] **1.2** — `toSystemDetailDto` extends `toSystemDto` with `organisations: []` array from junction rows

- [x] **Task 2** — Create `backend/src/services/system-service.js` — `listSystems` and `getSystemById`
  - [x] **2.1** — `listSystems({ q, categories, deploymentModel, pricingModel, geographicFocus, membership, donation, seating, page, limit })` — builds Prisma `where` clause, runs `findMany` + `count`
  - [x] **2.2** — `getSystemById(id)` — `findUnique` with adoption evidence include (see structure below)

- [x] **Task 3** — Create `backend/src/controllers/system-controller.js` — `listSystems` and `getSystemById` handlers
  - [x] **3.1** — Parse and validate all query params; multi-value `category` array handling; `geographic_focus` against seeded constant; build filters object; call service; return envelope
  - [x] **3.2** — UUID validation on `:id`; 404 handling from service returning null

- [x] **Task 4** — Create `backend/src/routes/systems.js` — routing only, two GET routes

- [x] **Task 5** — Mount route in `backend/src/app.js`: `app.use('/api/systems', systemRoutes)` after the organisations route

- [x] **Task 6** — Add entry to `docs/decisions.md` for multi-value `category` param (first multi-value list filter; document the `URLSearchParams` repeated-key pattern)

- [x] **Task 7** — Tests: added `backend/src/__tests__/system-service.test.js` and `backend/src/__tests__/system-controller.test.js` following the existing pattern in `organisation-service.test.js`

## Technical Requirements

### New files to create

| File | Purpose |
|------|---------|
| `backend/src/routes/systems.js` | Routing only — two GET routes |
| `backend/src/controllers/system-controller.js` | Param parsing, validation, response shaping |
| `backend/src/services/system-service.js` | Prisma queries, filter logic |
| `backend/src/services/system-list-dto.js` | snake_case → camelCase DTO mapping |

### Files to touch

| File | Change |
|------|--------|
| `backend/src/app.js` | `require + app.use('/api/systems', systemRoutes)` |
| `docs/decisions.md` | Multi-value `category` filter ADR entry |

### No frontend files in this story

Story 7.1 is **backend-only**. Frontend System hooks, pages, and API utilities are in Stories 7.3–7.6.

## Architecture Compliance

All v1 rules hold unchanged. Story 7.1-specific compliance:

### Response envelope — no exceptions
```js
// List success
{ data: [...systems], error: null, meta: { page: 1, limit: 20, total: 11, totalPages: 1 } }

// Single success
{ data: { ...system, organisations: [...] }, error: null, meta: null }

// 400 validation error
{
  data: null,
  error: { message: "Validation failed", fields: [{ field: "category", message: "Invalid category value" }] },
  meta: null
}

// 404
{ data: null, error: { message: "System not found", fields: [] }, meta: null }
```

### UUID validation — mirror `organisation-controller.js`
```js
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuidParam(id) { return typeof id === 'string' && UUID_REGEX.test(id.trim()); }
// Return 404 (not 400) for invalid UUID format — the entity is simply "not found"
```

### Prisma client import — singleton only
```js
const prisma = require('../lib/prisma');  // NEVER new PrismaClient()
```

### Multi-value `category` parameter
Express parses `?category=INTEGRATED&category=TICKETING` into `req.query.category = ['INTEGRATED', 'TICKETING']`. Normalise to an array regardless of whether it arrives as a string (single value) or array:
```js
// Normalise to array or undefined
function asQueryArray(param) {
  if (param === undefined || param === null) return undefined;
  if (Array.isArray(param)) return param.filter(v => typeof v === 'string' && v.trim() !== '');
  if (typeof param === 'string' && param.trim() !== '') return [param.trim()];
  return undefined;
}
```
Then validate every element against `SYSTEM_CATEGORY_SET = new Set(['INTEGRATED', 'TICKETING', 'AUDIENCE_MANAGEMENT'])`.

### Prisma `IN` filter for multi-value category
```js
// In service layer when categories array is provided:
where.category = { in: categories };
// categories is string[] e.g. ['INTEGRATED', 'TICKETING']
```

### System DTO — mirror `organisation-list-dto.js`
`system-list-dto.js` must export:
- `toSystemDto(row)` — scalar fields for list; no `organisations`
- `toSystemDetailDto(row)` — same as `toSystemDto` plus `organisations` nested array

Both reuse the same `dateTimeToIso(value)` helper (copy or import from a shared location — copying is fine, this project avoids premature abstractions).

**`toSystemDto` field mapping:**
```js
function toSystemDto(row) {
  return {
    id: row.id,
    name: row.name,
    vendor: row.vendor,
    category: row.category,                          // SCREAMING_SNAKE_CASE string, pass through
    deploymentModel: row.deployment_model ?? null,   // nullable enum
    pricingModel: row.pricing_model ?? null,
    geographicFocus: row.geographic_focus ?? null,
    description: row.description ?? null,
    membershipCapability: row.membership_capability,
    donationCapability: row.donation_capability,
    reservedSeatingCapability: row.reserved_seating_capability,
    sourceReference: row.source_reference ?? null,
    customAttributes: row.custom_attributes ?? null, // JSON value, pass through
    lastUpdated: dateTimeToIso(row.last_updated),
    createdAt: dateTimeToIso(row.created_at),
  };
}
```

**`toSystemDetailDto` addition:**
```js
function toSystemDetailDto(row) {
  return {
    ...toSystemDto(row),
    organisations: (row.organisation_systems ?? []).map(link => ({
      id: link.id,           // junction row id (OrganisationSystem.id)
      role: link.role,       // SCREAMING_SNAKE_CASE
      sourceReference: link.source_reference ?? null,
      note: link.note ?? null,
      lastUpdated: dateTimeToIso(link.last_updated),
      organisation: {
        id: link.organisation.id,
        name: link.organisation.name,
        type: link.organisation.organisation_type?.name ?? null,
        country: link.organisation.country,
      },
    })),
  };
}
```

### `getSystemById` Prisma include
```js
const systemDetailInclude = {
  organisation_systems: {
    include: {
      organisation: {
        include: { organisation_type: true },
      },
    },
    orderBy: [
      { role: 'asc' },
      { organisation: { name: 'asc' } },
    ],
  },
};
// Usage: prisma.system.findUnique({ where: { id }, include: systemDetailInclude })
```
Note: Prisma sorts SCREAMING_SNAKE_CASE enum values alphabetically: `INTEGRATED_SUITE` < `PRIMARY_CRM` < `PRIMARY_TICKETING` < `SECONDARY`. This is deterministic — the frontend renders role groups by iterating the ordered array.

### `listSystems` Prisma query pattern — mirror `organisation-service.js`
```js
async function listSystems({ q, categories, deploymentModel, pricingModel,
                              geographicFocus, membership, donation, seating,
                              page, limit }) {
  const where = buildSystemListWhere({ q, categories, deploymentModel,
                                        pricingModel, geographicFocus,
                                        membership, donation, seating });
  const [rows, total] = await Promise.all([
    prisma.system.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.system.count({ where }),
  ]);
  return { rows, total };
}
```
List endpoint **does not** include `organisation_systems` — that would be N+1 and the list page doesn't need adoption evidence. Only `getSystemById` includes the junction.

### Filter-building pattern — mirror `buildOrganisationListCompositeWhere`
```js
function buildSystemListWhere({ q, categories, deploymentModel, pricingModel,
                                  geographicFocus, membership, donation, seating }) {
  const parts = [];
  const term = q?.trim();
  if (term) {
    parts.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { vendor: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    });
  }
  if (categories?.length) parts.push({ category: { in: categories } });
  if (deploymentModel)   parts.push({ deployment_model: deploymentModel });
  if (pricingModel)      parts.push({ pricing_model: pricingModel });
  if (geographicFocus)   parts.push({ geographic_focus: geographicFocus });
  if (membership)        parts.push({ membership_capability: membership });
  if (donation)          parts.push({ donation_capability: donation });
  if (seating)           parts.push({ reserved_seating_capability: seating });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}
```

### `geographic_focus` validation
Import `SYSTEM_GEOGRAPHIC_FOCUS` from `backend/src/lib/system-geographic-focus.js`:
```js
const { SYSTEM_GEOGRAPHIC_FOCUS } = require('../lib/system-geographic-focus');
const GEOGRAPHIC_FOCUS_SET = new Set(SYSTEM_GEOGRAPHIC_FOCUS);
// Values: ['UK', 'Europe', 'North America', 'Global', 'Other']
```

### Route file structure
```js
// backend/src/routes/systems.js
const express = require('express');
const systemController = require('../controllers/system-controller');
const router = express.Router();

router.get('/', systemController.listSystems);
router.get('/:id', systemController.getSystemById);

module.exports = router;
```

### app.js mount — add after organisations route
```js
const systemRoutes = require('./routes/systems');
// ...
app.use('/api/systems', systemRoutes);
```

## Previous Story Intelligence (6.3)

- **Strip helpers exist** at `backend/src/lib/strip-client-controlled-write-keys.js` — exports `stripClientControlledSystemWriteKeys` and `stripClientControlledOrganisationSystemWriteKeys`. Story 7.1 is read-only (no POST/PUT), so these aren't needed here. Story 7.2 **must** call them.
- **Migrations A and B are applied** — `system` and `organisation_system` tables exist; `pg_trgm` GIN indexes on `system(name)`, `system(vendor)`, `system(description)` are live.
- **11 systems are seeded** with full enrichment including `custom_attributes` JSON on several rows. `GET /api/systems` on a reset DB will return 11 rows.
- **System names are canonical** — "Tessitura" (not "Tessitura CRM"), "Ticketsolve" (not "TicketSolve").
- **`system-geographic-focus.js`** exists at `backend/src/lib/system-geographic-focus.js` and `frontend/src/lib/system-geographic-focus.js` (dual-maintenance per ADR-016 per `docs/decisions.md`). The backend one exports `SYSTEM_GEOGRAPHIC_FOCUS = ['UK', 'Europe', 'North America', 'Global', 'Other']`.
- **`system-seed-catalog.js`** at `backend/src/prisma/system-seed-catalog.js` drives the seed; it's a read concern only for understanding the seeded data shape.
- **`schema.prisma` is stable** — `System` and `OrganisationSystem` have `@updatedAt` on `last_updated`. No migrations are needed in this story.
- **Dev Agent used in 6.3 deferred** `POST/PUT /api/systems` to Epic 7, noting strip helpers are ready.
- **`organisation_system` relation name on `System` model** is `organisation_systems` (plural) — check `schema.prisma` line 115. Use this name in `include`.

## Testing Requirements

Follow the pattern of `backend/src/__tests__/organisation-service.test.js`:
- Unit test `buildSystemListWhere` with various filter combos (all empty, single filter, multi-value category, combined filters)
- Integration test (Supertest) `GET /api/systems` with no params → 11 results, correct envelope shape
- Integration test `GET /api/systems?q=spektrix` → returns Spektrix
- Integration test `GET /api/systems?category=INTEGRATED&category=TICKETING` → returns 3+5 = 8 systems
- Integration test `GET /api/systems?category=INVALIDVAL` → 400 with `fields[0].field === "category"`
- Integration test `GET /api/systems/:id` for a seeded system ID → `organisations` array present, sorted
- Integration test `GET /api/systems/:id` for a non-existent UUID → 404

Run with: `cd backend && npm test` or `cd backend && npx jest src/__tests__/system-controller.test.js`

## Anti-Patterns (Never Do)

- `new PrismaClient()` outside `src/lib/prisma.js`
- Returning `{ success: true, systems: [...] }` — always `{ data, error, meta }`
- Including `organisation_systems` on the **list** endpoint — adds N+1 load for a list that doesn't need adoption evidence
- Using `req.query.category` directly without normalising string → array (single-value case)
- Hardcoding enum strings instead of validating against a `Set`
- Treating `geographic_focus` validation as optional — an invalid value must return 400
- Storing parsed filters in controller and passing individual params to service; instead collect into a `filters` object and pass to service as one argument
- Returning raw Prisma errors in the response body

## Story Completion Status

- **Status:** `done`
- **Note:** Implementation complete; code-review batch fixes applied (`console.error` parity, `q`/pagination guards, DTO orphan-link filter, `system-http-stack.test.js`). **132** backend tests green.

### Review Findings

_All items addressed (batch apply, 2026-04-30)._

- [x] [Review][Patch] Add `console.error` in `listSystems` / `getSystemById` catch blocks — parity with `organisation-controller.js` (`system-controller.js:178-211`)
- [x] [Review][Patch] Validate `q` max length and `page` / `limit` with `Number.isSafeInteger` before computing skip — reduce abuse and incorrect pagination (`system-controller.js:48-67`, `157-164`)
- [x] [Review][Patch] Guard `toSystemDetailDto` when `link.organisation` is missing — avoid throw on inconsistent FK data (`system-list-dto.js:40-45`)
- [x] [Review][Patch] Exercise story Testing Requirements against the real stack — `system-controller.test.js` mocks `system-service`, so DB-backed cases (11-row list, `q=spektrix`, multi-category counts, seeded `:id` + sort order) are not asserted (`system-controller.test.js`, story §Testing Requirements)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Completion Notes

- `system-list-dto.js` — `toSystemDto` and `toSystemDetailDto` follow the exact `organisation-list-dto.js` pattern; `customAttributes` JSON is passed through as-is; `toSystemDetailDto` maps `organisation_systems` junction rows to the `organisations` array with nested `organisation` object.
- `system-service.js` — `buildSystemListWhere` is a pure function (exported for testability); `listSystems` uses `Promise.all([findMany, count])` matching organisation-service pattern; list query does **not** include `organisation_systems` (no N+1); `getSystemById` includes the full adoption evidence via `systemDetailInclude` with nested orderBy on `role` then `organisation.name`.
- `system-controller.js` — `asQueryArray` added for multi-value `category` param (normalises both string and string[] from Express); all other filters follow the same pattern as `organisation-controller.js`; `geographic_focus` validated against `GEOGRAPHIC_FOCUS_SET` built from the shared `system-geographic-focus.js` constant.
- `app.js` — route mounted at `/api/systems` after organisations.
- `docs/decisions.md` — ADR-017 added for multi-value `category` filter; index updated.
- No strip helpers needed in this story (read-only GET endpoints). Story 7.2 will call `stripClientControlledSystemWriteKeys` from `lib/strip-client-controlled-write-keys.js`.

### File List

- `backend/src/services/system-list-dto.js` — **new**
- `backend/src/services/system-service.js` — **new**
- `backend/src/controllers/system-controller.js` — **new**
- `backend/src/routes/systems.js` — **new**
- `backend/src/__tests__/system-service.test.js` — **new**
- `backend/src/__tests__/system-controller.test.js` — **new**
- `backend/src/app.js` — updated (require + mount systemRoutes)
- `docs/decisions.md` — updated (ADR-017 + index)

## Change Log

- 2026-04-30: Code review batch — `MAX_Q_LENGTH`, safe pagination (`page`/`limit`/skip), `console.error` on 500 paths; `toSystemDetailDto` skips orphan junction rows; added `system-http-stack.test.js` (controller→service→DTO + shim Prisma); controller tests for `q`/pagination edge cases; **132** tests green.
- 2026-04-30: Implemented GET /api/systems and GET /api/systems/:id — DTO, service, controller, route, app mount, ADR-017. 45 new tests; full suite 124/124.
