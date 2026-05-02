# Story 9.2: SystemCard component (compare column)

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created. -->

## Story

As a staff member,
I want each System in the compare to render as a card with sticky header, full attribute set aligned to the label column, and explicit "—" markers for missing values,
so that I can scan rows across systems without ever seeing a blank cell that I might confuse with missing data versus "not yet loaded".

## Acceptance Criteria

1. **Sticky header anatomy**
   - System name: `text-lg font-semibold`.
   - Category: use the same visual tokens as `SystemCategoryBadge` on `SystemDetailPage` (`CATEGORY_CONFIG` — integrated / ticketing / audience management pill styles).
   - Vendor: `text-sm text-slate-500`.
   - Header actions (right-aligned): **Edit** as a `Link` to `/systems/:id/edit` with classes `text-sm text-blue-600` (and sensible hover); **remove** as an icon-only **ghost** button with **×** (use `lucide-react` `X` or equivalent), `aria-label` like "Remove from compare", calling `onRemove` (parent updates `ids` in the URL with `replace: true` per Story 9.1 / Epic 9).

2. **Never-blank cells (UX-DR33 / Epic 9.2)**
   - Scalar identity fields: plain text when present; when null or empty string, render an em dash `—` in `text-slate-300` (not muted prose like "Not recorded" for these rows — epic is explicit for compare).
   - **Capabilities:** `CapabilityBadge` with `variant="labelled"` for membership, donation, reserved seating (same as `OrganisationCard` compare rows).
   - **Description:** when null/empty, same `—` rule; when present, **clamp to 4 lines** with a **Show more** control that expands to full text and **Show less** to collapse; state is **per card instance** (local `useState`), not global.

3. **Custom attributes (union-ready for Story 9.3)**
   - The compare page will eventually compute the **ordered union of labels** across all selected Systems (case-insensitive merge at page level in 9.3).
   - **This story:** `SystemCard` accepts props defining that ordered list (e.g. `unionCustomAttributeLabels: string[]`) **and** the current system DTO (or its `customAttributes` array). For each union label, render one row: if this system has a matching attribute (match **label case-insensitively**), show `value` and source treatment consistent with `CustomAttributesPanel` on `SystemDetailPage` (HTTP(s) → link, else plain text); if no match, show `—` in `text-slate-300`.
   - If the **page** passes an **empty** union array because no selected system has custom attributes, render **no** extra rows (Epic 9.3: hide entire "Additional attributes" section when all empty — the page owns section visibility; the card simply renders zero union rows when the list is empty).

4. **Footer block (per card, after union rows)**
   - **Source reference:** reuse `SourceReferenceDisplay` behaviour (link when `http`/`https`, else text; when null — epic: "None recorded" if null for this field; align with how compare treats provenance — never leave the cell empty).
   - **Last updated:** `text-xs text-slate-500`, same **absolute + relative** pattern as `formatLastUpdated` in `SystemDetailPage.jsx`.
   - **Adopted by:** `N = Array.isArray(system.organisations) ? system.organisations.length : 0`. If `N > 0`, line reads as an adoption summary with **link to** `/systems/:id` (detail page shows adoption evidence). If `N === 0`, **"Not yet adopted"** in muted text (`text-slate-500` or similar) — not a dead blank.

5. **Loading / error / not-found columns**
   - Mirror `OrganisationCard` patterns: skeleton column inside the same grid shell when `query.isPending`; `SystemNotFoundError` column with message + remove affordance; generic error column with red treatment + remove. Use **`query`** shaped like `useCompareOrganisations` / future `useCompareSystems` results (full `UseQueryResult` for that id).

6. **Grid integration**
   - Card must participate in the **same CSS grid** approach as `ComparePage.jsx` / Story 9.1 `SystemComparePage`: use a **column shell** with `gridColumn`, `row-span-full`, `grid-rows-subgrid`, `min-w-0`, border/shadow parity with `OrganisationCard`'s `CompareColumnShell`.
   - **Refactor note:** `CompareColumnShell` is currently **private** inside `OrganisationCard.jsx`. Extract it to e.g. `frontend/src/components/CompareColumnShell.jsx` (or export from `OrganisationCard`) so **both** `OrganisationCard` and `SystemCard` share one implementation.

## Tasks / Subtasks

- [x] **Task 1 — Shared column shell**
  - [x] Extract `CompareColumnShell` to a shared module; update `OrganisationCard.jsx` imports.

