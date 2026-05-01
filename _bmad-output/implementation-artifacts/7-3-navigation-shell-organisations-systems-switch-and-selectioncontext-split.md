# Story 7.3: Navigation Shell — Organisations + Systems Switch and SelectionContext Split

Status: done

## Story

As a staff member,
I want a top-level navigation that lets me move between the Organisations and Systems catalogues without losing my place,
So that I can curate either side of the catalogue without one workflow's state interfering with the other.

## Acceptance Criteria

**Given** the v1 top navigation bar (`bg-slate-800`) shows only the app name and an "Organisations" link
**When** the v2 navigation update is applied
**Then** the nav also renders a "Systems" link to the right of "Organisations" sharing the same active/inactive treatment: active is `text-white font-medium`; inactive is `text-slate-400 hover:text-white`
**And** the active treatment is determined from the current pathname — `/organisations*` activates the Organisations link; `/systems*` activates the Systems link; the legacy `/compare/organisations*` activates Organisations; `/compare/systems*` activates Systems

**Given** the v1 application mounts a single `SelectionProvider` from `context/SelectionProvider.jsx`
**When** the context is split for v2
**Then** two providers exist: `OrganisationSelectionContext` (file: `context/OrganisationSelectionContext.jsx`) and `SystemSelectionContext` (file: `context/SystemSelectionContext.jsx`)
**And** each exports the same shape `{ selectedIds: string[], toggleSelection(id), clearSelection() }` via dedicated hooks `useOrganisationSelection` and `useSystemSelection`
**And** both providers wrap the route tree in `App.jsx` — order is irrelevant, they are independent

**Given** a staff member toggles selection on the Organisation list
**When** the staff member then navigates to the System list and toggles selection there
**Then** the Organisation selection set is preserved untouched
**And** the System selection set is independent
**And** clearing one context never clears the other

**Given** the existing v1 `useSelection` hook usages on Organisation list, Compare bar, and Compare page
**When** the migration to `useOrganisationSelection` is complete
**Then** every previous `useSelection` import is replaced with `useOrganisationSelection`
**And** no file imports the old `SelectionContext` after the migration (old files deleted)

**Given** `CompareSelectionBar` from v1 was bound implicitly to the single context
**When** v2 instantiates it on the Organisation list
**Then** the component accepts an `entityLabel` prop (`"organisations"` or `"systems"`) and a `useSelectionHook` prop (hook function reference)
**And** the disabled-state tooltip reads "Select up to 4 organisations to compare" for entityLabel `"organisations"`
**And** the Organisation list instance navigates to `/compare/organisations?ids=<id1>,<id2>,...`

**Given** any keyboard user navigates the app
**When** the focus traverses the top-nav links
**Then** focus indicators on both links use `ring-2 ring-blue-500 ring-offset-2` consistent with v1 UX-DR19

## Tasks / Subtasks

- [x] **Task 1** — Create `OrganisationSelectionContext.jsx` — new context + provider (AC: split context)
  - [x] **1.1** — Create `frontend/src/context/OrganisationSelectionContext.jsx` exporting `OrganisationSelectionProvider` component (context object split into `organisation-selection-context.js` per eslint `react-refresh/only-export-components` rule)
  - [x] **1.2** — Provider is identical in structure to v1 `SelectionProvider.jsx`: `useState([])`, `useCallback` toggle and clear, `useMemo` value — wires into `OrganisationSelectionContext`

- [x] **Task 2** — Create `SystemSelectionContext.jsx` — new context + provider (AC: split context)
  - [x] **2.1** — Create `frontend/src/context/SystemSelectionContext.jsx` — identical shape to Task 1 but using `SystemSelectionContext` (context object in `system-selection-context.js`)

- [x] **Task 3** — Create hooks `useOrganisationSelection.js` and `useSystemSelection.js` (AC: dedicated hooks)
  - [x] **3.1** — Create `frontend/src/hooks/useOrganisationSelection.js`: `useContext(OrganisationSelectionContext)`; throw if null
  - [x] **3.2** — Create `frontend/src/hooks/useSystemSelection.js`: `useContext(SystemSelectionContext)`; throw if null

