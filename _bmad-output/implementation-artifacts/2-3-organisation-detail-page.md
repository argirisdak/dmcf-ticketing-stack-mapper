# Story 2.3: Organisation Detail Page

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming, API envelope, British English, anti-patterns
- `_bmad-output/planning-artifacts/architecture.md` — `{ data, error, meta }`, camelCase JSON, TanStack Query keys, error handling
- `_bmad-output/implementation-artifacts/2-2-create-organisation.md` — DTO shape, success banner on detail, review outcomes, `toOrganisationDto` usage

## Story

As a staff member,
I want to view the full details of a single organisation including its source reference and last updated date,
so that I can read the record and assess its provenance before acting on it.

## Acceptance Criteria

1. **Given** a staff member navigates to `/organisations/:id`  
   **When** the detail page loads  
   **Then** all organisation fields are displayed: Name, Country, Type (name from nested `organisationType`), Ticketing Provider (`ticketingProvider`), CRM Platform (`crmPlatform`), Membership / Donation / Reserved Seating Capability, Source Reference, Notes (if present), Capacity (if present), Last Updated (`lastUpdated`), Created At (`createdAt`)  
   **And** each capability is rendered using the `CapabilityBadge` component in its **labelled** variant (icon + visible text, e.g. "Yes" / "No" / "Not recorded") — **this variant is introduced in this story**; the existing compact icon-only behaviour remains the default for the list page  
   **And** Source Reference and Last Updated are **prominent** (e.g. dedicated summary strip or card near the top, not only at the bottom of a long page)  
   **And** a `← Back to organisations` link (`text-sm text-blue-600`) appears at the top — use `Link` to `/organisations`  
   **And** an **Edit** control in the page header navigates to `/organisations/:id/edit` (Story 2.4 will implement the form; the route and button must work)

2. **Given** the detail page is loading  
   **When** data has not yet returned from `GET /api/organisations/:id`  
   **Then** a **skeleton** that mirrors the final layout (sections / rows, not a single block) renders — **no** full-page spinner

3. **Given** `GET /api/organisations/:id` is called  
   **When** the organisation exists  
   **Then** the API returns `{ data: { ...organisation }, error: null, meta: null }` with **camelCase** field names and **ISO 8601** strings for `lastUpdated` and `createdAt` (same DTO as list/create via `toOrganisationDto`)

4. **Given** a staff member opens `/organisations/:id` for a missing or unknown id  
   **When** the API returns **404**  
   **Then** the page shows a clear **"Organisation not found"** message and a link back to `/organisations` — not a blank page or an unhandled error boundary

5. **Given** the success path after create (Story 2.2)  
   **When** the user lands with `location.state.organisationSaved`  
   **Then** existing behaviour is preserved: green **"Organisation saved."** banner with auto-dismiss (5s), manual **×** dismiss, and `replace` navigation to clear state — do not regress this when adding the real detail layout

## Tasks / Subtasks

- [x] **Backend — `GET /api/organisations/:id`** (AC: 3, 4)
  - [x] In `backend/src/routes/organisations.js`, add `router.get('/:id', ...)` **after** `router.get('/', ...)` so the list route is not shadowed
  - [x] In `organisation-controller.js`, add `getOrganisationById`: parse `req.params.id`; optionally validate UUID format — if invalid, respond **404** with envelope (avoid Prisma throwing on malformed UUID) or follow the same pattern you use for “not found”
  - [x] Call new `organisationService.getOrganisationById(id)`; if no row, **404** + `{ data: null, error: { message: 'Organisation not found', fields: [] }, meta: null }` (align with Story 2.5 delete-404 wording in epics)
  - [x] On success: **200** + `{ data: <dto>, error: null, meta: null }` using existing `toOrganisationDto` and the same `include` as `listOrganisations` / `createOrganisation` (`organisationInclude` in `organisation-service.js`)
  - [x] Unexpected errors: `console.error`, **500** + safe envelope — mirror list/create handlers
  - [x] Tests in `organisation-controller.test.js` (and service tests if you mock at service layer): 200 shape, 404 for missing id, invalid id behaviour as chosen

