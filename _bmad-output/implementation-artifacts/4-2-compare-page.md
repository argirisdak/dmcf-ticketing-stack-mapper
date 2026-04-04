# Story 4.2: Compare page

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required reading (read before implementation)

- `_bmad-output/project-context.md` — British English (`organisation`), Tailwind-only styling, data in hooks/API modules, functional components
- `_bmad-output/planning-artifacts/architecture.md` — compare URL `/compare?ids=...`, parallel `GET /api/organisations/:id`, `OrganisationCard`, TanStack Query patterns, selection vs URL (compare view is URL-derived)
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `OrganisationCard` anatomy, empty compare state copy, `CapabilityBadge` variants, button hierarchy
- `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2 acceptance criteria (~lines 627–686)
- `_bmad-output/implementation-artifacts/4-1-compare-selection-bar.md` — selection bar, no `clearSelection` on compare nav, list checkbox patterns

## Story

As a staff member,  
I want to view selected organisations side by side with their attributes aligned in labelled rows,  
so that I can compare their ticketing stacks, capabilities, and provenance at a glance.

## Acceptance criteria

1. **URL + fetching**  
   **Given** a staff member navigates to `/compare?ids=<id1>,<id2>,...`  
   **When** the compare page loads  
   **Then** IDs are parsed from `useSearchParams` (comma-separated; trim empty segments; dedupe if needed for stable rendering)  
   **And** parallel requests run: one `GET /api/organisations/:id` per ID — **no** new batch endpoint; reuse `fetchOrganisation` from `frontend/src/api/organisations.js`  
   **And** each result is cached under TanStack Query key **`['organisations', id]`** (same as `useOrganisation`)  
   [Source: epics Story 4.2; `frontend/src/hooks/useOrganisation.js`]

2. **Loading UI**  
   **Given** parallel fetches are in progress  
   **When** data has not yet returned for one or more organisations  
   **Then** **per-column** skeleton placeholders match the compare card layout — **no** full-page spinner  
   **And** the **fixed attribute label column** on the left renders immediately with static labels (no fetch)  
   [Source: epics Story 4.2]

3. **Success layout**  
   **Given** fetches complete successfully  
   **When** the compare page renders  
   **Then** a **fixed** label column lists attribute names; one **`OrganisationCard`** value column per organisation to the right  
   **And** each card has a **sticky** header: organisation **name**, **type** badge, **country**  
   **And** attribute rows in this **exact order**: Country, Type, Ticketing Provider, CRM Platform, Membership Capability, Donation Capability, Reserved Seating Capability, Source Reference, Last Updated  
   **And** capability rows use `<CapabilityBadge variant="labelled" value={...} />`  
   [Source: epics Story 4.2; UX spec — `OrganisationCard`; `CapabilityBadge.jsx`]

4. **Never blank cells**  
   **Given** any attribute cell  
   **When** the card renders  
   **Then** no cell is empty: capabilities use `CapabilityBadge` (unknown → minus icon, slate styling, `aria-label="Not recorded"`)  
   **And** absent optional **text** fields show the string **`Not recorded`** (epic wording — not an em dash) for compare  
   [Source: epics Story 4.2; UX “Never blank”]

5. **Partial 404**  
   **Given** one parallel fetch returns **404** (`OrganisationNotFoundError` from API)  
   **When** the page renders  
   **Then** valid organisation columns render normally  
   **And** the failed slot shows **"This organisation could not be found"** (not a full-page error); user can continue with remaining columns  
   **And** avoid pointless retries on 404 (e.g. `retry` callback that returns `false` when `error instanceof OrganisationNotFoundError`)  
   [Source: epics Story 4.2; `OrganisationNotFoundError` in `organisations.js`]

6. **Responsive + sticky headers**  
   **Given** a viewport narrower than **1280px**  
   **When** the page renders  
   **Then** organisation columns sit in a wrapper with **`overflow-x-auto`** so columns scroll horizontally  
   **And** card headers stay **sticky** on **vertical** scroll (do not scroll off-screen) — align with UX “sticky card headers”  
   [Source: epics Story 4.2]

7. **Edit**  
   **Given** the compare page  
   **When** staff click **Edit** on a card  
   **Then** navigate to `/organisations/:id/edit` for that organisation  
   [Source: epics Story 4.2]

8. **Remove from comparison**  
   **Given** the compare page  
   **When** staff click **Remove** on a card  
   **Then** that ID is removed from the `ids` query param via **`setSearchParams`**; remaining IDs stay comma-separated; layout reflows  
   [Source: epics Story 4.2]

9. **Shareable URL**  
   **Given** a stable URL `/compare?ids=abc,def`  
   **When** opened in a new tab/session  
   **Then** the same organisations render — view is **fully derived from URL** (no reliance on selection context for the column set)  
   [Source: epics Story 4.2; architecture]

10. **Empty compare**  
    **Given** no `ids` param or `ids` is empty after parsing  
    **When** the page renders  
    **Then** message: **"Select organisations from the list to compare them here."** with a **"Go to organisations"** link to `/organisations`  
    [Source: epics Story 4.2; UX empty states table]

11. **Back navigation regression guard**  
    **Given** browser **Back** from compare to `/organisations`  
    **When** the list loads  
    **Then** URL filter state is unchanged (Epic 3 behaviour) — do not break list URL sync  
    [Source: epics Story 4.2]

## Tasks / subtasks

- [x] **Parse `ids` from URL** (AC: 1, 9, 10)  
  - [x] `useSearchParams`; split on `,`; trim segments; drop empty strings; optional dedupe for stable column order  
  - [x] Empty → empty state (AC 10)

- [x] **Parallel queries + cache keys** (AC: 1, 5)  
  - [x] Use **`useQueries`** from `@tanstack/react-query` (dynamic ID count — do **not** call `useOrganisation` in a loop; rules-of-hooks)  
  - [x] Each query: `queryKey: ['organisations', id]`, `queryFn: () => fetchOrganisation(id)`, `enabled: Boolean(id)`  
  - [x] 404 handling + retry policy per AC 5

- [x] **`OrganisationCard` component** (AC: 3, 4, 6, 7, 8)  
  - [x] New file `frontend/src/components/OrganisationCard.jsx` — props: organisation DTO **or** loading / error slot props  
  - [x] Sticky header: name (`text-lg font-semibold` per UX), `<Badge tone="type">` for type name if present else “Not recorded”, country row  
  - [x] Rows match AC3 order; map from DTO: `country`, `organisationType?.name`, `ticketingProvider?.name`, `crmPlatform?.name`, three capabilities, `sourceReference`, `lastUpdated` (format consistently — reuse `formatDateTime` pattern from `OrganisationDetailPage.jsx` or shared helper)  
  - [x] Footer: provenance (source + last updated) per UX anatomy if not redundant with rows — **minimum**: source + last updated visible (epic lists both as rows; footer optional if rows satisfy “visible”)  
  - [x] Actions: **Edit** (secondary/outline button per UX), **Remove** (ghost) — Remove calls parent callback to update URL only  
  - [x] Reuse `Badge` from `frontend/src/components/ui/badge.jsx` for type (and provider/CRM in row cells if you use badges for colour coding like the list table)

- [x] **`ComparePage` implementation** (AC: 2–11)  
  - [x] Replace placeholder in `frontend/src/pages/ComparePage.jsx`  
  - [x] Grid: left column `sticky left-0 z-10 bg-slate-50` (or white) for labels; right side flex/grid of cards  
  - [x] Loading: skeleton cards **per ID column**  
  - [x] `<1280px`: `overflow-x-auto` on card row wrapper  
  - [x] Wire `setSearchParams` for Remove  
  - [x] Optional: `← Back to organisations` link consistent with other sub-pages (`OrganisationDetailPage` pattern)

- [x] **Optional hook extraction** (AC: 1)  
  - [x] e.g. `useCompareOrganisations(ids)` wrapping `useQueries` — keeps `ComparePage` thin (recommended if page grows past ~100 lines)

- [x] **QA** (AC: 1–11)  
  - [x] Manual: 2–4 valid IDs; one bad UUID in the middle; all invalid; empty `ids`; remove column; edit navigation; narrow viewport horizontal scroll; refresh tab with same URL  
  - [x] `cd frontend && npm run build` (and `npm run lint` if configured)

### Review Findings

- [x] [Review][Patch] Success path returns null for non-object data — column can disappear (violates AC4 “never blank”) [OrganisationCard.jsx:170-172] — fixed: coerce invalid success payload to `{}` for rendering
- [x] [Review][Patch] Compare button uses `aria-disabled` when over limit but stays a focusable button — prefer native `disabled` (or equivalent) when `tooMany` [CompareSelectionBar.jsx] — fixed: `disabled={tooMany}` + default variant

## Dev notes

### Current implementation snapshot (extend, do not replace)

| Area | Today |
|------|--------|
| Compare route | `ComparePage.jsx` is a **placeholder** — replace with full layout |
| Single-org fetch | `fetchOrganisation` + `OrganisationNotFoundError` in `api/organisations.js` |
| Query hook | `useOrganisation` uses `queryKey: ['organisations', id]` — **must match** compare queries |
| Capabilities | `CapabilityBadge` supports `variant="labelled"` |
| List badges | `Badge` with `tone="type" \| "ticketing" \| "crm"` in `OrganisationListPage.jsx` — reuse for compare row cells where applicable |
| Selection | `CompareSelectionBar` navigates with `ids=`; **compare columns** follow **URL**, not `selectedIds`, so shared links work |

### Reinvention prevention

- Do **not** add a batch compare API for this story  
- Do **not** duplicate fetch logic — import `fetchOrganisation`  
- Do **not** introduce a second global selection store — URL drives compare set  
- Reuse `Button` variants from `frontend/src/components/ui/button.jsx` for Edit / Remove

### Architecture compliance

- REST `GET /api/organisations/:id` only; response envelope `{ data, error, meta }` handled inside `fetchOrganisation`  
- British copy throughout  
- Compare data flow: [Source: `architecture.md` — Data flow primary path] URL `ids` → parallel fetches → cards

### File structure (expected touches)

| Path | Action |
|------|--------|
| `frontend/src/components/OrganisationCard.jsx` | **Create** |
| `frontend/src/pages/ComparePage.jsx` | **Replace** placeholder with full implementation |
| `frontend/src/hooks/useCompareOrganisations.js` | **Optional create** — `useQueries` wrapper |

No backend changes unless you discover a DTO gap (none expected — list and detail share DTO shape via `toOrganisationDto`).

### Testing requirements

- No new backend tests required for this story  
- Frontend: `npm run build`; manual scenarios in AC list  
- If adding a hook with logic, consider a small unit test only if the project already tests hooks (optional; not required by epics)

### Previous story intelligence (4.1)

- Selection is **preserved** when opening compare — list checkboxes still reflect context when user returns  
- Do **not** call `clearSelection()` when loading compare  
- List/table work was sensitive to `colSpan` and skeleton columns — this story does not change the list table

### Git intelligence

- Repository may show shallow history; rely on file references above.

### Latest technical notes

- **TanStack Query v5** (`@tanstack/react-query@^5.96`): use **`useQueries`** for a variable-length ID list; identical `queryKey` to `useOrganisation` for deduped cache when user visited detail first  
- **React Router v6**: `useSearchParams` for `ids`; `Link` or `useNavigate` for edit and empty-state CTA  
- **React 19**: keep functional components and hooks rules

## Project context reference

See `_bmad-output/project-context.md` — PascalCase component files (`OrganisationCard.jsx`), kebab-case hooks if added, Tailwind-only styling, no auth, internal MVP scope.

## Story completion status

**done** — Code review complete; patch findings applied.

## Dev agent record

### Agent model used

Composer (Cursor agent)

### Debug log references

### Completion notes list

- Parsed `ids` via `parseCompareIds` in `frontend/src/lib/compare-url-params.js` (trim, empty drop, dedupe).
- `useCompareOrganisations` uses `useQueries` with `['organisations', id]` and `retry: false` when `OrganisationNotFoundError`.
- `OrganisationCard` covers loading skeleton, 404 column message, generic error, and success rows in AC3 order with `CapabilityBadge variant="labelled"` and `Not recorded` for empty text fields.
- `ComparePage`: sticky label column, `overflow-x-auto` below `xl` (1280px), `setSearchParams` for Remove, empty state + back link; list URL sync untouched (AC 11).

### File list

- `frontend/src/lib/compare-url-params.js`
- `frontend/src/hooks/useCompareOrganisations.js`
- `frontend/src/components/OrganisationCard.jsx`
- `frontend/src/pages/ComparePage.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change log

- 2026-04-04 — Story 4.2 context file created (create-story workflow).
- 2026-04-04 — Implemented compare page: URL-driven IDs, parallel TanStack Query fetches, `OrganisationCard` columns, lint + production build passing.
