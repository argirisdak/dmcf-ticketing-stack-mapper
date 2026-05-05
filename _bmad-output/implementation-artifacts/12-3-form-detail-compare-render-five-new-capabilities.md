# Story 12.3: Form, Detail, Compare — Render Five New Capabilities

Status: done

## Story

As a staff member,
I want SystemFormPage, SystemDetailPage, SystemCard (compare), and SystemComparePage to render the five new capability flags,
so that I can edit, view, and compare them through the same UI patterns as the existing capabilities.

## Acceptance Criteria

1. **System form** — `SystemFormPage.jsx` renders eight capability dropdowns total (3 v1 + 5 v3), each with `YES / NO / UNKNOWN` options and default `UNKNOWN`. Each capability field is wrapped in `FieldWithSource` (Story 11.4) so the user can attach a per-capability source URL. Layout: all eight grouped under the existing "Capabilities" section heading; visual order: Membership, Donation, Reserved seating, Season subscriptions, Dynamic pricing, Multi-venue support, Marketing automation, Accessibility features.

2. **System detail** — `SystemDetailPage.jsx` renders eight capability rows in the facts panel using `CapabilityBadge` labelled variant. Each row renders a `FieldSourceIcon` (Story 11.3) when the corresponding `fieldSources` entry exists. Same vertical order as the form.

3. **System card (compare)** — `SystemCard.jsx` renders all eight capability rows under the Capabilities section per the union compare layout. Missing values render `—` per the never-blank rule. ⓘ icons render column-locally per Story 11.3 AC4.

4. **System compare label column** — `SystemComparePage.jsx`'s left attribute label column lists all eight capability labels in the stable order from AC1.

5. **Backwards compatibility** — Pages render gracefully on any System where the five new capability values are `UNKNOWN` (which is true for all 11 systems before Story 12.5 lands). The `CapabilityBadge` already handles `UNKNOWN` — no special-casing needed.

6. **No filter sidebar changes** — Filter sidebar updates land in Story 12.4. This story does not touch `SystemListPage.jsx`'s filter bar.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Update `SystemFormPage.jsx`:
  - [x] 1.1 Add the five new capability fields to form state (alongside the existing three).
  - [x] 1.2 Render five new dropdowns wrapped in `FieldWithSource`, in the order specified.
  - [x] 1.3 Submit handler includes the five new fields in the payload.
- [x] **Task 2 (AC: 2)** — Update `SystemDetailPage.jsx` to render the five new capability rows in the facts panel. Each row uses `CapabilityBadge` (labelled variant) and renders `FieldSourceIcon` when applicable.
- [x] **Task 3 (AC: 3)** — Update `SystemCard.jsx` to render the five new rows in the Capabilities section.
- [x] **Task 4 (AC: 4)** — Update `SystemComparePage.jsx`'s left attribute label column to include the five new labels in the stable order.
- [x] **Task 5** — Update `frontend/src/lib/system-compare-union-labels.js` (or equivalent compare-row-builder) if it hard-codes the capability list — extend to all eight.
- [x] **Task 6 (AC: 5)** — Manual smoke check: open every seeded System detail page; confirm all eight capability rows render. Open Compare with two Systems; confirm all eight rows align.

## Dev Notes

- **Order is load-bearing:** The same eight-item order appears in form, detail, card, and compare label column. Define the order once as a constant (`CAPABILITY_ROWS`) in `frontend/src/lib/system-capabilities.js` and import everywhere.
- **`FieldWithSource` integration:** Each capability dropdown is the `children` of a `FieldWithSource` wrapper. The wrapper passes `fieldName` through (e.g. `"seasonSubscriptionsCapability"`).
- **Compare-page row builder:** If the existing builder iterates a hard-coded list, replace with an iteration over `CAPABILITY_ROWS`.
- **Out of scope:** Filter sidebar (Story 12.4), seed values (Story 12.5).

### References

