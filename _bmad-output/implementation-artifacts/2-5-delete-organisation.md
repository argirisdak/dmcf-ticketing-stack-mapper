# Story 2.5: Delete Organisation

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming, API envelope, British English, shadcn copy-paste (no CLI)
- `_bmad-output/planning-artifacts/architecture.md` — `{ data, error, meta }`, DELETE body shape, TanStack invalidation, success banners
- `_bmad-output/implementation-artifacts/2-3-organisation-detail-page.md` — detail layout, success banner + `location.state` preservation pattern
- `_bmad-output/implementation-artifacts/2-4-edit-organisation.md` — `isUuidParam` / 404 parity with `GET`, `OrganisationNotFoundError`, header actions next to Edit

## Story

As a staff member,
I want to delete an organisation record after explicitly confirming the action,
so that accidental deletions cannot happen and the catalogue remains trustworthy.

## Acceptance Criteria

1. **Given** a staff member is on the detail page at `/organisations/:id`  
   **When** they click the **"Delete organisation"** control (ghost / outline destructive styling — not the solid blue primary)  
   **Then** a confirmation **`Dialog`** (shadcn/ui pattern, Radix under the hood) opens showing the **organisation `name` in bold** and the exact warning text **"This cannot be undone."**  
   **And** the dialog contains a red primary destructive confirm button labelled **"Delete organisation"** with classes including `bg-red-600` (and appropriate hover), and a **"Cancel"** secondary button  
   **And** delete is offered **from the detail page only** — no delete action in the list table [Source: `_bmad-output/planning-artifacts/epics.md` Story 2.5; UX-DR6 in same file]

2. **Given** the confirmation dialog is open  
   **When** the staff member clicks **"Cancel"**, presses **Escape**, or clicks the **overlay**  
   **Then** the dialog closes with **no** API call and **no** navigation  
   **And** focus returns to the trigger control (Radix `Dialog` default behaviour — verify in manual test)

3. **Given** a staff member confirms deletion by clicking **"Delete organisation"** in the dialog  
   **When** `DELETE /api/organisations/:id` completes successfully  
   **Then** the server responds **HTTP 200** with  
   `{ data: { id: "<uuid>" }, error: null, meta: null }` — **`id` is the deleted row’s id** (camelCase in JSON) [Source: `_bmad-output/planning-artifacts/architecture.md` § Gap Analysis item 4]  
   **And** the client navigates to **`/organisations`** with router state e.g. `{ organisationDeleted: true }`  
   **And** an inline success banner **"Organisation deleted."** appears at the **top** of the list page with the same visual pattern as other success banners: `bg-emerald-50 border border-emerald-200 text-emerald-800`, `role="status"`, **auto-dismiss after 5 seconds**, **manual × dismiss** — mirror the detail page **"Organisation saved."** implementation [Stories 2.2–2.4; epics Story 2.5 note on banner dismiss across 2.2, 2.4, 2.5]

4. **Given** `DELETE /api/organisations/:id` is called  
   **When** the id is **not a valid UUID** (same rules as `GET` / `PUT`)  
   **Then** respond **404** with `{ data: null, error: { message: 'Organisation not found', fields: [] }, meta: null }` — reuse `isUuidParam` + `notFoundEnvelope` pattern from [`backend/src/controllers/organisation-controller.js`]

5. **Given** `DELETE /api/organisations/:id` with a **valid UUID** that does **not** exist (or race-deleted)  
   **When** the API processes the request  
   **Then** respond **404** with the same `notFoundEnvelope` as above

6. **Given** the confirm button is clicked  
   **When** the delete request is in flight  
   **Then** both dialog actions prevent double submit: **disable** confirm (and optionally Cancel) and show loading on confirm — same discipline as Save on edit/create [architecture Process Patterns]

## Tasks / Subtasks

