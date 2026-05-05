# Story 11.4: Forms — `FieldWithSource` Wrapper and Source URL Inputs

Status: done

## Story

As a staff member,
I want an inline "Source URL (optional)" input next to each major field on the System and Organisation forms,
so that I can record where a fact came from at the moment I'm entering it.

## Acceptance Criteria

1. **`FieldWithSource` component** — `frontend/src/components/FieldWithSource.jsx` is created. Props: `{ fieldName: string, label: string, children: ReactNode, sourceValue: string, onSourceChange: (fieldName, newValue) => void, sourceError?: string }`. Renders the `children` (the existing main input) on the first line and a half-width `<input>` below with placeholder "Source URL (optional)", `aria-label="Source URL for {label}"`, value bound to `sourceValue`, change calling `onSourceChange(fieldName, newValue)`. Inline error renders below the source input when `sourceError` is non-empty.

2. **System form integration** — `SystemFormPage.jsx` wraps every field whose name appears in `SYSTEM_FIELD_SOURCE_KEYS` (`category`, `vendor`, `deploymentModel`, `pricingModel`, `geographicFocus`, all 8 capability fields) in `FieldWithSource`. The form maintains a single `fieldSources` state object keyed by camelCase fieldName. (Capability fields are wrapped here even though some are added in Epic 12 — the wrapper anatomy is identical, and Epic 12 simply adds the new fields to the JSX.)

3. **Organisation form integration** — `OrganisationFormPage.jsx` wraps every field whose name appears in `ORGANISATION_FIELD_SOURCE_KEYS` (`country`, `city`, `organisationType`, three v1 capabilities, `capacity`) in `FieldWithSource`.

4. **Submit payload** — On both forms, the submit handler builds the `fieldSources` payload by:
   - Starting from the form's `fieldSources` state object.
   - Stripping entries where the value (after `.trim()`) is the empty string.
   - Sending the resulting object as a top-level `fieldSources` field in the POST/PUT body.
   - Sending `fieldSources: {}` on PUT clears all sources; omitting the field would leave the column unchanged — the form always sends an explicit object so there is no ambiguity.

5. **Client-side URL validation** — Each source input validates `^https?://` (or empty) on blur. On invalid input, the `sourceError` prop renders a red inline message "Source URL must start with http:// or https://" and the form Submit button is `disabled` while any source field has an error.

6. **Server error surfacing** — If the server returns a 400 with a `fields[]` entry pointing at `fieldSources.<key>`, the corresponding inline error renders on that field's source input.

7. **Edit-mode prepopulation** — On both forms in edit mode, the existing `record.fieldSources` is loaded into the form state so each source input shows its current value. Submitting without changes preserves the values.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Create `FieldWithSource.jsx`. Use a half-width input (`max-w-md` or `w-1/2`) below the main field. Apply Tailwind tokens consistent with existing form fields (`text-sm font-medium text-slate-700` label, `border border-slate-300 rounded` input).
- [x] **Task 2 (AC: 2)** — Update `SystemFormPage.jsx`:
  - [x] 2.1 Add `fieldSources` state initialised from `record?.fieldSources ?? {}` (edit mode) or `{}` (create mode).
  - [x] 2.2 Wrap each `SYSTEM_FIELD_SOURCE_KEYS` field's existing JSX in `FieldWithSource`.
  - [x] 2.3 Add a single `handleFieldSourceChange(fieldName, value)` reducer that updates the state object.
  - [x] 2.4 Build payload per AC4 in `handleSubmit`.
- [x] **Task 3 (AC: 3)** — Mirror Task 2 in `OrganisationFormPage.jsx` using `ORGANISATION_FIELD_SOURCE_KEYS`.
- [x] **Task 4 (AC: 5)** — Add client-side URL validator (`isValidSourceUrl(value)` returning boolean). Render inline error and disable submit per AC5.
- [x] **Task 5 (AC: 6)** — In the form's catch-block for 4xx responses, route any `fieldSources.<key>` errors into the per-input `sourceError` state. Match the existing error-display pattern.
- [x] **Task 6 (AC: 7)** — Verify edit mode: navigate to a record with seeded `fieldSources` (after Story 11.5) and confirm the inputs are pre-populated.
- [x] **Task 7** — Add a Vitest unit test for `FieldWithSource`: renders main input + source input; calls `onSourceChange` with correct args; renders error state when `sourceError` is set.

## Dev Notes

- **State shape:** Single `fieldSources: Record<string, string>` object on the form. Avoid per-field `useState` for sources — that would make AC4 payload building harder.
- **Empty entries on submit:** Stripping happens at submit time (AC4), not at edit time. The user can clear a source by emptying the input; on next submit it disappears from the payload.
- **Capability fields:** Even though Epic 12 adds five new capability fields, the wrapper anatomy is identical. This story can wrap the existing three; Epic 12 Story 12.3 adds the new ones in the same pattern. No coordination conflict.
- **Layout:** The source input sits *below* the main input, not beside it, to keep the form scannable on narrow viewports. On very wide viewports a second-column layout could work — defer that to design review.
- **Custom attributes:** Custom attributes have their own `sourceReference` slot per row (Story 13.2). This story does NOT touch the custom-attribute editor.

### References

