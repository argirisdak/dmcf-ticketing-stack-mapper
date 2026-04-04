# Story 2.2: Create Organisation

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming, API envelope, British English, anti-patterns
- `_bmad-output/planning-artifacts/architecture.md` — validation error shape, camelCase JSON, TanStack Query invalidation, form/error patterns
- `_bmad-output/implementation-artifacts/2-1-organisation-list-page.md` — list DTO pattern, controller style, review outcomes

## Story

As a staff member,
I want to create a new organisation record with all required and optional fields,
so that I can add a new entry to the catalogue with full provenance.

## Acceptance Criteria

1. **Given** a staff member clicks "Add organisation" from the list page  
   **When** the create form at `/organisations/new` loads  
   **Then** the form renders with: Name (required); Country (required, dropdown from `COUNTRIES` in `frontend/src/lib/countries.js`); Organisation Type (required, dropdown from `GET /api/meta/organisation-types`); Ticketing Provider (optional, `GET /api/meta/ticketing-providers`); CRM Platform (optional, `GET /api/meta/crm-platforms`); Membership / Donation / Reserved Seating Capability (each required, three-state: Unknown / Yes / No in the UI — serialised as `UNKNOWN` / `YES` / `NO` to the API); Source Reference (optional); Notes (optional, textarea); Capacity (optional, integer)  
   **And** each required field has a label above with no asterisk; optional fields append "(optional)" in muted `text-slate-500` per GOV.UK-style pattern from epics  
   **And** a `← Back to organisations` link (`text-sm text-blue-600`) at the top — use `Link` to `/organisations` for accessibility

2. **Given** a staff member clicks the primary "Save" submit button  
   **When** the form submission is in progress (mutation pending)  
   **Then** "Save" shows a loading indicator and is `disabled` (no double submit)  
   **And** the button returns to normal after success or failure

3. **Given** a staff member submits with all required fields valid  
   **When** `POST /api/organisations` is called  
   **Then** the server creates the record and returns `{ data: { ...organisation }, error: null, meta: null }` with HTTP **201**  
   **And** `last_updated` and `created_at` (and `updated_at`) are set by the database/Prisma — **strip** any `lastUpdated`, `createdAt`, `updatedAt`, `id` from the request body before persist if present; do not trust client timestamps  
   **And** capability fields default to `UNKNOWN` in the DB when omitted (already in `schema.prisma`); reject invalid capability strings with `400` + `fields`

4. **Given** a successful create  
   **When** the client handles the response  
   **Then** the user is navigated to `/organisations/:id` for the new id  
   **And** an inline success banner **"Organisation saved."** appears at the top: `bg-emerald-50 border border-emerald-200 text-emerald-800`  
   **And** the banner auto-dismisses after **5 seconds**  
   **And** the banner has a visible dismiss control (`×`) that removes it immediately — **same dismiss pattern** must be reused in Stories 2.4 and 2.5 later

5. **Given** required fields are missing or invalid on submit  
   **When** client-side validation runs  
   **Then** an error summary at the top with heading **"There is a problem."** lists each issue as a **link** that focuses the field  
   **And** each invalid field has an inline message and `border-red-500` on the input  
   **And** messages are specific (e.g. "Enter the organisation name", "Select a country")  
   **And** the API is **not** called until client validation passes

6. **Given** the server returns **400** with validation `error.fields`  
   **When** the response is processed  
   **Then** map `field` keys from `error.fields` onto form state, show the same error summary + inline pattern, and re-enable submit

## Tasks / Subtasks

- [x] **Backend — `POST /api/organisations`** (AC: 3, 6)
  - [x] Register `router.post('/', ...)` in `backend/src/routes/organisations.js` → controller handler
  - [x] In `organisation-controller.js`: parse JSON body; manual validation only (no extra validation library) — [Source: architecture.md validation decision]
  - [x] Accept **camelCase** body keys aligned with public API: e.g. `name`, `country`, `organisationTypeId`, `ticketingProviderId`, `crmPlatformId`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `sourceReference`, `notes`, `capacity` (omit optional keys when empty)
  - [x] Validate `country` against the canonical list — same values as `frontend/src/lib/countries.js`; backend source today is `COUNTRIES` in `backend/src/prisma/seed.js` (exported). If importing `seed.js` for `COUNTRIES` is undesirable (Prisma side effect), extract shared `backend/src/lib/countries.js` and require it from seed + controller — document in `docs/decisions.md` if you extract
  - [x] Validate `organisationTypeId` exists (`findUnique`); optional FKs: if provided, must exist or empty → `null`
  - [x] Validate `membershipCapability`, `donationCapability`, `reservedSeatingCapability` ∈ `YES` | `NO` | `UNKNOWN` (uppercase strings matching Prisma `CapabilityState`)
  - [x] Validate `capacity`: if present, integer in a sensible range (reject non-integers)
  - [x] On success: `organisationService.createOrganisation(...)` with `include` for `organisation_type`, `ticketing_provider`, `crm_platform` (Prisma relation names **snake_case** on models), then map through the **same camelCase DTO shape** as the list endpoint (reuse `toOrganisationListDto` from `organisation-list-dto.js` or rename/generalise to e.g. `toOrganisationDto` — **do not** return raw Prisma rows)
  - [x] `201` + envelope; on validation failure `400` + `{ data: null, error: { message: 'Validation failed', fields: [...] }, meta: null }` with **stable `field` keys** matching the request (camelCase) so the frontend can map them
  - [x] `500` path: log server-side (`console.error`), safe envelope — mirror list controller
  - [x] Jest + supertest tests: happy path 201 + camelCase `data`, missing name/country/type, bad capability, bad country string; mock service **or** follow existing `organisation-controller.test.js` style