- [x] **Task 2 — `SystemCard.jsx`**
  - [x] Implement component API: `systemId`, `query`, `onRemove`, `compareGridColumn`, `unionCustomAttributeLabels` (ordered), optional `variant` if needed later.
  - [x] Implement header, static rows (order below), description expand/collapse, union rows, footer.
  - [x] Reuse `CapabilityBadge`, `SourceReferenceDisplay`, category badge styling consistent with `SystemDetailPage`.

- [x] **Task 3 — Wire into `SystemComparePage` (Story 9.1)**
  - [x] Replace placeholder column bodies with `SystemCard` per id.
  - [x] Implement `removeId` / `setSearchParams` identical to `ComparePage.jsx` (drop id from `ids`, `replace: true`).
  - [x] **Union labels (minimal until 9.3):** compute an ordered union across **currently loaded** successful system DTOs in the page: gather all `customAttributes[].label`, dedupe case-insensitively, preserve **first-seen** order left-to-right by column order — this matches Epic 9.3 intent and avoids a second pass later. Hide the union block entirely when the deduped list is empty.

- [x] **Task 4 — Left label column**
  - [x] Define `ROW_LABELS` (static prefix) consistent with Epic 9.3 section order for `/compare/systems`: Identity (Name, Vendor, Category, Deployment model, Pricing model, Geographic focus), Capabilities (Membership, Donation, Reserved seating), Description, then after the dynamic union row count, Provenance (Source reference, Last updated), then Adopted by.  
  - [x] Grid `gridTemplateRows` must account for **dynamic** union row count (`staticRows + unionLabels.length`).

- [ ] **Task 5 — Quality gates**
  - [x] `cd frontend && npm run lint && npm run test`
  - [ ] Manual: 2–4 systems with mixed null/custom attrs; verify remove updates URL and cache reuse; verify no blank cells.

### Review Findings

- [x] [Review][Patch] **Resolved (2026-05-02):** Option 1 — defer custom-attribute union until every column query for the current `ids` has settled (`!isPending`). Until then, treat union as empty so row count does not grow column-by-column. [`frontend/src/lib/system-compare-union-labels.js`, callers/tests] — addressed 2026-05-02

- [x] [Review][Patch] Section dividers on system compare label column — Epic 9.3 AC §1 expects visible horizontal dividers between Identity / Capabilities / Description / Provenance / Additional attributes / Adopted by; `SystemComparePage.jsx` currently uses uniform row borders only. [`frontend/src/pages/SystemComparePage.jsx`] — addressed 2026-05-02 (`systemCompareSectionDividerRowIndexes` + `border-t` on section starts)

- [x] [Review][Patch] Row label wording vs Epic 9.3 — prefix uses `Deployment`; AC §1 specifies **Deployment model**. [`frontend/src/lib/system-compare-union-labels.js`:7] — addressed 2026-05-02

- [x] [Review][Patch] `SystemCard` can return `null` when `!isSuccess` after pending/error branches — rare TanStack states could yield a blank column without remove affordance. [`frontend/src/components/SystemCard.jsx`:282-284] — addressed 2026-05-02

- [x] [Review][Defer] Organisation detail “Compare these systems →” still targets `/compare/organisations` — Epic 9.3 AC §5 requires `/compare/systems?ids=…`; file not touched in this diff. [`frontend/src/pages/OrganisationDetailPage.jsx`:609-614] — deferred, pre-existing

- [x] [Review][Defer] Org compare page lacks cross-org system compare strip — Epic 9.3 AC §6; `ComparePage.jsx` unchanged in this diff. — deferred, pre-existing

## Dev Notes

### Epic cross-story context

- **Epic 9** goal: System-to-system compare at `/compare/systems?ids=…` (PRD FR-S7).
- **9.1** (ready-for-dev): route shell, `useCompareSystems`, layout skeleton — see `9-1-compare-route-shell-compare-systems-and-compare-organisations.md`. **Current repo state:** `App.jsx` still mounts `SystemCompareStubPage` for `/compare/systems`; compare implementation for systems is **not** landed yet. Story 9.2 should be implemented **on top of** the 9.1 branch/PR or in the same delivery wave so `SystemComparePage` exists.
- **9.3** will add contextual entry points and may tweak page chrome; card contract (`unionCustomAttributeLabels` + case-insensitive row lookup) should stay stable.

### Row order vs header

- Epic 9.2 places **name, category badge, vendor** in the **sticky header**; Epic 9.3’s label column still lists **Name, Vendor, Category** under Identity so rows **align across columns** for scanning. Expect **intentional duplication** between header and the first rows (same pattern as organisation compare: header shows title; grid rows still align to labels).

### Code anchors (UPDATE files)

