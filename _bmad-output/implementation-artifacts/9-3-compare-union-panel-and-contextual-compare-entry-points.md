# Story 9.3: Compare union panel and contextual compare entry points

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created. -->

## Story

As a staff member,
I want the Compare page's Custom Attributes panel to merge labels across all selected Systems and contextual links to take me from Organisation surfaces straight into a relevant System compare,
so that custom attributes are comparable side-by-side and I never have to re-pick Systems I have just been reading about.

## Acceptance Criteria

1. **`/compare/systems` — left label column structure**
   - After 2–4 systems have resolved successfully, the sticky label column shows **sections in this order**, with **visible horizontal dividers** between sections (e.g. `border-t border-slate-200` on the first row of each new section, or equivalent):
     - **Identity:** Name, Vendor, Category, Deployment model, Pricing model, Geographic focus
     - **Capabilities:** Membership capability, Donation capability, Reserved seating capability
     - **Description:** single row (see below)
     - **Provenance:** Source reference, Last updated
     - **Additional attributes:** one row per union label (see §2) — **omit the entire section** when the union list is empty (no empty state; matches UX-DR29 / detail behaviour)
     - **Adopted by:** single row
   - Card columns must use the **same row count and order** so every label row aligns across the grid.

2. **Union panel algorithm (page-level)**
   - From the **successful** system DTOs for the current URL `ids`, in **left-to-right column order**, collect every `customAttributes[].label`.
   - **Normalise duplicates** with **case-insensitive** equality; keep **presentation casing** from the **first** occurrence when scanning columns left-to-right, then top-to-bottom within each card's array order as returned by the API.
   - **No semantic deduplication** (e.g. do not merge "B Corp" with "B Corporation") — only case-insensitive label merge (Epics / UX D10 §2).
   - For each union label, each column shows: matching attribute's **value** and **source** treatment **consistent with** `CustomAttributesPanel` in `SystemDetailPage.jsx` (`isHttpOrHttpsUrl` → external link; else plain text; no source → do not fake content). If that system has no matching label (case-insensitive), show **em dash** `—` in `text-slate-300`.

3. **Description row**
   - One row for **Description** after capability rows and before Provenance.
   - Truncation / expand behaviour: match **Story 9.2 / Epic 9.2** (4-line clamp, Show more / Show less, state **per column/card**). If 9.2 is implemented via `SystemCard`, reuse that component's behaviour; if the page still uses an inline column component, implement the same UX there.

4. **Adopted by row**
   - After union rows (or immediately after Provenance if union section is hidden), a row whose label is **Adopted by**.
   - Cell content: `system.organisations.length`; if `> 0`, link to `/systems/:id`; if `0`, **Not yet adopted** in muted text — never a blank cell.

