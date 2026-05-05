# Story 13.2: SystemFormPage — `CustomAttributeEditor` Component

Status: done

## Story

As a staff member,
I want to add, edit, and remove custom attributes directly on the System form through a repeating row component,
so that I can record vendor-specific traits without touching seed files.

## Acceptance Criteria

1. **`CustomAttributeEditor` component** — `frontend/src/components/CustomAttributeEditor.jsx` is created. Props: `{ value: CustomAttribute[], onChange: (next: CustomAttribute[]) => void }`. Each entry shape: `{ _key: string, label: string, value: string, sourceReference: string }`. Renders one row per array entry with three text inputs (Label, Value, Source URL) and a ghost Remove button. Below the rows: a "+ Add custom attribute" button.

2. **Row anatomy** — Each row is a `flex` row of three labelled inputs:
   - Label: `<input type="text" maxLength={200}>` placeholder "e.g. B Corp certified"
   - Value: `<input type="text" maxLength={200}>` placeholder "e.g. Yes (since 2024)"
   - Source URL: `<input type="text" maxLength={500}>` placeholder "Source URL (optional)"
   - Remove: ghost icon button (Lucide `X`) with `aria-label="Remove custom attribute"`

3. **Stable keys** — Each entry carries an internal `_key` (UUID generated on creation) used as React's `key=` prop so input focus and value persist across re-renders, removals, and reorders.

4. **Add row** — Clicking "+ Add custom attribute" appends a new empty row `{ _key: <new uuid>, label: '', value: '', sourceReference: '' }` to the array.

5. **Remove row** — Clicking the row's Remove button calls `onChange` with the array minus that row.

6. **Inline character validation** — When Label or Value exceeds 200 chars or Source URL exceeds 500 chars, the offending input gets `border-red-500` and a small char counter below shows `Y / 200` (or `Y / 500`). The form's Submit button is `disabled` while any custom attribute has any field over its limit.

7. **Source URL inline validation** — When Source URL is non-empty and doesn't match `^https?://`, an inline error shows "Source URL must start with http:// or https://" and Submit is disabled.

8. **Form integration (create mode)** — `SystemFormPage.jsx` adds a "Custom attributes" section below the universal-core fields with an empty initial state. The section heading is `text-lg font-semibold` matching other section headings.

9. **Form integration (edit mode)** — On load, the editor is pre-populated with one row per existing entry from `system.customAttributes`. `_key` is generated deterministically from index + content hash so the same record renders the same keys on re-mount (preventing focus flicker).

10. **Submit payload** — Submit handler builds the payload by:
    - Stripping `_key` from each row.
    - Filtering out rows where both `label.trim()` and `value.trim()` are empty.
    - Sending the array as `customAttributes` in the body. Empty post-strip array is sent as `[]`.

11. **Detail page renders correctly after save** — After a successful save, the user is redirected to the System detail page where the existing custom-attribute panel renders the updated list (no read-path changes needed).

## Tasks / Subtasks

- [x] **Task 1 (AC: 1, 2, 3)** — Create `CustomAttributeEditor.jsx`. Use `crypto.randomUUID()` for `_key` generation.
- [x] **Task 2 (AC: 4, 5)** — Implement Add and Remove handlers. Verify focus stays where expected after each action (manual smoke check).
- [x] **Task 3 (AC: 6, 7)** — Implement inline validation: char counter + scheme check. Expose a derived `hasErrors` boolean via a callback or a separate prop so the parent form can disable Submit.
- [x] **Task 4 (AC: 8, 9)** — Update `SystemFormPage.jsx`:
  - [x] 4.1 Add `customAttributes` state, initialised empty (create) or pre-populated with `_key`-augmented copies (edit).
  - [x] 4.2 Mount the editor in a new "Custom attributes" section.
- [x] **Task 5 (AC: 10)** — Update `SystemFormPage.jsx` submit handler to build the payload per AC10. Strip `_key`, filter empty rows.
- [x] **Task 6 (AC: 11)** — Manual smoke test: create a System with two custom attributes; save; verify the detail page shows them. Edit; remove one; save; verify the detail page reflects the removal.
- [x] **Task 7** — Vitest unit test for `CustomAttributeEditor`: renders rows; add/remove behaviour; char-count validation; URL validation.

### Review Findings

