# Story 4.1: Compare selection bar

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Required reading (read before implementation)

- `_bmad-output/project-context.md` — British English (`organisation`), Tailwind-only styling, hooks for data (N/A for this story), functional components
- `_bmad-output/planning-artifacts/architecture.md` — `SelectionContext` contract (`selectedIds`, `toggleSelection`, `clearSelection`); compare URL shape `/compare?ids=...`; state boundaries (note: **override** below on clearing selection)
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `CompareSelectionBar` component spec, accessibility (`role="region"`, `aria-label`, disabled compare tooltip copy)
- `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1 acceptance criteria (~lines 590–625)
- `_bmad-output/implementation-artifacts/3-3-multi-filter-api-integration-and-url-state.md` — list table structure, URL-driven list, do not break row/search/filter behaviour

## Story

As a staff member,  
I want to select organisations from the list and see a persistent bar that lets me open the comparison view,  
so that I can build a comparison set naturally while scanning results.

## Acceptance criteria

1. **Given** a staff member is on the organisation list page  
   **When** the page renders  
   **Then** each table row has a **checkbox** in the **far-left** column  
   **And** the `CompareSelectionBar` is **hidden** when no rows are checked  
   [Source: `_bmad-output/planning-artifacts/epics.md` Story 4.1]

2. **Given** a staff member checks one or more row checkboxes  
   **When** `toggleSelection(id)` runs (via `useSelection()` backed by `SelectionContext`)  
   **Then** the `CompareSelectionBar` appears as a **sticky** bar at the **bottom of the viewport** with `bg-slate-800`  
   **And** it shows the count of selected organisations and a primary **"Compare selected (N) →"** button (N = `selectedIds.length`)  
   **And** the bar has `role="region"` and `aria-label="Compare selection"`  
   [Source: epics Story 4.1; UX spec — `CompareSelectionBar`]

3. **Given** a staff member has selected organisations and navigates to a **detail** page and **back**  
   **When** they return to the list  
   **Then** their selection is **preserved** — the same IDs remain selected (context wraps the route tree under `SelectionProvider` in `App.jsx`)  
   [Source: epics Story 4.1; `frontend/src/App.jsx`]

4. **Given** **5 or more** organisations are selected  
   **When** the `CompareSelectionBar` renders  
   **Then** the compare control is not actionable: use **`aria-disabled="true"`** (preferred for focus/tooltip) **or** a pattern that exposes the tooltip text to assistive tech, with user-visible explanation **"Select up to 4 organisations to compare"** — **no navigation** to `/compare`  
   **Note:** Native `disabled` buttons often do not show `title` tooltips in all browsers; wrapping with `title` on a focusable wrapper or using a small shadcn-style Tooltip (copy-paste) is acceptable if you add a dependency-free Radix tooltip primitive. Minimum acceptable: visible helper text next to the disabled control.  
   [Source: epics Story 4.1; UX-DR4 in epics planning lines ~95]

5. **Given** a staff member activates **"Compare selected (N) →"** with **1–4** organisations selected  
   **When** the control is activated  
   **Then** the app navigates to **`/compare?ids=<id1>,<id2>,...`** (comma-separated UUIDs, no spaces)  
   **And** **`clearSelection()` is NOT called** on that navigation — returning with browser **Back** must show the list with the **same** checkboxes still ticked  
   **And** record an explicit decision in **`docs/decisions.md`**: architecture currently says selection is *"cleared on compare or explicit clear"* (`architecture.md` — State boundaries); **this story overrides** that for **back-navigation UX** (align with epics Story 4.1 override note).  
   [Source: epics Story 4.1]

6. **Given** a staff member clicks **"Clear selection"** in the `CompareSelectionBar`  
   **When** the action runs  
   **Then** `clearSelection()` runs, all checkboxes **uncheck**, and the bar **hides**  
   [Source: epics Story 4.1]

7. **Regression guard:** List behaviour from Epic 3 remains intact — URL filters, search, pagination, empty states, and row activation (navigate to detail) still work. Checkbox toggles must **not** navigate to detail (`stopPropagation` on the checkbox cell / input click and key handling as needed).

## Tasks / subtasks

- [x] **`CompareSelectionBar` component** (AC: 2, 4, 5, 6)  
  - [x] New file `frontend/src/components/CompareSelectionBar.jsx` — sticky bottom, `bg-slate-800`, light text, layout: count + primary compare + text/button for clear  
  - [x] Wire `useSelection()`; derive `n = selectedIds.length`; compare URL: `ids=${selectedIds.join(',')}`  
  - [x] `useNavigate()` for compare; **do not** call `clearSelection()` after `navigate`  
  - [x] When `n >= 5`, block navigation and meet AC4 (aria-disabled + explanation)

- [x] **List table — selection column** (AC: 1, 3, 5, 6, 7)  
  - [x] In `OrganisationListResults` (or extracted row subcomponent): add `<th>` + `<td>` as **first** column with `<input type="checkbox" />`  
  - [x] Controlled by `selectedIds.includes(org.id)`; `onChange` → `toggleSelection(org.id)`  
  - [x] Stop row `onClick` / keyboard activation from firing when interacting with the checkbox  
  - [x] Update skeleton column count in `TableSkeleton` and all `colSpan` values to match new column count

- [x] **Mount bar on list route only** (AC: 1–3, 6)  
  - [x] Render `CompareSelectionBar` from `OrganisationListPage` (or equivalent) when `selectedIds.length > 0` — avoids obscuring detail/create/edit views while preserving context for back navigation  
  - [x] Hidden when `selectedIds.length === 0`

- [x] **Decision log** (AC: 5)  
  - [x] Append entry to `docs/decisions.md` — Epic 4 preserve selection on compare navigation vs architecture “clear on compare”

- [x] **QA** (AC: 1–7)  
  - [x] Manual: select 1–4 → compare URL correct; Back → checkboxes still match; Clear → empty; select 5+ → cannot open compare; detail round-trip preserves selection  
  - [x] `cd frontend && npm run build` (and eslint if configured)

### Review Findings

- [x] [Review][Patch] Consolidate duplicate imports from `organisation-list-filter-params.js` (`parseOrganisationListInputsFromSearchParams` / `clearAllListFiltersInSearchParams` / `hasActiveListFilters` and `normaliseCapabilityParam` are split across two import lines) — [OrganisationListPage.jsx:11-22]
- [x] [Review][Patch] Checkbox `aria-label` uses only `org.name`; if the name is empty or whitespace, assistive tech gets a weak label — add a fallback (e.g. truncated id or “Unnamed organisation”) — [OrganisationListPage.jsx:429]

## Dev notes

### Current implementation snapshot (extend, do not replace)

| Area | Today |
|------|--------|
| Selection state | `SelectionProvider` + `selection-context.js` + `useSelection.js` — `selectedIds`, `toggleSelection`, `clearSelection` |
| App shell | `SelectionProvider` wraps `<Routes>` in `App.jsx` |
| List table | No compare column; rows navigate to detail on click / Enter / Space |
| Compare route | `ComparePage.jsx` is a **placeholder** — Story 4.1 only **navigates** here; full UI is Story **4.2** |

**Naming note:** Epics and architecture refer to “`SelectionContext`”; the codebase splits **context object** (`selection-context.js`), **provider** (`SelectionProvider.jsx`), and **hook** (`useSelection.js`). Use **`useSelection()`** everywhere in UI — do not add a second selection store.

### Reinvention prevention

- Reuse existing `Button` (`frontend/src/components/ui/button.jsx`) for compare and clear — primary compare styling `bg-blue-600 hover:bg-blue-700` per UX primary actions  
- Do **not** encode selection in the list URL — selection stays in context only (architecture)  
- Do **not** implement `OrganisationCard`, parallel fetches, or compare layout in this story (4.2)

### Architecture compliance

- React Router `useNavigate` for SPA navigation to `/compare?ids=...`  
- British copy: **"Compare selected"**, **"Clear selection"**, **"organisations"**  
- Override and document: **do not** clear selection when entering compare (contradicts `architecture.md` line ~765 “cleared on compare” — superseded for this product decision)

### File structure (expected touches)

| Path | Action |
|------|--------|
| `frontend/src/components/CompareSelectionBar.jsx` | **Create** |
| `frontend/src/pages/OrganisationListPage.jsx` | Checkbox column, `colSpan`/skeleton updates, mount `CompareSelectionBar` |
| `docs/decisions.md` | **Append** Epic 4 selection persistence vs compare navigation |

No backend changes for Story 4.1.

### Testing requirements

- No new backend tests  
- Frontend: `npm run build`; manual flows in AC list above

### Previous story intelligence (3.3)

- Table and empty states are carefully keyed to URL + `location.key` patterns — preserve `OrganisationListSearchInput` / `OrganisationListResults` split; avoid remount patterns that break debounced search  
- Do not reduce `colSpan` incorrectly when adding columns — screen readers and layout break on mismatch

### Git intelligence

- Repository history may be shallow; rely on files above and story specs.

### Latest technical notes

- React Router v6: `navigate('/compare?ids=' + selectedIds.join(','))` — UUIDs only; commas separate IDs (no extra encoding required for standard UUID strings)  
- Prefer **`aria-disabled`** on compare when `n > 4` so assistive tech and keyboard users get consistent “disabled” semantics while still showing helper text

## Project context reference

See `_bmad-output/project-context.md` for stack, naming (`CompareSelectionBar.jsx` PascalCase component file), and “internal MVP” scope.

## Story completion status

**done** — Code review patches applied; no open review findings.

## Dev agent record

### Agent model used

Composer (Cursor agent)

### Debug log references

_(none)_

### Completion notes list

- Added `CompareSelectionBar` (fixed bottom, `bg-slate-800`, region + `aria-label`, compare navigates to `/compare?ids=` without clearing selection; 5+ selection uses `aria-disabled`, helper copy, no navigation).
- Organisation list table: first-column compare checkboxes wired to `useSelection`, `stopPropagation` on checkbox cell/input so row navigation is unchanged; skeleton and `colSpan` updated to 10 columns.
- Bar and list bottom padding only on list route when `selectedIds.length > 0`.
- Recorded **ADR-013** in `docs/decisions.md` (preserve selection after compare navigation).

### File list

- `frontend/src/components/CompareSelectionBar.jsx` (new)
- `frontend/src/pages/OrganisationListPage.jsx` (modified)
- `docs/decisions.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change log

- 2026-04-04 — Story 4.1 context file created (create-story workflow).
- 2026-04-04 — Implemented compare selection bar, list checkboxes, ADR-013; story marked **review**.
