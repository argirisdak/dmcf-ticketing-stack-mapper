# Story 15.3: OrganisationFormPage — `SimilarOrganisationsWarning` and 409 Inline Error

Status: done

## Story

As a staff member,
I want the create form to show a warning when I'm about to create an organisation with a name similar to an existing one, and a clear error if I bypass the warning and the server rejects the duplicate,
so that I avoid accidental duplicates without being blocked when the duplicate is legitimate (different city).

## Acceptance Criteria

1. **`useSimilarOrganisations` hook** — `frontend/src/hooks/useSimilarOrganisations.js` is created. Signature: `useSimilarOrganisations(name: string, options?: { excludeId?: string }) => { matches, isLoading, error }`. Debounces input by 300ms; calls `GET /api/organisations/check-similar` only when `name.trim().length >= 3`. Cache key: `['similarOrganisations', name, excludeId]`.

2. **`SimilarOrganisationsWarning` component** — `frontend/src/components/SimilarOrganisationsWarning.jsx` is created. Props: `{ matches, currentName, onContinue, onCancel }`. Renders a warning panel between form fields and submit button per UX-DR48. Panel anatomy:
   - Heading: `⚠ An organisation with a similar name already exists:`
   - List of up to 5 matches, format `<name> — <city>, <country>`. Each match links to `/organisations/<id>` (target=_blank).
   - Question line: `Continue creating "<currentName>" anyway?`
   - Two buttons: "Continue" (primary, sets userAcknowledgedDuplicates), "Cancel and amend" (secondary, clears name and refocuses).
   - `aria-live="polite"` on the panel container.

3. **Form integration (create mode only)** — `OrganisationFormPage.jsx` in create mode mounts the warning. The lookup runs on `onBlur` of the name field with `name.length >= 3`, debounced 300ms. When matches return non-empty:
   - The panel renders.
   - The form Submit button is **not** disabled — the warning is non-blocking.
   - Submitting without clicking "Continue" still works; the warning is informational only.
   - Once "Continue" is clicked, the warning hides and `userAcknowledgedDuplicates` is set to `true`.

4. **Re-trigger on name change** — If the user changes the name after acknowledging duplicates, `userAcknowledgedDuplicates` resets to `false` and the lookup re-runs on the next blur.

5. **Cancel and amend behaviour** — Clicking "Cancel and amend" clears the name field, sets `userAcknowledgedDuplicates` to false, and refocuses the name input.

6. **Edit mode** — The warning UX is **not** mounted in edit mode per UX-DR48. The 409 inline error path (AC7) still applies.

7. **409 inline error mapping** — When the server returns 409 with `error.message` matching the composite-unique conflict pattern (containing "already exists in"), an inline error renders below the name field with that message. The error summary at the page top (existing pattern) includes a link to the name field. The inline error is distinct visually from the soft warning panel — both can render on the same page if the user keeps editing after a 409.

8. **Tests** — Vitest tests cover:
   - Hook debounces correctly.
   - Hook respects `name.length >= 3` gate.
   - Warning component renders matches and fires `onContinue` / `onCancel`.
   - Form acknowledgement flow (warning shown → Continue → warning hidden → name change → warning re-shown).
   - 409 inline error rendering on submit failure.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Create `useSimilarOrganisations.js`:
  - [x] 1.1 Use `useDebouncedValue(name, 300)` (existing hook in repo).
  - [x] 1.2 Use `useQuery` with `enabled: debouncedName.trim().length >= 3`.
  - [x] 1.3 Return `{ matches: data?.data ?? [], isLoading, error }`.
- [x] **Task 2 (AC: 1)** — Add `checkSimilarOrganisations(name, excludeId?)` to `frontend/src/api/organisations.js`. Wire URL params; handle response envelope.
- [x] **Task 3 (AC: 2)** — Create `SimilarOrganisationsWarning.jsx` per AC2.
- [x] **Task 4 (AC: 3, 4, 5, 6)** — Update `OrganisationFormPage.jsx`:
  - [x] 4.1 Detect mode: create vs edit. Only mount the hook + warning in create mode.
  - [x] 4.2 Track `userAcknowledgedDuplicates` local state, initial false.
  - [x] 4.3 On name `onBlur`, the hook fires (debounced); when matches return and `!userAcknowledgedDuplicates`, render the warning.
  - [x] 4.4 Wire `onContinue` to set the flag true and hide the panel.
  - [x] 4.5 Wire `onCancel` to clear the name field, reset the flag, refocus.
  - [x] 4.6 On any name change after acknowledgement, reset the flag.
- [x] **Task 5 (AC: 7)** — Update the form's submit error handler to:
  - [x] 5.1 Detect 409 with the composite-unique conflict message.
  - [x] 5.2 Render the inline error on the name field per the existing field-error pattern.
  - [x] 5.3 Add the entry to the error summary at the top.
- [x] **Task 6 (AC: 8)** — Add Vitest tests per AC8.
- [x] **Task 7** — Manual smoke check:
  - [x] 7.1 In create mode, type "Royal Opera" (a name overlapping a seed Org); blur; verify warning appears.
  - [x] 7.2 Click "Continue"; verify warning hides; submit succeeds (assuming no exact `(name, city, country)` collision).
  - [x] 7.3 Type a name that **does** exact-collide with a seeded org; submit; verify 409 inline error.
  - [x] 7.4 In edit mode, change the name to a similar one; verify no warning UX appears (only 409 path on submit if collision).

## Dev Notes

