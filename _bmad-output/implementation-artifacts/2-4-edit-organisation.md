# Story 2.4: Edit Organisation

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming, API envelope, British English, anti-patterns
- `_bmad-output/planning-artifacts/architecture.md` — `{ data, error, meta }`, validation, TanStack Query keys
- `_bmad-output/implementation-artifacts/2-2-create-organisation.md` — POST body contract, GOV.UK form errors, `createOrganisation` client
- `_bmad-output/implementation-artifacts/2-3-organisation-detail-page.md` — `GET` by id, detail navigation, success banner + `location.state` preservation

## Story

As a staff member,
I want to update an existing organisation record,
so that I can correct stale or inaccurate data and update the source reference.

## Acceptance Criteria

1. **Given** a staff member navigates to `/organisations/:id/edit`  
   **When** the edit form loads  
   **Then** the form pre-fills with all existing field values for that organisation (same fields as create: name, country, type, optional provider/CRM, three capabilities, optional source reference, notes, capacity)  
   **And** a `← Back to organisations detail` link (`text-sm text-blue-600`) navigates to `/organisations/:id` — **not** to the list — matching [Source: `_bmad-output/planning-artifacts/epics.md` Story 2.4]  
   **And** `OrganisationFormPage` handles both create (`/organisations/new`) and edit (`/organisations/:id/edit`) — remove `EditOrganisationStub`; mode from route (`useMatch` / `useParams` is already used for stub detection)

2. **Given** a staff member clicks the primary "Save" submit button  
   **When** the mutation is in flight  
   **Then** "Save" shows a loading indicator and is `disabled` (no double submit)  
   **And** the button returns to normal after success or failure — same pattern as create [`frontend/src/pages/OrganisationFormPage.jsx`]

3. **Given** a staff member changes one or more fields and submits with valid data  
   **When** `PUT /api/organisations/:id` is called  
   **Then** the server updates the row and returns `{ data: { ...organisation }, error: null, meta: null }` with HTTP **200**  
   **And** the response DTO matches list/detail/create (`toOrganisationDto`, camelCase, ISO dates)

4. **Given** a successful update  
   **When** the client handles the response  
   **Then** navigate to `/organisations/:id` with `state: { organisationSaved: true }` so the existing detail-page **"Organisation saved."** banner (auto-dismiss 5s, manual ×) appears — same UX as create [Stories 2.2 / 2.3]

5. **Given** invalid client or server validation  
   **When** submit fails validation  
   **Then** the GOV.UK pattern from create applies: summary **"There is a problem."** with focus links, per-field inline errors, `border-red-500`, stable `field` keys on `400` responses for mapping

6. **Given** `PUT /api/organisations/:id` with a missing or unknown id  
   **When** the organisation does not exist (or id is not a valid UUID — align with `GET` behaviour)  
   **Then** respond **404** with `{ data: null, error: { message: 'Organisation not found', fields: [] }, meta: null }` — consistent with `getOrganisationById`

7. **Given** the request body includes `lastUpdated`, `last_updated`, `createdAt`, `created_at`, or `id`  
   **When** the controller builds the update payload  
   **Then** those keys are **stripped/ignored** before persist — `last_updated` is maintained by Prisma (`@updatedAt` on `last_updated` in `schema.prisma`), not the client [Source: `backend/src/prisma/schema.prisma`; migration note in `20260403120000_organisation_last_updated_updated_at`]

## Tasks / Subtasks

- [x] **Backend — `PUT /api/organisations/:id`** (AC: 3, 5–7)
  - [x] In `backend/src/routes/organisations.js`, add `router.put('/:id', ...)` alongside existing `get('/:id')` (order: keep `post`/`get` `/` before any `/:id` routes)
  - [x] In `organisation-controller.js`, add `updateOrganisation`:
    - [x] Parse `req.params.id`; if not valid UUID → **404** + same envelope as `getOrganisationById` (reuse `isUuidParam` + `notFoundEnvelope`)
    - [x] Clone `req.body`, delete client-controlled timestamps and `id` (mirror the deletes in `createOrganisation` lines 180–187)
    - [x] Reuse the same validation rules as create: name, country, `organisationTypeId`, optional FKs, capabilities, capacity, optional strings — **extract shared validation into a helper** if it avoids duplication, or duplicate minimally with identical messages so `error.fields` keys stay camelCase
    - [x] Verify FK ids exist (same Prisma lookups as create)
    - [x] Call new `organisationService.updateOrganisation(id, payload)`; if `update` affects 0 rows (race deleted), return **404**
    - [x] Success: **200** + `toOrganisationDto` row
    - [x] **400** / **500** patterns match create/list
  - [x] Tests in `organisation-controller.test.js` and/or `organisation-service.test.js`: 200 shape, 404 missing id, 404 malformed UUID, 400 validation, ignored `lastUpdated` in body (optional assertion via mock or DB read)