- [x] **Task 4** — Update `CompareSelectionBar.jsx` — add `entityLabel` + `useSelectionHook` props (AC: entityLabel prop)
  - [x] **4.1** — Add `{ entityLabel, useSelectionHook }` props; call `useSelectionHook()` instead of `useSelection()`
  - [x] **4.2** — Compute singular: `entityLabel.slice(0, -1)` (organisations → organisation; systems → system)
  - [x] **4.3** — Update selected count copy: `{n} {n === 1 ? entityLabel.slice(0, -1) : entityLabel} selected`
  - [x] **4.4** — Update tooltip: `Select up to 4 ${entityLabel} to compare`
  - [x] **4.5** — Update compare navigate: `` navigate(`/compare/${entityLabel}?ids=${selectedIds.join(',')}`) ``
  - [x] **4.6** — Remove `import { useSelection }` (no longer needed)

- [x] **Task 5** — Update `App.jsx` — new nav, two providers, compare/organisations route (AC: nav + providers)
  - [x] **5.1** — Extracted `NavLinks` inner component calling `useLocation()` to compute active state: `/organisations*` and `/compare/organisations*` → orgs active; `/systems*` and `/compare/systems*` → systems active
  - [x] **5.2** — Both links use `<Link>` (not `<NavLink>`) with class computed from active boolean: `text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800` + active/inactive treatment
  - [x] **5.3** — Nav layout: flex row, `gap-6` between the two link items; app name on left, links on right
  - [x] **5.4** — Replace `<SelectionProvider>` with `<OrganisationSelectionProvider><SystemSelectionProvider>` wrapping the route tree
  - [x] **5.5** — Added route `<Route path="/compare/organisations" element={<ComparePage />} />` alongside existing `/compare` route
  - [x] **5.6** — Removed import of old `SelectionProvider`; added imports for new providers

- [x] **Task 6** — Update `OrganisationListPage.jsx` — swap hook + fix compare URL (AC: migration)
  - [x] **6.1** — Replaced `import { useSelection }` with `import { useOrganisationSelection }` from `../hooks/useOrganisationSelection.js`
  - [x] **6.2** — All `useSelection()` calls (2 call sites) → `useOrganisationSelection()`
  - [x] **6.3** — Updated `CompareSelectionBar` render: `<CompareSelectionBar entityLabel="organisations" useSelectionHook={useOrganisationSelection} />`

- [x] **Task 7** — Delete old context files (AC: no old SelectionContext imports)
  - [x] **7.1** — Deleted `frontend/src/context/SelectionProvider.jsx`
  - [x] **7.2** — Deleted `frontend/src/context/selection-context.js`
  - [x] **7.3** — Deleted `frontend/src/hooks/useSelection.js`

- [x] **Task 8** — Verify `ComparePage.jsx` does not use `useSelection` (it reads ids from URL only — no context)
  - [x] **8.1** — Confirmed `ComparePage.jsx` has no `useSelection` import (uses `useSearchParams` only)

### Review Findings

- [x] [Review][Decision] Systems nav link vs `Route` — Resolved (option A): added `frontend/src/pages/SystemsPlaceholderPage.jsx` and `<Route path="/systems" element={<SystemsPlaceholderPage />} />` until Story 7-4 replaces it.
- [x] [Review][Patch] Harden `CompareSelectionBar` required props — Implemented: thin wrapper validates `entityLabel` (non-empty trimmed string) and `useSelectionHook` (function) before `CompareSelectionBarImpl` runs hooks. `frontend/src/components/CompareSelectionBar.jsx`
- [x] [Review][Defer] No automated tests added for pathname-based nav highlighting or `/compare/organisations?ids=` navigation [`frontend`] — deferred, optional follow-up; scoped diff excluded test additions.

## Dev Notes

### Existing SelectionContext structure (v1)

Two files to replace and delete:

| File | Status |
|------|--------|
| `frontend/src/context/selection-context.js` | DELETE — exports `SelectionContext = createContext(null)` |
| `frontend/src/context/SelectionProvider.jsx` | DELETE — exports `SelectionProvider` using `selection-context.js` |
| `frontend/src/hooks/useSelection.js` | DELETE — exports `useSelection()` using `SelectionContext` |

All three files are replaced by new context files + hooks in Tasks 1–3.

### New context file shape (replicate exactly for both)

```jsx
// frontend/src/context/OrganisationSelectionContext.jsx
import { createContext, useCallback, useMemo, useState } from 'react'

export const OrganisationSelectionContext = createContext(null)

export function OrganisationSelectionProvider({ children }) {
  const [selectedIds, setSelectedIds] = useState([])

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const value = useMemo(
    () => ({ selectedIds, toggleSelection, clearSelection }),
    [selectedIds, toggleSelection, clearSelection]
  )

  return (
    <OrganisationSelectionContext.Provider value={value}>
      {children}
    </OrganisationSelectionContext.Provider>
  )
}
```

