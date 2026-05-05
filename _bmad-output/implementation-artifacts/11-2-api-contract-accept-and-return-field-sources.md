# Story 11.2: API Contract — Accept and Return `fieldSources`

Status: done

## Story

As a backend developer,
I want `POST` and `PUT` endpoints on both Systems and Organisations to accept a `fieldSources` object validated against a per-entity allow-list, and detail/list responses to include `fieldSources`,
so that the frontend can read and write per-field provenance through the same DTOs it already uses.

## Acceptance Criteria

1. **Allow-list module** — `backend/src/lib/field-source-keys.js` is created. It exports `SYSTEM_FIELD_SOURCE_KEYS` (frozen array of exactly 13 camelCase strings: `category`, `vendor`, `deploymentModel`, `pricingModel`, `geographicFocus`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `seasonSubscriptionsCapability`, `dynamicPricingCapability`, `multiVenueSupportCapability`, `marketingAutomationCapability`, `accessibilityFeaturesCapability`) and `ORGANISATION_FIELD_SOURCE_KEYS` (frozen array of exactly 7 camelCase strings: `country`, `city`, `organisationType`, `membershipCapability`, `donationCapability`, `reservedSeatingCapability`, `capacity`).

2. **System write contract** — `POST /api/systems` and `PUT /api/systems/:id` accept a top-level body field `fieldSources` of type plain object. Validation:
   - Every key must be in `SYSTEM_FIELD_SOURCE_KEYS` — otherwise 400 with `fields: [{ field: "fieldSources.<key>", message: "Unknown field source key. Allowed: <list>" }]`.
   - Every value must be a string matching `^https?://` — otherwise 400 with `fields: [{ field: "fieldSources.<key>", message: "Source URL must start with http:// or https://" }]`.
   - Empty object `{}` is valid and clears all sources for that record (column set to `{}`, not `null`).
   - Omitted `fieldSources` leaves the existing column value unchanged on PUT.

3. **Organisation write contract** — `POST /api/organisations` and `PUT /api/organisations/:id` apply the same shape and validation rules using `ORGANISATION_FIELD_SOURCE_KEYS`.

4. **DTO updates** — `system-list-dto.js` and `organisation-list-dto.js` map the column to a camelCased `fieldSources` field on every list and detail response. Value is the JSON object verbatim or `null` (no transformation, no key filtering on read — read trusts what was written).

5. **Response inclusion in list endpoints** — `GET /api/systems` and `GET /api/organisations` include `fieldSources` on every row in `data`, so the list page can render ⓘ icons without a refetch.

6. **Backwards compatibility** — Existing API clients that don't send `fieldSources` continue to work; existing read responses gain `fieldSources` as a new optional field (v3-additive).

7. **Tests** — Jest tests cover the allow-list rejection path, the URL-scheme rejection path, the empty-object semantics, and a successful round-trip on at least one System and one Organisation field.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1)** — Create `backend/src/lib/field-source-keys.js` exporting both frozen arrays per AC1.
- [x] **Task 2 (AC: 2)** — Add validation helper `validateFieldSources(value, allowList)` in `system-controller.js` (or a shared `lib/validate-field-sources.js` if the same logic is reused for organisations — recommended).
  - [x] 2.1 Helper returns `{ ok: true, value }` on success or `{ ok: false, errors: [...] }` on failure (errors shape matches existing controller validation pattern).
  - [x] 2.2 Wire into `POST /api/systems` and `PUT /api/systems/:id` controller flows after existing validation.
- [x] **Task 3 (AC: 3)** — Wire the same helper into `POST /api/organisations` and `PUT /api/organisations/:id` using `ORGANISATION_FIELD_SOURCE_KEYS`.
- [x] **Task 4 (AC: 4, 5)** — Update `services/system-list-dto.js` and `services/organisation-list-dto.js` to map `field_sources` → `fieldSources` on every list and detail row. Verify the field appears on both list and detail responses.
- [x] **Task 5 (AC: 7)** — Add Jest tests:
  - [x] 5.1 `system-controller.test.js`: POST with valid `fieldSources` → 201 with round-trip; POST with unknown key → 400; POST with bad URL → 400; PUT with empty object clears sources.
  - [x] 5.2 `organisation-controller.test.js`: same coverage on the org side.
- [x] **Task 6 (AC: 6)** — Run full suite; verify existing tests pass without modification (validates additive contract).

### Review Findings

- [x] [Review][Patch] Non-string values under an allowed `fieldSources` key return the URL-scheme error message — should distinguish “must be a string” from invalid scheme — [`backend/src/lib/validate-field-sources.js`]
- [x] [Review][Patch] Add organisation POST test for non-plain-object `fieldSources` (e.g. array), matching system controller coverage — [`backend/src/__tests__/organisation-controller.test.js`]
- [x] [Review][Defer] Story “Technical requirements” / file-structure table still say DTO-only and separate `*-field-sources.test.js` files; implementation uses service pass-through and colocated tests — deferred, documentation drift in story artifact