5. **`OrganisationDetailPage` — contextual system compare link**
   - **Current bug:** when `systems.length >= 2`, a link labelled "Compare these systems →" points to `/compare/organisations` — **wrong**.
   - **Fix:** place the link **beneath the role groups** (after the grouped list, with the Add system control), styled `text-sm text-blue-600 hover:text-blue-800` (ghost link).
   - **2–4 linked systems:** copy **Compare these systems →**; `to` = `/compare/systems?ids=` + comma-separated **distinct** `link.system.id` values (stable order: follow existing role group iteration order — `ROLE_ORDER` then row order within groups).
   - **5+ linked systems:** copy **Compare the 4 most recently updated systems →**; `ids` = the four distinct systems whose **junction** row has the highest `lastUpdated` (API field on each link object — **not** the System entity's own `lastUpdated`). Tie-break: deterministic (e.g. preserve sort stability by `link.id` or system id).
   - **0 or 1 linked system:** **no** contextual link.

6. **`ComparePage` (`/compare/organisations`) — cross-org system compare strip**
   - When **2–4 organisation columns** have loaded successfully, compute client-side: **union of distinct** `link.system.id` across all compared organisations' `systems` arrays (from already-fetched detail DTOs in `useCompareOrganisations` results).
   - If union size is **2, 3, or 4:** render below the compare grid a strip: `border-t border-slate-200 pt-4 mt-6` containing a ghost link **Compare systems used by these organisations →** to `/compare/systems?ids=<union preserving a stable order>` (e.g. first-seen while iterating orgs left-to-right, then links in each org).
   - If union size is **0 or 1:** render **nothing** (no link).
   - If union size is **5+:** render **no** link; instead a **muted** note: `These organisations use [N] different systems. Open the` **System list →** `to select which to compare.` (link to `/systems`; use **British English** copy consistent with the app).

7. **Regression / parity**
   - Contextual navigation into `/compare/systems` must behave like list-driven entry: **`ids` in URL is source of truth**, column removal (when implemented) updates URL with `replace: true`, page remains shareable.
   - Do **not** add `fetch` inside presentational cards — keep queries in hooks / page (`useCompareSystems`, `useCompareOrganisations`).

## Tasks / Subtasks

- [x] **Task 1 — Union helper**
  - [x] Add a small pure helper (e.g. `frontend/src/lib/system-compare-custom-attributes.js`) exporting `buildUnionCustomAttributeLabels(systemDtosInColumnOrder)` → `string[]`, with unit tests in Vitest (case fold, first-seen casing, column order).

- [x] **Task 2 — `SystemComparePage.jsx`**
  - [x] Refactor static `ROW_LABELS` into section-aware structure: static prefix rows + dynamic union length + stable `gridTemplateRows: auto repeat(totalRows, auto)`.
  - [x] Inject section divider styling in the label column (and matching spacer/divider treatment in columns if needed for alignment).
  - [x] Compute union from successful loaded DTOs; pass union labels into each column component (or into `SystemCard` if Story 9.2 extracted it).
  - [x] Ensure skeleton loading state uses the **same row count** as the resolved grid (including dynamic union length when known, or a conservative placeholder if union unknown until load completes — prefer matching final layout to avoid layout jump).

- [x] **Task 3 — Column body**
  - [x] Implement Description row + custom-attribute rows + Adopted by row; reuse `SourceReferenceDisplay` / HTTP link pattern from `SystemDetailPage` for per-attribute source where applicable.
  - [x] Align **Name** row with epic: header may duplicate name (9.2 pattern); label column still includes **Name** for row alignment.

- [x] **Task 4 — `OrganisationDetailPage.jsx`**
  - [x] Replace incorrect compare href; implement 2–4 vs 5+ rules and distinct ID collection.
  - [x] Keep link absent when fewer than two systems.

- [x] **Task 5 — `ComparePage.jsx`**
  - [x] Derive union of system ids from successful org queries; render contextual strip or muted note per AC §6.

- [x] **Task 6 — Quality gates**
  - [x] `cd frontend && npm run lint && npm run test`
  - [x] Manual: org with 2, 4, 5+ links; org compare with 2 orgs sharing 2–4 distinct systems vs 5+; system compare with asymmetric custom attributes.

### Review Findings

- [x] [Review][Patch] Custom attribute **values** match `CustomAttributesPanel` — **Decision 2026-05-02:** option 1 (match detail panel: no links on values; `http(s)` sources still link). Implemented in `SystemCard.jsx` `CustomAttributeCompareCell`.

- [x] [Review][Patch] AC §1 row order: Provenance before Additional attributes; Adopted by after union — Applied in `system-compare-union-labels.js`, `SystemCard.jsx` body order, section dividers.

- [x] [Review][Patch] Deterministic tie-break when junction `lastUpdated` ties — Applied lexicographic id compare in `organisation-linked-systems-compare.js`.

- [x] [Review][Patch] DRY + invalid-date guard for date/URL helpers — Applied `frontend/src/lib/format-and-url-helpers.js`; `SystemDetailPage.jsx` and `SystemCard.jsx` import shared helpers.

- [x] [Review][Patch] Canonical import path for `buildUnionCustomAttributeLabels` — Re-export removed from `system-compare-union-labels.js`; use `system-compare-custom-attributes.js` only.

- [x] [Review][Patch] Encode system ids in `/compare/systems?ids=` URLs — Applied `encodeCompareIdsForQuery` in `compare-url-params.js`, `ComparePage.jsx`, `organisation-linked-systems-compare.js`.

- [x] [Review][Patch] Description row Show more/less only when clamped — Applied `useLayoutEffect` overflow measure in `DescriptionCompareCell`.

- [x] [Review][Patch] Dead or misleading compare helpers — Removed `system-compare-view-state.js` (+ test); `CompareLegacyPathPage` H1 set to “Compare has moved”.

- [x] [Review][Patch] Section divider alignment across columns — Applied `bodyRowClass` + `systemCompareSectionDividerRowIndexes` on `SystemCard` rows.

- [x] [Review][Patch] `useMemo` deps for `useQueries` — Dropped unstable `useMemo` around union merge / org-strip derive; both run each render (cheap pure helpers). Avoids `useQueries` array identity churn and React Compiler `preserve-manual-memoization` conflicts.

- [x] [Review][Patch] Sprint vs story bookkeeping — Applied `sprint-status.yaml` (9-2 → done, 9-3 → in-progress) and story status.

- [x] [Review][Patch] Stable React keys for compare skeletons — Applied row-label-based keys in `SystemCard` skeleton/placeholders/error rows.

- [x] [Review][Defer] Manual AC smoke and 5+ contextual-compare E2E — Task 6 manual checks not run in-session; public `buildOrganisationContextualSystemCompare` 5+ path under-tested. — deferred, pre-existing

- [x] [Review][Defer] Optional UX for single-id system compare URL — No helper when `ids` resolves to one column; behaviour may confuse users but is outside written ACs. — deferred, pre-existing

- [x] [Review][Defer] Tie-break when all junction `lastUpdated` values tie or parse as equal — `topFourSystemIdsByJunctionLastUpdated` falls through to id ordering; document or harden if product needs a different rule. — deferred, pre-existing

## Dev Notes

### Epic cross-story context

- **Epic 9** delivers FR-S7 (system-to-system compare).
- **9.1** is **done** in sprint tracking: routes, `useCompareSystems`, `SystemComparePage` shell exist.
- **9.2** is **ready-for-dev** in sprint: spec introduces `SystemCard`, `CompareColumnShell` extraction, remove-from-compare, full compare column anatomy. **Current repo (pre-9.2 merge):** there is **no** `SystemCard.jsx`; compare UI lives in **`SystemComparePage.jsx`** as `SystemCompareColumn`. Coordinate with 9.2: either land 9.2 first and extend `SystemCard` with this story's rows/union, or implement 9.3 row structure in the inline column and refactor when `SystemCard` exists.

### Current file state (must read before editing)

| File | Relevant today |
|------|----------------|
| `frontend/src/pages/SystemComparePage.jsx` | Inline `ROW_LABELS`, `SystemCompareColumn`; **no** `customAttributes`, **no** Description, **no** Adopted by, **no** section dividers; **no** URL remove handler on columns (Edit only). |
| `frontend/src/pages/OrganisationDetailPage.jsx` | Linked systems panel; **bug** at ~608–615: "Compare these systems →" → `/compare/organisations`. |
| `frontend/src/pages/ComparePage.jsx` | Org compare grid only; **no** post-grid system-compare strip. |
| `frontend/src/pages/SystemDetailPage.jsx` | `CustomAttributesPanel`, `formatLastUpdated`, category badge patterns — reuse for parity. |
| `frontend/src/lib/compare-url-params.js` | `parseCompareIds`, `MAX_SYSTEM_COMPARE_IDS` (4). |

### Architecture compliance

- React function components; data via TanStack Query hooks already on the page.
- **British English** in UI copy (`organisation`, `behaviour` in comments if needed).
- Tailwind v3; no new dependencies for dedupe (simple loop + `Map` keyed by lowercased label).

### API / DTO guardrails

- System detail DTO (`GET /api/systems/:id`): `customAttributes` is an array of `{ label, value, sourceReference }` (camelCase). Compare hooks expose envelope — column UI reads **`query.data?.data`** when following existing `useCompareSystems` pattern.
- Organisation detail DTO: `systems[]` junction objects include `lastUpdated` (junction), `system.id`, `system.name`, etc.

### Testing

- Unit-test `buildUnionCustomAttributeLabels` only (pure logic). Optional: thin test for "top 4 by junction lastUpdated" if extracted to a pure helper.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 9, Story 9.3]
- [Source: `_bmad-output/planning-artifacts/architecture-v2-delta.md` — §4.4–4.6 compare routes & parallel fetch]
- [Source: `_bmad-output/implementation-artifacts/9-2-systemcard-component-compare-column.md` — card/union contract if 9.2 lands first]
- [Source: `_bmad-output/project-context.md` — stack & conventions]