```jsx
// frontend/src/context/SystemSelectionContext.jsx — identical pattern
export const SystemSelectionContext = createContext(null)
export function SystemSelectionProvider({ children }) { ... }
```

### New hook shape

```js
// frontend/src/hooks/useOrganisationSelection.js
import { useContext } from 'react'
import { OrganisationSelectionContext } from '../context/OrganisationSelectionContext.jsx'

export function useOrganisationSelection() {
  const ctx = useContext(OrganisationSelectionContext)
  if (!ctx) throw new Error('useOrganisationSelection must be used within OrganisationSelectionProvider')
  return ctx
}
```

```js
// frontend/src/hooks/useSystemSelection.js — same pattern with SystemSelectionContext
```

### CompareSelectionBar refactor — exact prop interface

The hook is passed as a prop (`useSelectionHook`) to avoid conditional hook calls inside the component. Do NOT call both hooks and conditionally use one — that violates React's rules of hooks.

```jsx
export function CompareSelectionBar({ entityLabel, useSelectionHook }) {
  const navigate = useNavigate()
  const { selectedIds, clearSelection } = useSelectionHook()
  const n = selectedIds.length
  const tooMany = n >= 5
  const canCompare = n >= 1 && n <= 4
  const entitySingular = entityLabel.slice(0, -1) // 'organisations' → 'organisation'

  const handleCompare = () => {
    if (!canCompare) return
    navigate(`/compare/${entityLabel}?ids=${selectedIds.join(',')}`)
  }

  return (
    ...
    <p>
      <span className="font-medium text-white">{n}</span>{' '}
      {n === 1 ? entitySingular : entityLabel} selected
    </p>
    ...
    {tooMany ? (
      <p id="compare-selection-limit-hint">
        Select up to 4 {entityLabel} to compare
      </p>
    ) : null}
    <Button ... onClick={handleCompare}>
      Compare selected ({n}) →
    </Button>
    ...
  )
}
```

### Nav active logic — use NavLinks sub-component

`useLocation` cannot be called inside `className` function passed to `NavLink`. Extract a `NavLinks` component inside `App()` that calls `useLocation()`:

```jsx
// Must be rendered *inside* BrowserRouter (already the case in App.jsx)
function NavLinks() {
  const { pathname } = useLocation()
  const orgsActive = pathname.startsWith('/organisations') || pathname.startsWith('/compare/organisations')
  const sysActive = pathname.startsWith('/systems') || pathname.startsWith('/compare/systems')
  const cls = (active) =>
    `text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
      active ? 'text-white font-medium' : 'text-slate-400 hover:text-white'
    }`
  return (
    <>
      <Link to="/organisations" className={cls(orgsActive)}>Organisations</Link>
      <Link to="/systems" className={cls(sysActive)}>Systems</Link>
    </>
  )
}
```

Use `Link` (not `NavLink`) since active state is computed manually. Import `Link` from `react-router-dom`.

### App.jsx provider wrapping order

Both providers wrap the full route tree. Inner-to-outer order is irrelevant — they are independent. Suggested nesting:

```jsx
<OrganisationSelectionProvider>
  <SystemSelectionProvider>
    <Routes>
      ...
    </Routes>
  </SystemSelectionProvider>
</OrganisationSelectionProvider>
```

### Route addition for /compare/organisations

Add alongside existing `/compare` route:

```jsx
<Route path="/compare/organisations" element={<ComparePage />} />
<Route path="/compare" element={<ComparePage />} />
```

The existing `ComparePage` reads `?ids=` from the URL via `useSearchParams` — it works with both paths unchanged. Do NOT delete the old `/compare` route (that happens in Story 9.1).

### OrganisationListPage.jsx — exact changes

1. Import change: `useOrganisationSelection` replaces `useSelection`
2. All `useSelection()` call sites:
   - Line 28 in current file: `import { useSelection } from '../hooks/useSelection.js'` → `import { useOrganisationSelection } from '../hooks/useOrganisationSelection.js'`
   - Line 293: `const { selectedIds, toggleSelection } = useSelection()` → `useOrganisationSelection()`
   - Line 624: `const { selectedIds } = useSelection()` → `useOrganisationSelection()`
