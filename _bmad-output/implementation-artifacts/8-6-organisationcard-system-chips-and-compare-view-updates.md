# Story 8.6: OrganisationCard — System Chips and Compare-View Updates

Status: done

## Story

As a staff member,
I want the Organisation card (used on Compare and as a summary surface) to show linked Systems as compact role-tagged chips,
so that I can read an Organisation's stack at a glance instead of scanning two separate flat fields.

## Acceptance Criteria

**AC1 — Remove legacy ticketing/CRM rows**
- Remove the `ticketingProvider` and `crmPlatform` data extraction from `OrganisationCard`
- Remove the two Badge rows for Ticketing Provider and CRM Platform from the card's `inner` markup
- The card renders 8 attribute rows instead of 9 after this change

**AC2 — Systems chip strip (summary variant)**
- A "Systems" row replaces the two removed rows
- In the summary variant (`variant="summary"`, the default), each chip shows: Lucide role icon + system name; `text-xs text-slate-600 bg-slate-100 rounded px-2 py-0.5`
- Role icon mapping: `PRIMARY_TICKETING` → `Ticket`, `PRIMARY_CRM` → `Users`, `INTEGRATED_SUITE` → `Layers`, `SECONDARY` → `Link2`
- Strip caps at 3 chips; overflow shows "+N more" in `text-xs text-slate-400`
- Chips are **not links** — informational only
- When no systems linked: render "No systems linked" in `text-xs text-slate-400 italic`