- **Non-blocking by design:** Warning is informational. The user may know what they're doing (legitimate "Theatre Royal" in another city). Hard-blocking would be hostile. The DB constraint (Story 15.1) is the actual guard against true collisions.
- **Why edit mode skipped:** Per UX-DR48. Editing an existing record's name to match another is rare; the 409 catches it. Adding fuzzy-match UX for edit doubles the surface area for marginal value.
- **Why `length >= 3`:** A 2-char name like "Op" would match every org with "op" anywhere in the name — too noisy. 3 chars is empirical; tuneable.
- **Debounce duration:** 300ms matches the existing search input debounce. Consistent feel.
- **Acknowledgement persistence:** Stays true until the name changes. Clicking outside the form, scrolling, or typing in another field doesn't reset it — only changing the name.
- **Aria-live:** `polite` so the panel announces without stealing focus. Avoid `assertive` — the user is mid-flow.

### References

- [epics.md — Story 15.3](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §4.5, §7.4, UX-DR48, UX-DR49](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [frontend/src/pages/OrganisationFormPage.jsx](frontend/src/pages/OrganisationFormPage.jsx).
- [frontend/src/hooks/useDebouncedValue.js](frontend/src/hooks/useDebouncedValue.js) — existing debounce hook.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Warning fires on every keystroke | 300ms debounce + `length >= 3` gate. |
| Acknowledgement persists across name changes | Reset flag on every name change after the first acknowledgement. |
| Warning panel competes with submit button for attention | Place between fields and submit; muted styling (slate / amber, not red). |
| 409 message format depends on server response | Match on substring "already exists in" in the message; if format changes, update both ends together. |
| Hook fires on edit mode by accident | Conditional `enabled` based on `mode === 'create'`. |

## Technical requirements

- **Stack:** React 18, TanStack Query v5, react-router-dom v6, Tailwind v3.
- **No new npm packages.**

## File structure requirements

| Action | Path |
|--------|------|
| Add | `frontend/src/hooks/useSimilarOrganisations.js` |
| Add | `frontend/src/components/SimilarOrganisationsWarning.jsx` |
| Add | `frontend/src/__tests__/SimilarOrganisationsWarning.test.jsx` |
| Add | `frontend/src/__tests__/useSimilarOrganisations.test.js` |
| Edit | `frontend/src/pages/OrganisationFormPage.jsx` |
| Edit | `frontend/src/api/organisations.js` (add `checkSimilarOrganisations` function) |

## Testing requirements

- Vitest coverage per AC8 / Task 6.
- Manual smoke check per Task 7.

## Dev Agent Record

### Implementation Plan

- Added `checkSimilarOrganisations` and 409 handling on `createOrganisation` / `updateOrganisation` in `organisations.js`.
- Implemented `useSimilarOrganisations` with 300ms debounce and `length >= 3` gate; create form passes `nameForSimilarCheck` updated on name blur so lookup matches UX (blur-driven, not every keystroke).
- `SimilarOrganisationsWarning` panel between linked-systems block and Save; create-only via `OrganisationCreateForm` props to `OrganisationFormBody`.
- `mergeCompositeConflictNameMessage` maps 409 `error.message` (substring `already exists in`) onto the name summary entry so inline + error-summary show the full server text.

### Debug Log

- (empty)

### Completion Notes

- ✅ Tasks 7.1–7.3 exercised via `OrganisationFormPage.similar-warning.test.jsx` (mocked fetch + timers). Task 7.4: edit form does not wire `useSimilarOrganisations` / `beforeSubmitSlot` / `nameInputOnBlur` (code review).
- Full frontend suite: `npm run test` (78 tests). ESLint clean for touched files.
- Backend `npm test` not re-run in this session (local `node_modules` permission / jest runner issue in environment).

## File List

- `frontend/src/hooks/useSimilarOrganisations.js` (new)
- `frontend/src/components/SimilarOrganisationsWarning.jsx` (new)
- `frontend/src/api/organisations.js` (edit)
- `frontend/src/pages/OrganisationFormPage.jsx` (edit)
- `frontend/src/api/organisations.test.js` (new)
- `frontend/src/__tests__/useSimilarOrganisations.test.js` (new)
- `frontend/src/__tests__/SimilarOrganisationsWarning.test.jsx` (new)
- `frontend/src/__tests__/OrganisationFormPage.similar-warning.test.jsx` (new)

## Change Log

- **2026-05-04** — Story 15.3: similar-organisations warning on create, 409 inline name error + summary, API helper and Vitest coverage; sprint status → review for `15-3-organisation-form-similar-organisations-warning`.

### Review Findings

- [x] [Review][Decision] Mixed scope in story-scoped files — Resolved 2026-05-04: **accept single batch**; document combined scope in PR/release notes (sort/order, field sources, and 15.3 similar-name UX).

- [x] [Review][Patch] Harden `createOrganisation` JSON parsing on errors [`frontend/src/api/organisations.js` ~92] — Applied 2026-05-04: `res.json().catch(() => ({}))` on create responses.

- [x] [Review][Patch] Surface check-similar failures in the create UX [`frontend/src/pages/OrganisationFormPage.jsx`] — Applied 2026-05-04: status panel when lookup errors after a gated blur (`nameForSimilarCheck.length >= 3`).

- [x] [Review][Patch] 409 without `fields` may miss AC7 inline name mapping [`frontend/src/pages/OrganisationFormPage.jsx` catch path] — Applied 2026-05-04: unified create/edit catch path; `mergeCompositeConflictNameMessage` injects a `name` summary row when the server message matches the composite pattern.

- [x] [Review][Patch] Stabilise hook tests against debounce changes [`frontend/src/__tests__/useSimilarOrganisations.test.js`] — Applied 2026-05-04: fake timers + `advanceTimersByTimeAsync`.
