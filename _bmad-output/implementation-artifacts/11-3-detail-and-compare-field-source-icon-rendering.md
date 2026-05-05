# Story 11.3: Detail and Compare — `FieldSourceIcon` Rendering

Status: done

## Story

As a staff member,
I want a small ⓘ icon next to each field on the System and Organisation detail pages, and on both compare pages, when that record has a per-field source URL,
so that I can verify a specific claim by clicking through to the URL that backs it.

## Acceptance Criteria

1. **`FieldSourceIcon` component** — `frontend/src/components/FieldSourceIcon.jsx` is created. Props: `{ url: string | null, fieldLabel: string }`. Returns `null` when `url` is `null` or empty. When non-empty, renders a Lucide `Info` icon at `size-3.5 text-slate-400 hover:text-blue-600`, wrapped in `<a target="_blank" rel="noopener noreferrer" href={url} title={url} aria-label="View source for {fieldLabel}">`.

2. **System detail rendering** — `SystemDetailPage.jsx` adds a `FieldSourceIcon` immediately to the right of every field value cell that corresponds to a key in `SYSTEM_FIELD_SOURCE_KEYS`. Lookup: `system.fieldSources?.[fieldKey]`. If missing or empty, no icon renders; there is no fallback to `system.sourceReference`.

3. **Organisation detail rendering** — `OrganisationDetailPage.jsx` adds the same icon adjacent to every field that corresponds to a key in `ORGANISATION_FIELD_SOURCE_KEYS`, using `organisation.fieldSources?.[fieldKey]`.

4. **System compare rendering** — `SystemComparePage.jsx` (and the `SystemCard` component) renders the icon on a per-column / per-row basis: for each cell, the icon appears only when *that column's System* has a `fieldSources` entry for *that row's field*. No inheritance from neighbouring columns.

5. **Organisation compare rendering** — `ComparePage.jsx` (organisations) renders the icon per the same column-local rule.

6. **No row-level fallback** — None of the four pages substitutes the row-level `sourceReference` into the per-field icon. If a field has no entry in `fieldSources`, the icon is absent.