- [x] **Backend — service** (AC: 3)
  - [x] `getOrganisationById` in `organisation-service.js`: `findUnique({ where: { id }, include: organisationInclude })`, return `toOrganisationDto(row)` or `null`

- [x] **Frontend — API** (AC: 3, 4)
  - [x] Add `fetchOrganisation(id)` in `frontend/src/api/organisations.js`: `GET` with envelope parsing; **200** requires `data` object, `error: null`, `meta: null`; **404** should surface a distinguishable error (e.g. `err.statusCode = 404` or custom subclass) so the page can render the not-found UI without treating it as a generic crash

- [x] **Frontend — data hook** (AC: 2)
  - [x] `useQuery` with `queryKey: ['organisations', id]` (and `enabled: Boolean(id)`) per architecture; handle `isLoading` / `isError` / `isSuccess`

- [x] **Frontend — `CapabilityBadge`** (AC: 1)
  - [x] Extend `frontend/src/components/CapabilityBadge.jsx` with a prop such as `variant="compact" | "labelled"` (default **`compact`** so `OrganisationListPage` needs no changes)
  - [x] Labelled variant: same icons as today plus adjacent text for screen readers and sighted users; keep `aria-label` sensible for both variants

- [x] **Frontend — `OrganisationDetailPage.jsx`** (AC: 1, 2, 4, 5)
  - [x] `useParams()` for `id`; wire `fetchOrganisation` via hook
  - [x] Loading: layout skeleton (slate shimmer blocks)
  - [x] Success: structured read-only layout; reference lookups show **name** (`organisationType.name`, etc.); handle null optional relations with an em dash or "—" / "Not set" consistently
  - [x] 404: dedicated message + `Link` to `/organisations`
  - [x] Other errors: user-visible failure message (not silent) + link back — avoid raw stack traces
  - [x] Preserve success banner block from Story 2.2 at top of page flow
  - [x] Header row: title (organisation **name** as `h1`), **Edit** button linking to `/organisations/${id}/edit` (use `Button` / styling consistent with list page primary actions)

- [x] **Documentation** (only if behaviour is non-obvious)
  - [x] Short note in `docs/decisions.md` if you introduce a new 404 envelope convention or UUID validation rule

## Dev Notes

### Epic 2 cross-story context

- **2.1** — List, compact `CapabilityBadge`, `GET /api/organisations` paginated.
- **2.2** — `POST /api/organisations`, `toOrganisationDto`, detail page **placeholder** + success banner, `createOrganisation` client, meta hooks.
- **2.4** — Edit form at `/organisations/:id/edit` (pre-fill, `PUT`); back link from form goes to **detail**, not list.
- **2.5** — Delete dialog on **detail** page only.

### Previous story intelligence (2.2)

- **Single-resource responses** must use the same DTO as list/create — **never** `res.json(prismaRow)`.
- **Review outcomes:** defensive client handling for API failures; accessible controls; clear error messaging when mutations fail — apply the same discipline for **detail fetch** failures.
- **Files already in play:** `organisation-list-dto.js` (`toOrganisationDto`), `organisation-service.js` (`organisationInclude`), `organisation-controller.js`, `OrganisationDetailPage.jsx`, `frontend/src/api/organisations.js`.

### Schema reference (Prisma)

- `Organisation` in `backend/src/prisma/schema.prisma`: nested relations `organisation_type`, `ticketing_provider`, `crm_platform`; capabilities `YES` | `NO` | `UNKNOWN`; `source_reference`, `notes`, `capacity` optional; `last_updated` maintained by middleware on update.

### Architecture compliance (must follow)

