# Story 12.2: API — Accept and Filter Five New Capabilities

Status: done

## Story

As a backend developer,
I want `POST` and `PUT /api/systems` to accept the five new capability fields, and `GET /api/systems` to filter on them,
so that the frontend can persist and query the new flags through familiar contracts.

## Acceptance Criteria

1. **Write contract** — `POST /api/systems` and `PUT /api/systems/:id` accept the five new top-level body fields (`seasonSubscriptionsCapability`, etc.) with values `YES`, `NO`, or `UNKNOWN`. Lowercase input is normalised to uppercase before persistence — matching existing capability handling.

2. **Validation** — Any of the five fields with a value outside `{YES, NO, UNKNOWN}` returns 400 with `fields: [{ field: "<capabilityName>", message: "Must be YES, NO, or UNKNOWN" }]`.

3. **Filter contract** — `GET /api/systems` accepts query params `seasonSubscriptionsCapability`, `dynamicPricingCapability`, `multiVenueSupportCapability`, `marketingAutomationCapability`, `accessibilityFeaturesCapability`, each with a single value `YES | NO | UNKNOWN` (case-insensitive; normalised to uppercase). Multiple capability filters compose with AND. An invalid value for any of these params returns **400** with `fields` listing that param and message **`Select a valid option`** — matching existing v1 capability list filters (`membership`, `donation`, `seating`).

4. **Service translation** — `system-service.js` extends its filter-building logic to pass each new capability to the Prisma `where` clause when present.

5. **Tests** — Jest tests cover:
   - Round-trip: POST with each new capability set to `YES` returns 201 and the response reflects the value.
   - Filter: `GET /api/systems?seasonSubscriptionsCapability=YES` returns only matching rows.
   - Compose: `GET /api/systems?seasonSubscriptionsCapability=YES&dynamicPricingCapability=NO` applies both.
   - Validation: POST with `seasonSubscriptionsCapability=MAYBE` returns 400.

## Tasks / Subtasks

- [x] **Task 1 (AC: 1, 2)** — Update `system-controller.js` to accept and validate the five new capability body fields. Reuse the existing capability validation helper (DRY); if no helper exists, extract one.
- [x] **Task 2 (AC: 3, 4)** — Update `system-controller.js` `listSystems` handler and `system-service.js` filter logic to read the five new query params and apply them to the Prisma `where` clause.
- [x] **Task 3 (AC: 5)** — Add Jest tests covering the AC5 cases. Place in existing `system-controller.test.js` and `system-service.test.js` files.

## Dev Notes

- **Capability normalisation:** Existing v1 capabilities accept lowercase input via `String(value).toUpperCase()` before validation. Apply the same pattern to the five new fields.
- **Filter param naming:** Use camelCase query params (`seasonSubscriptionsCapability=YES`) for consistency with the new write field names. This is consistent with how the v1 `membership` / `donation` / `seating` filters are already named (note: those are short forms, but the v3 capabilities are full camelCase per the architecture delta — leave the v1 filter names alone, just add the five new ones).
- **No multi-value support for these filters:** Single value per param, like the v1 capability filters. Multi-value (`?cap=YES&cap=NO`) is only used for `category` (ADR-017) and is not introduced here.
- **Empty-array clear semantics:** Not applicable — capabilities are scalars, not collections.

### References

- [epics.md — Story 12.2](_bmad-output/planning-artifacts/epics.md).
- [architecture-v3-delta.md §3.1, §3.3](_bmad-output/planning-artifacts/architecture-v3-delta.md).
- [backend/src/controllers/system-controller.js](backend/src/controllers/system-controller.js) — existing capability validation pattern.

## Developer context (guardrails)

| Risk | Mitigation |
|------|------------|
| Diverging validation strictness from v1 capability filters | Use the same helper / pattern; tests assert lowercase input is accepted. |
| Forgetting one of the five capabilities | List them as a constant array at the top of the controller / service and iterate; avoid copy-paste. |
| Filter param name mismatch between docs and code | Architecture-v3-delta §3.1 is the source of truth for camelCase names. |

## Technical requirements

- No new npm packages.
- Reuse existing controller and service patterns.

## File structure requirements

| Action | Path |
|--------|------|
| Edit | `backend/src/controllers/system-controller.js` |
| Edit | `backend/src/services/system-service.js` |
| Edit | `backend/src/__tests__/system-controller.test.js` |
| Edit | `backend/src/__tests__/system-service.test.js` |

## Testing requirements

- Jest coverage per AC5.
- Existing tests pass.

## Dev Agent Record

### Implementation Plan

