# Story 8.3: Organisation List — Filter Sidebar Re-shape (Adopted System + Role)

Status: done

## Story

As a staff member,
I want to filter the Organisation list by which System an organisation has adopted, with an optional role sub-filter,
so that I can answer procurement-pattern questions like "which UK opera houses use Tessitura as their integrated suite?"

## Acceptance Criteria

**AC1 — Remove Provider and CRM dropdowns**
**Given** the v1 Organisation list filter sidebar contains Provider and CRM dropdowns
**When** the v2 re-shape is applied
**Then** both dropdowns are removed from `OrganisationListFilterSection`
**And** the `useTicketingProvidersQuery` and `useCrmPlatformsQuery` imports and calls are removed from `OrganisationListPage.jsx`
**And** the `useCrmPlatformsQuery`, `useTicketingProvidersQuery` imports from `useMetaReferenceData.js` are no longer referenced in the list page

**AC2 — Adopted system combobox**
**Given** the filter sidebar is re-shaped
**When** it renders
**Then** a `SystemCombobox` component appears where Provider/CRM dropdowns were, with placeholder "Search by adopted system…"
**And** typing in the combobox calls `GET /api/systems?q=[term]&limit=20` (debounced ~300ms via `useSystemSearch` hook — separate query key `['system-search', q]`, not `['systems', ...]`)
**And** each dropdown result row shows the System name (`font-medium`) and Category Badge (amber/blue/purple tokens)
**And** selecting a result sets the URL `system` param to the System's UUID and shows the System name in the combobox input

**AC3 — Role sub-filter**
**Given** an Adopted system is selected (URL `system` param is set)
**When** the sidebar re-renders
**Then** a "Role" select appears directly below the combobox with options: Any role / Primary ticketing / Primary CRM / Integrated suite / Secondary
**And** selecting a role sets the URL `system_role` param to the corresponding `SystemRole` enum value (`PRIMARY_TICKETING`, `PRIMARY_CRM`, `INTEGRATED_SUITE`, `SECONDARY`)
**And** selecting "Any role" removes `system_role` from the URL
**And** the Role select is hidden when no system is selected
**And** clearing the system (via combobox clear) also removes `system_role` from the URL atomically — no dangling `system_role` that triggers the Story 8.2 controller 400 rejection

**AC4 — ActiveFilterChips v2**
**Given** any combination of v2 filters is active
**When** `ActiveFilterChips` renders
**Then** the `system` chip shows "Adopted system: [System name]" — name resolved from the selected system data (falls back to "Adopted system: [uuid]" while loading)
**And** the `system_role` chip shows "Role: [humanised role label]" — only when `system` is also active
**And** dismissing the `system` chip also atomically clears `system_role` from the URL
**And** the v1 `provider` and `crm` chip handlers are gone (those keys are no longer in `LIST_FILTER_PARAM_KEYS` — removed in Story 8.2)

**AC5 — URL pre-population**
**Given** the URL contains `?system=<uuid>&system_role=INTEGRATED_SUITE&country=UK`
**When** a staff member opens this URL directly (browser back, bookmarked link)
**Then** the combobox renders the System name pre-selected (fetched via `useSystem(uuid)`)
**And** the Role select renders "Integrated suite" pre-selected
**And** the Country filter renders "UK" pre-selected
**And** the result table reflects the combined filter (backend already handles this from Story 8.2)

**AC6 — Table columns clean-up**
**Given** the table was rendering `org.ticketingProvider` and `org.crmPlatform` (now removed from API response since Story 8.2)
**When** Story 8.3 is applied
**Then** those two columns and their `<th>` headers ("Ticketing Provider", "CRM Platform") are removed from the table
**And** the skeleton `TableSkeleton` column count drops from 10 to 8 to match the actual column count
**And** `colSpan` values in the capability legend row are updated accordingly

**AC7 — No regressions**
**Given** all changes are applied
**When** tests and linting run
**Then** `cd frontend && npm run lint` passes with 0 errors
**And** `cd frontend && npm run test` passes (Vitest, 4 tests)
**And** the Organisation list page renders correctly: search, country, type, capability filters still work; `ActiveFilterChips` still renders chips for those dimensions