- [x] **Backend — service** (AC: 3, 7)
  - [x] `updateOrganisation(id, payload)` in `organisation-service.js`: `prisma.organisation.update({ where: { id }, data: { ...snake_case mapping... }, include: organisationInclude })` — map camelCase payload to Prisma field names like `createOrganisation`
  - [x] Return `toOrganisationDto(row)`; let Prisma throw `P2025` if missing → map to `null` or let controller translate to 404

- [x] **Frontend — API** (AC: 3–6)
  - [x] Add `updateOrganisation(id, body)` in `frontend/src/api/organisations.js`: `PUT`, parse envelope; **200** requires `data` + `error: null` + `meta: null`; **404** distinguishable for edit page (reuse pattern from `fetchOrganisation` / `OrganisationNotFoundError` if present)

- [x] **Frontend — hooks** (AC: 2, 4)
  - [x] `useMutation` for update (new `useUpdateOrganisation.js` or extend patterns from `useCreateOrganisation.js`)
  - [x] `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['organisations'] })` and `invalidateQueries({ queryKey: ['organisations', id] })` per architecture

- [x] **Frontend — `OrganisationFormPage.jsx`** (AC: 1–2, 5)
  - [x] Remove `EditOrganisationStub`; implement edit branch:
    - [x] Load existing org via `useOrganisation(id)` (or `useQuery` with same key as detail — [`frontend/src/hooks/useOrganisation.js`])
    - [x] While loading reference meta + organisation: skeleton or disabled form — avoid full-page spinner only if you can mirror create UX; at minimum do not flash empty form as "loaded"
    - [x] Initialise form state from DTO: `organisationTypeId` from `organisationType?.id`, same for ticketing/CRM; `capacity` as string (`''` if null); capabilities uppercase strings
    - [x] Back link: `Link` to `` `/organisations/${id}` `` with label **← Back to organisations detail**
    - [x] Page title copy: **Edit organisation** (subtitle optional)
    - [x] Submit: reuse `validateClient`, error summary, and field markup — factor shared form fields between create and edit **or** one inner component with `mode` prop to minimise drift
    - [x] On success: `navigate(`/organisations/${id}`, { state: { organisationSaved: true } })` — preserve any future `location.state` keys when clearing banner on detail (see 2.3 review: spread state, omit only `organisationSaved`)

- [x] **Documentation** (only if behaviour is non-obvious)
  - [x] Short ADR or `docs/decisions.md` note if PUT body contract or 404 rules differ from POST — *N/A: PUT mirrors POST validation and 404 matches GET; no doc change.*

## Dev Notes

### Epic 2 cross-story context

- **2.1** — List, pagination query key `['organisations']`.
- **2.2** — Create form, POST, `OrganisationFormPage` create mode, meta hooks.
- **2.3** — Detail, `GET /api/organisations/:id`, Edit button → `/organisations/:id/edit`, success banner handling.
- **2.5** — Delete on detail only (do not break detail header layout when adding edit).

### Previous story intelligence (2.3)

- **404** for detail uses a dedicated message — edit route should show a clear not-found (or redirect) if id unknown; do not white-screen.
- **Banner state:** `OrganisationDetailPage` should keep fixing that only `organisationSaved` is cleared from `location.state`, not the whole state object.
- **DTO:** Always `toOrganisationDto` — never return raw Prisma.

### Previous story intelligence (2.2)

- Server `400` uses `error.fields` with camelCase `field` keys aligned with request body.
- Client: `submitError` for non-field failures; map server fields via `mapServerFieldsToSummary`.
- **Review fixes** already in create form: `aria-invalid`, `aria-describedby`, `focusFormControl` — replicate for edit.

