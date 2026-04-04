# Deferred work

## Deferred from: code review of 5-2-readme-completion-and-demo-smoke-test.md (2026-04-04)

- **ADR-011 rationale tone** — Replace informal “lineage the user hit” phrasing with a pinned Prisma version and a concrete reference to middleware removal in the docs when convenient.
- **Smoke checklist brittleness** — Hard-coded `United Kingdom` / `Tessitura` and optional compare UUIDs can drift when seed data or Story 5.1 ids change; update README when those change.
- **Seed on every backend start** — Optional README note on startup duration or log noise if operators find it confusing.

## Deferred from: code review of 5-1-sample-organisation-seed-data.md (2026-04-04)

- **Non-transactional sample-org seed loop** — `seedSampleOrganisations` upserts each row sequentially without `prisma.$transaction`; abrupt failure mid-loop can leave a partial sample set until seed is re-run. Low severity for local/demo; revisit if CI needs atomicity.

## Deferred from: code review of 3-3-multi-filter-api-integration-and-url-state.md — backend chunk (2026-04-04)

- **Prisma middleware removal** — `backend/src/lib/prisma.js` exports a plain client; old middleware tests were removed. Re-validate that no required cross-cutting behaviour (logging, soft rules, timestamp touch) was lost outside `last_updated` / Prisma defaults.

## Deferred from: code review of 3-3-multi-filter-api-integration-and-url-state.md — frontend chunk (2026-04-04)

- **Form/detail/button/selection refactors in the same diff** — Not exhaustively re-reviewed against Story 3.3 acceptance criteria; treat as adjacent epic work unless a regression is suspected.

## Deferred from: code review of 3-3-multi-filter-api-integration-and-url-state.md — tests chunk (2026-04-04)

- **List GET validation assertions** — Extend `invalid country` / `invalid capability` tests to assert the full AC7 error envelope (`data: null`, `meta: null`, `error.message`), matching `invalid page`.

- **Lowercase capability query on list** — Add a controller test that `membership=yes` (etc.) is normalised to `YES` when calling the service.

## Deferred from: code review of 3-1-text-search.md (2026-04-04)

- **Organisation DTO: `lastUpdated` vs `updatedAt`** — Both map from `last_updated`; consolidating to a single public field is deferred to a future API/versioning story (no breaking change in 3.1).

- **List page: remount on debounced `q` change** — `OrganisationListResults` uses `key={q ?? '__full__'}` to reset page without `setState` in `useEffect`; focus and subtree state reset on each new debounced term. Revisit if keyboard or filter-bar state needs preservation (Epic 3 follow-up).

- **GIN indexes without `CONCURRENTLY`** — Migration uses plain `CREATE INDEX`; fine for current scale; use `CONCURRENTLY` or online index strategies before very large production tables.

- **Monolithic organisation controller** — List query parsing lives alongside CRUD validation helpers; consider splitting when editing this module next.

## Deferred from: code review of 2-5-delete-organisation.md (2026-04-04)

- **No organisation-service unit tests for `deleteOrganisation`** — Story allowed controller-only tests; add service-level DELETE coverage (including Prisma error mapping) when tightening service test norms.

## Deferred from: code review of 2-4-edit-organisation.md (2026-04-04)

- **Edit form vs background refetch** — With `refetchOnWindowFocus`, organisation `data` can refresh while the edit form keeps locally hydrated state; remote concurrent changes are not merged into the form. Accept until optimistic locking or ETag/versioning is a product requirement.

## Deferred from: code review of 2-3-organisation-detail-page.md (2026-04-04)

- **Detail page: no automated frontend tests** — Story scope specifies manual checks in Docker; add component or E2E coverage when the project adopts a frontend test pattern for pages.

## Deferred from: code review of 2-1-organisation-list-page.md (2026-04-02)

- **List endpoint: no supertest + Prisma integration** — Controller tests mock `organisation-service`; end-to-end HTTP + DB + DTO is not covered. Consider adding when a test database is standard in CI.

## Deferred from: code review of 1-3-readme-and-project-documentation.md (2026-04-02)

- **Frontend ESLint react-refresh** — `eslint-plugin-react-refresh` reports `only-export-components` in `frontend/src/components/ui/button.jsx` and `frontend/src/context/SelectionContext.jsx`; fix or adjust rule when touching those modules.

## Deferred from: code review of 1-2-frontend-scaffold-and-application-shell.md (2026-04-02)

- **No catch-all / 404 route** — paths outside defined routes render an empty main area; decide later whether to show a 404 page, redirect home, or keep as-is (`frontend/src/App.jsx`).

- **Dockerfile `npm install` vs `npm ci`** — consider `npm ci` for reproducible image builds when the stack moves beyond local-dev-only containers (`frontend/Dockerfile`).
