# Story 7.2: System REST API — Create, Update, Delete

**Status:** done

## Story

As a frontend developer,
I want `POST`, `PUT`, and `DELETE` endpoints for Systems with the right validation, conflict, and constraint behaviour,
So that the System form and detail-header actions can write to the catalogue safely.

## Acceptance Criteria

**Given** `POST /api/systems` is called with a valid body containing `{ name, vendor, category }` plus any optional fields
**When** the controller validates the body
**Then** required-field validation requires `name` (non-empty string), `vendor` (non-empty string), and `category` (one of `INTEGRATED | TICKETING | AUDIENCE_MANAGEMENT`)
**And** the response is `201` with `{ data: { ...system }, error: null, meta: null }`
**And** `last_updated` and `created_at` are set automatically — both are stripped from the request body if present (silently — they are server-managed)
**And** capability fields default to `"UNKNOWN"` when omitted (Prisma schema default; not set explicitly in the payload)

**Given** `POST /api/systems` is called with `name` matching an existing System (case-sensitive unique constraint)
**When** the database returns a unique-constraint violation (Prisma `P2002`)
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
**Then** the response is `404` with `{ data: null, error: { message: "System not found", fields: [] }, meta: null }`

**Given** `DELETE /api/systems/:id` is called for a System with no `organisation_system` rows referencing it
**When** the row is deleted
**Then** the response is `200` with `{ data: { id }, error: null, meta: null }`

**Given** `DELETE /api/systems/:id` is called for a System with one or more `organisation_system` rows referencing it
**When** Prisma honours the `onDelete: Restrict` FK from Story 6.1 and raises `P2003`
**Then** the response is `409` with `{ data: null, error: { message: "This system is linked to N organisations. Remove all organisation links before deleting.", linkedOrganisationCount: N }, meta: null }`
**And** `N` is computed by counting `organisation_system` rows where `system_id = :id` (counted after catching P2003)

**Given** any write endpoint receives a body containing server-managed keys (`id`, `last_updated`, `created_at`, `custom_attributes`)
**When** the controller validates
**Then** those keys are stripped silently before reaching the service — `custom_attributes` is read-only via API in MVP per FR-S9

## Tasks / Subtasks

- [x] **Task 1** — Update `backend/src/services/system-service.js` — add write functions (AC: create, update, delete ACs)
  - [x] **1.1** — `createSystem(payload)`: `prisma.system.create({ data: { name, vendor, category, deployment_model, pricing_model, geographic_focus, description, membership_capability, donation_capability, reserved_seating_capability, source_reference } })`; return `toSystemDto(row)` (no include needed — list DTO is sufficient for create/update responses)
  - [x] **1.2** — `updateSystem(id, payload)`: build partial `data` object (only include keys present in payload, undefined = omit); catch `P2025` → return `null`; throw all other errors for controller to handle
  - [x] **1.3** — `deleteSystem(id)`: attempt `prisma.system.delete({ where: { id } })`; catch `P2025` → return `null`; catch `P2003` → count `organisation_system` rows and throw `{ code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount: N }` (not a real Error, a plain object); return `id` on success

- [x] **Task 2** — Update `backend/src/controllers/system-controller.js` — add write handlers (AC: all write ACs)
  - [x] **2.1** — `createSystem` handler: validate body is object; call `stripClientControlledSystemWriteKeys` (strips id, timestamps) + additionally delete `customAttributes`/`custom_attributes` from raw; call `parseSystemWritePayload(raw)`; on validation errors return 400; call service; catch `P2002` → 409; catch other → 500
  - [x] **2.2** — `parseSystemWritePayload(raw)` helper: validates required fields (name non-empty, vendor non-empty, category in set); validates optional enum fields if present; returns `{ fields, payload }` — payload has undefined-safe optional fields so the service layer can distinguish "not provided" from "set to null"
  - [x] **2.3** — `updateSystem` handler: UUID validate `:id` (404 for invalid format); validate body is object; strip + parse (same as create but required fields are optional for PUT); call service; catch `P2002` → 409; null return → 404; catch other → 500
  - [x] **2.4** — `deleteSystem` handler: UUID validate `:id` (404 for invalid format); call service; null return → 404; `SYSTEM_HAS_LINKS` throw → 409 with `linkedOrganisationCount`; catch other → 500

