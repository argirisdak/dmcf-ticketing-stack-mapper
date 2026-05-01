# Story 8.2: Organisation API — Filter and Response Re-shape

Status: done

## Story

As a staff member using the Organisation list and detail,
I want the Organisation API to filter by adopted System (with optional role) and return embedded system links,
so that the Organisation list filter sidebar and detail page can render the v2 surfaces without a separate round-trip.

## Acceptance Criteria

**AC1 — Reject deprecated filter params**
**Given** the v1 `GET /api/organisations` accepts `provider` and `crm` query params
**When** the v2 re-shape is applied
**Then** `provider` and `crm` are removed entirely — passing them returns `400` with `{ data: null, error: { message: "Validation failed", fields: [{ field: "provider", message: "Unknown filter" }] }, meta: null }` (not silent ignore — explicit rejection so frontend bugs surface fast)

**AC2 — New system/system_role filter params**
**And** two new params are accepted: `system` (UUID matching a System) and `system_role` (one of the four `SystemRole` enum values)
**And** `system_role` is only valid when `system` is also present — passing `system_role` alone returns `400` with `{ field: "system_role", message: "Provide a system filter to use a role sub-filter" }`

**AC3 — System filter uses EXISTS subquery**
**Given** `GET /api/organisations?system=<uuid>` is called
**When** the service constructs the SQL via Prisma
**Then** the filter uses `systems: { some: { system_id: <uuid> } }` (Prisma `some` generates an EXISTS subquery — an Organisation linked to multiple Systems is never duplicated)

**AC4 — System+role combined filter**
**Given** `GET /api/organisations?system=<uuid>&system_role=PRIMARY_TICKETING` is called
**When** the response returns
**Then** only Organisations with at least one link to that System with `role = PRIMARY_TICKETING` are returned
**And** the v1 filters (`q`, `country`, `type`, `membership`, `donation`, `seating`, `page`, `limit`) continue to work unchanged with AND semantics

**AC5 — Detail response: remove legacy fields, add systems array**
**Given** the v1 `GET /api/organisations/:id` response contains `ticketingProvider` and `crmPlatform` flat objects
**When** the v2 re-shape is applied
**Then** those two fields are removed from the response
**And** a new `systems` array is added — each entry has `{ id (junction), role, sourceReference, note, lastUpdated, system: { id, name, vendor, category } }`
**And** the array is sorted by `role` then `system.name` ascending

**AC6 — List response: same re-shape as detail**
**Given** `GET /api/organisations` (list endpoint)
**When** the v2 re-shape is applied
**Then** each item in the `data` array also has `systems[]` embedded and no `ticketingProvider` / `crmPlatform` fields

**AC7 — Reject legacy write fields**
**Given** the v1 `POST /api/organisations` and `PUT /api/organisations/:id` accepted `ticketing_provider_id` and `crm_platform_id` in the body
**When** the v2 re-shape is applied
**Then** those keys are *rejected* with `400` (not silently ignored): `{ data: null, error: { message: "Validation failed", fields: [{ field: "ticketing_provider_id", message: "Use POST /api/organisations/:id/systems instead" }] }, meta: null }`
**And** the same rejection applies to a hypothetical `systems: [...]` array in the body — link writes are a separate operation per Story 8.1
**And** both snake_case (`ticketing_provider_id`, `crm_platform_id`) and camelCase (`ticketingProviderId`, `crmPlatformId`) forms are rejected

**AC8 — Frontend hooks updated**
**Given** the v1 frontend hooks (`useOrganisations`, `useOrganisation`) consume the response
**When** they are updated for v2
**Then** they continue to use TanStack Query with the same query keys (`['organisations', filters]` for the list; `['organisations', id]` for detail) — only the response shape changes

## Tasks / Subtasks