### Architecture compliance (must follow)

- Envelope: `{ data, error, meta }`; single-resource success → **`meta: null`**.
- Routes thin; controllers validate; services own Prisma — [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Prisma client only from `backend/src/lib/prisma.js`.
- **`last_updated` maintenance:** Architecture mentions middleware; **current codebase** uses Prisma `@updatedAt` on `last_updated` — no `$use` middleware in `prisma.js`. Do not accept client timestamps; rely on DB/Prisma.

### `last_updated` / schema (critical)

```prisma
last_updated  DateTime  @default(now()) @updatedAt
```

Every successful `update` bumps `last_updated` automatically if you map fields through Prisma `update` — do not set `last_updated` in `data: {}`.

### File structure (expected touches)

| Path | Action |
|------|--------|
| `backend/src/routes/organisations.js` | `PUT /:id` |
| `backend/src/controllers/organisation-controller.js` | `updateOrganisation`, export |
| `backend/src/services/organisation-service.js` | `updateOrganisation` |
| `backend/src/__tests__/organisation-controller.test.js` | PUT cases |
| `backend/src/__tests__/organisation-service.test.js` | optional |
| `frontend/src/api/organisations.js` | `updateOrganisation` |
| `frontend/src/hooks/useUpdateOrganisation.js` | **New** (or equivalent) |
| `frontend/src/pages/OrganisationFormPage.jsx` | Edit mode + remove stub |

### Testing requirements

- **Backend:** `cd backend && npm test` — PUT happy path, validation, 404.
- **Frontend:** Manual: open edit from detail, change field, save → detail + banner; invalid UUID; not found id; server 400 mapping.

### Git intelligence

- Local history may be shallow; rely on story files and code references above.

### Latest technical notes

- Stack: Express 5, Prisma 6, TanStack Query 5, React 19, react-router-dom 6 — verify in `package.json` if upgrading.
- Do **not** run `npx shadcn` CLI; copy-paste primitives only per project context.

## Project context reference

See `_bmad-output/project-context.md` for British spelling (`organisation`), envelope-only API, no auth, Tailwind-only styling, and shadcn copy-paste rule.

## Story completion status

**done** — Implementation complete; code review patches applied (2026-04-04).

### Review Findings

- [x] [Review][Patch] Align client `capacity` validation with server upper bound — fixed: `MAX_CAPACITY` + same message as server. [frontend/src/pages/OrganisationFormPage.jsx]

- [x] [Review][Patch] Cover AC7 snake_case strip on PUT — fixed: supertest `strips last_updated and created_at from body before service call`. [backend/src/__tests__/organisation-controller.test.js]

- [x] [Review][Defer] Background refetch vs edit form — default React Query `refetchOnWindowFocus` updates `data` while `hydratedRef` prevents re-applying DTO to the form, so concurrent edits elsewhere are not surfaced; saving overwrites server state. Out of story AC scope (no versioning). [frontend/src/pages/OrganisationFormPage.jsx] — deferred, pre-existing pattern risk

---

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Implemented `PUT /api/organisations/:id` with shared `parseOrganisationWritePayload`, `stripClientControlledOrganisationKeys`, and `validateOrganisationForeignKeys` used by create and update.
- `organisation-service.updateOrganisation` maps camelCase → Prisma fields, returns DTO; `P2025` → `null` → controller **404**.
- Frontend: `updateOrganisation` API, `useUpdateOrganisation` with query invalidation for `['organisations']` and `['organisations', id]`.
- `OrganisationFormPage`: shared `OrganisationFormBody`, edit flow with `useOrganisation`, loading/not-found/error states, `startTransition` for initial hydrate (React 19 lint).
- Backend: `npm test` — 48 tests pass. Frontend: `npm run build` succeeds.

### File List

- `backend/src/routes/organisations.js`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `frontend/src/api/organisations.js`
- `frontend/src/hooks/useUpdateOrganisation.js`
- `frontend/src/pages/OrganisationFormPage.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-4-edit-organisation.md`

### Change Log

- 2026-04-05: Story 2.4 — edit organisation (PUT API, service, form, hooks, tests); sprint status → review.
- 2026-04-04: Code review — client `capacity` max parity + PUT snake_case strip test; story and sprint → done.