## Dev Agent Record

### Implementation Plan

- Added frozen allow-lists and shared `validateFieldSources` in `lib/`.
- Extended `parseSystemWritePayload` / `parseOrganisationWritePayload` to validate optional `fieldSources` / `field_sources`; build a new object for Prisma (no body mutation).
- Services pass `field_sources` through on create and update when `fieldSources` is present in the controller payload; PUT omits the column when the client omits `fieldSources`.
- DTOs expose `fieldSources` from `row.field_sources` (verbatim JSON or null).

### Debug Log

- None.

### Completion Notes

- ✅ Implemented Story 11.2: allow-lists, validation, system/org write paths, DTO read paths, and Jest coverage in controller + service tests. Full backend suite: 228 tests passed.
- Services include minimal `field_sources` pass-through (required to persist writes; story technical note assumed DTO-only but persistence needs service wiring).

## File List

- backend/src/lib/field-source-keys.js (new)
- backend/src/lib/validate-field-sources.js (new)
- backend/src/controllers/system-controller.js
- backend/src/controllers/organisation-controller.js
- backend/src/services/system-service.js
- backend/src/services/organisation-service.js
- backend/src/services/system-list-dto.js
- backend/src/services/organisation-list-dto.js
- backend/src/__tests__/system-controller.test.js
- backend/src/__tests__/organisation-controller.test.js
- backend/src/__tests__/system-service.test.js
- backend/src/__tests__/organisation-service.test.js

## Change Log

- 2026-05-03: Story 11.2 — `fieldSources` write validation (allow-list + http(s) URLs), list/detail DTO exposure, service persistence, tests (Argirisdak / dev-story).

## Dev Notes

- **Validation location:** Controller-level, before the service call — same pattern as existing capability validation. Service receives a clean object or rejects upstream.
- **Empty-string values:** A key with `value === ""` should be rejected (`http(s)://` check fails). The frontend strips empty source inputs before sending (Story 11.4) — so an empty string reaching the server is an error path.
- **Type strictness:** If `fieldSources` is sent as a non-object (array, number, string), reject with 400 `{ field: "fieldSources", message: "Must be an object." }`.
- **Immutability:** Don't mutate the request body; build a new validated object before passing to service.
- **DTO read path:** Don't filter unknown keys on read — if someone manually edits the JSON in the DB to include keys outside the current allow-list, the API surfaces them verbatim. This is intentional: tightening only on write keeps read paths cheap and forward-compatible if the allow-list grows.

### References

- [epics.md — Story 11.2](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §2.4, §3.1, §3.2, §3.4](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [backend/src/services/system-list-dto.js](backend/src/services/system-list-dto.js) — DTO conventions.
- [backend/src/controllers/system-controller.js](backend/src/controllers/system-controller.js) — existing controller validation pattern.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Allow-list drift between DTO field names and source key names | Co-locate constants in `lib/field-source-keys.js`; if a DTO field is renamed, fail loudly via tests. |
| Open-redirect via attacker-controlled URLs | URLs are stored verbatim and rendered with `target="_blank" rel="noopener noreferrer"` on the frontend (Story 11.3). Server doesn't fetch URLs, only validates scheme. |
| Accepting non-string values (number, null, object) under a key | The `^https?://` regex implicitly rejects non-strings via type check before regex; ensure type check is explicit. |
| Forgetting to add new capability keys to the allow-list when Epic 12 lands | Lint test asserts every System DTO field with a `_capability` suffix has a matching entry in `SYSTEM_FIELD_SOURCE_KEYS`. (Add this in Story 12.1 if not already covered here.) |

## Technical requirements

- **Validation library:** None — manual controller validation per existing pattern.
- **No service-layer changes** beyond the DTO mapping.

## File structure requirements

| Action | Path |
|--------|------|
| Add | `backend/src/lib/field-source-keys.js` |
| Add | `backend/src/lib/validate-field-sources.js` (recommended) |
| Edit | `backend/src/controllers/system-controller.js` |
| Edit | `backend/src/controllers/organisation-controller.js` |
| Edit | `backend/src/services/system-list-dto.js` |
| Edit | `backend/src/services/organisation-list-dto.js` |
| Add | `backend/src/__tests__/system-field-sources.test.js` |
| Add | `backend/src/__tests__/organisation-field-sources.test.js` |

## Testing requirements

- New Jest coverage per Task 5.
- Existing test suite passes unchanged.