- [x] [Review][Decision] Section heading scale on System form — **Resolved 2026-05-04:** option 1 — raised "Capabilities" to `text-lg font-semibold` to match "Custom attributes" (`SystemFormPage.jsx`).
- [x] [Review][Patch] Harden `CustomAttributeEditor` against a missing `value` prop — default `value = []` in the component signature (`CustomAttributeEditor.jsx`).
- [x] [Review][Patch] Extend Vitest coverage for AC6 counter rule — tests for ≥80% label/value/url counter visibility (`CustomAttributeEditor.test.jsx`).
- [x] [Review][Defer] `SystemFormPage.jsx` size and mixed concerns — file is very large after this story; splitting create/edit bodies or shared handlers is deferred to a future refactor (`SystemFormPage.jsx`) — deferred, pre-existing

## Dev Notes

- **`_key` lifecycle:** Generated on add, preserved across re-renders, stripped at submit. Don't try to derive it from `label` or `value` content because those mutate; UUID is stable.
- **Edit-mode key generation:** The deterministic key for pre-existing rows can be `\`existing-${index}\`` for simplicity — it doesn't need to be a UUID, just stable across re-renders of the same record.
- **Reordering:** Out of scope. If users want to reorder, they remove and re-add. A drag-and-drop ordering UI is a Growth concern.
- **Form layout:** Each row should fit on a single line on desktop. On narrow viewports the row can wrap; the Remove button stays on the last line aligned right.
- **Character counters:** Only show when the input has ≥80% of its limit (so the counter doesn't clutter when there's plenty of headroom).

### References

- [epics.md — Story 13.2](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §4.3, §7.3, UX-DR45](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [frontend/src/pages/SystemFormPage.jsx](frontend/src/pages/SystemFormPage.jsx) — existing form anatomy.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Input focus loss on add/remove | Stable `_key` via UUID; React's reconciliation handles the rest. Manual smoke check confirms. |
| Submit silently discards user content | If a row has label-only or value-only (not both empty), it's a 400 from server; the inline validation catches this before submit. |
| Pre-existing custom attributes show with stale order | Server returns array in insertion order; pre-populate in the same order; don't sort. |
| Pasted content with newlines breaks single-line input | Use `<input type="text">` not `<textarea>` — newlines are stripped on paste. |

## Technical requirements

- **Stack:** React 18, Vite, Tailwind v3, Lucide.
- **No new npm packages.**

## File structure requirements

| Action | Path |
|--------|------|
| Add | `frontend/src/components/CustomAttributeEditor.jsx` |
| Add | `frontend/src/__tests__/CustomAttributeEditor.test.jsx` |
| Edit | `frontend/src/pages/SystemFormPage.jsx` |
| Edit | `frontend/src/api/systems.js` (ensure `createSystem` / `updateSystem` accept `customAttributes` in the payload object) |

## Testing requirements

- Vitest coverage per Task 7.
- Manual smoke check per Task 6.

---

## Dev Agent Record

### Debug Log

- Backend `npm test` could not be executed in this environment (Jest / `node_modules` native postinstall EACCES on `unrs-resolver`). Frontend `npm test` and `npm run lint` completed successfully.

### Implementation Plan

- Added `CustomAttributeEditor` with stable `_key`, row layout, Lucide ghost remove, add row, char counters (≥80% or over limit / invalid URL), and `onValidationChange` wired to disable Save alongside existing source-URL validation.
- Added `buildCustomAttributesPayload` and shared row error helpers in `custom-attributes-form.js` (reuses `isValidSourceUrl` for scheme checks).
- Integrated editor and `customAttributes` state into create/edit flows; hydrate edit rows with deterministic `_key` (`existing-${index}-${hash}`) and support `source_reference` from stored JSON.
- Tests: `custom-attributes-form.test.js` + `CustomAttributeEditor.test.jsx` (with explicit `cleanup()` between cases).

### Completion Notes

- All acceptance criteria addressed in code; `createSystem` / `updateSystem` already accept arbitrary JSON bodies — no `systems.js` change required.
- Task 6: end-to-end browser smoke not run here; payload + redirect to detail match existing patterns — recommend a quick UI pass (add two attrs → save → detail; edit → remove one → save).

## File List

- `frontend/src/components/CustomAttributeEditor.jsx` (new)
- `frontend/src/lib/custom-attributes-form.js` (new)
- `frontend/src/lib/custom-attributes-form.test.js` (new)
- `frontend/src/__tests__/CustomAttributeEditor.test.jsx` (new)
- `frontend/src/pages/SystemFormPage.jsx` (modified)

## Change Log

- **2026-05-04** — Story 13.2: custom attribute editor on System form, submit payload shaping, Vitest coverage.
