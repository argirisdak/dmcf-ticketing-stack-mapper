# Story 12.4: SystemListPage — Filter Sidebar with Collapsible "More Capabilities" Group

Status: done

## Story

As a staff member,
I want the System list filter sidebar to expose the five new capability filters under a collapsible "More capabilities" group,
so that I can filter by them without overwhelming the sidebar layout.

## Acceptance Criteria

1. **Existing v1 capability filters unchanged** — Membership, Donation, and Reserved seating filters remain visible by default in the sidebar, with the same UX they have today.

2. **Collapsible disclosure** — Below the v1 capability filters, a collapsible disclosure labelled "More capabilities (5)" appears, collapsed by default. Clicking the disclosure expands it to reveal the five new capability filters (Season subscriptions, Dynamic pricing, Multi-venue support, Marketing automation, Accessibility features), each with the same `Any / YES / NO / UNKNOWN` selector contract as the v1 filters.

3. **URL wiring** — Each new filter wires through to the `useSystems` hook with the corresponding camelCase query param (`seasonSubscriptionsCapability`, etc.). Selection updates the URL via `useSearchParams`.

4. **Active-filter chips** — `SystemActiveFilterChips.jsx` renders a chip for each active new-capability filter, using existing chip styles. Chip label format: `"<Capability label>: <value>"`. Dismissing the chip removes the filter from the URL.

5. **Auto-expand when active** — If any of the five new filters is active when the page loads (e.g. via deep-link), the disclosure auto-expands so the user can see what's filtering. Otherwise the disclosure starts collapsed.

6. **Collapsed-state count badge** — When collapsed, the disclosure shows a count badge if any contained filter is active: e.g. "More capabilities (5) · 2 active".

## Tasks / Subtasks

- [x] **Task 1 (AC: 2)** — Add a disclosure component to the sidebar. Use a simple `<details>` / `<summary>` pattern or a controlled state pattern with a chevron icon — match existing sidebar conventions.
- [x] **Task 2 (AC: 2, 3)** — Render five new dropdown filters inside the disclosure, wired to URL params via the hook.
- [x] **Task 3 (AC: 4)** — Update `SystemActiveFilterChips.jsx` to recognise the five new filter keys and emit chips for them.
- [x] **Task 4 (AC: 5, 6)** — Compute disclosure initial state from URL params (auto-expand if any of the five are non-default). Compute and render the count badge in the collapsed summary line.
- [x] **Task 5** — Manual smoke check: deep-link `?seasonSubscriptionsCapability=YES`; verify the disclosure auto-expands and the chip renders. Toggle filters; verify URL updates and chips appear/disappear.

## Dev Notes

- **Disclosure pattern:** Native `<details>` is cheap and accessible; if the existing sidebar uses a controlled component for other groups, follow that pattern instead for visual consistency.
- **Sidebar visual weight:** The disclosure should feel subordinate to the v1 capability section above it — smaller heading, no border, indented content. Goal: a glanceable v1 set with a "see more" pull.
- **Filter param naming:** Stay aligned with Story 12.2's API contract — camelCase like `seasonSubscriptionsCapability`.
- **Out of scope:** No backend changes (Story 12.2 already handles the API filter contract).

### References

- [epics.md — Story 12.4](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md UX-DR47](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [frontend/src/pages/SystemListPage.jsx](frontend/src/pages/SystemListPage.jsx) — existing filter sidebar.
- [frontend/src/components/SystemActiveFilterChips.jsx](frontend/src/components/SystemActiveFilterChips.jsx).
- [frontend/src/hooks/useSystems.js](frontend/src/hooks/useSystems.js).

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Sidebar overflow on narrow viewports | Disclosure pattern keeps height bounded by default; only expanded when intentionally opened. |
| Auto-expand fighting user collapse intent | Auto-expand only on initial load (not on every URL change); use a `useState` initial value derived from initial URL params. |
| Chip label inconsistency with detail page labels | Use the same `CAPABILITY_ROWS` constant from Story 12.3 to derive labels. |

## Technical requirements

- No new npm packages.
- Reuse existing dropdown / select components from the sidebar.

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `frontend/src/pages/SystemListPage.jsx` |
| Edit | `frontend/src/components/SystemActiveFilterChips.jsx` |
| Edit | `frontend/src/hooks/useSystems.js` (extend filter param handling) |

## Testing requirements

- Manual smoke check per Task 5.
- Vitest test for `SystemActiveFilterChips` extended to cover new keys.

## Dev Agent Record

### Implementation Plan

- Extended `system-list-filter-params.js` from `CAPABILITY_ROWS.slice(3)`: URL keys, parse/clear/chip metadata, and helpers for active extended-filter counts.
- Wired `parseSystemListInputsFromSearchParams` → `useSystems` → `fetchSystems` with camelCase query params matching Story 12.2.
- `SystemListPage.jsx`: controlled `<details>` under v1 capability selects; initial open state from URL; collapsed “· N active” suffix; five `<select>`s mirroring v1 option contract.
- Chips: no `SystemActiveFilterChips.jsx` edit required — component already iterates `SYSTEM_LIST_FILTER_PARAM_KEYS` and capability normalisation.

### Debug Log

- Backend `npm test` could not run in this agent environment (`EACCES` under `backend/node_modules`, missing `jest-circus`); no backend changes for this story. Frontend `npm test`, `npm run lint`, and `npm run build` passed.

### Completion Notes

- ✅ AC1–6 addressed: v1 filters unchanged; collapsible “More capabilities (5)” with five URL-backed filters; chips and clear-all include new keys; initial expand when any extended filter is active; inactive count in summary when collapsed.
- ✅ Vitest: `SystemActiveFilterChips.test.jsx` covers one extended chip + dismiss and all five labels.
- Task 5: deep-link UI behaviour covered by implementation + unit tests; recommend a quick browser pass on `/systems?seasonSubscriptionsCapability=YES`.

## File List

- `frontend/src/lib/system-list-filter-params.js`
- `frontend/src/api/systems.js`
- `frontend/src/hooks/useSystems.js`
- `frontend/src/pages/SystemListPage.jsx`
- `frontend/src/components/SystemActiveFilterChips.test.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/12-4-system-list-filter-sidebar-collapsible-more-capabilities.md`

## Change Log

- 2026-05-03: Story 12.4 — collapsible “More capabilities” system list filters, API query wiring, chip coverage via shared filter keys, Vitest for active filter chips.

### Review Findings

- [x] [Review][Decision] AC5 — Disclosure open state vs in-SPA navigation — **Resolved 2026-05-03:** Option 1 — treat AC5 as **first mount / full page load** only; no change required for in-SPA `searchParams` transitions without remount.

- [x] [Review][Patch] Disclosure label hard-codes “(5)” [`frontend/src/pages/SystemListPage.jsx` summary] — **Fixed 2026-05-03:** Summary uses `More capabilities ({SYSTEM_MORE_CAPABILITY_FILTER_ROWS.length})`.

- [x] [Review][Patch] Ensure `SystemActiveFilterChips.test.jsx` is tracked in version control — **Fixed 2026-05-03:** File staged with `git add` during code-review follow-up.