## Tasks / Subtasks

- [x] **Task 1** — Create `frontend/src/hooks/useSystemSearch.js` (AC: #2)
  - [x] **1.1** — Import `useQuery` from `@tanstack/react-query` and `fetchSystems` from `../api/systems.js`
  - [x] **1.2** — Accept a single `term` string param (the raw input value, not yet debounced)
  - [x] **1.3** — Apply `useDebouncedValue(term, 300)` internally using the existing hook from `../hooks/useDebouncedValue.js`
  - [x] **1.4** — Use query key `['system-search', debounced]` — NOT `['systems', ...]` to avoid colliding with the System list page cache and invalidation
  - [x] **1.5** — Set `enabled: debounced.trim().length > 0` — do not fire on empty input
  - [x] **1.6** — Call `fetchSystems({ q: debounced, limit: 20 })` — returns the full `{ data, meta }` envelope; extract `body.data` array for the dropdown
  - [x] **1.7** — Return `{ systems: data?.data ?? [], isLoading, isError }` from the hook

- [x] **Task 2** — Create `frontend/src/components/SystemCombobox.jsx` (AC: #2, #3, #5)
  - [x] **2.1** — Props: `{ selectedId, onSelect, placeholder }` where `selectedId: string | null` (from URL), `onSelect: (system: {id, name, category} | null) => void`, `placeholder: string` defaults to "Search by adopted system…"
  - [x] **2.2** — Internal state: `searchTerm` (controlled text input value), `isOpen` (dropdown visible), `activeIndex` (keyboard nav), `mode: 'displaying' | 'searching'`
  - [x] **2.3** — Use `useSystem(selectedId)` (from `../hooks/useSystem.js`) to get the selected system's name and category — `enabled` only when `selectedId` is truthy; this handles URL pre-population
  - [x] **2.4** — Use `useSystemSearch(searchTerm)` (Task 1) to get dropdown results when user is typing
  - [x] **2.5** — Display logic: when `selectedId` is set and `useSystem` has resolved data, show the system name in the input (read-only / non-search mode); when user focuses the input while a system is selected, switch to search mode (clear input text, show dropdown); when `selectedId` is null, input is always in search mode
  - [x] **2.6** — Dropdown: `position: absolute`, `z-index: 50`, `bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto`, appears below the input; each result row shows `<span class="font-medium">{name}</span>` + Category Badge using the v2 tokens (Integrated → blue-50/blue-700/blue-200, Ticketing → amber-50/amber-700/amber-200, Audience management → purple-50/purple-700/purple-200) — render the category value humanised
  - [x] **2.7** — Selection: clicking a result calls `onSelect({ id, name, category })`, closes dropdown, shows system name in input
  - [x] **2.8** — Clear button: when `selectedId` is set, show a `×` button inside the input (right side); clicking it calls `onSelect(null)`, resets `searchTerm` to `''`
  - [x] **2.9** — Keyboard navigation: `ArrowDown`/`ArrowUp` move `activeIndex`, `Enter` selects the active result, `Escape` closes the dropdown without selecting; `Tab` closes the dropdown
  - [x] **2.10** — Click outside: attach a `mousedown` listener on `document` (via `useEffect` with cleanup) that closes the dropdown when click target is outside the combobox wrapper `div`
  - [x] **2.11** — ARIA: input has `role="combobox"`, `aria-expanded={isOpen}`, `aria-autocomplete="list"`, `aria-controls="system-combobox-listbox"`, `aria-activedescendant` set to the active option's id when navigating; dropdown has `role="listbox"` `id="system-combobox-listbox"`; each result has `role="option"`, `id="system-combobox-option-{idx}"`, `aria-selected={activeIndex === idx}`
  - [x] **2.12** — Loading state: while `isLoading` in `useSystemSearch`, show a muted "Searching…" row in the dropdown
  - [x] **2.13** — Empty state: if results are empty and debounced term is non-empty: show "No systems found for '[term]'" row
  - [x] **2.14** — Input styling: same `selectClass` styling used in `OrganisationListFilterSection`; wrapper div `position: relative` for the dropdown

- [x] **Task 3** — Update `frontend/src/pages/OrganisationListPage.jsx` (AC: #1, #3, #6)
  - [x] **3.1** — Remove imports: `useCrmPlatformsQuery`, `useTicketingProvidersQuery` from `../hooks/useMetaReferenceData.js`
  - [x] **3.2** — Add imports: `SystemCombobox` from `../components/SystemCombobox.jsx`
  - [x] **3.3** — In `OrganisationListFilterSection`: remove all state/logic for `providerVal`, `crmVal`, `providerOptions`, `crmOptions`, `providerOrphan`, `crmOrphan`, `providersQuery`, `crmsQuery` — and remove them from the `metaErrors` array
  - [x] **3.4** — In `OrganisationListFilterSection`: add `const systemId = searchParams.get('system') ?? null` and `const systemRoleVal = searchParams.get('system_role') ?? ''`
  - [x] **3.5** — In `OrganisationListFilterSection`: add `handleSystemSelect` function that atomically updates URL params
  - [x] **3.6** — Replace the Provider `<div>` block with `<SystemCombobox selectedId={systemId} onSelect={handleSystemSelect} placeholder="Search by adopted system…" />` inside a wrapper with `<label>Adopted system</label>` above it
  - [x] **3.7** — Remove the CRM `<div>` block entirely
  - [x] **3.8** — Add the Role sub-filter immediately after the SystemCombobox `<div>` (conditionally rendered when `systemId` is set)
  - [x] **3.9** — In the table `<thead>`: remove `<th>Ticketing Provider</th>` and `<th>CRM Platform</th>` columns; update capability legend `colSpan` from 6 to 4
  - [x] **3.10** — In `TableSkeleton`: change `cols` from `10` to `8`
  - [x] **3.11** — In the `organisations.map(...)` tbody rows: remove the `<td>` for `org.ticketingProvider` and the `<td>` for `org.crmPlatform`
  - [x] **3.12** — Updated `OrganisationListSearchInput` `aria-label` to "Search organisations by name, city, or notes"

- [x] **Task 4** — Update `frontend/src/components/ActiveFilterChips.jsx` (AC: #4)
  - [x] **4.1** — Add prop `resolvedSystemName?: string | null`
  - [x] **4.2** — Add `SYSTEM_ROLE_LABELS` constant at the top of the file
  - [x] **4.3** — In the `chips` derivation, add special handling for `system` and `system_role` keys
  - [x] **4.4** — Override the `remove` function for the `system` chip so it also deletes `system_role` atomically
  - [x] **4.5** — `useSystem(systemId)` called in `OrganisationListFilterSection` to get selected system name
  - [x] **4.6** — Updated `<ActiveFilterChips>` call site to pass `resolvedSystemName={selectedSystemData?.data?.name ?? null}`

- [x] **Task 5** — Verify no regressions (AC: #7)
  - [x] **5.1** — `cd frontend && npm run lint` — 0 ESLint errors ✅
  - [x] **5.2** — `cd frontend && npm run test` — 4 Vitest tests pass ✅
  - [x] **5.3** — Manual smoke (to be verified by reviewer)

### Review Findings

- [x] [Review][Patch] Associate the "Adopted system" label with the combobox control — `htmlFor="filter-adopted-system"` on the label; `inputId` / default `id` on the combobox input — resolved (batch apply, 2026-05-01).

- [x] [Review][Patch] Surface `useSystemSearch` failures in the dropdown — Error row when `isError && debouncedNonEmpty` — resolved (batch apply, 2026-05-01).

- [x] [Review][Patch] Fix ArrowDown opening keyboard state while a system is pre-selected — ArrowDown transitions `displaying` → `searching` before opening, matching focus behaviour — resolved (batch apply, 2026-05-01).

- [x] [Review][Patch] Guard the Role `<select>` when `system_role` in the URL is not a known enum — Validated value for `<select>`; `useEffect` strips unknown `system_role` from the URL with `replace: true` — resolved (batch apply, 2026-05-01).

## Dev Notes

### Previous Story Intelligence (Story 8.1 and 8.2)

**What 8.2 already did (DO NOT redo):**
- `organisation-list-filter-params.js` already updated: `system`/`system_role` are in `LIST_FILTER_PARAM_KEYS` and `FILTER_DIMENSION_LABELS`; `provider`/`crm` are removed
- `api/organisations.js` `fetchOrganisations` already sends `system`/`system_role` params
- `hooks/useOrganisations.js` already picks up the new params via `LIST_FILTER_PARAM_KEYS`
- Backend `GET /api/organisations` already handles `system`/`system_role` filter, already rejects `provider`/`crm` with `400`

**What 8.2 intentionally left broken (this story fixes):**
- `OrganisationListPage.jsx` still renders Provider and CRM dropdowns — those controls now send params the backend rejects with `400`; they are dead but still rendering
- `OrganisationListPage.jsx` still renders `org.ticketingProvider` and `org.crmPlatform` table columns — these are now `undefined` in the response; they silently render as nothing
- `ActiveFilterChips` renders the `system` chip with the raw UUID, not the name (the label infrastructure is ready but the name resolution is missing)

**8.1 data shape** — each org's `systems` array entry (from `toLinkDto`):
```js
{
  id: "<junction-uuid>",         // OrganisationSystem.id (linkId)
  role: "PRIMARY_TICKETING",     // SystemRole enum
  sourceReference: "...",
  note: "...",
  lastUpdated: "ISO-8601",
  system: { id, name, vendor, category }  // embedded System record
}
```
This is what `org.systems` contains in the list response — not relevant for the filter sidebar, but useful context for the table column decisions in 8.6.

### Architecture Compliance

**Layer boundaries:**
- This story is purely frontend — no backend changes. All backend work was done in Story 8.2.
- `useSystemSearch` hook: query key must be `['system-search', debounced]` NOT `['systems', ...]`. Using `['systems', ...]` would conflict with the System list page's `useSystems` hook and cause mutual invalidation.
- `useSystem(id)` from `frontend/src/hooks/useSystem.js` uses key `['systems', id]` — this is correct for detail fetches and separate from the list queries.

**`updateParam` helper in `OrganisationListFilterSection`:**
- The existing `updateParam(key, value)` function (which sets/deletes a single param and resets page) is NOT suitable for clearing `system` because it must atomically also clear `system_role`. Use a dedicated `handleSystemSelect` function (Task 3.5) instead of calling `updateParam('system', ...)`.
- The Role select CAN use `updateParam('system_role', value)` since it's a simple single-param update.

**`ActiveFilterChips` design note:**
- The component is used by both Organisation list and (in future stories) possibly System list. The `resolvedSystemName` prop is specific to the organisation list use case. This is acceptable — the prop is optional and the component degrades gracefully to showing the UUID if not provided.
- The `system_role` chip is guarded (`only when system param also active`) — this prevents showing a floating Role chip if somehow `system_role` ends up in the URL without `system` (which the backend would reject anyway, but defensive UI is correct).

**Anti-patterns to avoid:**
- Do NOT use `useSystems` (query key `['systems', {...}]`) for the combobox search — this would mix the combobox results into the System list page cache. Create `useSystemSearch` with key `['system-search', q]`.
- Do NOT read `selectedId` directly from the `onSelect` callback's closure — always read it from `searchParams.get('system')`. The URL is the single source of truth.
- Do NOT set `system_role` in a separate `setSearchParams` call after setting `system` — always update them atomically in one `setSearchParams` call to prevent React rendering a state where `system_role` is in the URL without `system`.
- Do NOT make `ActiveFilterChips` fetch data internally (no `useQuery` inside the chip renderer) — receive data via props.

### Combobox Implementation Detail

**No existing combobox component in `frontend/src/components/ui/`** (only `badge.jsx`, `button.jsx`, `button-variants.js`, `dialog.jsx`). Build `SystemCombobox` as a custom component in `frontend/src/components/`.

**Positioning the dropdown:** The combobox wrapper `<div>` must be `relative`. The dropdown `<ul>` must be `absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto`. This keeps it within the filter bar without overflow clipping issues.

**Category Badge rendering in the combobox results:** Use inline Tailwind spans — do NOT import the shadcn `Badge` component for the dropdown results (it's a separate semantic use). Inline approach:
```jsx
const CATEGORY_TOKENS = {
  INTEGRATED: 'bg-blue-50 text-blue-700 border-blue-200',
  TICKETING: 'bg-amber-50 text-amber-700 border-amber-200',
  AUDIENCE_MANAGEMENT: 'bg-purple-50 text-purple-700 border-purple-200',
}
const humaniseCategory = (cat) => {
  if (!cat) return ''
  return cat.toLowerCase().replace(/_/g, ' ').replace(/\b\w/, (c) => c.toUpperCase())
  // AUDIENCE_MANAGEMENT → "Audience management"
}
```

**Click-outside effect:**
```js
useEffect(() => {
  if (!isOpen) return
  const handler = (e) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
      setIsOpen(false)
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [isOpen])
```

**Pre-population on mount:** When `selectedId` changes (e.g. browser back restores a UUID), the `useSystem(selectedId)` query automatically fetches the system. The combobox input displays the system name once `useSystem` resolves. While loading, show the UUID as a placeholder — or leave the input blank and show a skeleton. Recommended: show nothing in the input (mode = 'displaying', but no name yet), so the user sees an empty combobox briefly until the name loads.

### File Structure

```
frontend/src/
  hooks/
    useSystemSearch.js             ← NEW: debounced system search hook
    useSystem.js                   ← EXISTING: used for pre-population lookup
  components/
    SystemCombobox.jsx             ← NEW: accessible search-as-you-type combobox
    ActiveFilterChips.jsx          ← UPDATE: system name display + system_role chip + atomic clear
  pages/
    OrganisationListPage.jsx       ← UPDATE: remove Provider/CRM, add SystemCombobox + Role sub-filter, clean table columns
```

No backend changes. No new API endpoints. No schema changes. No migrations.

### Testing Strategy

Frontend Vitest tests (`frontend/src/api/systems.test.js`) test the `fetchSystems` API helper — no changes needed there. No unit tests for `useSystemSearch` or `SystemCombobox` are required by this story; ESLint + Vitest regression check is the quality gate.

**Manual smoke test steps:**
1. Load `/organisations` — list renders with 8 columns, capability legend row correct
2. Typing "tessit" in the System combobox shows a dropdown with Tessitura and its category badge
3. Selecting Tessitura sets `?system=<uuid>` in URL, input shows "Tessitura", Role sub-filter appears
4. Selecting "Integrated suite" from Role select sets `?system_role=INTEGRATED_SUITE`, table narrows
5. ActiveFilterChips shows "Adopted system: Tessitura" and "Role: Integrated suite"
6. Clicking × on the "Adopted system" chip removes both `system` and `system_role` from URL; Role sub-filter disappears
7. Setting Country=UK with System=Tessitura works simultaneously (AND semantics)
8. Navigate to any org detail and press browser back — System filter and Role are restored from URL

### Project Structure Notes

- British English: component name `SystemCombobox` (not `SystemComboboBox`); all label copy "Adopted system", "Any role", "Primary ticketing", "Primary CRM", "Integrated suite", "Secondary" — match the UX spec exactly
- File names: `useSystemSearch.js`, `SystemCombobox.jsx` — kebab-case rule applies to the file name, PascalCase for the exported component
- No deep nesting: `SystemCombobox.jsx` goes in `frontend/src/components/` (flat), not in a subdirectory
- The `useDebouncedValue` hook already exists at `frontend/src/hooks/useDebouncedValue.js` — import it, do not recreate it
- `useSystem` already exists at `frontend/src/hooks/useSystem.js` — import it for the pre-population lookup

### References

- Story 8.2 file: `_bmad-output/implementation-artifacts/8-2-organisation-api-filter-and-response-re-shape.md` — §Story Boundary lists what 8.3 owns
- Epics: `_bmad-output/planning-artifacts/epics.md` lines 1499–1556 (Story 8.3 AC)
- UX spec v2 delta: `_bmad-output/planning-artifacts/ux-design-specification.md` §D6.2 (filter sidebar), §D9 (ActiveFilterChips extension)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` §Communication Patterns (filter state via `useSearchParams`), §Anti-patterns (never `window.location`)
- Existing filter params: `frontend/src/lib/organisation-list-filter-params.js` — already updated; `LIST_FILTER_PARAM_KEYS` and `FILTER_DIMENSION_LABELS` have `system`/`system_role`
- Existing hooks: `frontend/src/hooks/useSystems.js` (uses `['systems', ...]` key — do NOT use for combobox), `frontend/src/hooks/useSystem.js` (uses `['systems', id]` — use for pre-population)
- Existing components: `frontend/src/components/ActiveFilterChips.jsx`, `frontend/src/components/CompareSelectionBar.jsx` (pattern reference for prop-driven component)
- Current list page: `frontend/src/pages/OrganisationListPage.jsx` — full file reviewed; Provider/CRM still present, table has 10 cols (skeleton matches), `useOrganisationSelection` correct hook already used

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Resolved `react-hooks/set-state-in-effect` lint error in `SystemCombobox.jsx`: the `useEffect` syncing `mode` from `selectedId` (router URL external state) required one `// eslint-disable-next-line` comment, matching the pattern used in `OrganisationListSearchInput`.

### Completion Notes List

- Created `frontend/src/hooks/useSystemSearch.js`: debounced system search hook using query key `['system-search', q]` (separate from `['systems', ...]` to avoid cache collisions with the System list page).
- Created `frontend/src/components/SystemCombobox.jsx`: full accessible combobox with keyboard nav (ArrowDown/Up/Enter/Escape/Tab), click-outside dismissal, URL pre-population via `useSystem`, inline category badge tokens, clear button for atomic system+role reset.
- Updated `frontend/src/pages/OrganisationListPage.jsx`: removed `useTicketingProvidersQuery`/`useCrmPlatformsQuery` imports and all associated state; added `SystemCombobox` + `handleSystemSelect` (atomic `system`+`system_role` URL update); added Role sub-filter (conditionally rendered); removed Ticketing Provider and CRM Platform `<th>` headers and `<td>` cells; updated `TableSkeleton` cols 10→8 and `colSpan` 6→4; updated search input `aria-label`.
- Updated `frontend/src/components/ActiveFilterChips.jsx`: added `resolvedSystemName` prop, `SYSTEM_ROLE_LABELS` constant, special chip rendering for `system` (name display) and `system_role` (guarded, humanised label), atomic `remove` that clears `system_role` when `system` chip is dismissed.
- Lint: 0 errors. Tests: 4/4 passing (no regressions).

### File List

- frontend/src/hooks/useSystemSearch.js (NEW)
- frontend/src/components/SystemCombobox.jsx (NEW)
- frontend/src/pages/OrganisationListPage.jsx (MODIFIED)
- frontend/src/components/ActiveFilterChips.jsx (MODIFIED)

### Change Log

- 2026-05-01: Story 8.3 implemented — Organisation list filter sidebar re-shaped: Provider/CRM dropdowns removed, SystemCombobox (debounced search-as-you-type) added, Role sub-filter added, table columns cleaned up (10→8), ActiveFilterChips updated with system name resolution and atomic role chip handling.
- 2026-05-01: Code review batch fixes — label/`id` pairing for adopted system combobox; search error row in combobox dropdown; ArrowDown keyboard consistency when a system is selected; invalid `system_role` URL cleanup and guarded Role select value.