**AC3 — Systems list (compare variant)**
- In the compare variant (`variant="compare"`), all linked systems are listed — the cap-at-3 rule is lifted
- Each entry: a role badge (`text-xs`, inline span, colour derived from the system's `category` field) + the system name as `<Link to={/systems/:id}>` (where `:id` = `link.system.id`)
- Category-to-colour mapping (same tokens as `SystemDetailPage.jsx` `CATEGORY_CONFIG`):
  - `INTEGRATED` → `bg-blue-50 text-blue-700 border border-blue-200`
  - `TICKETING` → `bg-amber-50 text-amber-700 border border-amber-200`
  - `AUDIENCE_MANAGEMENT` → `bg-purple-50 text-purple-700 border border-purple-200`
  - fallback → `bg-slate-50 text-slate-700 border border-slate-200`
- Role label text (rendered as `text-xs` beside the badge): same ROLE_LABELS map as `SystemDetailPage` (`PRIMARY_TICKETING` → "Primary ticketing", `PRIMARY_CRM` → "Primary CRM", `INTEGRATED_SUITE` → "Integrated suite", `SECONDARY` → "Secondary")
- When no systems linked: render "No systems linked" in `text-xs text-slate-400 italic`

**AC4 — `variant` prop**
- `OrganisationCard` accepts an optional `variant` prop: `"summary"` | `"compare"`
- Default is `"summary"` — existing usages (compare page passes `compareGridColumn`) gain the new chips without passing the prop explicitly
- Wait — `ComparePage.jsx` DOES need to pass `variant="compare"` because the compare page is the detail-level surface. See tasks.

**AC5 — ComparePage row labels and grid update**
- `ROW_LABELS` in `ComparePage.jsx` updated from 9 to 8 labels:
  ```js
  const ROW_LABELS = [
    'Country', 'Type', 'Systems',
    'Membership Capability', 'Donation Capability', 'Reserved Seating Capability',
    'Source Reference', 'Last Updated',
  ]
  ```
  (Replace 'Ticketing Provider' and 'CRM Platform' entries with a single 'Systems' entry)
- `gridTemplateRows` in `ComparePage.jsx`: `'auto repeat(8, auto)'` (was `'auto repeat(9, auto)'`)
- `OrganisationCard` called from `ComparePage` receives `variant="compare"` prop
- Skeleton and error-state filler `Array.from({ length: N })` counts updated from 9 → 8

**AC6 — No regressions**
- `cd frontend && npm run lint` passes with 0 errors
- `cd frontend && npm run test` passes
- Organisation compare page renders correctly with the new Systems row
- Organisation list page (if it renders OrganisationCard) is not broken

## Tasks / Subtasks

- [x] **Task 1: Update `OrganisationCard.jsx` — remove legacy fields, add systems (AC1–AC4)**
  - [x] Add Lucide imports: `import { Ticket, Users, Layers, Link2 } from 'lucide-react'`
  - [x] Add `ROLE_ICON_MAP`, `CATEGORY_CONFIG`, `ROLE_LABELS` constants (defined at module level, mirroring `SystemDetailPage.jsx` — do NOT import from there as it is a page-level function)
  - [x] Remove `ticketingName` and `crmName` data extraction from the `isSuccess` branch
  - [x] Remove the two Badge rows for ticketing/crm from `inner` markup
  - [x] Add a `SystemsCell` helper (or inline JSX) that renders the correct strip for `"summary"` vs `"compare"` variant
  - [x] Add optional `variant` prop (default `"summary"`) to `OrganisationCard`
  - [x] Update skeleton `Array.from({ length: 9 })` → `Array.from({ length: 8 })` in `OrganisationCardSkeleton`
  - [x] Update error-state filler `Array.from({ length: 9 })` → `Array.from({ length: 8 })` in both `notFound` and `isError` branches

- [x] **Task 2: Update `ComparePage.jsx` (AC5)**
  - [x] Replace `ROW_LABELS` array — drop 'Ticketing Provider' and 'CRM Platform', add 'Systems' (8 labels total)
  - [x] Update `gridTemplateRows` to `'auto repeat(8, auto)'`
  - [x] Pass `variant="compare"` to `<OrganisationCard>` in the `ids.map` call

- [x] **Task 3: Lint and test (AC6)**
  - [x] `cd frontend && npm run lint` — 0 errors
  - [x] `cd frontend && npm run test` — all pass

### Review Findings

- [x] [Review][Patch] Unguarded nested access on organisation system links (`link.system`) — Chip and compare list branch into `link.system.name`, `.id`, and `.category` without checking `link.system` exists. A partial or regressing API row risks a runtime error or a blank chip/link label. Prefer optional chaining and visible fallbacks (e.g. “Unnamed system”) or omit the row when `system` is missing. [frontend/src/components/OrganisationCard.jsx:~32]

**Resolved 2026-05-01:** Introduced `linkedSystemPresentation()` for safe name, optional `href`, and category fallback; compare variant renders plain text when ID is absent.

## Dev Notes

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/OrganisationCard.jsx` | Major: remove legacy ticketing/CRM, add Systems strip, add `variant` prop |
| `frontend/src/pages/ComparePage.jsx` | Minor: update ROW_LABELS, grid rows count, pass `variant="compare"` |

**Do NOT touch:**
- `frontend/src/components/ui/badge.jsx` — no new tones needed; category colours are inlined in `OrganisationCard` using the same CATEGORY_CONFIG pattern as `SystemDetailPage.jsx`
- `backend/` — API is fully implemented; `systems[]` is already embedded in the org detail response (Story 8.2)
- `frontend/src/pages/OrganisationDetailPage.jsx` — no changes needed
- `frontend/src/pages/OrganisationListPage.jsx` — `OrganisationCard` is not used here; no changes needed
- `frontend/src/pages/SystemDetailPage.jsx` — do not import from it; copy the patterns locally

### Data Shape — `systems` Array

The `systems` array is already embedded in every v2 org response (Story 8.2). Shape:

```js
[
  {
    id: string,              // junction row ID (OrganisationSystem.id)
    role: string,            // 'PRIMARY_TICKETING' | 'PRIMARY_CRM' | 'INTEGRATED_SUITE' | 'SECONDARY'
    sourceReference: string | null,
    note: string | null,
    lastUpdated: string,     // ISO 8601
    system: {
      id: string,            // System.id — use this for the /systems/:id link
      name: string,
      vendor: string,
      category: string,      // 'INTEGRATED' | 'TICKETING' | 'AUDIENCE_MANAGEMENT'
    }
  }
]
```

Access via: `org.systems ?? []` — treat missing key as empty array.

### Constants to Define in `OrganisationCard.jsx`

```js
import { Ticket, Users, Layers, Link2 } from 'lucide-react'

const ROLE_ICON_MAP = {
  PRIMARY_TICKETING: Ticket,
  PRIMARY_CRM: Users,
  INTEGRATED_SUITE: Layers,
  SECONDARY: Link2,
}

const ROLE_LABELS = {
  PRIMARY_TICKETING: 'Primary ticketing',
  PRIMARY_CRM: 'Primary CRM',
  INTEGRATED_SUITE: 'Integrated suite',
  SECONDARY: 'Secondary',
}

const CATEGORY_CONFIG = {
  INTEGRATED: 'bg-blue-50 text-blue-700 border border-blue-200',
  TICKETING: 'bg-amber-50 text-amber-700 border border-amber-200',
  AUDIENCE_MANAGEMENT: 'bg-purple-50 text-purple-700 border border-purple-200',
}
```

### Summary Variant Chip Rendering

```jsx
// Rendered inside the Systems cell, summary variant
function SystemsChipStrip({ systems }) {
  if (!systems || systems.length === 0) {
    return <span className="text-xs text-slate-400 italic">No systems linked</span>
  }
  const visible = systems.slice(0, 3)
  const overflow = systems.length - 3
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((link) => {
        const Icon = ROLE_ICON_MAP[link.role] ?? Link2
        return (
          <span
            key={link.id}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
          >
            <Icon size={11} aria-hidden />
            {link.system.name}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className="text-xs text-slate-400">+{overflow} more</span>
      )}
    </div>
  )
}
```

### Compare Variant Systems Rendering

```jsx
// Rendered inside the Systems cell, compare variant
function SystemsCompareList({ systems }) {
  if (!systems || systems.length === 0) {
    return <span className="text-xs text-slate-400 italic">No systems linked</span>
  }
  return (
    <div className="flex flex-col gap-1.5">
      {systems.map((link) => {
        const catCls = CATEGORY_CONFIG[link.system.category] ?? 'bg-slate-50 text-slate-700 border border-slate-200'
        const roleLabel = ROLE_LABELS[link.role] ?? link.role
        return (
          <div key={link.id} className="flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${catCls}`}>
              {roleLabel}
            </span>
            <Link to={`/systems/${encodeURIComponent(link.system.id)}`} className="text-blue-600 hover:text-blue-800">
              {link.system.name}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
```

### Updated `OrganisationCard` Data Extraction

```js
// Replace ticketingName / crmName extraction with:
const systems = Array.isArray(org.systems) ? org.systems : []
```

### Updated `inner` Systems Row (replaces two rows)

```jsx
<div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
  {variant === 'compare'
    ? <SystemsCompareList systems={systems} />
    : <SystemsChipStrip systems={systems} />
  }
</div>
```

### `OrganisationCard` Prop Signature Update

```jsx
export function OrganisationCard({ organisationId, query, onRemove, compareGridColumn, variant = 'summary' }) {
```

Pass `variant` through to the `SystemsChipStrip` / `SystemsCompareList` selection and also to `OrganisationCardSkeleton` if needed (skeleton doesn't change behaviour by variant, just count).

### `ComparePage.jsx` Changes — Complete Diff

```js
// Before
const ROW_LABELS = [
  'Country', 'Type', 'Ticketing Provider', 'CRM Platform',
  'Membership Capability', 'Donation Capability', 'Reserved Seating Capability',
  'Source Reference', 'Last Updated',
]

// After
const ROW_LABELS = [
  'Country', 'Type', 'Systems',
  'Membership Capability', 'Donation Capability', 'Reserved Seating Capability',
  'Source Reference', 'Last Updated',
]
```

```jsx
// gridTemplateRows before: 'auto repeat(9, auto)'
// gridTemplateRows after:  'auto repeat(8, auto)'
```

```jsx
// OrganisationCard call: add variant="compare"
<OrganisationCard
  key={id}
  compareGridColumn={index + 2}
  variant="compare"
  organisationId={id}
  query={queries[index]}
  onRemove={() => removeId(id)}
/>
```

### Skeleton Count Update

Both skeleton `Array.from` calls go from `{ length: 9 }` to `{ length: 8 }`:
1. `OrganisationCardSkeleton` → `Array.from({ length: 8 })`
2. `notFound` branch (error card filler) → `Array.from({ length: 8 })`
3. `isError` branch (error card filler) → `Array.from({ length: 8 })`

### Architecture Compliance

- `OrganisationCard` is a **component** in `frontend/src/components/` — it accepts props and renders; it does not call `fetch` or use hooks
- `Link` import from `react-router-dom` is already in the file — no new import for links
- Lucide icons (`lucide-react`) are a project dependency — already used in `SystemDetailPage.jsx` and other pages
- No new npm packages required
- No backend changes — `systems[]` is in the response from Story 8.2

### Route Context

- The organisation compare page currently responds to both `/compare` and `/compare/organisations` (see `App.jsx:67-68`). Story 9.1 will handle route cleanup. This story does not touch routing.
- The `variant="compare"` prop enables the linked system names as `<Link to="/systems/:id">` — these resolve correctly with the current routing.

### Previous Story Learnings (8-5)

1. **`lucide-react` import pattern:** Import named icons directly: `import { Ticket, Users, Layers, Link2 } from 'lucide-react'` — same pattern as SystemDetailPage/SystemListPage.
2. **Avoid re-exporting from page files:** `SystemCategoryBadge` in `SystemDetailPage.jsx` is a module-level function, not exported — copy the `CATEGORY_CONFIG` pattern into `OrganisationCard.jsx` rather than attempting a cross-import.
3. **`encodeURIComponent` on IDs:** Use `encodeURIComponent(link.system.id)` in the link `to` prop — same pattern as existing `Link to={/organisations/${encodeURIComponent(organisationId)}/edit}` in the card header.
4. **Array safety:** Access `org.systems` as `Array.isArray(org.systems) ? org.systems : []` — the DTO may omit the field on very old cached data.

### UX Specification Reference

- UX D6.1 — OrganisationCard system chips strip (summary variant: icon + name, cap 3, no links)
- UX D6.1 (compare column) — compare variant: role badge (category colour) + system name as link, no cap
- UX D9 — `OrganisationCard` updated component strategy (replaces ticketingProvider/crmPlatform rows)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Removed `ticketingName`/`crmName` extraction; replaced with `systems = Array.isArray(org.systems) ? org.systems : []`
- Added `ROLE_ICON_MAP`, `ROLE_LABELS`, `CATEGORY_CONFIG` constants at module level in `OrganisationCard.jsx` (not imported from `SystemDetailPage.jsx` per story guidance)
- Added `SystemsChipStrip` (summary: icon + name, cap 3, +N overflow, no links) and `SystemsCompareList` (compare: category badge + system name as `<Link>`, no cap) helper functions
- Added `variant = 'summary'` prop to `OrganisationCard`; compare variant renders `SystemsCompareList`, summary renders `SystemsChipStrip`
- All three `Array.from({ length: 9 })` skeleton/error filler counts updated to `{ length: 8 }` (skeleton, notFound, isError branches)
- `ComparePage.jsx`: `ROW_LABELS` trimmed from 9 to 8 entries (Ticketing Provider + CRM Platform → Systems); `gridTemplateRows` updated to `'auto repeat(8, auto)'`; `<OrganisationCard>` call gains `variant="compare"`
- `npm run lint`: 0 errors; `npm run test`: 14/14 passed

### File List

- `frontend/src/components/OrganisationCard.jsx`
- `frontend/src/pages/ComparePage.jsx`

## Change Log

- 2026-05-01: Code review — hardened `SystemsChipStrip` / `SystemsCompareList` via `linkedSystemPresentation()` (fallback name, category, link only when ID present).
- 2026-05-01: Implemented Story 8.6 — removed legacy ticketingProvider/crmPlatform rows from OrganisationCard, added Systems chip strip (summary variant) and Systems compare list (compare variant), updated ComparePage ROW_LABELS and grid from 9 → 8 rows