- [x] **UI primitive — `Dialog`** (AC: 1–2)
  - [x] There is **no** `dialog.jsx` under `frontend/src/components/ui/` yet — **copy** the shadcn Dialog implementation from [ui.shadcn.com](https://ui.shadcn.com) into `frontend/src/components/ui/dialog.jsx`, matching the project’s **JS + Tailwind** setup and existing `button.jsx` patterns — **do not** run `npx shadcn` CLI [Source: `_bmad-output/project-context.md`; `architecture.md` shadcn note]
  - [x] Install any **missing** peer deps only if the copied component requires them (project already has `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)

- [x] **Backend — `DELETE /api/organisations/:id`** (AC: 3–5)
  - [x] Add `router.delete('/:id', organisationController.deleteOrganisation)` in `backend/src/routes/organisations.js` (keep route order consistent with existing `/:id` handlers)
  - [x] Implement `deleteOrganisation` in `organisation-controller.js`:
    - [x] Parse `req.params.id`; if `!isUuidParam(id)` → **404** + `notFoundEnvelope`
    - [x] Call `organisationService.deleteOrganisation(id)`; if service reports missing (`null` / `P2025` handling) → **404**
    - [x] Success → **200** + `{ data: { id }, error: null, meta: null }` where `id` is the string UUID that was deleted
    - [x] Unexpected errors → **500** envelope consistent with other controller actions
  - [x] Implement `deleteOrganisation(id)` in `organisation-service.js` using `prisma.organisation.delete({ where: { id } })`; map Prisma `P2025` to “not found” for the controller (same approach as `updateOrganisation` when row missing)
  - [x] Tests: `organisation-controller.test.js` (and/or service tests): **200** shape `{ data: { id } }`, **404** unknown id, **404** malformed id

- [x] **Frontend — API** (AC: 3–5)
  - [x] Add `deleteOrganisation(id)` in `frontend/src/api/organisations.js`: `DELETE`, parse envelope; **200** requires `data` object with string `id`, `error: null`, `meta: null`; **404** → throw `OrganisationNotFoundError` (reuse `GET`/`PUT` pattern)

- [x] **Frontend — mutation hook** (AC: 3, 6)
  - [x] Add `useDeleteOrganisation.js` (or equivalent) with `useMutation` + `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['organisations'] })` and `invalidateQueries({ queryKey: ['organisations', id] })` per [Source: `architecture.md` TanStack Query invalidation]

- [x] **Frontend — `OrganisationDetailPage.jsx`** (AC: 1–2, 6)
  - [x] In the header beside **Edit**, add **Delete organisation** trigger — preserve responsive layout (`flex`, wrapping); do **not** regress the Edit button behaviour from Story 2.4
  - [x] Wire `Dialog` with controlled `open` state; body copy: bold `{data.name}`, line **"This cannot be undone."**; **Cancel** closes; confirm calls mutation
  - [x] On mutation **success**: `navigate('/organisations', { state: { organisationDeleted: true } })` (adjust key name only if you align list page to the same string)
  - [x] On mutation **error**: show a concise inline error in the dialog or on the page — do not leave the user with a silent failure; avoid raw `console.error` in committed code

- [x] **Frontend — `OrganisationListPage.jsx`** (AC: 3)
  - [x] Read `location.state?.organisationDeleted` (or chosen key); show **"Organisation deleted."** banner matching detail’s saved banner UX
  - [x] Clear router state with **`replace: true`** and preserve other `location.state` keys the same way `OrganisationDetailPage` clears only `organisationSaved` [see `2-4-edit-organisation.md` review note]

## Dev Notes

### Epic 2 cross-story context

- **2.1** — List route `/organisations`, query key `['organisations']`.
- **2.2–2.4** — Create / detail / edit; reuse envelope and error types.
- After this story, Epic 2 CRUD is complete; Epic 3 builds on the list page.

### Previous story intelligence (2.4)

- **404** semantics and malformed UUID handling are **already** centralised — DELETE must **not** introduce different status codes for the same cases as GET.
- **Banner state:** always merge/preserve unrelated `location.state` keys when clearing transient flags.
- **DTO:** delete success returns **only** `{ id }` in `data`, not a full organisation — do not expect `toOrganisationDto` on DELETE success.

### Architecture compliance (must follow)

- Envelope: `{ data, error, meta }`; single-resource success → **`meta: null`**.
- Routes thin; controllers validate id + shape responses; services own Prisma — [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Prisma client only from `backend/src/lib/prisma.js`.
- **Current codebase:** `last_updated` uses Prisma `@updatedAt` — architecture text referencing `$use` middleware is **stale**; follow `schema.prisma` and `prisma.js` as implemented.

### Schema / delete behaviour

- `Organisation` only references lookup tables; there are **no** child tables pointing at `organisation.id`, so a plain `delete` on the row should not hit FK violations in the current schema [Source: `backend/src/prisma/schema.prisma`].

### File structure (expected touches)

| Path | Action |
|------|--------|
| `frontend/src/components/ui/dialog.jsx` | **New** (shadcn copy) |
| `backend/src/routes/organisations.js` | `DELETE /:id` |
| `backend/src/controllers/organisation-controller.js` | `deleteOrganisation`, export |
| `backend/src/services/organisation-service.js` | `deleteOrganisation` |
| `backend/src/__tests__/organisation-controller.test.js` | DELETE cases |
| `frontend/src/api/organisations.js` | `deleteOrganisation` |
| `frontend/src/hooks/useDeleteOrganisation.js` | **New** |
| `frontend/src/pages/OrganisationDetailPage.jsx` | Delete trigger + dialog + mutation |
| `frontend/src/pages/OrganisationListPage.jsx` | Deleted success banner |

### Testing requirements

- **Backend:** `cd backend && npm test` — DELETE happy path, 404 missing, 404 bad UUID.
- **Frontend:** `npm run build` / lint as usual; **manual:** open detail → delete → list shows banner → banner times out and × works; cancel/escape/overlay closes dialog without delete; double-submit prevented while pending.

### Git intelligence

- Repository history may be minimal locally; rely on story files and code references above.

### Latest technical notes

- Stack: Express 5, Prisma 6, TanStack Query 5, React 19, `react-router-dom` 6 — confirm versions in `package.json` if upgrading.
- **shadcn:** copy-paste components only; align Dialog imports with the project’s `radix-ui` / `@radix-ui/*` setup as required by the official snippet for a JS Vite project.

## Project context reference

See `_bmad-output/project-context.md` for British spelling (`organisation`), envelope-only API, no auth, Tailwind-only styling, and shadcn copy-paste rule.

## Story completion status

**done** — Code review complete; patch applied.

## Dev Agent Record

### Implementation Plan

- Backend: `DELETE /:id` with `isUuidParam` + `notFoundEnvelope` parity with GET/PUT; service `delete` + P2025 → null; controller tests with mocked service.
- Frontend: Radix Dialog (shadcn-style `dialog.jsx`), destructive outline trigger + red confirm button, `useDeleteOrganisation` mutation with query invalidation, list-page banner mirroring detail saved banner (5s + dismiss + `replace` state merge).

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Added `DELETE /api/organisations/:id` returning `{ data: { id }, error: null, meta: null }` on success; 404 for bad UUID and missing row.
- Detail page delete confirmation dialog with loading/disabled actions while pending; success navigates to list with `organisationDeleted` state.
- List page shows “Organisation deleted.” emerald banner with auto-dismiss and manual dismiss; clears only `organisationDeleted` from `location.state` via `replace: true`.
- Direct dependency `@radix-ui/react-dialog` for the Dialog primitive.

### File List

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/components/ui/dialog.jsx`
- `frontend/src/api/organisations.js`
- `frontend/src/hooks/useDeleteOrganisation.js`
- `frontend/src/pages/OrganisationDetailPage.jsx`
- `frontend/src/pages/OrganisationListPage.jsx`
- `backend/src/routes/organisations.js`
- `backend/src/controllers/organisation-controller.js`
- `backend/src/services/organisation-service.js`
- `backend/src/__tests__/organisation-controller.test.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-5-delete-organisation.md`

### Change Log

- 2026-04-04: Story 2.5 — delete organisation (API, UI confirmation dialog, list success banner, tests).

### Review Findings

- [x] [Review][Patch] DELETE 500 test should assert `console.error` was called (parity with other organisation controller 500 tests) [`backend/src/__tests__/organisation-controller.test.js:487`] — fixed

- [x] [Review][Defer] No `organisation-service` unit tests for `deleteOrganisation` [`backend/src/services/organisation-service.js`] — deferred, optional coverage per story (controller tests present)