3. CompareSelectionBar render (line 692): `<CompareSelectionBar />` → `<CompareSelectionBar entityLabel="organisations" useSelectionHook={useOrganisationSelection} />`

### Project Structure Notes

New files (follow existing context/ and hooks/ flat structure — no subdirectories):

```
frontend/src/
  context/
    OrganisationSelectionContext.jsx   ← NEW
    SystemSelectionContext.jsx          ← NEW
    [SelectionProvider.jsx]             ← DELETE
    [selection-context.js]              ← DELETE
  hooks/
    useOrganisationSelection.js         ← NEW
    useSystemSelection.js               ← NEW
    [useSelection.js]                   ← DELETE
```

### Current inactive nav link colour

The current `App.jsx` uses `text-slate-300` for inactive nav links. The epics and UX spec specify `text-slate-400`. Update to `text-slate-400` as part of this story.

### References

- Epics Story 7.3 (line 1210–1249): `_bmad-output/planning-artifacts/epics.md`
- UX Spec D1 Navigation Shell Update (line 783–800): `_bmad-output/planning-artifacts/ux-design-specification.md`
- UX Spec UX-DR21 (line 793–799): SelectionContext split spec
- UX Spec UX-DR22 (line 785–791): Top nav dual link spec
- Current `App.jsx`: `frontend/src/App.jsx`
- Current `SelectionProvider.jsx`: `frontend/src/context/SelectionProvider.jsx`
- Current `selection-context.js`: `frontend/src/context/selection-context.js`
- Current `useSelection.js`: `frontend/src/hooks/useSelection.js`
- Current `CompareSelectionBar.jsx`: `frontend/src/components/CompareSelectionBar.jsx`
- Current `OrganisationListPage.jsx`: `frontend/src/pages/OrganisationListPage.jsx`
- Current `ComparePage.jsx`: `frontend/src/pages/ComparePage.jsx` — no changes needed; reads `?ids=` from URL only

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Debug Log References

### Completion Notes List

- Context split into 4 files (not 2) due to `react-refresh/only-export-components` ESLint rule: context objects in `.js` files (`organisation-selection-context.js`, `system-selection-context.js`), provider components in `.jsx` files — mirrors the v1 `selection-context.js` / `SelectionProvider.jsx` split.
- `CompareSelectionBar` refactored to accept `entityLabel` + `useSelectionHook` props; hook-as-prop pattern avoids conditional hook calls inside the component.
- `NavLinks` extracted as inner component inside `App()` to call `useLocation()` (must be inside `BrowserRouter`); uses `<Link>` not `<NavLink>` since active state computed manually.
- Inactive nav link colour updated from v1 `text-slate-300` to `text-slate-400` per UX spec.
- `/compare/organisations` route added; old `/compare` route retained for Story 9.1 cleanup.
- Code review follow-up: `CompareSelectionBar` prop validation wrapper (invalid `entityLabel` / `useSelectionHook` fail fast); `/systems` stub page and route until Story 7-4.
- Backend test suite: 172 tests, 12 suites, 0 regressions. Frontend ESLint: clean.

### File List

- `frontend/src/context/organisation-selection-context.js` — NEW (exports `OrganisationSelectionContext`)
- `frontend/src/context/OrganisationSelectionContext.jsx` — NEW (exports `OrganisationSelectionProvider`)
- `frontend/src/context/system-selection-context.js` — NEW (exports `SystemSelectionContext`)
- `frontend/src/context/SystemSelectionContext.jsx` — NEW (exports `SystemSelectionProvider`)
- `frontend/src/hooks/useOrganisationSelection.js` — NEW
- `frontend/src/hooks/useSystemSelection.js` — NEW
- `frontend/src/components/CompareSelectionBar.jsx` — UPDATED (entityLabel + useSelectionHook props)
- `frontend/src/App.jsx` — UPDATED (NavLinks, two providers, compare/organisations route, `/systems` placeholder route)
- `frontend/src/pages/OrganisationListPage.jsx` — UPDATED (useOrganisationSelection, CompareSelectionBar props)
- `frontend/src/pages/SystemsPlaceholderPage.jsx` — NEW (stub until Story 7-4 system list)
- `frontend/src/context/SelectionProvider.jsx` — DELETED
- `frontend/src/context/selection-context.js` — DELETED
- `frontend/src/hooks/useSelection.js` — DELETED