- [x] **Backend — service** (AC: 3)
  - [x] `createOrganisation` in `organisation-service.js`: `prisma.organisation.create({ data: { ... }, include: { ... } })` using Prisma field names (`organisation_type_id`, etc.)
  - [x] Do not set `last_updated` manually on create unless needed; rely on schema defaults + middleware for updates

- [x] **Frontend — API clients** (AC: 3, 6)
  - [x] Add `createOrganisation(body)` in `frontend/src/api/organisations.js` — `POST` JSON, parse envelope; on `201` assert `data` object + `error: null` + `meta: null`; on `400` return or throw in a shape the form can read (`fields` array)
  - [x] Add `frontend/src/api/meta.js`: `fetchOrganisationTypes`, `fetchTicketingProviders`, `fetchCrmPlatforms` calling `/api/meta/organisation-types`, `/api/meta/ticketing-providers`, `/api/meta/crm-platforms` — each returns `data` array (meta responses today expose Prisma rows with `id`, `name`, and timestamp fields — **only `id` and `name` are required** for `<select>` options)

- [x] **Frontend — data hooks** (AC: 2, 4)
  - [x] `useMutation` for create (new hook e.g. `useCreateOrganisation.js` or colocate in a small hook file); `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['organisations'] })` — [Source: architecture.md]
  - [x] `useQuery` for each meta list with keys `['meta', 'organisation-types']` etc. (per architecture naming)

- [x] **Frontend — `OrganisationFormPage.jsx`** (AC: 1–2, 5–6)
  - [x] **Create mode** when `useParams()` has **no** `id` (route `/organisations/new`)
  - [x] **Edit mode stub:** route `/organisations/:id/edit` already points here — for **this story**, if `id` is present, render a short message that edit is Story 2.4 (avoid half-implemented PUT)
  - [x] Implement full create form: labels, optional suffix, GOV.UK error summary + focus links (`useRef` or `id` + `focus()`), inline errors, capability inputs as **native `<select>`** or accessible Radix **Select** if already in repo — match existing shadcn manual-copy approach; **do not** run `npx shadcn` CLI
  - [x] Submit: client validation first; then mutation; loading state on button
  - [x] On success: `navigate(\`/organisations/${data.id}\`, { state: { organisationSaved: true } })` (or equivalent clear flag name) for detail page banner

- [x] **Frontend — `OrganisationDetailPage.jsx`** (AC: 4)
  - [x] Minimal change for 2.2: read `useLocation()`; when `state.organisationSaved`, render the success banner with auto-dismiss (e.g. `useEffect` + timeout) and manual dismiss; **clear** state on dismiss or after timeout so refresh does not re-show (use `navigate(..., { replace: true, state: {} })` or similar)
  - [x] Full field layout remains **Story 2.3** — placeholder body is acceptable below the banner

- [x] **Documentation** (if non-obvious)
  - [x] Record DTO reuse / POST body contract in `docs/decisions.md` if not already implied by ADR-009

### Review Findings

- [x] [Review][Patch] **Inline field errors missing (AC5/AC6)** [`frontend/src/pages/OrganisationFormPage.jsx`] — Resolved 2026-04-03: per-field inline messages, `aria-invalid` / `aria-describedby`, summary links call `focus()` + `scrollIntoView`.

- [x] [Review][Patch] **Silent failure on non-400 create errors** [`frontend/src/pages/OrganisationFormPage.jsx` `mutation` `onError`] — Resolved 2026-04-03: `submitError` state + alert banner when mutation fails without `err.fields`.

## Dev Notes

### Epic 2 cross-story context

- **2.1** delivered list API, `toOrganisationListDto`, `CapabilityBadge` (compact), badges, list page patterns.
- **2.3** will add `GET /api/organisations/:id`, labelled `CapabilityBadge`, real detail layout.
- **2.4** will add `PUT` and **pre-filled** `OrganisationFormPage` for `/organisations/:id/edit`.
- **2.5** delete flow.
- After any mutation, always `invalidateQueries({ queryKey: ['organisations'] })` so the list stays fresh.

### Previous story intelligence (2.1)

- **DTO boundary:** Never `res.json(prismaRow)`. Extend the list mapper for single-resource responses.
- **Controller query normalisation:** Reuse `asQueryString` pattern from list handler if you add query-based endpoints later; for POST, watch for **body** shape issues (malformed JSON → Express error handling).
- **Review outcomes from 2.1:** Out-of-range list `page` returns 200 with empty `data` (ADR-010); log unexpected errors server-side; client guards list response shape — apply analogous **defensive parsing** for create response.
- **Files to mirror:** `organisation-controller.js`, `organisation-service.js`, `organisation-list-dto.js`, `organisation-controller.test.js`.