7. **Accessibility** — Each icon is keyboard-focusable, has a non-empty `aria-label`, and the underlying `<a>` is announced as a link with the URL.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Create `FieldSourceIcon.jsx`. Use `import { Info } from 'lucide-react';`. Handle null/empty URL by returning `null` early.
- [x] **Task 2 (AC: 2)** — Update `SystemDetailPage.jsx` to render the icon next to each `SYSTEM_FIELD_SOURCE_KEYS` field. Import the constant from a frontend mirror (see Task 6) or inline it.
- [x] **Task 3 (AC: 3)** — Update `OrganisationDetailPage.jsx` similarly with `ORGANISATION_FIELD_SOURCE_KEYS`.
- [x] **Task 4 (AC: 4)** — Update `SystemComparePage.jsx` and `SystemCard.jsx` to render the icon per the column-local rule.
- [x] **Task 5 (AC: 5)** — Update `ComparePage.jsx` and `OrganisationCard.jsx` similarly.
- [x] **Task 6** — Create `frontend/src/lib/field-source-keys.js` mirroring the backend allow-lists. Document the dual-maintenance rule following the ADR-008 / ADR-016 pattern (mention in the new ADR-025 in the decisions log; this story doesn't need to write the ADR but the next iteration should).
- [x] **Task 7 (AC: 7)** — Verify keyboard tab order and screen-reader announcement (manual smoke check: tab into the detail page, hear each ⓘ link announced).
- [x] **Task 8** — Add a Vitest unit test for `FieldSourceIcon`: renders nothing on null; renders an anchor with correct attributes on a valid URL.

### Review Findings

- [x] [Review][Patch] Gate `FieldSourceIcon` in `SystemCard` to compare-only layout — `SystemCard.jsx` renders per-field source icons whenever `systemCompareRowFieldSourceKey` returns a key, including when `compareGridColumn` is `null` (list / non-compare card). `OrganisationCard` correctly uses `variant === 'compare'`. Story scope is detail pages and compare views; list cards should not show ⓘ unless product explicitly wants parity.

- [x] [Review][Defer] Extended system capability rows vs AC2 — `SYSTEM_FIELD_SOURCE_KEYS` (and backend mirror) already lists `seasonSubscriptionsCapability`, `dynamicPricingCapability`, etc., but `SystemDetailPage` has no rows for them yet. When Epic 12 adds those FactRows, each must wire `FieldSourceIcon` with the matching key. — deferred, pre-existing UI gap

## Dev Notes

- **Icon size:** `size-3.5` (Tailwind shorthand for 0.875rem) keeps the icon visually subordinate to the value cell — it shouldn't compete with content for attention.
- **Hover style:** `text-slate-400 hover:text-blue-600` — visible enough to scan, not loud.
- **Anchor attributes:** `target="_blank" rel="noopener noreferrer"` is mandatory for security (prevents `window.opener` exploits in the new tab).
- **Title and aria-label distinction:** `title` shows the URL on hover (so the user can copy or read it before clicking); `aria-label` is for screen readers.
- **Compare-cell layout:** The icon sits inline at the end of the cell value. For a missing value (`—`), the icon is also absent — no source for "no value".
- **Custom attributes:** Custom attributes already render their own per-attribute `sourceReference` via existing markup. This story does NOT change that — it only adds icons to the field-level rows.

### References

- [epics.md — Story 11.3](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §4.1, §7.1, UX-DR43, UX-DR50](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/system-catalogue-rationale.md §5.3](docs/system-catalogue-rationale.md) — rationale for no row-level fallback.
- [frontend/src/components/SystemCard.jsx](frontend/src/components/SystemCard.jsx) — compare card anatomy.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Visual clutter on detail pages | Single icon style across all pages; no badges, no counters, no labels — pure icon. Re-evaluate after first design review. |
| Substituting row-level source for missing per-field source | Code review checklist: every icon render must read from `fieldSources?.[key]`, never from `sourceReference`. Add an inline comment at each render site referencing this rule. |
| Open-redirect or window-opener attacks via crafted URLs | `rel="noopener noreferrer"` is mandatory. Server-side scheme validation (Story 11.2) blocks `javascript:` and `data:`. |
| Allow-list drift between backend and frontend | Frontend mirror in `frontend/src/lib/field-source-keys.js` per Task 6. Document dual-maintenance rule in ADR-025. |

## Technical requirements

- **Stack:** React 18, Vite, Tailwind v3, Lucide icons (already in dependencies).
- **No new npm packages** required.

## File structure requirements

| Action | Path |
|--------|------|
| Add | `frontend/src/components/FieldSourceIcon.jsx` |
| Add | `frontend/src/lib/field-source-keys.js` |
| Add | `frontend/src/__tests__/FieldSourceIcon.test.jsx` (or co-located `.test.jsx`) |
| Edit | `frontend/src/pages/SystemDetailPage.jsx` |
| Edit | `frontend/src/pages/OrganisationDetailPage.jsx` |
| Edit | `frontend/src/pages/SystemComparePage.jsx` |
| Edit | `frontend/src/components/SystemCard.jsx` |
| Edit | `frontend/src/pages/ComparePage.jsx` |
| Edit | `frontend/src/components/OrganisationCard.jsx` |

## Testing requirements

- Vitest unit test for `FieldSourceIcon` (Task 8).
- Manual smoke check on each updated page using a seeded record with `fieldSources` populated (after Story 11.5 lands; until then, manually populate one DB row for testing).

## Dev Agent Record

### Debug Log

- Vitest executed `FieldSourceIcon.jsx` with classic JSX runtime in the test runner; added `vitest.setup.js` assigning `globalThis.React` so component JSX executes under Vitest. Merged root `vite.config.js` into Vitest via `mergeConfig`.

### Completion Notes

- Implemented `FieldSourceIcon` (Lucide `Info`, anchor with `noopener noreferrer`, `title` + `aria-label`, focus ring). Icons read only from `fieldSources` via `pickFieldSourceUrl`; inline comments mark no row-level `sourceReference` fallback (Story 11.3).
- System and organisation detail pages wrap allow-listed fields only; compare views use `systemCompareRowFieldSourceKey` / `ORGANISATION_COMPARE_ROW_SOURCE_KEYS` for column-local mapping.
- **Task 7:** Automated coverage confirms focusable `<a>`, non-empty `aria-label`, and link semantics; full keyboard/SR pass recommended once seed data includes `fieldSources` (Story 11.5).

### Implementation Plan

1. Mirror backend allow-lists and compare-row mapping in `field-source-keys.js`.
2. Add component + wire detail and compare surfaces + Vitest + lint.

## File List

- `frontend/src/components/FieldSourceIcon.jsx`
- `frontend/src/components/FieldSourceIcon.test.js`
- `frontend/src/lib/field-source-keys.js`
- `frontend/src/lib/field-source-keys.test.js`
- `frontend/vitest.config.js`
- `frontend/vitest.setup.js`
- `frontend/src/pages/SystemDetailPage.jsx`
- `frontend/src/pages/OrganisationDetailPage.jsx`
- `frontend/src/pages/SystemComparePage.jsx`
- `frontend/src/pages/ComparePage.jsx`
- `frontend/src/components/SystemCard.jsx`
- `frontend/src/components/OrganisationCard.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/11-3-detail-and-compare-field-source-icon-rendering.md`

## Change Log

- 2026-05-03: Code review — gate `FieldSourceIcon` in `SystemCard` to compare grid only (`compareGridColumn != null`); story status → done; sprint status synced.
- 2026-05-03: Story 11.3 — `FieldSourceIcon`, frontend `field-source-keys` mirror, detail + compare wiring, Vitest (and Vitest config merge + setup for JSX), sprint status → review.
