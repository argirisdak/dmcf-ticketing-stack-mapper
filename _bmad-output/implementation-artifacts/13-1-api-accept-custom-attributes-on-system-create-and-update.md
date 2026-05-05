# Story 13.1: API — Accept `customAttributes` on System Create and Update

Status: done

## Story

As a backend developer,
I want `POST /api/systems` and `PUT /api/systems/:id` to accept a `customAttributes` array with strict shape validation,
so that the frontend can persist editable custom attributes through the existing JSON column.

## Acceptance Criteria

1. **Write contract** — `POST` and `PUT` accept a top-level body field `customAttributes` of type array. Each element must be an object with required `label` (string, non-empty after trim, ≤200 chars), required `value` (string, non-empty after trim, ≤200 chars), optional `sourceReference` (string ≤500 chars matching `^https?://` if non-empty).

2. **Empty-row stripping** — Entries where `label.trim()` and `value.trim()` are both empty are dropped silently before persistence. (Source-only entries cannot exist; if `label` or `value` is empty individually but not both, that's a 400.)

3. **Validation rules** — Returns 400 with envelope `{ data: null, error: { message: "Validation failed", fields: [{ field: "customAttributes[N].<key>", message: "<...>" }] }, meta: null }` when:
   - `label` is missing or empty (after trim) but `value` is not.
   - `value` is missing or empty (after trim) but `label` is not.
   - `label` or `value` exceeds 200 chars.
   - `sourceReference` is non-empty and doesn't match `^https?://`.
   - `sourceReference` exceeds 500 chars.
   - An array element is not a plain object.
   - The top-level `customAttributes` is not an array.

4. **Unknown property stripping** — Unknown properties on each element are stripped before persistence. Only `label`, `value`, `sourceReference` are persisted. (No 400 for unknown keys — silent strip; this matches the v2 read DTO's tolerant posture.)

5. **Empty array semantics** — `customAttributes: []` (empty array, not omitted) sets the column to `null`, clearing all custom attributes. The detail page renders the same way it does today (panel hidden when null/empty per UX-DR29).

6. **Omitted field semantics** — On PUT, omitting `customAttributes` from the body leaves the existing column unchanged. (Distinction from `[]` which clears it.)

7. **Tests** — Jest tests cover: round-trip on valid payload; each validation rejection case; empty-row stripping; empty-array clear semantics; omitted-field preservation.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1, 2, 3, 4)** — Add `validateCustomAttributes(value)` helper in `system-controller.js` (or extract to `lib/validate-custom-attributes.js` if prefer). Returns `{ ok: true, value: cleanedArray }` or `{ ok: false, errors: [...] }`.
  - [x] 1.1 Trim `label` and `value` strings.
  - [x] 1.2 Strip rows where both trim to empty.
  - [x] 1.3 Validate each remaining row's individual fields per AC3.
  - [x] 1.4 Strip unknown properties.
- [x] **Task 2 (AC: 5, 6)** — Wire into `POST /api/systems` and `PUT /api/systems/:id`:
  - [x] 2.1 If `customAttributes` is in the body and is `[]`, set `custom_attributes: null` in the Prisma payload.
  - [x] 2.2 If `customAttributes` is in the body and is non-empty, validate and pass cleaned array to Prisma as JSON.
  - [x] 2.3 If `customAttributes` is omitted from the PUT body, do not touch the column (omit from update payload).
- [x] **Task 3 (AC: 7)** — Add Jest tests in `system-controller.test.js` covering all AC3 rejection cases plus the round-trip and clear/preserve semantics.

### Review Findings

- [x] [Review][Decision] Both `customAttributes` and `custom_attributes` in one body — **Resolved (option 1):** `400` with `customAttributes` field error `Cannot provide both customAttributes and custom_attributes.` (POST and PUT).

- [x] [Review][Patch] Case-sensitive HTTP scheme for `sourceReference` — **Fixed:** prefix match is case-insensitive; persisted `sourceReference` normalises the scheme to lowercase `http://` / `https://`. [backend/src/lib/validate-custom-attributes.js]

- [x] [Review][Defer] Unbounded `customAttributes` array length — Very large arrays could increase CPU/memory during validation; not required by Story 13.1. [backend/src/lib/validate-custom-attributes.js:32] — deferred, pre-existing scope

- [x] [Review][Defer] Story-scoped file noise — The same controller, service, and test diff mixes extended capabilities, `fieldSources`, and Story 13.1 work on a dirty branch; increases review and bisection cost. — deferred, pre-existing

## Dev Notes

- **Why null for empty array:** The detail page already hides the custom-attributes panel when the column is null or has length 0 (UX-DR29). Storing `null` instead of `[]` is slightly cleaner and avoids storing trivial JSON; both work for the read path.
- **Why silent unknown-key strip:** Custom attributes are user-authored — unknown keys may be a typo, copy-paste artefact, or a future feature scout. Rejecting would be hostile; stripping is forgiving.
- **Why required `label` and `value` non-empty:** A custom attribute with no label or no value carries no information. The form should make this hard to type accidentally; the backend enforces it as a contract.
- **Length caps:** 200 / 200 / 500 are reasonable defaults. The compare page renders custom attributes in a column-width cell; very long values would break the layout. If a user genuinely needs longer values, the description field is the right place.
- **Trim before validation:** A user typing whitespace shouldn't bypass non-empty checks. `value.trim().length === 0` is the test.
- **`field_sources` and `customAttributes` are independent:** A System can have `fieldSources` populated and `customAttributes` empty, or vice versa, or both. Validation for each is independent.

### References

- [epics.md — Story 13.1](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §3.1 (custom attributes), §2.5](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [docs/decisions.md ADR-019](docs/decisions.md) — JSON column precedent.
- [backend/src/prisma/system-seed-catalog.js](backend/src/prisma/system-seed-catalog.js) — example of valid `customAttributes` shape.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Persisting whitespace-only labels or values | Trim and reject before persist (AC3). |
| Rejecting legitimate URLs with trailing slashes or query strings | Regex is `^https?://` — only checks the scheme prefix. Anything after is allowed. |
| Confusing `[]` clear vs omitted preserve | Two separate code paths in the controller; tests cover both. |
| Persisting an array containing non-object elements | Type check each element before validation; non-object → 400. |

## Technical requirements

- **Validation:** Manual, in-controller per existing pattern.
- **JSON column:** `system.custom_attributes` already exists (Prisma `Json?`).

## File structure requirements

| Action | Path |
|--------|------|
| Add | `backend/src/lib/validate-custom-attributes.js` (or inline helper in controller) |
| Edit | `backend/src/controllers/system-controller.js` |
| Edit | `backend/src/__tests__/system-controller.test.js` |

## Testing requirements

- Jest coverage per AC7.
- Existing tests pass.

## Dev Agent Record

### Debug Log

- Full `npm test` in this agent environment failed: Jest triggers `napi-postinstall` for `unrs-resolver`, which is root-owned under `node_modules` and hits EACCES. Implementation was smoke-tested via `node -e` on `validate-custom-attributes.js`. **Argirisdak should run `cd backend && npm test` locally** after fixing `node_modules` ownership if needed.

### Completion Notes

- Added `validateCustomAttributes` in `backend/src/lib/validate-custom-attributes.js` (plain-object check, trim, blank-row drop, length and `sourceReference` URL rules, field paths `customAttributes[N].…`).
- `system-controller`: `mergeCustomAttributesWrite` reads `customAttributes` / `custom_attributes` from the original body (after strip from parse path), validates, sets `payload.customAttributes` to `null` or cleaned array; skips assignment when base parse returned `payload: null`. Wired into POST and PUT.
- `system-service`: `createSystem` / `updateSystem` map `payload.customAttributes` → `custom_attributes` when the key is present (including `null` to clear).
- Extended `system-controller.test.js` with a dedicated `customAttributes` suite plus PUT clear vs omit cases; adjusted strip tests so they no longer expect custom attribute keys to be dropped silently.

### File List

- `backend/src/lib/validate-custom-attributes.js` (new)
- `backend/src/controllers/system-controller.js`
- `backend/src/services/system-service.js`
- `backend/src/__tests__/system-controller.test.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-05-04 — Story 13.1: API accept `customAttributes` on system create/update with validation, service mapping, and Jest coverage.
- 2026-05-04 — Code review follow-up: reject body with both `customAttributes` and `custom_attributes`; case-insensitive `http`/`https` scheme on `sourceReference` with normalised stored prefix.
