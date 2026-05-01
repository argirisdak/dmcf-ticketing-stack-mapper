# Story 8.1: Organisation–System Link API (Junction CRUD)

Status: done

## Story

As a frontend developer,
I want nested REST endpoints under `/api/organisations/:id/systems` for managing junction rows directly,
so that the Organisation form and detail page can attach, update, and remove System links without round-tripping through the parent Organisation save.

## Acceptance Criteria

**Given** the v1 controller/service layering is followed
**When** the new endpoints are implemented
**Then** layout is: `backend/src/routes/organisation-systems.js` (sub-router mounted on the organisations router, *not* in `app.js`), `backend/src/controllers/organisation-system-controller.js`, `backend/src/services/organisation-system-service.js`, `backend/src/services/organisation-system-dto.js`

**Given** `GET /api/organisations/:id/systems` is called for an existing Organisation
**When** the response is returned
**Then** it has shape `{ data: [...links], error: null, meta: null }` where each link has `{ id, role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`
**And** `404` is returned with the v1 envelope when the Organisation does not exist

**Given** `POST /api/organisations/:id/systems` is called with body `{ systemId, role, sourceReference?, note? }`
**When** the controller validates
**Then** `systemId` (UUID present in the `system` table) and `role` (one of the four `SystemRole` enum values) are required; `sourceReference` and `note` are optional strings
**And** missing or invalid fields return `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field, message }] }, meta: null }`
**And** a missing Organisation (`:id`) or missing `systemId` (not found in DB) returns `404` after the FK existence check at controller level

**Given** the body is valid and `(organisation_id, system_id)` is not yet linked
**When** the row is inserted via Prisma
**Then** the response is `201` with `{ data: { id, role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }, error: null, meta: null }`

**Given** `(organisation_id, system_id)` is already linked and `POST` is retried
**When** the Prisma write hits the `@@unique([organisation_id, system_id])` constraint
**Then** the response is `409` with `{ data: null, error: { message: "This organisation is already linked to that system", fields: [{ field: "systemId", message: "Already linked" }] }, meta: null }`

**Given** `PUT /api/organisations/:id/systems/:linkId` is called with any subset of `{ role, sourceReference, note, systemId }`
**When** the controller validates and the service updates the junction row by `linkId`
**Then** the response is `200` with the full updated link object
**And** `404` is returned when `:linkId` does not exist or does not belong to `:id`

**Given** `DELETE /api/organisations/:id/systems/:linkId` is called
**When** the row is deleted
**Then** the response is `200` with `{ data: { id }, error: null, meta: null }`
**And** `404` is returned when the link does not exist or does not belong to `:id`

**Given** any of the four endpoints
**When** the request body or query attempts to write `last_updated`, `created_at`, or `id`
**Then** those keys are stripped silently before reaching the service

## Tasks / Subtasks