### Schema reference (Prisma)

- Model `Organisation` in `backend/src/prisma/schema.prisma`: required `name`, `country`, `organisation_type_id`; optional `ticketing_provider_id`, `crm_platform_id`; capabilities default `UNKNOWN`; optional `source_reference`, `notes`, `capacity` (`Int?`).
- Relation names on includes: `organisation_type`, `ticketing_provider`, `crm_platform` (see `organisation-list-dto.js`).

### Architecture compliance (must follow)

- Envelope: every response `{ data, error, meta }`; single resource success → `meta: null`.
- Validation errors: `error.fields` is always an array; each item `{ field, message }` with messages suitable for display.
- camelCase JSON in/out for organisation resource; capabilities uppercase enums.
- Routes thin; controllers validate + shape; services own Prisma — [Source: `_bmad-output/planning-artifacts/architecture.md#Structure Patterns`]
- Prisma client only from `backend/src/lib/prisma.js`.

### UX references

- GOV.UK-style error summary + inline errors — [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` form patterns]
- Submit button loading/disabled — architecture process patterns
- Success banner styling and dismiss — epics Story 2.2 AC + architecture success feedback

### File structure (expected touches)

| Path | Action |
|------|--------|
| `backend/src/routes/organisations.js` | Add `POST /` |
| `backend/src/controllers/organisation-controller.js` | Add `createOrganisation` |
| `backend/src/services/organisation-service.js` | Add `createOrganisation` |
| `backend/src/services/organisation-list-dto.js` | Generalise or reuse for single row |
| `backend/src/__tests__/organisation-controller.test.js` | Extend |
| `frontend/src/api/organisations.js` | Add `createOrganisation` |
| `frontend/src/api/meta.js` | **New** |
| `frontend/src/hooks/useCreateOrganisation.js` (or similar) | **New** |
| `frontend/src/hooks/useMetaOrganisationTypes.js` (or one `useMetaReferenceData`) | **New** as needed |
| `frontend/src/pages/OrganisationFormPage.jsx` | Replace placeholder (create path) |
| `frontend/src/pages/OrganisationDetailPage.jsx` | Success banner handling |
| `docs/decisions.md` | Optional ADR for POST body / shared DTO |

### Testing requirements

- **Backend:** `cd backend && npm test` — new tests for POST validation and success shape (camelCase keys on `data`).
- **Frontend:** Manual browser verification against Docker stack; no mandated unit tests for MVP.

### Git intelligence

- Repository history may be shallow in some environments; follow existing file layout and patterns from Story 2.1.

### Latest technical notes

- **Express 5**, **Prisma 6.19.x**, **TanStack Query 5**, **React 19**, **react-router-dom 6** — keep APIs consistent with locked versions in `package.json` files.
- Meta endpoints currently return Prisma-shaped rows; form only needs stable `id` + `name` for options.

## Project context reference

See `_bmad-output/project-context.md` for stack, British spelling (`organisation`), and "no auth / no external APIs" constraints.

## Story completion status

**done** — Code review patch findings addressed; frontend build passes.

---

## Change Log

- 2026-04-03: Story 2.2 — `POST /api/organisations`, shared `backend/src/lib/countries.js`, `toOrganisationDto` (+ `updatedAt`), create form at `/organisations/new`, success banner on detail, ADR-008/009 updates.
- 2026-04-03: Code review follow-up — inline validation messages + accessible focus from error summary; generic submit failure banner on `OrganisationFormPage`.

---

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

_(none)_

### Completion Notes List

- Implemented `createOrganisation` controller validation (manual), Prisma FK checks, capability and capacity rules, stripped client id/timestamps; service `createOrganisation` with shared include + DTO mapping.
- Extracted `COUNTRIES` to `backend/src/lib/countries.js`; seed re-exports for compatibility.
- Frontend: `createOrganisation` API + `meta.js`, TanStack Query hooks, GOV.UK-style error summary with anchor links, edit-route stub via `useMatch`, detail success banner with 5s auto-dismiss and × dismiss + `replace` state clear.
- `cd backend && npm test` — 39 passed. `npm run build` in frontend — success. Full-repo ESLint still reports two pre-existing errors in `button.jsx` and `SelectionContext.jsx` (react-refresh rule).
- Code review (2026-04-03): added per-field inline errors, `aria-*` wiring, `focusFormControl` for summary links, `submitError` banner for non-validation failures.

### File List

- `backend/src/lib/countries.js`
- `backend/src/prisma/seed.js`
- `backend/src/routes/organisations.js`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/services/organisation-list-dto.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `frontend/src/api/organisations.js`
- `frontend/src/api/meta.js`
- `frontend/src/hooks/useCreateOrganisation.js`
- `frontend/src/hooks/useMetaReferenceData.js`
- `frontend/src/pages/OrganisationFormPage.jsx`
- `frontend/src/pages/OrganisationDetailPage.jsx`
- `docs/decisions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