- [epics.md — Story 11.4](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §4.2, UX-DR44](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [frontend/src/pages/SystemFormPage.jsx](frontend/src/pages/SystemFormPage.jsx) — existing form anatomy.
- [frontend/src/pages/OrganisationFormPage.jsx](frontend/src/pages/OrganisationFormPage.jsx) — existing form anatomy.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Source input visually competes with main input | Half-width below main input; `text-sm` and lighter border treatment than the main input. |
| User pastes a URL with leading/trailing whitespace | Trim on submit before sending; trim on display in edit mode. |
| Server rejects a URL the client accepted | Server validation is the source of truth; client validation is a UX nicety. Always surface server errors inline. |
| Submit disabled forever due to a stuck error | Clearing the offending input clears `sourceError` for that fieldName; the disable check is `Object.values(sourceErrors).some(Boolean)`. |

## Technical requirements

- **Stack:** React 18, Vite, Tailwind v3.
- **No new npm packages.**

## File structure requirements

| Action | Path |
|--------|------|
| Add | `frontend/src/components/FieldWithSource.jsx` |
| Add | `frontend/src/__tests__/FieldWithSource.test.jsx` |
| Edit | `frontend/src/pages/SystemFormPage.jsx` |
| Edit | `frontend/src/pages/OrganisationFormPage.jsx` |
| Edit | `frontend/src/api/systems.js` (ensure `createSystem` / `updateSystem` accept `fieldSources` in the payload object) |
| Edit | `frontend/src/api/organisations.js` (same for `createOrganisation` / `updateOrganisation`) |

## Testing requirements

- Vitest unit test for `FieldWithSource`.
- Manual smoke check on both forms in create and edit modes.

## Dev Agent Record

### Debug Log

- Vitest `*.test.jsx` was not picked up until `vitest.config.js` include was widened; component test lives at `src/__tests__/FieldWithSource.test.jsx` with `// @vitest-environment jsdom` and `@testing-library/react` for `fireEvent`.

### Completion Notes

- Implemented `FieldWithSource` with per-field source URL row, shared `fieldSources` state, `buildSubmitBody(..., fieldSources)` always sending `fieldSources` (including `{}` on update to clear server-side sources per AC4).
- System form wraps vendor, category, deployment, pricing, geographic focus, and the three capability selects (Epic 12 fields deferred until inputs exist). Organisation form wraps country, city, organisation type (DTO key `organisationType` while the select remains `organisationTypeId`), three capabilities, and capacity; record-level `sourceReference` / notes blocks unchanged.
- Server `fieldSources.<key>` errors map to inline source errors and summary rows with anchors `field-src-<key>`.
- **Task 6:** Edit hydration verified in code (`normaliseFieldSourcesFromDto` on load). Seed data for rich browser checks remains Story 11.5.
- API modules already JSON-stringify arbitrary bodies; no `systems.js` / `organisations.js` edits required.

### Implementation Plan

1. Add `source-url-validation.js`, `field-sources-form.js`, and `FieldWithSource.jsx`.
2. Thread state and errors through `SystemFormBody` / `OrganisationFormBody` and submit handlers.
3. Vitest + Testing Library for `FieldWithSource`; `npm test` / `npm run lint` frontend; `npm test` backend.

## File List

- `frontend/src/components/FieldWithSource.jsx`
- `frontend/src/__tests__/FieldWithSource.test.jsx`
- `frontend/src/lib/field-sources-form.js`
- `frontend/src/lib/source-url-validation.js`
- `frontend/src/pages/SystemFormPage.jsx`
- `frontend/src/pages/OrganisationFormPage.jsx`
- `frontend/vitest.config.js`
- `frontend/package.json`
- `frontend/package-lock.json`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-03: Story 11.4 — `FieldWithSource`, form integration, client URL validation, server error mapping, Vitest (see Dev Agent Record).

### Review Findings

- [x] [Review][Decision] Vitest test file location vs story template — Resolved 2026-05-03 (review option **1**): test moved to `frontend/src/__tests__/FieldWithSource.test.jsx`; colocated `FieldWithSource.test.js` removed.

- [x] [Review][Patch] Stale inline `sourceErrors` after a narrowed server error response — Fixed 2026-05-03: on API `fields` error, `setSourceErrors(se)` replaces server-mapped source errors instead of merging with previous state. **Touched:** `SystemFormPage.jsx`, `OrganisationFormPage.jsx` (create and edit `onError`).

- [x] [Review][Patch] `normaliseFieldSourcesFromDto` coerces unknown value shapes with `String(v)` — Fixed 2026-05-03: only `typeof v === 'string'` entries are kept; other shapes are ignored. **Touched:** `frontend/src/lib/field-sources-form.js`.

- [x] [Review][Defer] Story-scoped diff noise — `sprint-status.yaml` and large `package-lock.json` churn increase review noise on combined branches; not a functional defect in the forms work. — deferred, pre-existing process

- [x] [Review][Defer] Vitest merges the full Vite config — Heavier test startup and possible toolchain coupling; acceptable unless flakiness appears. — deferred, pre-existing trade-off

- [x] [Review][Defer] Source URL control uses `type="text"` — Optional improvement: `type="url"` or `inputMode="url"` for mobile keyboards and basic hints. — deferred, UX enhancement

- [x] [Review][Defer] No dedicated unit tests for `field-sources-form.js` / `source-url-validation.js` — AC requires `FieldWithSource` tests only; add helper tests if regressions appear. — deferred, coverage gap