- [x] **Task 1** — Create `backend/src/services/organisation-system-dto.js` (AC: #1, #2)
  - [x] **1.1** — Define local `dateTimeToIso(value)` (copy from `system-list-dto.js` pattern — each service file has its own copy; do NOT import across service files)
  - [x] **1.2** — `toLinkDto(link)` — maps junction Prisma row (with `system` relation) to `{ id, role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`; `system` field is `null` if relation is absent (defensive)
  - [x] **1.3** — Export `{ toLinkDto }`

- [x] **Task 2** — Create `backend/src/services/organisation-system-service.js` (AC: #2–#8)
  - [x] **2.1** — `const LINK_INCLUDE = { system: { select: { id: true, name: true, vendor: true, category: true } } }` — shared include used on all reads and writes
  - [x] **2.2** — `listLinks(orgId)` — verify org exists (`findUnique { select: { id: true } }`), return `null` if not; `findMany` where `organisation_id = orgId` with `LINK_INCLUDE`; return `links.map(toLinkDto)`
  - [x] **2.3** — `createLink(orgId, { systemId, role, sourceReference, note })` — `prisma.organisationSystem.create` with `data: { organisation_id: orgId, system_id: systemId, role, source_reference: sourceReference ?? null, note: note ?? null }` and `include: LINK_INCLUDE`; return `toLinkDto(link)`; caller handles P2002 (409)
  - [x] **2.4** — `updateLink(orgId, linkId, patch)` — `findFirst({ where: { id: linkId, organisation_id: orgId } })`; return `null` if not found; build `data` object from only provided patch fields (role, source_reference, note, system_id); `update({ where: { id: linkId }, data, include: LINK_INCLUDE })`; return `toLinkDto(updated)`; catch P2025 as `null` (concurrent delete race)
  - [x] **2.5** — `deleteLink(orgId, linkId)` — `findFirst` same as above; return `null` if not found; `prisma.organisationSystem.delete({ where: { id: linkId } })`; return `{ id: linkId }`; catch P2025 and return `{ id: linkId }` (idempotent — link is gone either way)
  - [x] **2.6** — Export `{ listLinks, createLink, updateLink, deleteLink }`

- [x] **Task 3** — Create `backend/src/controllers/organisation-system-controller.js` (AC: #2–#8)
  - [x] **3.1** — Copy `UUID_REGEX` and `isUuidParam(id)` helper verbatim from `organisation-controller.js` — do NOT import it from there (each controller is self-contained)
  - [x] **3.2** — `VALID_ROLES` set: `new Set(['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY'])`
  - [x] **3.3** — `stripLinkWriteKeys(body)` — delete `id`, `lastUpdated`, `createdAt`, `last_updated`, `created_at`, `updatedAt`, `updated_at` from a shallow copy; return cleaned object
  - [x] **3.4** — `listLinks(req, res)` — validate `req.params.id` is UUID (404 if not); call `organisationSystemService.listLinks(id)`; return `404` with `{ data: null, error: { message: 'Organisation not found', fields: [] }, meta: null }` if service returns `null`; else `200` with `{ data, error: null, meta: null }`
  - [x] **3.5** — `createLink(req, res)` — validate `:id` UUID; validate body not null/non-object; strip server keys; validate `systemId` (UUID string required), `role` (in VALID_ROLES, required); optional string normalise `sourceReference`, `note`; early-return `400` with fields array on any error; FK check org existence and system existence at controller level (`prisma.organisation.findUnique`, `prisma.system.findUnique`) → `404` with appropriate messages; call service; catch Prisma `P2002` → `409`; return `201` on success
  - [x] **3.6** — `updateLink(req, res)` — validate `:id` and `:linkId` UUIDs (404 if invalid); strip server keys; validate `role` if present (in VALID_ROLES), validate `systemId` if present (UUID + DB existence check); call `updateLink(orgId, linkId, patch)`; `404` if service returns `null`; `200` with updated DTO
  - [x] **3.7** — `deleteLink(req, res)` — validate `:id` and `:linkId` UUIDs; call `deleteLink(orgId, linkId)`; `404` if service returns `null`; `200` with `{ data: { id: linkId }, error: null, meta: null }`
  - [x] **3.8** — Export `{ listLinks, createLink, updateLink, deleteLink }`

- [x] **Task 4** — Create `backend/src/routes/organisation-systems.js` (AC: #1)
  - [x] **4.1** — `const router = express.Router({ mergeParams: true })` — **`mergeParams: true` is mandatory**; without it `req.params.id` from the parent organisations router is `undefined`
  - [x] **4.2** — `router.get('/', controller.listLinks)`
  - [x] **4.3** — `router.post('/', controller.createLink)`
  - [x] **4.4** — `router.put('/:linkId', controller.updateLink)`
  - [x] **4.5** — `router.delete('/:linkId', controller.deleteLink)`
  - [x] **4.6** — Export `router`

- [x] **Task 5** — Update `backend/src/routes/organisations.js` (AC: #1)
  - [x] **5.1** — `const organisationSystemsRouter = require('./organisation-systems')` (add at top of file)
  - [x] **5.2** — Add `router.use('/:id/systems', organisationSystemsRouter)` **after** existing `/:id` routes to avoid matching conflicts; keep existing routes unchanged

- [x] **Task 6** — Add tests `backend/src/__tests__/organisation-system-controller.test.js` (AC: all)
  - [x] **6.1** — Mock `../lib/prisma` with `{ organisation: { findUnique }, system: { findUnique }, organisationSystem: { findMany, create, findFirst, update, delete }, $disconnect }` jest mocks
  - [x] **6.2** — Mock `../services/organisation-system-service` with jest.fn() stubs (pattern from `organisation-controller.test.js`)
  - [x] **6.3** — `GET /api/organisations/:id/systems` — 200 with data array, 404 for unknown org, 400 for malformed UUID `:id`
  - [x] **6.4** — `POST /api/organisations/:id/systems` — 201 on success, 400 missing systemId, 400 missing role, 400 invalid role, 404 org not found, 404 system not found, 409 duplicate link
  - [x] **6.5** — `PUT /api/organisations/:id/systems/:linkId` — 200 on success, 404 link not found, 400 invalid role value, 400 invalid systemId UUID
  - [x] **6.6** — `DELETE /api/organisations/:id/systems/:linkId` — 200 on success, 404 link not found

- [x] **Task 7** — Verify no regressions
  - [x] **7.1** — `cd backend && npm test` — all tests pass, 0 failures (199 tests across 13 suites)
  - [x] **7.2** — Smoke: `GET /api/organisations/:id/systems` via curl/Insomnia against `docker compose up` — confirm response shape matches DTO spec
  - [x] **7.3** — Confirm existing organisation CRUD endpoints unchanged (no new fields or breakage)

## Dev Notes

### Routing: Sub-router in `organisations.js`, NOT `app.js`

Mount the junction router as a sub-router on the existing organisations router, **not** directly in `app.js`. This is the only approach that avoids Express path-merging edge cases:

```js
// backend/src/routes/organisations.js — add these two lines:
const organisationSystemsRouter = require('./organisation-systems');
// ... keep all existing routes ...
router.use('/:id/systems', organisationSystemsRouter);
```

The `organisation-systems.js` router **must** use `express.Router({ mergeParams: true })` — without this flag `req.params.id` is undefined in the sub-router. `req.params.linkId` comes from the sub-router's own `/:linkId` segments and is always available.

### New Files (all backend, no frontend changes)

| File | Action |
|------|--------|
| `backend/src/services/organisation-system-dto.js` | **CREATE** |
| `backend/src/services/organisation-system-service.js` | **CREATE** |
| `backend/src/controllers/organisation-system-controller.js` | **CREATE** |
| `backend/src/routes/organisation-systems.js` | **CREATE** |
| `backend/src/routes/organisations.js` | **UPDATE** — add sub-router mount only |
| `backend/src/__tests__/organisation-system-controller.test.js` | **CREATE** |

No frontend changes. No schema changes (OrganisationSystem model is already in schema from Epic 6).

### Schema Already Exists — No Migration Needed

`OrganisationSystem` model is fully defined in `backend/src/prisma/schema.prisma` (Story 6.1):

```
model OrganisationSystem {
  id               String       @id @default(uuid())
  organisation_id  String
  organisation     Organisation @relation(...)
  system_id        String
  system           System       @relation(..., onDelete: Restrict)
  role             SystemRole                        // enum: PRIMARY_TICKETING | PRIMARY_CRM | INTEGRATED_SUITE | SECONDARY
  source_reference String?
  note             String?
  last_updated     DateTime     @default(now()) @updatedAt
  created_at       DateTime     @default(now())
  @@unique([organisation_id, system_id])
  @@index([system_id])
  @@index([organisation_id])
}
```

Prisma client accesses this as `prisma.organisationSystem` (camelCase of model name).

### `toLinkDto` — The Canonical Link Shape

This mapper **must** live in `organisation-system-dto.js` and be re-used in Story 8.2 when `GET /api/organisations/:id` embeds the `systems` array. Keeping it in one place is the "same DTO mapper" requirement from the epics spec:

```js
function dateTimeToIso(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

function toLinkDto(link) {
  return {
    id: link.id,
    role: link.role,
    sourceReference: link.source_reference ?? null,
    note: link.note ?? null,
    lastUpdated: dateTimeToIso(link.last_updated),
    system: link.system
      ? { id: link.system.id, name: link.system.name, vendor: link.system.vendor, category: link.system.category }
      : null,
  };
}

module.exports = { toLinkDto };
```

### Service Implementation Details

`LINK_INCLUDE` is used on every Prisma call that returns a link row (create, update, findMany):

```js
const LINK_INCLUDE = {
  system: { select: { id: true, name: true, vendor: true, category: true } },
};
```

`updateLink` — only include fields in the Prisma `data` object that were explicitly provided (not undefined). This avoids accidentally nulling `source_reference` when only `role` was changed:

```js
async function updateLink(orgId, linkId, patch) {
  const existing = await prisma.organisationSystem.findFirst({
    where: { id: linkId, organisation_id: orgId },
  });
  if (!existing) return null;
  const data = {};
  if (patch.role !== undefined)            data.role = patch.role;
  if (patch.sourceReference !== undefined) data.source_reference = patch.sourceReference; // can be null
  if (patch.note !== undefined)            data.note = patch.note;                        // can be null
  if (patch.systemId !== undefined)        data.system_id = patch.systemId;
  const updated = await prisma.organisationSystem.update({
    where: { id: linkId },
    data,
    include: LINK_INCLUDE,
  });
  return toLinkDto(updated);
}
```

### Controller Validation Pattern

Follow `organisation-controller.js` exactly — strip keys, validate, FK-check, call service. For `createLink`:

```js
// 1. UUID param check
const orgId = req.params?.id;
if (!isUuidParam(orgId)) return res.status(404).json(orgNotFoundEnvelope);

// 2. Body check
if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
  return res.status(400).json({ data: null, error: { message: 'Validation failed', fields: [{ field: 'body', message: 'Request body must be a JSON object' }] }, meta: null });
}

// 3. Strip server keys
const raw = stripLinkWriteKeys(req.body);

// 4. Validate fields
const fields = [];
const systemId = typeof raw.systemId === 'string' ? raw.systemId.trim() : '';
if (!systemId) {
  fields.push({ field: 'systemId', message: 'Select a system' });
} else if (!isUuidParam(systemId)) {
  fields.push({ field: 'systemId', message: 'Select a valid system' });
}
const role = typeof raw.role === 'string' ? raw.role.trim().toUpperCase() : '';
if (!role) {
  fields.push({ field: 'role', message: 'Select a role' });
} else if (!VALID_ROLES.has(role)) {
  fields.push({ field: 'role', message: 'Select a role' });
}
if (fields.length > 0) return res.status(400).json({ data: null, error: { message: 'Validation failed', fields }, meta: null });

// 5. FK checks — controller level before service call
const org = await prisma.organisation.findUnique({ where: { id: orgId }, select: { id: true } });
if (!org) return res.status(404).json(orgNotFoundEnvelope);
const system = await prisma.system.findUnique({ where: { id: systemId }, select: { id: true } });
if (!system) return res.status(404).json({ data: null, error: { message: 'System not found', fields: [] }, meta: null });

// 6. Call service
try {
  const sourceReference = normaliseOptionalString(raw.sourceReference);
  const note = normaliseOptionalString(raw.note);
  const data = await organisationSystemService.createLink(orgId, { systemId, role, sourceReference, note });
  return res.status(201).json({ data, error: null, meta: null });
} catch (err) {
  if (err.code === 'P2002') {
    return res.status(409).json({
      data: null,
      error: { message: 'This organisation is already linked to that system', fields: [{ field: 'systemId', message: 'Already linked' }] },
      meta: null,
    });
  }
  console.error('[POST /api/organisations/:id/systems] unexpected error', err);
  return res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
}
```

`normaliseOptionalString` trims and returns `null` for empty — copy the helper from `organisation-controller.js` (don't import from there; keep each controller self-contained).

### `PUT` Validation — Only Validate Fields Present

For `updateLink`, no field is required. Only validate what's present:
- If `role` is present: must be in `VALID_ROLES`
- If `systemId` is present: must be UUID + perform DB existence check

An empty patch (body `{}` or all undefined after strip) is allowed — it results in a no-op update on the row (Prisma `@updatedAt` still fires, touching `last_updated`).

### Prisma Error Codes

- `P2002` — unique constraint violation → `409` (duplicate link)
- `P2025` — record to delete/update not found → treat as `null` from service → `404` from controller
- Both codes are already used in `system-controller.js` — check that file for reference

### Test Pattern — Follow `organisation-controller.test.js`

Use supertest + jest mocks. Mock at both prisma and service layers:

```js
jest.mock('../lib/prisma', () => ({
  organisation: { findUnique: jest.fn() },
  system: { findUnique: jest.fn() },
  organisationSystem: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  $disconnect: jest.fn(),
}));

jest.mock('../services/organisation-system-service', () => ({
  listLinks: jest.fn(),
  createLink: jest.fn(),
  updateLink: jest.fn(),
  deleteLink: jest.fn(),
}));
```

Tests go against the real `app` (via supertest) so routing is covered. The service mock means no actual Prisma calls — identical pattern to `organisation-controller.test.js`.

Test the FK check paths by mocking `prisma.organisation.findUnique` to return `null` and `prisma.system.findUnique` to return `null` independently.

### `systemId` vs `system_id` Naming

The request body field name is `systemId` (camelCase — matches all other write bodies in this project). The Prisma `data` object uses `system_id` (snake_case — matches the schema column). Never accept `system_id` from the client.

### Story Boundary — Backend Only

No frontend changes in this story. The frontend hook `useOrganisationSystems` (needed by Stories 8.4 and 8.5) is explicitly out of scope. The test for Epic 8's organisation API filter re-shape (Story 8.2) is also out of scope — do not touch `organisation-service.js` or `organisation-list-dto.js`.

### Project Structure Notes

- New files in `backend/src/services/` (dto + service) and `backend/src/controllers/` and `backend/src/routes/` — the only locations for their layer
- No new lib files, no changes to `app.js`, no frontend files
- British English: `organisation` not `organization` in file names, variables, and log messages
- Controller log prefix convention: `[POST /api/organisations/:id/systems]`, `[PUT /api/organisations/:id/systems/:linkId]` etc.

### References

- Epics Story 8.1: `_bmad-output/planning-artifacts/epics.md` (Story 8.1 section, lines ~1406–1454)
- Schema: `backend/src/prisma/schema.prisma` — `OrganisationSystem` model
- Pattern: `backend/src/controllers/organisation-controller.js` — validation, FK check, strip, error envelope
- Pattern: `backend/src/services/system-list-dto.js` — `dateTimeToIso` helper and DTO shape
- Pattern: `backend/src/services/organisation-service.js` — service structure
- Pattern: `backend/src/routes/organisations.js` — route file shape (to be updated)
- Test pattern: `backend/src/__tests__/organisation-controller.test.js`
- Deferred (relevant): none for Story 8.1 directly

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `organisation-system-dto.js` with `toLinkDto` — canonical link mapper for reuse in Story 8.2's embedded `systems` array on the org detail response.
- Created `organisation-system-service.js` with `listLinks`, `createLink`, `updateLink`, `deleteLink`; uses `LINK_INCLUDE` on every Prisma call; P2025 caught in `updateLink`/`deleteLink` for concurrent-delete safety.
- Created `organisation-system-controller.js` with full validation pipeline: UUID check → body shape check → field validation → FK existence checks → service call → P2002 → 409.
- `updateLink` controller: only passes fields present in the body to the service patch object (prevents accidental null-overwrite of `sourceReference`/`note`). `sourceReference` and `note` can be explicitly nulled by including them in the body.
- Created `organisation-systems.js` route with `mergeParams: true` — critical for `:id` param inheritance from the parent organisations router.
- Updated `organisations.js` to mount sub-router at `/:id/systems` after existing CRUD routes.
- 29 new tests in `organisation-system-controller.test.js`; all 199 backend tests pass, 0 regressions.

### File List

- backend/src/services/organisation-system-dto.js
- backend/src/services/organisation-system-service.js
- backend/src/controllers/organisation-system-controller.js
- backend/src/routes/organisation-systems.js
- backend/src/routes/organisations.js
- backend/src/__tests__/organisation-system-controller.test.js

### Change Log

- 2026-05-01 — Story 8.1 implemented: Organisation–System link CRUD API (GET/POST/PUT/DELETE `/api/organisations/:id/systems`). New DTO, service, controller, route files; sub-router mounting with mergeParams; 29 new tests, all 199 backend tests passing.

### Review Findings

- [x] [Review][Patch] Add supertest covering PUT `systemId` change when `(organisation_id, system_id)` already exists — expect **409** and `systemId` field error (mirrors POST P2002 test); file `backend/src/__tests__/organisation-system-controller.test.js` — fixed 2026-05-01.