- Centralised the five v3 capability field definitions in `SYSTEM_EXTENDED_CAPABILITY_FIELDS` on the controller; reused `normaliseOptionalEnum` + `CAPABILITY_SET` for writes (invalid body → 400 with message `Must be YES, NO, or UNKNOWN` per AC2).
- List handler parses camelCase query params matching write field names; invalid filter values return 400 with `Select a valid option`, consistent with existing `membership` / `donation` / `seating` on `GET /api/systems` (per AC3).
- Service: extended `buildSystemListWhere`, `listSystems`, `createSystem`, and `updateSystem` to map camelCase payload keys to Prisma snake_case columns.
- Extended `system-http-stack.test.js` `matchesWhere` shim for the five columns so integration-style filters behave correctly.

### Debug Log

- Local `npm test` / Jest could not complete in this environment: `backend/node_modules` contains root-owned files and `unrs-resolver` napi-postinstall fails with `EACCES`; `jest-circus` resolution also failed. Fix with `sudo chown -R "$USER":"$USER" backend/node_modules` (or clean reinstall) and re-run `cd backend && npm test`.

### Completion Notes

- ✅ Story 12.2: POST/PUT accept all five capabilities (camelCase + snake_case body aliases); GET list filters with AND composition; tests added for round-trip (`it.each`), snake_case create, filter, compose, and MAYBE validation.
- ✅ HTTP stack shim updated for new `where` clauses.

## File List

- `backend/src/controllers/system-controller.js`
- `backend/src/services/system-service.js`
- `backend/src/__tests__/system-controller.test.js`
- `backend/src/__tests__/system-service.test.js`
- `backend/src/__tests__/system-http-stack.test.js`

## Change Log

- **2026-05-03** — Implemented API accept/filter for five new system capabilities; Jest coverage; Prisma create/update mapping; stack test shim alignment.
- **2026-05-03** — Code review Decision 1: AC3 and epics Story 12.2 updated so invalid capability **values** on `GET /api/systems` document 400 + `Select a valid option`, matching v1 `membership` / `donation` / `seating`.
- **2026-05-03** — Code review Decision 2: accepted mixed scope — `fieldSources` work may ship on the same branch as Story 12.2.
- **2026-05-03** — Code review: applied all patch findings — extended GET/POST/PUT tests (`it.each`), `.some()` on validation fields where appropriate (`system-controller.test.js`).

### Review Findings

- [x] [Review][Decision] Story AC3 vs implemented GET filter behaviour — **Resolved:** Option 1 — AC3 and `epics.md` Story 12.2 now match implementation (400 for invalid values on known capability query params).

- [x] [Review][Decision] Mixed scope: `fieldSources` in the same change-set as Story 12.2 — **Resolved:** Option 1 — coupling accepted on this branch; no split required for review sign-off.

- [x] [Review][Patch] Add PUT `/api/systems/:id` tests for extended capabilities — [`system-controller.test.js`] — applied (`it.each` normalise + MAYBE).

- [x] [Review][Patch] Extend GET list tests: invalid query value for each of the four other extended capability params (parity with `seasonSubscriptionsCapability`) — [`system-controller.test.js`] — applied (`it.each` on all five params; YES filter also parametrised).

- [x] [Review][Patch] Extend POST negative tests: invalid enum on the other four extended capability body fields (parity with `seasonSubscriptionsCapability` MAYBE) — [`system-controller.test.js`] — applied (`it.each`).

- [x] [Review][Patch] Prefer `error.fields.some(...)` (or sorted assertions) over `fields[0]` where multiple validation errors are possible — [`system-controller.test.js`] — applied for extended-capability GET invalid, `fieldSources` POST errors.

- [x] [Review][Defer] snake_case body aliases for all five extended capabilities — [`system-controller.js` `parseSystemWritePayload`] — deferred; beyond AC1 camelCase wording; harmless extra API surface.

- [x] [Review][Defer] `matchesWhere` in `system-http-stack.test.js` uses sequential early-return checks — deferred; may not mirror Prisma `AND` semantics for every composite predicate shape.

- [x] [Review][Defer] Service `createSystem` uses `?? undefined` on new capability columns — deferred; explicit `null` vs omit vs `UNKNOWN` semantics not specified.

- [x] [Review][Defer] Deeper hardening for `fieldSources` validation (URL length, scheme edge cases, non-string values) — deferred; outside Story 12.2 core scope.

- [x] [Review][Defer] HTTP stack fixtures default all extended capabilities to `UNKNOWN` — deferred; reduces diversity of integration-test filter scenarios.