- [x] **Task 3** — Update `backend/src/routes/systems.js` — add POST, PUT, DELETE routes
  - [x] **3.1** — `router.post('/', systemController.createSystem)`
  - [x] **3.2** — `router.put('/:id', systemController.updateSystem)`
  - [x] **3.3** — `router.delete('/:id', systemController.deleteSystem)`

- [x] **Task 4** — Expand `backend/src/__tests__/system-controller.test.js` — add POST, PUT, DELETE handler tests
  - [x] **4.1** — POST: valid body → 201; missing name → 400 with `fields[0].field === "name"`; missing vendor → 400; invalid category → 400 with `fields[0].field === "category"`; duplicate name (P2002 from mock) → 409 with `fields[0].message === "A system with this name already exists"`; server-managed keys stripped (send `id` + `last_updated` + `custom_attributes` in body → verify payload reaching mock does not contain them)
  - [x] **4.2** — PUT: valid partial body → 200; non-UUID :id → 404; null from service → 404; P2002 from mock → 409; SYSTEM_HAS_LINKS throw → not applicable here (that's delete)
  - [x] **4.3** — DELETE: valid :id, null from service → 404; non-UUID :id → 404; service returns id → 200 with `{ data: { id } }`; service throws SYSTEM_HAS_LINKS → 409 with `linkedOrganisationCount`

- [x] **Task 5** — Expand `backend/src/__tests__/system-service.test.js` — add write unit tests (mocking Prisma)
  - [x] **5.1** — `createSystem`: mocked `prisma.system.create` returns row; verify `toSystemDto` is applied; verify only expected fields in create data (no `id`, no `custom_attributes`)
  - [x] **5.2** — `updateSystem`: P2025 from mock → returns null; P2002 propagated; success → DTO returned
  - [x] **5.3** — `deleteSystem`: P2025 → null; P2003 → count called, throws `{ code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount }`; success → id returned

### Review Findings

- [x] [Review][Decision] Empty or no-op PUT body — **Resolved (2026-04-30):** `updateSystem` performs `findUnique` + `toSystemDto` when no Prisma fields change; avoids empty `update` and does not bump `last_updated`.

- [x] [Review][Decision] `null` vs clear for capability fields on PUT — **Resolved (2026-04-30):** explicit JSON `null` for membership/donation/reserved-seating maps to `UNKNOWN` (non-nullable `CapabilityState` in schema).

- [x] [Review][Patch] DELETE 409 pluralisation — **Resolved:** singular `organisation` when `linkedOrganisationCount === 1`.

- [x] [Review][Defer] P2002 handling always maps duplicate constraint to `field: name` — [`system-controller.js`](backend/src/controllers/system-controller.js) `create`/`update` catch blocks; acceptable while `name` is the only unique key; revisit if schema adds other uniques. — deferred, pre-existing

- [x] [Review][Defer] `system-controller.js` combines list/read and write handlers in one large module — harder to navigate than route-specific controllers; defer splitting until more endpoints accumulate. — deferred, pre-existing

## Technical Requirements

### Files to update (no new files)

| File | Change |
|------|--------|
| `backend/src/services/system-service.js` | Add `createSystem`, `updateSystem`, `deleteSystem` exports |
| `backend/src/controllers/system-controller.js` | Add `createSystem`, `updateSystem`, `deleteSystem` exports + `parseSystemWritePayload` helper |
| `backend/src/routes/systems.js` | Add `router.post`, `router.put`, `router.delete` routes |
| `backend/src/__tests__/system-controller.test.js` | Expand with write handler tests |
| `backend/src/__tests__/system-service.test.js` | Expand with write function tests |

**No new files required.** Story 7.1 created all the scaffolding. Do not create duplicate files.

### Strip pattern for write endpoints — CRITICAL

The `stripClientControlledSystemWriteKeys` helper at `backend/src/lib/strip-client-controlled-write-keys.js` strips `id` and timestamp keys. It does NOT strip `custom_attributes`. You must additionally delete those keys after calling the helper:

```js
// In controller write handlers — exactly this order:
const stripped = stripClientControlledSystemWriteKeys(req.body);
delete stripped.customAttributes;    // camelCase variant (from frontend)
delete stripped.custom_attributes;   // snake_case variant (raw API)
// then pass stripped to parseSystemWritePayload
```

**Never accept `custom_attributes` from the API in this story.** It is seeded-only per FR-S9 (ADR in `docs/decisions.md`).

### Import the strip helper

```js
const { stripClientControlledSystemWriteKeys } = require('../lib/strip-client-controlled-write-keys');
```

### `parseSystemWritePayload(raw)` — validation rules

```js
function parseSystemWritePayload(raw, { requireAll = true } = {}) {
  const fields = [];

  // name — required on create, optional on update
  let name;
  if (requireAll || 'name' in raw) {
    const n = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!n) fields.push({ field: 'name', message: 'Enter the system name' });
    else name = n;
  }

  // vendor — required on create, optional on update
  let vendor;
  if (requireAll || 'vendor' in raw) {
    const v = typeof raw.vendor === 'string' ? raw.vendor.trim() : '';
    if (!v) fields.push({ field: 'vendor', message: 'Enter the vendor name' });
    else vendor = v;
  }

  // category — required on create, optional on update
  let category;
  if (requireAll || 'category' in raw) {
    const c = typeof raw.category === 'string' ? raw.category.trim().toUpperCase() : '';
    if (!SYSTEM_CATEGORY_SET.has(c)) fields.push({ field: 'category', message: 'Select a category' });
    else category = c;
  }

  // Optional enum fields — validate only if present
  let deploymentModel;
  if ('deployment_model' in raw || 'deploymentModel' in raw) {
    const dm = (raw.deployment_model ?? raw.deploymentModel);
    if (dm !== null && dm !== undefined && dm !== '') {
      const v = String(dm).trim().toUpperCase();
      if (!DEPLOYMENT_MODEL_SET.has(v)) fields.push({ field: 'deployment_model', message: 'Select a deployment model' });
      else deploymentModel = v;
    } else {
      deploymentModel = null; // explicit null clears the field
    }
  }
  // ... same pattern for pricingModel, geographicFocus, membershipCapability, donationCapability, reservedSeatingCapability

  // Optional string fields
  const description = 'description' in raw
    ? (typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null)
    : undefined;
  const sourceReference = 'source_reference' in raw || 'sourceReference' in raw
    ? (typeof (raw.source_reference ?? raw.sourceReference) === 'string' ? (raw.source_reference ?? raw.sourceReference).trim() || null : null)
    : undefined;

  if (fields.length > 0) return { fields, payload: null };

  return { fields: [], payload: { name, vendor, category, deploymentModel, pricingModel, geographicFocus, description, membershipCapability, donationCapability, reservedSeatingCapability, sourceReference } };
}
```

Use `requireAll: true` for POST (all required fields enforced), `requireAll: false` for PUT (only validate fields that are present).

### `createSystem` service — Prisma call

```js
async function createSystem(payload) {
  const row = await prisma.system.create({
    data: {
      name: payload.name,
      vendor: payload.vendor,
      category: payload.category,
      deployment_model: payload.deploymentModel ?? undefined,
      pricing_model: payload.pricingModel ?? undefined,
      geographic_focus: payload.geographicFocus ?? undefined,
      description: payload.description ?? undefined,
      membership_capability: payload.membershipCapability ?? undefined,  // schema default UNKNOWN
      donation_capability: payload.donationCapability ?? undefined,
      reserved_seating_capability: payload.reservedSeatingCapability ?? undefined,
      source_reference: payload.sourceReference ?? undefined,
    },
  });
  return toSystemDto(row);
}
```

**No `include` on create/update.** `toSystemDto` (not `toSystemDetailDto`) is used for write responses — the response does not need adoption evidence; that is only for detail GET.

### `updateSystem` service — partial update pattern

```js
async function updateSystem(id, payload) {
  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.vendor !== undefined) data.vendor = payload.vendor;
  if (payload.category !== undefined) data.category = payload.category;
  if (payload.deploymentModel !== undefined) data.deployment_model = payload.deploymentModel;
  if (payload.pricingModel !== undefined) data.pricing_model = payload.pricingModel;
  if (payload.geographicFocus !== undefined) data.geographic_focus = payload.geographicFocus;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.membershipCapability !== undefined) data.membership_capability = payload.membershipCapability;
  if (payload.donationCapability !== undefined) data.donation_capability = payload.donationCapability;
  if (payload.reservedSeatingCapability !== undefined) data.reserved_seating_capability = payload.reservedSeatingCapability;
  if (payload.sourceReference !== undefined) data.source_reference = payload.sourceReference;

  try {
    const row = await prisma.system.update({ where: { id }, data });
    return toSystemDto(row);
  } catch (err) {
    if (err?.code === 'P2025') return null;
    throw err;  // includes P2002 — controller catches
  }
}
```

### `deleteSystem` service — Restrict FK + count

```js
async function deleteSystem(id) {
  try {
    await prisma.system.delete({ where: { id } });
    return id;
  } catch (err) {
    if (err?.code === 'P2025') return null;
    if (err?.code === 'P2003') {
      const count = await prisma.organisationSystem.count({ where: { system_id: id } });
      throw { code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount: count };
    }
    throw err;
  }
}
```

**Prisma model name for the junction:** `prisma.organisationSystem` (Prisma auto-generates this from `model OrganisationSystem` in `schema.prisma`). Confirm: `backend/src/prisma/schema.prisma` line 120–136 shows `model OrganisationSystem` with `@@map("organisation_system")`.

### Controller — P2002 / SYSTEM_HAS_LINKS handling

```js
// createSystem / updateSystem catch block:
} catch (err) {
  if (err?.code === 'P2002') {
    return res.status(409).json({
      data: null,
      error: { message: 'A system with this name already exists', fields: [{ field: 'name', message: 'A system with this name already exists' }] },
      meta: null,
    });
  }
  console.error('[POST /api/systems] unexpected error', err);
  return res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
}

// deleteSystem catch block:
} catch (err) {
  if (err?.code === 'SYSTEM_HAS_LINKS') {
    return res.status(409).json({
      data: null,
      error: { message: `This system is linked to ${err.linkedOrganisationCount} organisations. Remove all organisation links before deleting.`, linkedOrganisationCount: err.linkedOrganisationCount },
      meta: null,
    });
  }
  console.error('[DELETE /api/systems/:id] unexpected error', err);
  return res.status(500).json({ data: null, error: { message: 'An unexpected error occurred', fields: [] }, meta: null });
}
```

### Routes update

```js
// backend/src/routes/systems.js — add after existing GET routes:
router.post('/', systemController.createSystem);
router.put('/:id', systemController.updateSystem);
router.delete('/:id', systemController.deleteSystem);
```

### Response envelopes — exact shapes required

```js
// POST 201 success
{ data: { id, name, vendor, category, deploymentModel, pricingModel, geographicFocus, description,
          membershipCapability, donationCapability, reservedSeatingCapability,
          sourceReference, customAttributes, lastUpdated, createdAt },
  error: null, meta: null }

// PUT 200 success — same shape as POST (toSystemDto applied to updated row)

// DELETE 200 success
{ data: { id: '<uuid>' }, error: null, meta: null }

// 409 duplicate name (POST or PUT)
{ data: null, error: { message: 'A system with this name already exists',
                       fields: [{ field: 'name', message: 'A system with this name already exists' }] }, meta: null }

// 409 delete with links
{ data: null, error: { message: 'This system is linked to N organisations. Remove all organisation links before deleting.',
                       linkedOrganisationCount: N }, meta: null }

// 404 system not found
{ data: null, error: { message: 'System not found', fields: [] }, meta: null }

// 400 validation
{ data: null, error: { message: 'Validation failed', fields: [{ field: '...', message: '...' }] }, meta: null }
```

### Module export pattern — mirror system-controller existing style

Add the three new handlers to the existing `module.exports` in `system-controller.js`:
```js
module.exports = { listSystems, getSystemById, createSystem, updateSystem, deleteSystem };
```

Add the three new functions to `module.exports` in `system-service.js`:
```js
module.exports = { listSystems, getSystemById, buildSystemListWhere, createSystem, updateSystem, deleteSystem };
```

## Previous Story Intelligence (7.1)

- **Strip helper ready.** `stripClientControlledSystemWriteKeys` in `backend/src/lib/strip-client-controlled-write-keys.js` strips `id` + timestamps. **Story 7.2 MUST call this**, then additionally delete `customAttributes`/`custom_attributes` from the result (see task 2.1 above).
- **DTO functions.** `toSystemDto(row)` and `toSystemDetailDto(row)` are in `backend/src/services/system-list-dto.js`. Write responses use `toSystemDto` only — no adoption evidence needed.
- **Validation constants already defined in controller.** `SYSTEM_CATEGORY_SET`, `DEPLOYMENT_MODEL_SET`, `PRICING_MODEL_SET`, `CAPABILITY_SET`, `GEOGRAPHIC_FOCUS_SET` are already at the top of `system-controller.js`. Do NOT redefine them — add write handlers to the same file and reuse these constants.
- **`isUuidParam` already defined.** Same `UUID_REGEX` and `isUuidParam` function at top of `system-controller.js`. Reuse for `:id` validation in PUT/DELETE.
- **`asQueryArray` and `asQueryString` already defined.** These are query-param helpers — NOT needed for write body parsing (body parsing is different).
- **132 tests green after 7.1.** Run `cd backend && npm test` to verify baseline before adding tests.
- **`system-controller.test.js` mocks the service.** Pattern: `jest.mock('../services/system-service', ...)` with `mockListSystems`, `mockGetSystemById`. Add `mockCreateSystem`, `mockUpdateSystem`, `mockDeleteSystem` following the same mock pattern.
- **`system-service.test.js` mocks Prisma directly.** Pattern: `jest.mock('../lib/prisma', () => ({ system: { ... }, organisationSystem: { count: jest.fn() }, $disconnect: jest.fn() }))`. You will need to add `organisationSystem: { count: jest.fn() }` to the mock for the delete test.
- **`organisation-controller.js` P2002 pattern:** Organisation has no unique name — so existing controller has no P2002 handling. Story 7.2 is the FIRST endpoint in this project to return 409 on P2002. Do not look for a precedent in the organisation controller; implement fresh.
- **No FK validation needed for System writes.** Organisation required an FK check for `organisationTypeId`, `ticketingProviderId`, `crmPlatformId`. System has no FK references in its own table — no FK pre-check step needed before the Prisma write.

## Architecture Compliance

All v1 rules hold. Story 7.2-specific:

- **Singleton Prisma:** `const prisma = require('../lib/prisma');` — never `new PrismaClient()`.
- **Response envelope:** `{ data, error, meta }` on every response without exception.
- **`meta: null`** on all write and single-resource responses.
- **`last_updated` / `created_at`** are never accepted from the client. `@updatedAt` handles `last_updated` automatically on every `prisma.system.update`.
- **Validation flow order:** strip client keys → parse+validate body → call service → handle DB errors.
- **No FK pre-check:** System has no FK fields — skip the `validateOrganisationForeignKeys` pattern entirely.
- **British English:** all variable names, error messages, comments use British English conventions as per project-context. `organisation` not `organization` in `linkedOrganisationCount`.
- **`custom_attributes` is server-managed.** Strip it from all write bodies. Never pass it to the Prisma create/update call.

## Testing Requirements

Follow the patterns in `system-controller.test.js` and `system-service.test.js`.

### Controller tests (mock service)

```
POST /api/systems:
  - valid body { name, vendor, category } → 201 with data
  - missing name → 400, fields[0].field === 'name'
  - missing vendor → 400, fields[0].field === 'vendor'
  - invalid category → 400, fields[0].field === 'category'
  - server-managed keys in body (id, last_updated, custom_attributes) → service receives payload without them
  - service P2002 → 409 with fields[0].message === 'A system with this name already exists'
  - non-object body → 400

PUT /api/systems/:id:
  - invalid UUID :id → 404
  - valid partial body → 200 with data
  - null from service → 404
  - service P2002 → 409

DELETE /api/systems/:id:
  - invalid UUID :id → 404
  - service returns id → 200 with { data: { id } }
  - null from service → 404
  - SYSTEM_HAS_LINKS thrown → 409 with linkedOrganisationCount === N
```

### Service tests (mock Prisma)

```
createSystem:
  - prisma.system.create called with correct field mapping (snake_case on DB layer)
  - returned row passed through toSystemDto
  - payload does not contain id or custom_attributes

updateSystem:
  - prisma.system.update called with only provided fields (partial update)
  - P2025 → null returned
  - P2002 re-thrown for controller to handle

deleteSystem:
  - prisma.system.delete called with { where: { id } }
  - P2025 → null returned
  - P2003 → organisationSystem.count called, throws { code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount }
  - success → id returned
```

Run: `cd backend && npm test` (full suite) or `cd backend && npx jest src/__tests__/system-controller.test.js src/__tests__/system-service.test.js` for targeted run.

## Anti-Patterns (Never Do)

- Call `new PrismaClient()` anywhere outside `src/lib/prisma.js`.
- Return `{ success: true }` or any shape other than `{ data, error, meta }`.
- Set `meta` to anything other than `null` in write responses.
- Accept `custom_attributes` in the write body and pass it to Prisma.
- Accept `last_updated` or `created_at` from the request body.
- Return raw Prisma error objects or stack traces in the response body.
- Forget to add the new controller functions to `module.exports`.
- Create new constants (`SYSTEM_CATEGORY_SET` etc.) — they already exist in `system-controller.js`.
- Use `toSystemDetailDto` for create/update responses — the list DTO (`toSystemDto`) is correct.
- Perform a count-then-delete transaction — delete first, catch P2003, then count (sequence matters to avoid TOCTOU).
- Hardcode enum strings without validating against the existing `Set` constants.
- Include `organisation_systems` in the create/update Prisma call — adoption evidence is for GET only.

## Story Completion Status

- **Status:** `done`
- **Note:** Implementation complete. Code review resolutions applied (no-op PUT, capability `null` → `UNKNOWN`, DELETE 409 copy). Extended test count in `system-controller.test.js` / `system-service.test.js`.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Completion Notes List

- `system-service.js` — added `createSystem` (Prisma create → `toSystemDto`), `updateSystem` (partial update using only provided payload keys; **no-op path:** empty `data` → `findUnique` + `toSystemDto` without touching `last_updated`; otherwise `update`), P2025 → null; P2002 re-thrown; `deleteSystem` (P2025 → null; P2003 → count `organisationSystem` rows → throw `{ code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount }`).
- `system-controller.js` — added `stripAndSanitise` (calls shared helper + removes `customAttributes`/`custom_attributes`), `parseSystemWritePayload` (**capability fields:** JSON `null` maps to `UNKNOWN` on PUT), `createSystem` (201 / 400 / 409 P2002 / 500), `updateSystem` (200 / 400 / 404 / 409 P2002 / 500), `deleteSystem` (200 / 404 / 409 with singular/plural organisation copy / 500). Imported `stripClientControlledSystemWriteKeys` from shared lib.
- `routes/systems.js` — added `POST /`, `PUT /:id`, `DELETE /:id` routes.
- `system-controller.test.js` — updated service mock to include write functions; POST (7 tests), PUT (9 tests), DELETE (6 tests).
- `system-service.test.js` — updated Prisma mock to include `system.create`, `system.update`, `system.delete`, `organisationSystem.count`; `createSystem` (4 tests), `updateSystem` (7 tests), `deleteSystem` (6 tests).
- Final suite: **172 tests, 12 suites, 0 regressions** (after code-review resolutions: no-op PUT, capability `null` → `UNKNOWN`, DELETE 409 singular/plural).

### File List

- `backend/src/services/system-service.js` — updated (added `createSystem`, `updateSystem`, `deleteSystem`)
- `backend/src/controllers/system-controller.js` — updated (added write handlers + helpers)
- `backend/src/routes/systems.js` — updated (added POST, PUT, DELETE routes)
- `backend/src/__tests__/system-controller.test.js` — updated (expanded with write handler tests)
- `backend/src/__tests__/system-service.test.js` — updated (expanded with write function tests)