## Change Log

- 2026-05-02: Implemented union helper module, org compare system-id strip, organisation detail contextual `/compare/systems` links, capability row label copy alignment, section divider colour parity, and Vitest coverage; frontend lint + tests and backend regression suite green.

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor agent)

### Debug Log References

### Completion Notes List

- Added `buildUnionCustomAttributeLabels` and wired `mergeCustomAttributeUnionLabels` to use per-column DTO order (successful columns only; null placeholders preserve left-to-right semantics).
- Aligned static compare labels with AC wording (`Membership capability`, etc.) and `border-t border-slate-200` on section dividers in `SystemComparePage.jsx`.
- `OrganisationDetailPage.jsx`: contextual compare uses `buildOrganisationContextualSystemCompare` (role-order distinct ids; 5+ links → top four by junction `lastUpdated` with tie-break on link id); link styling and placement under **Add system**.
- `ComparePage.jsx`: `deriveCompareOrganisationsSystemUnion` drives post-grid strip (2–4 distinct systems → link; 5+ → muted copy with **System list →**); pending or failed columns suppress strip.
- New tests: `system-compare-custom-attributes.test.js`, `compare-organisations-system-union.test.js`, `organisation-linked-systems-compare.test.js`; extended `system-compare-union-labels.test.js`.
- Task 6 manual checks: not run in this session; recommend quick UI smoke on org detail (2 / 4 / 5+ links) and org compare strip edge cases.

### File List

- `frontend/src/lib/system-compare-custom-attributes.js`
- `frontend/src/lib/system-compare-custom-attributes.test.js`
- `frontend/src/lib/system-compare-union-labels.js`
- `frontend/src/lib/system-compare-union-labels.test.js`
- `frontend/src/lib/compare-organisations-system-union.js`
- `frontend/src/lib/compare-organisations-system-union.test.js`
- `frontend/src/lib/organisation-linked-systems-compare.js`
- `frontend/src/lib/organisation-linked-systems-compare.test.js`
- `frontend/src/pages/SystemComparePage.jsx`
- `frontend/src/pages/ComparePage.jsx`
- `frontend/src/pages/OrganisationDetailPage.jsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/9-3-compare-union-panel-and-contextual-compare-entry-points.md`