- Envelope: `{ data, error, meta }`; single-resource success → **`meta: null`**.
- camelCase JSON for organisation resource in API responses consumed by the SPA.
- Routes thin; controllers validate/coerce ids and shape responses; services own Prisma — [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Prisma client only from `backend/src/lib/prisma.js`.
- After future mutations (2.4/2.5), invalidate `['organisations']` and `['organisations', id]` as appropriate — detail should refetch when returning from edit.

### UX references

- Skeleton loading for tables/detail — [Source: epics Story 2.1 / 2.3]
- Prominent provenance fields (source reference, last updated) — [Source: `_bmad-output/planning-artifacts/epics.md` Story 2.3]

### File structure (expected touches)

| Path | Action |
|------|--------|
| `backend/src/routes/organisations.js` | Add `GET /:id` after `GET /` |
| `backend/src/controllers/organisation-controller.js` | Add `getOrganisationById` |
| `backend/src/services/organisation-service.js` | Add `getOrganisationById` |
| `backend/src/__tests__/organisation-controller.test.js` | Extend |
| `backend/src/__tests__/organisation-service.test.js` | Extend if applicable |
| `frontend/src/api/organisations.js` | Add `fetchOrganisation` |
| `frontend/src/hooks/useOrganisation.js` (or colocate) | **New** — `useQuery` wrapper |
| `frontend/src/components/CapabilityBadge.jsx` | Add `labelled` variant |
| `frontend/src/pages/OrganisationDetailPage.jsx` | Full layout + loading/error/not-found |

### Testing requirements

- **Backend:** `cd backend && npm test` — cover happy path DTO shape, 404, and routing/controller behaviour for `GET /api/organisations/:id`.
- **Frontend:** Manual verification in Docker: load detail from list row, direct URL, 404 uuid, success banner after create.

### Git intelligence

- Repository may have minimal commit history locally; follow patterns from Stories 2.1–2.2 files above.

### Latest technical notes

- Stack locked in repo: **Express 5**, **Prisma 6**, **TanStack Query 5**, **React 19**, **react-router-dom 6** — keep APIs aligned with `package.json`.
- Do **not** run `npx shadcn` CLI; copy-paste primitives only per project context.

## Project context reference

See `_bmad-output/project-context.md` for British spelling (`organisation`), envelope-only API, no auth, Tailwind-only styling, and shadcn copy-paste rule.

## Story completion status

**done** — Code review complete; patch findings addressed.

### Review Findings

- [x] [Review][Patch] Success banner navigation clears all `location.state` — `clearBannerState` uses `navigate(..., { state: {} })`, which drops any future keys stored alongside `organisationSaved`. Prefer omitting only `organisationSaved` and spreading the rest of `location.state`. [`frontend/src/pages/OrganisationDetailPage.jsx`](frontend/src/pages/OrganisationDetailPage.jsx) — fixed 2026-04-04

- [x] [Review][Patch] `toOrganisationDto` date fallbacks — if `last_updated` or `created_at` were ever null/non-Date, `String(row.last_updated)` yields `"null"`/`"undefined"` strings in JSON instead of ISO 8601. Guard with explicit null checks or ISO formatting. [`backend/src/services/organisation-list-dto.js`](backend/src/services/organisation-list-dto.js) — fixed 2026-04-04

- [x] [Review][Defer] No automated frontend tests for detail loading / 404 / banner — story calls for manual verification in Docker; acceptable for now. [n/a]

---

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Implemented `GET /api/organisations/:id` with UUID pre-validation (malformed id → same 404 envelope as missing row), `getOrganisationById` service + `toOrganisationDto`, controller tests and service tests with Prisma mocked.
- Frontend: `fetchOrganisation`, `OrganisationNotFoundError` (404), `useOrganisation` hook, `CapabilityBadge` `labelled` variant (default `compact`), full detail layout with provenance strip, skeleton, generic error UI, preserved create success banner.
- Recorded **ADR-012** in `docs/decisions.md` for 404 semantics.

### File List

- `backend/src/routes/organisations.js`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `backend/src/__tests__/organisation-service.test.js`
- `frontend/src/api/organisations.js`
- `frontend/src/hooks/useOrganisation.js`
- `frontend/src/components/CapabilityBadge.jsx`
- `frontend/src/pages/OrganisationDetailPage.jsx`
- `docs/decisions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-3-organisation-detail-page.md`

### Change Log

- 2026-04-04: Story 2.3 — organisation detail API, detail page UI, labelled capability badges, ADR-012; sprint status → review.
- 2026-04-04: Code review — banner `location.state` preservation, `dateTimeToIso` in `toOrganisationDto`; sprint status → done.