| File | Current role | Story impact |
|------|----------------|-------------|
| `frontend/src/components/OrganisationCard.jsx` | Compare column shell + org rows | Extract `CompareColumnShell`; no behaviour change intended |
| `frontend/src/pages/ComparePage.jsx` | Reference for `removeId`, grid CSS | Mirror patterns for system compare page |
| `frontend/src/pages/SystemDetailPage.jsx` | `SystemCategoryBadge`, `formatLastUpdated`, `CustomAttributesPanel` patterns | Reuse / factor small helpers if needed (avoid huge copy-paste) |
| `frontend/src/App.jsx` | Routes | No change required for 9.2 alone if 9.1 adds `SystemComparePage` |
| Story 9.1 artifacts | `useCompareSystems.js`, `SystemComparePage.jsx` | **Consumers** of `SystemCard` |

### API / data shape guardrails

- `GET /api/systems/:id` returns envelope `{ data, error: null, meta: null }`; TanStack Query `data` is the **envelope** when using the same pattern as `useSystem` — column UI should read **`query.data?.data`** for the system DTO (see Story 9.1 dev notes).
- DTO fields (camelCase): `name`, `vendor`, `category`, `deploymentModel`, `pricingModel`, `geographicFocus`, `description`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `sourceReference`, `lastUpdated`, `customAttributes`, `organisations`.
- Adoption count: `organisations.length` on the detail DTO.

### Architecture compliance

- React function components, hooks-only fetching; **no `fetch` inside `SystemCard`** — receive `query` from parent.
- Tailwind v3; shadcn `Button`, `Link` from react-router.
- British English in any new user-facing copy (`organisation` where referring to adopters).

### Testing

- Prefer unit tests for **pure helpers** if extracted (e.g. union-label merge, case-insensitive attribute lookup). Follow existing Vitest layout under `frontend/`.
- Full grid tests optional if no harness; manual compare with 2–4 columns is required.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 9, Stories 9.2–9.3]
- [Source: `_bmad-output/planning-artifacts/architecture-v2-delta.md` — §4.4–4.6 compare routes & fetch pattern]
- [Source: `_bmad-output/implementation-artifacts/9-1-compare-route-shell-compare-systems-and-compare-organisations.md` — shell & hook expectations]
- [Source: `_bmad-output/project-context.md` — stack & conventions]
- [Source: `frontend/src/components/OrganisationCard.jsx` — `CompareColumnShell`, compare grid]
- [Source: `frontend/src/pages/SystemDetailPage.jsx` — badge, dates, custom attributes]

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- ESLint `react-hooks/set-state-in-effect` on description overflow detection — resolved by always rendering Show more/less for non-empty descriptions (line-clamp-4 when collapsed).

### Completion Notes List

- Extracted `CompareColumnShell` to `frontend/src/components/CompareColumnShell.jsx`; `OrganisationCard.jsx` imports it (no behaviour change intended).
- Added `SystemCard.jsx` with sticky header (name, category badge, vendor, Edit link + ghost × remove), identity/capability/description rows, union custom-attribute rows (`findCustomAttributeByLabel`), footer (`SourceReferenceDisplay` with `emptyLabel="None recorded"`, `formatLastUpdated` parity with detail page, adoption summary), and loading/error/not-found columns aligned to dynamic row count.
- Added `mergeCustomAttributeUnionLabels`, `buildSystemCompareRowLabels`, `findCustomAttributeByLabel` in `frontend/src/lib/system-compare-union-labels.js` with Vitest coverage.
- Refactored `SystemComparePage.jsx` to mirror `ComparePage.jsx`: always-on grid per id, `removeId` with `replace: true`, dynamic `gridTemplateRows`, shared union labels across columns.
- `getSystemComparePhase` remains in the codebase for its unit tests; system compare no longer gates the grid on “≥2 successful columns” so per-column errors and single-column compare match organisation compare behaviour and story AC5.
- Automated: `frontend` lint + Vitest (all pass); `backend` Jest (all pass). **Pending:** Task 5 manual pass in the running app (`/compare/systems?ids=…`, 2–4 systems, remove from compare, no blank cells).

### File List

- `frontend/src/components/CompareColumnShell.jsx` (new)
- `frontend/src/components/OrganisationCard.jsx`
- `frontend/src/components/SystemCard.jsx` (new)
- `frontend/src/lib/system-compare-union-labels.js` (new)
- `frontend/src/lib/system-compare-union-labels.test.js` (new)
- `frontend/src/pages/SystemComparePage.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/9-2-systemcard-component-compare-column.md`

## Change Log

- 2026-05-02: Story 9.2 — shared compare column shell, `SystemCard`, union label merge, `SystemComparePage` wiring, tests and quality gates.