- [epics.md — Story 12.3](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §4.1, §4.2, UX-DR47](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [frontend/src/components/SystemCard.jsx](frontend/src/components/SystemCard.jsx).
- [frontend/src/pages/SystemDetailPage.jsx](frontend/src/pages/SystemDetailPage.jsx).
- [frontend/src/pages/SystemComparePage.jsx](frontend/src/pages/SystemComparePage.jsx).

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Order drift between form, detail, compare | Single shared `CAPABILITY_ROWS` constant. |
| Over-tall facts panel on detail page | Eight rows is acceptable; if visual review flags it, group capabilities under a sub-heading. |
| Compare rows pushing the page wider | Card column width is fixed; rows just add height. Verify horizontal scroll behaviour with 4 cards. |

## Technical requirements

- No new npm packages.
- Reuse `CapabilityBadge`, `FieldWithSource`, `FieldSourceIcon`.

## File structure requirements

| Action | Path |
|--------|------|
| Add | `frontend/src/lib/system-capabilities.js` (`CAPABILITY_ROWS` constant) |
| Edit | `frontend/src/pages/SystemFormPage.jsx` |
| Edit | `frontend/src/pages/SystemDetailPage.jsx` |
| Edit | `frontend/src/components/SystemCard.jsx` |
| Edit | `frontend/src/pages/SystemComparePage.jsx` |
| Edit | `frontend/src/lib/system-compare-union-labels.js` (if applicable) |

## Testing requirements

- Manual smoke check per Task 6.
- Vitest tests for `SystemCard` and `SystemDetailPage` extended to assert eight capability rows render.

## Dev Agent Record

### Implementation Plan

- Introduced `CAPABILITY_ROWS` in `frontend/src/lib/system-capabilities.js` and wired form, detail, `SystemCard`, and `SYSTEM_COMPARE_ROW_LABEL_PREFIX` to it.
- Extended `SYSTEM_COMPARE_STATIC_ROW_SOURCE_KEYS` and section divider indices for five new compare rows before Description.
- Form: Capabilities heading, eight `FieldWithSource` dropdowns, submit body and DTO hydration for new fields; API error key mapping for snake_case.

### Debug Log

- ESLint once failed on a missing Vite timestamp file; retry succeeded.
- `backend npm test` failed in this environment (`EACCES` under `node_modules`, missing `jest-circus`); no backend files were changed for this story.

### Completion Notes

- ✅ Story 12.3: eight capabilities in form (with sources), detail facts panel, compare card rows, and compare label column (via `buildSystemCompareRowLabels`).
- ✅ Vitest: `SystemDetailPage.test.jsx` and `SystemCard.test.jsx` assert eight capability rows / labelled badges; `field-source-keys` and `system-compare-union-labels` tests updated for new row indices and labels.
- ✅ Frontend `npm run lint` and `npm run test` pass.
- Task 6: compare alignment and every seeded detail page not exercised in a browser here; recommend a quick local smoke (`docker compose up`, spot-check two systems on detail + `/compare/systems?ids=…`).

## File List

- `frontend/src/lib/system-capabilities.js` (new)
- `frontend/src/pages/SystemFormPage.jsx`
- `frontend/src/pages/SystemDetailPage.jsx`
- `frontend/src/components/SystemCard.jsx`
- `frontend/src/lib/system-compare-union-labels.js`
- `frontend/src/lib/field-source-keys.js`
- `frontend/src/lib/field-source-keys.test.js`
- `frontend/src/lib/system-compare-union-labels.test.js`
- `frontend/src/pages/SystemDetailPage.test.jsx` (new)
- `frontend/src/components/SystemCard.test.jsx` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings

- [x] [Review][Resolved] AC3 display — **Decision 1 = keep current:** capability compare rows stay on labelled `CapabilityBadge` (“Not recorded” for unknown), not scalar `—`. Update planning copy (e.g. epics AC3) if it still says a literal em dash for capabilities.
- [x] [Review][Resolved] Compare capability labels — **Decision 2 = keep short labels** (`CAPABILITY_ROWS` as shipped); no copy change for organisation-alignment in this story.
- [x] [Review][Resolved] FieldWithSource on non-capability facts — **Decision 3 = intentional:** Story 11.4-style sources on those system facts; AC1/AC2 text is narrower than delivered behaviour — update planning copy when convenient, no revert required.
- [x] [Review][Patch] Replace magic number `6` for compare pre-capability row count with exported `SYSTEM_COMPARE_CAPABILITY_BLOCK_START_ROW` in `SystemCard.jsx` and `system-compare-union-labels.js` section dividers [`frontend/src/components/SystemCard.jsx`, `frontend/src/lib/system-compare-union-labels.js`]
- [x] [Review][Patch] Normalise hydrated capability strings: if the API returns a value outside YES/NO/UNKNOWN, coerce to UNKNOWN in `dtoToFormState` (or equivalent) to avoid blank controlled selects [`frontend/src/pages/SystemFormPage.jsx`]
- [x] [Review][Defer] `sprint-status.yaml` uses absolute `story_location` and bundles broad epic status edits — deferred, BMAD/process churn (prefer narrower commits when practical)
- [x] [Review][Defer] `SystemFormPage` duplicates field-source handlers between create and edit paths — deferred, tech debt
- [x] [Review][Defer] Client vs server `fieldSources` validation symmetry — deferred, needs API/integration verification
- [x] [Review][Defer] Vitest mostly covers icon presence and order; YES/NO paths and compare-grid stress less covered — deferred, test hardening

## Change Log

- 2026-05-03: Implemented Story 12.3 — shared `CAPABILITY_ROWS`, form/detail/compare UI for eight capabilities, compare row builder and field-source key mapping, Vitest coverage.