- [x] **Task 1** — Update `backend/src/services/organisation-list-dto.js` (AC: #5, #6)
  - [x] **1.1** — Add `const { toLinkDto } = require('./organisation-system-dto')` at the top — `toLinkDto` is the canonical link mapper established in Story 8.1; do NOT define a local copy
  - [x] **1.2** — Remove `ticketingProvider` and `crmPlatform` from `toOrganisationDto` (both the Prisma-row reads and the output fields)
  - [x] **1.3** — Add `systems: Array.isArray(row.systems) ? row.systems.map(toLinkDto) : []` to the output (defensive array check in case the include is absent on older code paths)
  - [x] **1.4** — Leave `dateTimeToIso`, `toOrganisationListDto` alias, and all other fields unchanged

- [x] **Task 2** — Update `backend/src/services/organisation-service.js` (AC: #3, #4, #5, #6)
  - [x] **2.1** — Replace `organisationInclude` constant with v2 version (remove `ticketing_provider: true` and `crm_platform: true`; add `systems` include):
    ```js
    const organisationInclude = {
      organisation_type: true,
      systems: {
        include: {
          system: { select: { id: true, name: true, vendor: true, category: true } },
        },
        orderBy: [{ role: 'asc' }, { system: { name: 'asc' } }],
      },
    };
    ```
  - [x] **2.2** — Update `buildOrganisationListWhere` — remove the `ticketing_provider.name` branch from the `OR` array; the text search now covers `name`, `city`, `notes` only
  - [x] **2.3** — Update `buildOrganisationListCompositeWhere` — remove `provider` and `crm` branches; add `system` and `system_role` handling:
    ```js
    if (filters.system) {
      const linkFilter = { system_id: filters.system };
      if (filters.system_role) linkFilter.role = filters.system_role;
      parts.push({ systems: { some: linkFilter } });
    }
    ```
  - [x] **2.4** — Update `listOrganisations` parameter destructuring — replace `provider`, `crm` with `system`, `system_role`; update the `buildOrganisationListCompositeWhere` call accordingly
  - [x] **2.5** — Update `createOrganisation` — remove `ticketing_provider_id: payload.ticketingProviderId` and `crm_platform_id: payload.crmPlatformId` from the Prisma `data` object (the controller now rejects those fields; legacy FK columns stay null for new rows until Epic 10 drops them)
  - [x] **2.6** — Update `updateOrganisation` — same: remove those two lines from the Prisma `data` object

- [x] **Task 3** — Update `backend/src/controllers/organisation-controller.js` (AC: #1, #2, #7)
  - [x] **3.1** — Add near the top (alongside other sets): `const VALID_ROLES = new Set(['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY'])` — copy verbatim; do NOT import from another controller
  - [x] **3.2** — In `listOrganisations`: read `providerRaw` and `crmRaw` via `asQueryString`; if either is not `undefined`, push a `400` field error (`"Unknown filter"`) and fall through to the existing `fields.length > 0` guard
  - [x] **3.3** — In `listOrganisations`: read and validate `systemRaw` (UUID via `isUuidParam`) and `systemRoleRaw` (must be in `VALID_ROLES`); enforce that `system_role` without `system` returns `{ field: "system_role", message: "Provide a system filter to use a role sub-filter" }` — follow the same block-then-accumulate pattern as the existing capability validation
  - [x] **3.4** — In `listOrganisations`: pass `system` and `system_role` to `listOrganisations` service call; remove `provider` and `crm` from `listParams`
  - [x] **3.5** — Add helper `checkForbiddenOrganisationBodyKeys(body)` that detects any of: `ticketing_provider_id`, `crm_platform_id`, `ticketingProviderId`, `crmPlatformId`, `systems` keys in the body object and returns a `fields[]` array with message `"Use POST /api/organisations/:id/systems instead"` for each present key
  - [x] **3.6** — In `createOrganisation` and `updateOrganisation` handlers: call `checkForbiddenOrganisationBodyKeys(raw)` immediately after `stripClientControlledOrganisationKeys` and before `parseOrganisationWritePayload`; return early `400` if forbidden keys are found
  - [x] **3.7** — In `parseOrganisationWritePayload`: remove all `ticketingProviderId` and `crmPlatformId` processing (the `normaliseOptionalFk` calls, the field-level error pushes for those fields, and the payload assignments); `normaliseOptionalFk` removed (no remaining callers)
  - [x] **3.8** — In `validateOrganisationForeignKeys`: remove the `ticketingProviderId` and `crmPlatformId` FK database checks (those lookup tables exist until Epic 10 but the API no longer accepts those fields)

- [x] **Task 4** — Update backend tests (AC: all)
  - [x] **4.1** — `backend/src/__tests__/organisation-service.test.js` — updated DTO test: `systems` array asserted, `ticketingProvider`/`crmPlatform` asserted absent; added system filter tests for service WHERE clause; updated `getOrganisationById` and `updateOrganisation` mock rows to use `systems: []`; confirmed Prisma data no longer includes `ticketing_provider_id`/`crm_platform_id`
  - [x] **4.2** — `backend/src/__tests__/organisation-controller.test.js` — added tests for:
    - `GET /api/organisations?provider=Tessitura` → `400`, field `provider`, message `"Unknown filter"` ✓
    - `GET /api/organisations?crm=Salesforce` → `400`, field `crm`, message `"Unknown filter"` ✓
    - `GET /api/organisations?provider=X&crm=Y` → `400`, both fields ✓
    - `GET /api/organisations?system=<valid-uuid>` → `200` ✓
    - `GET /api/organisations?system=not-a-uuid` → `400` ✓
    - `GET /api/organisations?system_role=PRIMARY_TICKETING` (no `system`) → `400`, field `system_role` ✓
    - `GET /api/organisations?system=<uuid>&system_role=INTEGRATED_SUITE` → `200` with both forwarded ✓
    - `GET /api/organisations?system=<uuid>&system_role=NOT_A_ROLE` → `400` ✓
    - `POST /api/organisations` with `ticketing_provider_id` → `400` ✓
    - `POST /api/organisations` with `ticketingProviderId` → `400` ✓
    - `POST /api/organisations` with `crm_platform_id` → `400` ✓
    - `POST /api/organisations` with `systems: []` → `400` ✓
    - `PUT /api/organisations/:id` with `ticketing_provider_id` → `400` ✓
    - `PUT /api/organisations/:id` with `crmPlatformId` → `400` ✓
    - `PUT /api/organisations/:id` with `systems: [...]` → `400` ✓

- [x] **Task 5** — Update frontend filter params lib and API helper (AC: #8)
  - [x] **5.1** — `frontend/src/lib/organisation-list-filter-params.js` — updated `LIST_FILTER_PARAM_KEYS`: removed `'provider'`/`'crm'`; added `'system'`/`'system_role'`; updated `FILTER_DIMENSION_LABELS`
  - [x] **5.2** — `frontend/src/api/organisations.js` — updated `fetchOrganisations`: removed `provider`/`crm` params; added `system`/`system_role` params with JSDoc update
  - [x] **5.3** — `frontend/src/hooks/useOrganisations.js` — updated JSDoc `@param` block; keyPart loop picks up new params automatically via `LIST_FILTER_PARAM_KEYS`

- [x] **Task 6** — Verify no regressions (AC: all)
  - [x] **6.1** — `cd backend && npm test` — 218 tests pass, 0 failures (was 199 before, +19 new tests)
  - [x] **6.2** — `cd frontend && npm run lint` — 0 ESLint errors
  - [x] **6.3** — Frontend Vitest: 4 tests pass, 0 failures
  - [x] **6.4** — All new controller tests cover smoke scenarios: provider/crm → 400, system filter, forbidden body keys
  - [x] **6.5** — All existing CRUD tests updated and passing (sampleDto updated to v2 shape; no legacy FK fields in service calls)

## Dev Notes

### Previous Story Intelligence (Story 8.1)

Story 8.1 created the full `OrganisationSystem` junction CRUD API and its DTO layer. Two things from 8.1 are directly consumed here:

1. **`toLinkDto` in `organisation-system-dto.js`** — this is the canonical mapper for junction rows and MUST be imported (not re-defined) in `organisation-list-dto.js` for the `systems` array. The 8.1 story notes explicitly called this out: "this mapper must live in `organisation-system-dto.js` and be re-used in Story 8.2".

2. **`LINK_INCLUDE` pattern** — the 8.1 service uses `system: { select: { id, name, vendor, category } }`. The `organisationInclude.systems.include.system.select` block must match this exactly so the `toLinkDto` mapper receives all the fields it expects.

**8.1 controller conventions used here:**
- `VALID_ROLES = new Set(['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY'])` — copy this into `organisation-controller.js` (self-contained per-controller rule)
- UUID validation via `isUuidParam` — already in `organisation-controller.js`
- Accumulate `fields[]` before returning `400` — same pattern as existing list validation

### Architecture Compliance

**Three-layer rule (route → controller → service):**
- Routes: `backend/src/routes/organisations.js` — no changes needed
- Controller: owns filter param parsing, forbidden key rejection, UUID validation
- Service: owns WHERE clause construction and Prisma calls

**Anti-patterns to avoid:**
- Do NOT use `prisma.$queryRaw` for the system filter — Prisma `systems: { some: {...} }` generates the EXISTS subquery natively and is type-safe
- Do NOT import `VALID_ROLES` or any function from `organisation-system-controller.js` — each controller is self-contained
- Do NOT import `isUuidParam` from another controller — copy it as needed (it's already in `organisation-controller.js`)
- Do NOT pass `ticketing_provider_id` / `crm_platform_id` through the service layer — they are legacy schema columns that remain in place until Epic 10; the v2 API simply stops accepting them

**Response envelope — unchanged:**
All endpoints continue returning `{ data, error, meta }`. The only change is the shape of the `data` objects — `ticketingProvider` and `crmPlatform` removed, `systems[]` added.

**`@updatedAt` rule (ADR-011):** `Organisation.last_updated` is still `@updatedAt` in Prisma. Nothing in this story touches that.

### File Structure

```
backend/src/
  services/
    organisation-list-dto.js      ← UPDATE: import toLinkDto, remove legacy fields, add systems
    organisation-service.js       ← UPDATE: include change, filter re-shape, create/update data objects
  controllers/
    organisation-controller.js    ← UPDATE: reject provider/crm/legacy body keys, add system filter
  __tests__/
    organisation-service.test.js  ← UPDATE: DTO test row, systems assertion
    organisation-controller.test.js ← UPDATE: new rejection tests, system filter tests

frontend/src/
  lib/
    organisation-list-filter-params.js  ← UPDATE: remove provider/crm, add system/system_role
  api/
    organisations.js                    ← UPDATE: fetchOrganisations params
  hooks/
    useOrganisations.js                 ← UPDATE: JSDoc only (logic unchanged)
```

No new files. No schema changes. No migration.

### Prisma Include and orderBy Detail

The new `organisationInclude` must use the Prisma relation name `systems` (as declared on `Organisation` model in `schema.prisma`) — not the table name `organisation_system`:

```js
const organisationInclude = {
  organisation_type: true,
  systems: {
    include: {
      system: { select: { id: true, name: true, vendor: true, category: true } },
    },
    orderBy: [{ role: 'asc' }, { system: { name: 'asc' } }],
  },
};
```

Sorting by `system.name` via a nested relation in `orderBy` is valid Prisma v6 syntax. The `role` enum sorts alphabetically (`INTEGRATED_SUITE` < `PRIMARY_CRM` < `PRIMARY_TICKETING` < `SECONDARY`) — this is acceptable; no custom sort needed.

### Filter Validation in `listOrganisations` Controller

**Order of validation steps:**
1. Parse `page` / `limit` (existing — unchanged)
2. Read `providerRaw` and `crmRaw` via `asQueryString` → push `{ field: 'provider'/'crm', message: 'Unknown filter' }` if not `undefined`
3. Read `systemRaw` → validate UUID via `isUuidParam` → push `{ field: 'system', message: 'Provide a valid system UUID' }` if invalid
4. Read `systemRoleRaw` → validate in `VALID_ROLES`; if `systemRoleRaw` is present but `systemRaw` resolved to a valid UUID: validate role; if `systemRoleRaw` is present but `systemRaw` is absent or invalid: push `{ field: 'system_role', message: 'Provide a system filter to use a role sub-filter' }` (only when `system` param itself wasn't provided — don't double-report when both are invalid)
5. Read `countryRaw`, capability params (existing — unchanged)
6. Return `400` if `fields.length > 0` (existing guard — unchanged)

**Note on step 4 edge case:** If `system` is present but fails UUID validation AND `system_role` is present, push only the `system` UUID error (not the system_role dependency error), because the user did provide a system value — it's just malformed.

### Forbidden Body Key Detection

Insert between `stripClientControlledOrganisationKeys` and `parseOrganisationWritePayload` in both `createOrganisation` and `updateOrganisation` handlers:

```js
const raw = stripClientControlledOrganisationKeys(req.body);

// Reject v1 legacy FK keys — they must never reach the service
const forbiddenFields = [];
for (const key of ['ticketing_provider_id', 'crm_platform_id', 'ticketingProviderId', 'crmPlatformId', 'systems']) {
  if (key in raw) {
    forbiddenFields.push({
      field: key,
      message: key === 'systems'
        ? 'Use POST /api/organisations/:id/systems instead'
        : 'Use POST /api/organisations/:id/systems instead',
    });
  }
}
if (forbiddenFields.length > 0) {
  return res.status(400).json({
    data: null,
    error: { message: 'Validation failed', fields: forbiddenFields },
    meta: null,
  });
}

const { fields, payload } = parseOrganisationWritePayload(raw);
```

### `parseOrganisationWritePayload` Cleanup

Remove these sections entirely:
- The `normaliseOptionalFk(raw.ticketingProviderId)` call and associated field error push
- The `normaliseOptionalFk(raw.crmPlatformId)` call and associated field error push
- The payload assignments `ticketingProviderId: null`, `if (tp && tp.id) payload.ticketingProviderId = tp.id`, etc.

The function `normaliseOptionalFk` can be removed if it has no remaining callers (check the file — as of Story 8.1 it was only used for FK processing).

The `payload` object returned from `parseOrganisationWritePayload` should no longer contain `ticketingProviderId` or `crmPlatformId`.

### Service `createOrganisation` / `updateOrganisation` Data Objects

Remove from both Prisma data objects:
```js
// REMOVE these two lines:
ticketing_provider_id: payload.ticketingProviderId,
crm_platform_id: payload.crmPlatformId,
```

The legacy FK columns (`ticketing_provider_id`, `crm_platform_id`) remain in the `organisation` table and will be dropped in Epic 10 Story 10.1. For new rows, Prisma will leave them as their default (`null`). For existing rows on update, Prisma will not touch them. This is the correct v2 behaviour — legacy links are preserved in the schema but not managed by the API.

### Frontend `organisation-list-filter-params.js` Update

The `LIST_FILTER_PARAM_KEYS` array drives multiple behaviours automatically:
- `useOrganisations` key part construction (iterates the array)
- `parseOrganisationListInputsFromSearchParams` (iterates the array)
- `hasActiveListFilters` (iterates the array)
- `clearAllListFiltersInSearchParams` (iterates the array — deletes all keys in the array)

So updating the array is the primary change; other functions in the file need no logic changes, only the `FILTER_DIMENSION_LABELS` constant and any explicit references to `'provider'` or `'crm'` strings.

**Note:** `system` and `system_role` are not capability params, so `CAPABILITY_FILTER_PARAM_KEYS` does not need updating.

**New array:**
```js
export const LIST_FILTER_PARAM_KEYS = Object.freeze([
  'country',
  'type',
  'system',
  'system_role',
  'membership',
  'donation',
  'seating',
])
```

### Testing Strategy

**`organisation-service.test.js` DTO test:**

The existing test passes a Prisma row with `ticketing_provider: { id: 'p1', name: 'Spektrix' }` and asserts `dto.ticketingProvider.name === 'Spektrix'`. This test must be updated:
- Add `systems: []` (or a mock link row) to the input
- Assert `dto.systems` is an array
- Assert `dto.ticketingProvider` is `undefined` (or use `.not.toHaveProperty('ticketingProvider')`)
- Assert `dto.crmPlatform` is `undefined` / not present

**`organisation-controller.test.js` new tests:**

Follow the existing pattern — mock `../services/organisation-service` (not Prisma directly for list/detail). For the forbidden body key tests on create/update, the service mock should never be called (return before reaching service call):

```js
// Example: provider rejection
it('returns 400 when provider param is passed', async () => {
  const res = await request(app).get('/api/organisations?provider=Tessitura')
  expect(res.status).toBe(400)
  expect(res.body.error.fields).toEqual(
    expect.arrayContaining([expect.objectContaining({ field: 'provider', message: 'Unknown filter' })])
  )
})

// Example: ticketing_provider_id rejection on POST
it('returns 400 when ticketing_provider_id is in POST body', async () => {
  const res = await request(app)
    .post('/api/organisations')
    .send({ name: 'Test Org', country: 'United Kingdom', organisationTypeId: 'some-uuid', ticketing_provider_id: 'x' })
  expect(res.status).toBe(400)
  expect(res.body.error.fields).toEqual(
    expect.arrayContaining([expect.objectContaining({ field: 'ticketing_provider_id' })])
  )
  expect(organisationService.createOrganisation).not.toHaveBeenCalled()
})
```

### Story Boundary

**In scope:**
- Backend: `organisation-list-dto.js`, `organisation-service.js`, `organisation-controller.js`
- Backend tests: `organisation-service.test.js`, `organisation-controller.test.js`
- Frontend: `organisation-list-filter-params.js`, `api/organisations.js`, `hooks/useOrganisations.js` (JSDoc only)

**Out of scope (deferred to Stories 8.3–8.6):**
- Filter sidebar UI changes (Story 8.3)
- `ActiveFilterChips` v2 (Story 8.3)
- Linked Systems panel on Organisation detail (Story 8.4)
- Linked Systems editor on Organisation form (Story 8.5)
- `OrganisationCard` system chips (Story 8.6)
- `OrganisationListPage` UI update to remove Provider/CRM dropdown filter controls — the UI still renders those old controls in this story; they simply won't work until 8.3 removes them
- Any changes to `OrganisationDetailPage` or `OrganisationFormPage` components — those consume the new `systems[]` array but their UI updates are 8.4/8.5

**Note on OrganisationFormPage/DetailPage regressions:** The existing pages reference `data.ticketingProvider` and `data.crmPlatform` from the API. After this story those fields are gone from the response. This will cause undefined-access rendering bugs in the form and detail components. Those bugs are intentional at this stage — they will be fixed in Stories 8.4 and 8.5. The story boundary is backend + hooks; component visual regressions in 8.2 are expected and tracked.

If this is unacceptable (i.e. the app should remain fully functional at all times), the developer should defensively null-check in those components while keeping the UI logic otherwise unchanged. Document the decision in the Dev Agent Record.

### Project Structure Notes

- British English: `organisation` not `organization` throughout
- Controller log prefix convention: `[GET /api/organisations]`, `[POST /api/organisations]`, `[PUT /api/organisations/:id]` — existing prefixes, no change
- No new lib files, no changes to `app.js`, no new routes files
- The `systems` relation name in Prisma is lowercase `systems` (from schema: `systems OrganisationSystem[]`) — not `organisationSystems`
- `system_id` in the Prisma `where` clause (snake_case for schema columns); the client sends `system` as the query param (not `system_id`)

### References

- Story 8.1 (done): `_bmad-output/implementation-artifacts/8-1-organisation-system-link-api-junction-crud.md` — `toLinkDto` canonical mapper, LINK_INCLUDE pattern, controller conventions
- Epics: `_bmad-output/planning-artifacts/epics.md` lines 1455–1498 (Story 8.2 AC)
- Schema: `backend/src/prisma/schema.prisma` — `Organisation.systems OrganisationSystem[]` relation, `SystemRole` enum values
- Current DTO: `backend/src/services/organisation-list-dto.js` — remove `ticketingProvider`/`crmPlatform`, add `systems`
- Current service: `backend/src/services/organisation-service.js` — `organisationInclude`, `buildOrganisationListCompositeWhere`, `createOrganisation`, `updateOrganisation`
- Current controller: `backend/src/controllers/organisation-controller.js` — `listOrganisations`, `parseOrganisationWritePayload`, `validateOrganisationForeignKeys`
- Filter params lib: `frontend/src/lib/organisation-list-filter-params.js` — `LIST_FILTER_PARAM_KEYS`, `FILTER_DIMENSION_LABELS`
- Architecture doc: `_bmad-output/planning-artifacts/architecture.md` — §API & Communication Patterns (validation flow), §Structure Patterns (layer boundaries), §Anti-patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Updated `organisation-list-dto.js`: imported `toLinkDto` from `organisation-system-dto.js` (canonical mapper from Story 8.1); removed `ticketingProvider` and `crmPlatform` from `toOrganisationDto`; added `systems: Array.isArray(row.systems) ? row.systems.map(toLinkDto) : []` with defensive array check.
- Updated `organisation-service.js`: replaced `organisationInclude` to include `systems` with nested system select and `orderBy: [{ role: 'asc' }, { system: { name: 'asc' } }]`; removed `ticketing_provider`/`crm_platform` from include; removed `ticketing_provider.name` from text search OR; removed `provider`/`crm` filter branches; added `systems: { some: { system_id, role? } }` EXISTS-subquery filter; removed `ticketing_provider_id`/`crm_platform_id` from `createOrganisation` and `updateOrganisation` Prisma data objects.
- Updated `organisation-controller.js`: added `VALID_ROLES` set; added `checkForbiddenOrganisationBodyKeys` helper; `listOrganisations` now rejects `provider`/`crm` params with `400 "Unknown filter"`, validates `system` UUID and `system_role` enum (enforcing `system_role` requires `system`), and passes `system`/`system_role` to service; `createOrganisation`/`updateOrganisation` call `checkForbiddenOrganisationBodyKeys` before parse to reject `ticketing_provider_id`, `crm_platform_id`, `ticketingProviderId`, `crmPlatformId`, `systems` keys; `parseOrganisationWritePayload` cleaned of all legacy FK processing; `validateOrganisationForeignKeys` cleaned of `ticketingProvider`/`crmPlatform` FK checks; `normaliseOptionalFk` removed (no remaining callers).
- Updated backend tests: `organisation-service.test.js` rewrites DTO test (asserts `systems[]`, no `ticketingProvider`/`crmPlatform`), adds system filter WHERE tests, updates `getOrganisationById`/`updateOrganisation` mocks to v2 shape; `organisation-controller.test.js` removes deprecated `ticketingProvider`/`crmPlatform` from `sampleDto` and mock setup, adds 15 new tests covering provider/crm rejection, system filter acceptance/rejection, and forbidden body key rejection on POST/PUT.
- Updated frontend: `organisation-list-filter-params.js` removes `provider`/`crm` from `LIST_FILTER_PARAM_KEYS` and `FILTER_DIMENSION_LABELS`, adds `system`/`system_role`; `api/organisations.js` `fetchOrganisations` updated accordingly; `hooks/useOrganisations.js` JSDoc updated.
- All 218 backend tests pass; 4 frontend Vitest tests pass; 0 ESLint errors.
- Decision on component regressions: `OrganisationFormPage` and `OrganisationDetailPage` still reference the now-absent `ticketingProvider`/`crmPlatform` fields — these render as `undefined` but do not crash. Component updates are intentionally deferred to Stories 8.4 and 8.5 per story boundary.
- Code review (2026-05-01): added POST `crmPlatformId` and PUT `crm_platform_id` controller tests; service tests now assert full `organisationInclude` (systems `orderBy` for AC5/AC6).

### File List

- backend/src/services/organisation-list-dto.js
- backend/src/services/organisation-service.js
- backend/src/controllers/organisation-controller.js
- backend/src/__tests__/organisation-service.test.js
- backend/src/__tests__/organisation-controller.test.js
- frontend/src/lib/organisation-list-filter-params.js
- frontend/src/api/organisations.js
- frontend/src/hooks/useOrganisations.js

### Review Findings

- [x] [Review][Patch] POST `crmPlatformId` rejection not covered by controller tests — Addressed 2026-05-01: POST `crmPlatformId` 400 test added. [`backend/src/__tests__/organisation-controller.test.js`]

- [x] [Review][Patch] PUT `crm_platform_id` rejection not covered — Addressed 2026-05-01: PUT `crm_platform_id` 400 test added. [`backend/src/__tests__/organisation-controller.test.js`]

- [x] [Review][Patch] No test asserts `systems` ordering contract (AC5/AC6) — Addressed 2026-05-01: shared `organisationSystemsIncludeExpectation` asserts full include + `orderBy` on list, get, and update service paths. [`backend/src/__tests__/organisation-service.test.js`]

- [x] [Review][Defer] `buildOrganisationListCompositeWhere` omits a `systems.some` clause when only `system_role` is passed without `system` — HTTP path never does this; only relevant for direct internal service callers. [`backend/src/services/organisation-service.js`] — deferred, internal boundary
