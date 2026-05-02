# Deferred work

## Deferred from: code review of 10-2-drop-legacy-meta-endpoints-and-frontend-helpers.md (2026-05-02)

- **Mixed-epic diff and bisection** — Large combined diff complicates rollback and story-isolated review; prefer smaller PRs per epic/story when practical.

- **Compare organisations strip only when union kind is ready** — If `deriveCompareOrganisationsSystemUnion` can remain non-ready on errors, `ComparePage.jsx` may show no system-compare strip without explanation; verify behaviour once union module is committed and covered.

## Deferred from: code review of 10-1-migration-c-drop-legacy-lookup-tables-and-fk-columns.md (2026-05-02)

- **Frontend meta API wrappers vs removed routes** — `frontend/src/api/meta.js` still calls `/api/meta/ticketing-providers` and `/api/meta/crm-platforms`, which this story removes from the backend. Story 10.1 defers cleanup to Epic 10.2; remove or stub those fetchers when 10.2 runs.

- **Operational backup before Migration C** — AC #3 is process/runbook; README/decisions updates are Story 10.3.

- **`IF EXISTS` on Migration C** — Trade-off between idempotent re-run and silent skip when object names differ; verify constraint names against production before apply.

## Deferred from: code review of 9-3-compare-union-panel-and-contextual-compare-entry-points.md (2026-05-02)

- **Manual AC smoke and 5+ contextual-compare E2E** — Task 6 manual checks were not run in-session; the public `buildOrganisationContextualSystemCompare` path for five or more linked systems is not covered end-to-end in tests.

- **Optional UX for single-id system compare URL** — When `ids` resolves to a single column, there is no in-page guidance; acceptable gap unless product wants explicit copy.

- **Tie-break when all junction `lastUpdated` values are equal or unparseable** — `topFourSystemIdsByJunctionLastUpdated` relies on id ordering as fallback; document or adjust if stakeholders need a different deterministic rule.

## Deferred from: code review of 9-2-systemcard-component-compare-column.md (2026-05-02)

- **Organisation detail system compare CTA** — “Compare these systems →” still links to `/compare/organisations`; Epic 9.3 AC §5 expects `/compare/systems` with distinct system ids. Not changed in the Story 9.2 diff; track under 9.3 / `OrganisationDetailPage.jsx`.

- **Org compare → system compare strip** — Epic 9.3 AC §6 (union of systems across compared orgs, 2–4 vs 5+ copy) not implemented in `ComparePage.jsx` in this diff; track under 9.3.

## Deferred from: code review of 9-1-compare-route-shell-compare-systems-and-compare-organisations.md (2026-05-02)

- **Legacy compare page title vs copy** — `CompareLegacyPathPage` uses “Page not found” while the body explains dedicated URLs; revisit wording if users confuse app-wide failure with deprecated `/compare` only.
- **`CompareColumnShell` imported from `OrganisationCard.jsx`** — Works but couples system compare to an organisation-named module; extract a shared shell when convenient.
- **Loading / skeleton accessibility** — Column skeletons use `aria-hidden`; consider a page-level busy/status pattern for screen readers during compare load.
- **`useMemo` phase keyed on `queries` array** — If `useQueries` returns a new array reference each render, phase recalculates every time; confirm TanStack behaviour or narrow dependencies.
- **Test coverage** — Story adds `getSystemComparePhase` tests only; routing (`/compare/*`), legacy page, and `SystemComparePage` branches remain manual or untested.
- **`/compare/foo` vs bare `/compare`** — Catch-all renders the same legacy helper page; optional improvement to hint invalid path segments.

## Deferred from: code review of 8-5-organisation-form-linked-systems-editor.md (2026-05-01)

- **`fetchOrganisations` param rename (`provider`/`crm` → `system`/`system_role`)** — All callers must use the new query keys; verify list/filter hooks and URL sync outside the reviewed chunk.

- **“Compare these systems →” on detail** — Link targets `/compare/organisations` without guaranteed selection context; revisit when compare flows and SelectionProvider behaviour are final.

## Deferred from: code review of 8-4-organisation-detail-linked-systems-panel.md (2026-05-01)

- **Edit PUT 409 / duplicate `systemId`** — Frontend does not map update conflicts to inline messaging; depends on whether the junction PUT returns 409 when retargeting to an existing pair. Revisit when API behaviour is confirmed.

## Deferred from: code review of 8-2-organisation-api-filter-and-response-re-shape.md (2026-05-01)

- **`buildOrganisationListCompositeWhere` ignores orphan `system_role`** — If `listOrganisations` were called internally with `system_role` but no `system`, no junction filter is applied. The HTTP controller always validates pairing; defer hardening unless non-HTTP callers are introduced.

## Deferred from: code review of 7-6-system-create-edit-form.md (2026-04-30)

- **`createSystem` 409 / duplicate name not exercised in Vitest** — Inline name conflict UX depends on `err.fields`; add a mocked 409 response test when the frontend API suite grows.

## Deferred from: code review of 7-4-system-list-page.md (2026-04-30)

- **`limit` not read from URL for system list** — Matches organisation list parser behaviour; revisit if URL-driven page size is required.
- **`fetchSystems` assumes JSON error bodies** — Non-JSON responses can throw on `res.json()`; align with a shared API helper if this is tightened project-wide.
- **Search box vs URL `q` after back/forward** — Matches organisation list pattern; revisit if filters must mirror URL on every navigation type.

## Deferred from: code review of 7-3-navigation-shell-organisations-systems-switch-and-selectioncontext-split.md (2026-04-30)

- **No frontend tests for Story 7–3 behaviours** — Pathname-derived nav active state and navigation to `/compare/organisations?ids=` could be covered in a smoke or component test suite in a later story.

## Deferred from: code review of 7-2-system-rest-api-create-update-delete.md (2026-04-30)

- **P2002 mapped only to `field: name`** — Fine while `System.name` is the only unique constraint; extend error mapping if further uniques are added.
- **Monolithic `system-controller.js`** — Read and write paths share one file; consider splitting when the systems API surface grows.

## Deferred from: code review of 6-3-updatedat-on-system-organisationsystem-and-seed-reshape.md (2026-04-30)

- **`seed.js` `console.error` on failure** — Acceptable for CLI seed entrypoint; differs from API “no console.error” rule in project-context.
- **Integration test: Prisma `update` bumps `system.last_updated`** — Optional per story; add when CI runs migrations against Postgres.

## Deferred from: code review of 6-2-migration-b-backfill-systems-and-organisation-links-custom-sql.md (2026-05-01)

- **`CREATE EXTENSION pgcrypto` on managed Postgres** — May need superuser or extension allow-list on RDS/Aurora; verify against target hosting before production migrate.
- **Migration B not executed in automated integration tests** — Only structural Jest checks; rely on `migrate deploy` / manual DB verification until CI runs migrations against Postgres.

## Deferred from: code review of 6-1-migration-a-add-system-and-organisationsystem-schema-additive.md (2026-04-30)

- **Scoped diff vs working tree** — `git diff HEAD` on `main` may include large `_bmad-output/planning-artifacts` edits (epics, architecture, UX) alongside Migration A; reviewers should diff the story File List or a dedicated branch for Story 6.1 only.

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
