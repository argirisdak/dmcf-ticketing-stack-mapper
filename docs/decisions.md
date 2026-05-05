# Architecture Decisions

This file records all meaningful architectural decisions made during implementation. Each entry states what was decided and why.

**Index (quick find for handoff / audits):** Prisma v6 — **ADR-001**; Tailwind v3 pin — **ADR-005**; shadcn/ui copy-paste — **ADR-006**; React Router v6 via `react-router-dom` — **ADR-007**; country list dual maintenance — **ADR-008**; list pagination when `page` is past the end — **ADR-010**; organisation `last_updated` via `@updatedAt` (no `$use`) — **ADR-011**; GET organisation by id — 404 for missing and malformed ids — **ADR-012**; compare selection preserved after navigating to compare — **ADR-013**; sample organisations — fixed UUID upserts — **ADR-014**; v2 schema migration — three-step sequence — **ADR-015**; system `geographic_focus` list dual maintenance — **ADR-016**; `GET /api/systems` multi-value `category` filter — **ADR-017**; organisation–system junction hard-delete — **ADR-018**; system `custom_attributes` as JSON — **ADR-019**; system name unique / vendor disambiguation — **ADR-020**; three-migration sequence (§8 traceability) — **ADR-021**; no batch compare endpoint — **ADR-022**; selection context split (organisations vs systems) — **ADR-023**; compare paths `/compare/systems` & `/compare/organisations` — **ADR-024**; per-field source provenance via `field_sources` JSON column — **ADR-025**; organisation composite uniqueness `(name, city, country)` + warning UX — **ADR-026**; system capability column set scope — **ADR-027**; list sort query-param contract — **ADR-028**; custom-attribute editor reuses JSON column (no schema change) — **ADR-029**; Prisma `--create-only` migration drift repair (hand-edit) — **ADR-030**.

---

## ADR-001: Prisma v6 (not v7)

**Decision:** Pin to Prisma v6 (`prisma@6`, `@prisma/client@6`).

**Rationale:** Prisma v7 requires ESM and a `prisma.config.ts` file (TypeScript in a JS project). v6 runs in CommonJS without modification and has no confirmed EOL date for an internal MVP timeline. Organisation freshness is maintained via **`@updatedAt` on `last_updated`** (see **ADR-011**), not `$use` middleware.

**Implication:** If the project migrates to TypeScript or ESM in a future phase, reassess the Prisma major version and config model independently of `last_updated` mechanics.

**Migration SQL:** Schema remains authoritative in **`schema.prisma`**; new DDL is produced with **`prisma migrate`**. The **only** supported hand-edit to an **already generated** `migration.sql` is the narrow drift-repair case in **ADR-030** (remove unintended statements such as spurious `DROP INDEX` from `--create-only` output before apply). Do not use ad-hoc SQL edits to introduce or change columns without a matching `schema.prisma` change.

---

## ADR-011: Organisation `last_updated` via Prisma `@updatedAt` (no `$use`)

**Decision:** Remove Prisma Client **`$use`** middleware from `backend/src/lib/prisma.js`. On the `Organisation` model, set **`last_updated`** to **`@default(now()) @updatedAt`** and **drop** the separate **`updated_at`** column from `organisation` (Prisma allows only one `@updatedAt` field per model). The public API continues to expose **`lastUpdated`** and **`updatedAt`** in the organisation DTO; both map from the **`last_updated`** column so existing clients keep a stable shape.

**Rationale:** In current Prisma releases used by this project, **`$use` is not available** on the client (it was removed in the lineage the user hit — treated here as “do not rely on `$use`”). Prisma’s built-in **`@updatedAt`** updates the field on every `update` (and on `create`) at the client layer, which matches the prior “never trust client `last_updated`” rule. Stripping `updated_at` avoids duplicating two timestamps with the same meaning.

**Implication:** Run migrations after pull (`organisation.updated_at` removed). Any raw SQL or external tools that referenced `organisation.updated_at` must use `last_updated` instead.

---

## ADR-002: Optional `city` on Organisation for Story 3.1 text search

**Decision:** Add nullable `organisation.city` and include it in list/detail DTOs as `city`. Server-side list search (`GET /api/organisations?q=`) matches case-insensitively on `name`, `city`, `notes`, and related `ticketing_provider.name` (OR). A GIN (`gin_trgm_ops`) index on `city` ships in the same migration as indexes for `notes` and `ticketing_provider.name`.

**Rationale:** Epic 3 / Story 3.1 acceptance criteria require search by city as well as name, notes, and provider. The earlier “exclude city” note is superseded by that epic text. City remains optional (no form field required in 3.1) so existing creates/updates stay valid.

**Implication:** Editors can add a city field to create/update flows later; until then `city` is usually null. Apply the Story 3.1 migration so the column and indexes exist before relying on search in deployed environments.

---

## ADR-003: Jest used for backend unit tests in MVP

**Decision:** Added Jest + Supertest for backend unit and integration tests despite the architecture stating "no testing framework for MVP."

**Rationale:** Proactively added for quality assurance during scaffold setup. Jest was chosen for zero-config simplicity with CommonJS — it works out of the box with no transpilation or configuration beyond `"test": "jest"` in `package.json`.

**Implication:** If testing expands (especially to the frontend), evaluate migrating to Vitest for consistency with the Vite-based frontend and alignment with the architecture's stated preference for Vitest.

---

## ADR-004: Express v5 resolved

**Decision:** Express `^5.2.1` was installed (Express 5), not Express 4.

**Rationale:** `npm install express` resolves to v5 as of 2026. Express 5 is largely backward-compatible but has differences: `req.query` returns a plain object (not extended by `qs`), path route matching is stricter, and rejected promises in async handlers are forwarded to error middleware automatically. The project's simple routing and JSON API patterns are unaffected.

**Implication:** Agents working on Epic 2+ should consult Express 5 documentation. Key difference: async errors in route handlers propagate automatically — explicit `try/catch` with `next(err)` is still recommended for clarity but unhandled rejections no longer crash the server.

---

## Story 1.3 compliance checklist (AC2)

The following AC2 bullets are satisfied by the ADRs below (no duplicate Prisma ADR — see **ADR-001**):

| Requirement | ADR |
|-------------|-----|
| Prisma v6 (not v7) | **ADR-001** |
| Tailwind CSS v3 (not v4) pin | **ADR-005** |
| shadcn/ui copy-paste (not CLI) | **ADR-006** |
| React Router v6 via `react-router-dom` | **ADR-007** |
| Country list dual maintenance (backend `lib/countries.js` + frontend) | **ADR-008** |
| Compare selection preserved on compare navigation (no `clearSelection()` on navigate) | **ADR-013** |

---

## ADR-005: Tailwind CSS v3 pin (not v4)

**Decision:** Stay on Tailwind CSS v3 with `tailwind.config.js` (and PostCSS) rather than adopting Tailwind v4’s CSS-first configuration model for this MVP.

**Rationale:** The project uses a conventional v3 `tailwind.config.js` workflow. Tailwind v4 shifts to CSS-based configuration; shadcn/ui patterns and examples used here are validated against v3. Pinning v3 avoids churn and documentation drift while the UI surface is still growing.

**Implication:** Any move to v4 should be a deliberate migration with config and dependency audits, not an incidental major bump.

---

## ADR-006: shadcn/ui via manual copy (not CLI)

**Decision:** Add shadcn-style primitives by **copying** component source into `frontend/src/components/ui/`. Do **not** use `npx shadcn@latest add` (or similar CLI) to pull components.

**Rationale:** Manual copy keeps dependencies minimal and avoids extra tooling coupling and version surprises from the installer. This matches project-context guidance: UI primitives are copy-paste only, not a separate installable package.

**Implication:** New primitives are added by pasting from shadcn docs and adjusting imports/paths as needed.

---

## ADR-007: React Router browser package (`react-router-dom@6`)

**Decision:** Use **`react-router-dom@6`** for routing. All router hooks and components are imported from `react-router-dom`, not from `react-router` alone.

**Rationale:** `react-router-dom` is the correct package for browser applications; it wraps core `react-router` with DOM bindings. Installing only `react-router` is a common mistake and leads to missing exports for web apps.

**Implication:** `package.json` should list `react-router-dom` at v6; imports stay consistent with that package.

---

## ADR-008: Country list dual maintenance (no `/api/meta/countries`)

**Decision:** The canonical country list for backend validation lives in **`backend/src/lib/countries.js`** as `COUNTRIES` (CommonJS export). **`backend/src/prisma/seed.js`** imports and **re-exports** `COUNTRIES` so existing `require('.../seed.js')` call sites keep working. The same values are **mirrored** in **`frontend/src/lib/countries.js`**. There is **no** `GET /api/meta/countries` endpoint.

**Rationale:** Story 2.2 needed country validation in the organisation controller without pulling the full seed module (which wires Prisma). A tiny shared module keeps seed and controller aligned. Keeping a mirrored frontend list avoids an extra API hop for static geography.

**Implication:** Whenever the country list changes, **update** `backend/src/lib/countries.js` **and** `frontend/src/lib/countries.js` in the same change (seed continues to re-export from `lib/countries.js`). Record that dual update in commit messages or PR descriptions.

---

## ADR-009: Organisation list API uses an explicit camelCase DTO

**Decision:** `GET /api/organisations` maps each Prisma row through `toOrganisationListDto` in `backend/src/services/organisation-list-dto.js` instead of returning raw `findMany` results.

**Rationale:** The Prisma client exposes snake_case property names that match `schema.prisma`, while the public API contract requires camelCase JSON and a stable DTO shape. **Pre–Migration C**, the mapper also nested legacy lookup objects **`ticketingProvider`** and **`crmPlatform`** alongside **`organisationType`**. **After Migration C** (Epic 8+), those provider/platform nests are **not** returned; linked systems are expressed as a **`systems`** array on the DTO (see paragraph below). The mapper remains the single place that defines list/create/detail/update JSON.

**Implication:** New organisation endpoints should reuse or extend the same mapping pattern rather than serialising Prisma rows directly.

**POST `/api/organisations` (Story 2.2):** Request bodies use **camelCase** keys (`name`, `country`, `organisationTypeId`, optional FK ids, three `*Capability` enums as `YES` | `NO` | `UNKNOWN`, optional `sourceReference`, `notes`, `capacity`). The handler strips client-supplied `id` and timestamp fields before persist. Successful **201** responses use the same **`toOrganisationDto`** mapper as the list (including `updatedAt`).

**v2 list/detail shape (Epic 8+, after Migration C):** `toOrganisationDto` in `organisation-list-dto.js` exposes a **`systems`** array of junction links (via `organisation-system-dto` / `toLinkDto`: role, per-link notes, nested `system` summary). Legacy nested **`ticketingProvider`** / **`crmPlatform`** fields are **not** returned after legacy FK columns and lookup tables were removed. Treat the mapper implementation as the contract.

---

## ADR-010: List pagination — `page` beyond last page

**Decision:** For `GET /api/organisations`, when `page` is greater than `totalPages` (including when `total` is 0), the API returns **HTTP 200** with `data: []`, `error: null`, and `meta` echoing the requested `page`, `limit`, `total`, and `totalPages` (no `400`, no clamping to the last page).

**Rationale:** Matches common REST list semantics (offset past the end yields an empty window). Chosen explicitly over `400` or clamping during code review (2026-04-02) so clients can rely on stable success handling; the UI should disable or hide page controls beyond `totalPages` rather than depending on server-side rejection.

**Implication:** Do not add validation errors for “page too high” unless this ADR is revised. Document in client code if deep-linking to a high `page` should reset to page 1.

---

## ADR-012: `GET /api/organisations/:id` — 404 for missing and malformed ids

**Decision:** `getOrganisationById` treats **non-UUID** `:id` path segments the same as a missing row: **HTTP 404** with envelope `{ data: null, error: { message: 'Organisation not found', fields: [] }, meta: null }`. Valid UUIDs that do not exist receive the same response. No **400** for malformed ids.

**Rationale:** Avoids Prisma throwing on invalid UUID strings, keeps a single client-facing “not found” story for bad links, and matches the delete-404 wording planned for Story 2.5.

**Implication:** The SPA should use **404** (e.g. `OrganisationNotFoundError` with `statusCode === 404`) for both unknown and malformed ids when rendering the detail not-found state.

---

## ADR-013: Preserve compare selection after navigating to compare (Story 4.1)

**Decision:** When the user activates **Compare selected** and the app navigates to **`/compare?ids=...`**, **do not** call **`clearSelection()`**. Selection remains in **`SelectionProvider`** so **browser Back** returns to the list with the **same** checkboxes still selected.

**Rationale:** Epic 4 / Story 4.1 acceptance criteria require this back-navigation UX. Earlier architecture text described clearing selection on compare; that behaviour is **superseded** here for product usability.

**Implication:** The compare page (Story 4.2+) must tolerate stale context state if the user deep-links to compare without using the bar; list and bar remain the source of truth for “what was selected” when returning via history.

---

## ADR-014: Sample organisations — fixed UUID upsert (Story 5.1)

**Decision:** Curated demo `organisation` rows live in `backend/src/prisma/sample-organisations-seed-data.js` and are applied from `seed.js` **after** reference lookups are upserted. Each sample row has a **stable UUID**; persistence uses **`organisation.upsert` on `id`** with full scalar payloads (including explicit **`created_at`** and **`last_updated`**) on both create and update so repeated `prisma db seed` / `migrate reset` yields the same rows without duplicates.

**Rationale:** Meets Story 5.1 AC5 (idempotent, deterministic state) without deleting user-created orgs that might share no ids with the fixed set. Lookup FKs are resolved by **name** at seed time, not hardcoded lookup UUIDs.

**Implication:** Adding or renumbering sample UUIDs is a conscious change; testers can rely on documented ids for compare and filter smoke checks. Non-sample organisations created in the app are unaffected by re-seeding.

---

## ADR-015: v2 systems model — three Prisma migrations (additive → backfill → destructive)

**Decision:** Converting the catalogue from legacy `ticketing_provider` / `crm_platform` FKs on `organisation` to the `system` + `organisation_system` model is implemented as **three sequential Prisma migrations**, not one: **(A)** additive schema (`system`, `organisation_system`, enums, indexes; legacy columns and lookup tables unchanged); **(B)** custom SQL backfill from legacy FKs into the new tables; **(C)** drop legacy lookup tables and FK columns (deferred to Epic 10).

**Rationale:** A single migration that removes the old FK columns before `organisation_system` is populated would strand associations and lose provenance. Additive-first keeps existing rows valid while the junction is filled deterministically, then destructive cleanup is safe.

**Implication:** Story 6.1 applies only Migration A. Local `npx prisma migrate dev` may detect drift versus `schema.prisma` when the database still has **raw-SQL-only** GIN (`pg_trgm`) indexes (organisation search and system search) that are not declared as Prisma `@@index` attributes — those indexes are intentional. Use **`prisma migrate deploy`** in Docker/CI when applying an already-reviewed migration folder; avoid interactive `migrate dev` replan cycles unless intentionally generating a new migration.

---

## ADR-016: System `geographic_focus` list — dual maintenance (Story 6.3)

**Decision:** Canonical allowed values for **`system.geographic_focus`** live in **`backend/src/lib/system-geographic-focus.js`** and **`frontend/src/lib/system-geographic-focus.js`** as **`SYSTEM_GEOGRAPHIC_FOCUS`**. Both files must stay identical. There is no `GET /api/meta/geographic-focus` endpoint.

**Rationale:** Matches the **ADR-008** pattern for countries: static validation lists for an internal MVP without an extra round-trip. System list filters (Epic 7+) will validate `geographic_focus` against this set.

**Implication:** When the list changes, update **both** files in the same commit. Seed data and migrations should only use values present in the shared constant.

---

## ADR-017: `GET /api/systems` — multi-value `category` filter via repeated query param (Story 7.1)

**Decision:** The `category` filter on `GET /api/systems` accepts **repeated** `?category=` params (e.g. `?category=INTEGRATED&category=TICKETING`) and maps to a Prisma **`category: { in: [...] }`** clause. This is the first multi-value list filter in the API; all other filter params remain single-value.

**Rationale:** Category is a primary discovery dimension for Systems and users will frequently want to view more than one category at once (e.g. "show me integrated and ticketing systems"). A comma-separated single-param approach (`?category=INTEGRATED,TICKETING`) is non-standard; Express's built-in `req.query` parsing of repeated keys into arrays is the idiomatic choice. `URLSearchParams` on the frontend handles repeated params natively.

**Implication:** The frontend must serialise multi-category selection using `URLSearchParams.append('category', value)` per selected value — not a comma-separated string. Backend controller normalises a single string param to a one-element array so single-value and multi-value clients behave identically.

---

## ADR-018: OrganisationSystem unlink is a hard-delete

**Decision:** Removing a link between an organisation and a system **deletes** the `organisation_system` row. There is **no** soft-delete column, **no** `active` flag, and **no** adoption-history table in the MVP.

**Rationale:** Keeps the junction model small and queries unambiguous for an internal tool. Confirmed destructive UX (confirm dialog) is acceptable; audit requirements can be revisited in a later phase if needed.

**Implication:** Clients must not assume “unlink” leaves a tombstone row. Any future history feature would be a new table or event log, not a reinterpretation of delete.

---

## ADR-019: System custom attributes as JSON on `System.custom_attributes`

**Decision:** Vendor-specific or integration-specific fields that do not warrant first-class columns are stored in **`system.custom_attributes`** as **JSON** (Prisma `Json`), not in a separate `system_attribute` / EAV table.

**Rationale:** Avoids schema churn for rare keys while keeping one row per system. Editors validate shape at the API boundary; MVP exposes attributes as **read-only** in the UI (Growth may add full editing).

**Implication:** Query/filter semantics for custom keys stay limited unless indexed paths are introduced later. Document breaking JSON changes in release notes if clients depend on specific keys.

---

## ADR-020: System `name` is unique; use `vendor` for disambiguation

**Decision:** `system.name` is **unique** at the database level. Products that share a marketing name from different vendors are distinguished via **`vendor`** (and related descriptive fields), not by relaxing uniqueness.

**Rationale:** List and compare UIs use `name` as the primary human label; duplicate names would confuse operators and break mental models for “one catalogue row per product”.

**Implication:** Seed and imports must assign unambiguous `name` values or vary `vendor` in the displayed label where the product name collides.

---

## ADR-021: Three-migration sequence (architecture-v2-delta §8 traceability)

**Decision:** Any schema change that **moves** data from legacy structures into new tables must follow the **additive → backfill → destructive** migration sequence. This decision records **§8 traceability** for the v2 programme; the full rationale and operational implications are in **ADR-015**.

**Rationale:** Duplicating the long ADR-015 narrative would drift; a short pointer keeps one source of truth while satisfying the delta doc’s decision list.

**Implication:** When proposing shortcuts (e.g. combining backfill and drop), cite **ADR-015** and reject unless risk is explicitly accepted.

---

## ADR-022: No batch compare endpoint — parallel `GET /api/systems/:id` (and organisations)

**Decision:** There is **no** dedicated “compare many systems in one request” API. The compare UI loads **one resource at a time** via existing detail endpoints (e.g. parallel **`GET /api/systems/:id`** calls).

**Rationale:** Keeps read contracts simple, leverages HTTP caching patterns the browser already uses, and avoids N+1 payload design debates for an internal MVP.

**Implication:** If compare latency becomes an issue, prefer a measured move to a batch read **after** profiling — not by default.

---

## ADR-023: Split selection context — organisations vs systems

**Decision:** Compare selection state for **organisations** and **systems** is held in **separate** React context providers (`OrganisationSelectionProvider` and `SystemSelectionProvider` in `frontend/src/context/`), not a single shared bag of mixed entity types.

**Rationale:** Prevents ID collisions and ambiguous UI when both catalogues are in use; each compare flow has its own selection bar and URL shape.

**Implication:** Features that span both entity types must not reuse the wrong context; cross-linking from org detail to system compare should pass explicit ids, not “whatever was selected elsewhere”.

---

## ADR-024: Compare paths `/compare/systems` and `/compare/organisations`

**Decision:** First-class compare URLs are **`/compare/systems`** and **`/compare/organisations`** (with `?ids=` comma-separated UUIDs as implemented). Legacy **`/compare?ids=...`** bookmarks from v1 **may break** or are served only via a **legacy route** shim; that is acceptable for an internal MVP.

**Rationale:** Explicit paths align with the split catalogues and routing structure; cleaning old bookmarks is lower cost than perpetuating a single ambiguous compare entry.

**Implication:** Documentation and new links must use the prefixed paths. Support tickets for old bookmarks should point users to the new URLs.

---

## ADR-025: Per-field source provenance via `field_sources` JSON column on System and Organisation

**Decision:** Material data points on `System` and `Organisation` carry their own source URL via a `field_sources Json?` column on each entity. Shape: `{ "<fieldName>": "<url>" }` with field-name keys validated against a per-entity allow-list (`SYSTEM_FIELD_SOURCE_KEYS`, `ORGANISATION_FIELD_SOURCE_KEYS`) co-located with the DTOs in `backend/src/lib/field-source-keys.js` and mirrored in `frontend/src/lib/field-source-keys.js`. The row-level `source_reference` field is preserved as a general fallback but **does not** auto-substitute into per-field claims at any UI surface.

**Rationale:** The original brief specified per-data-point provenance; v2 reduced this to one row-level source per record, which proved insufficient — a comparison row's specific claim (pricing model, deployment) is not defended by a vendor's marketing root URL. Three implementation paths were considered:

- **Companion column per attribute** (`pricing_model_source`, `deployment_model_source`, ...) — rejected: schema sprawls; every new attribute needs a migration.
- **Side table `FieldSource(entity, entity_id, field_name, source_reference)`** — rejected: extra join on every read, more migration ceremony, no concrete query need yet that benefits from relational shape.
- **JSON column on the entity row** — chosen. Same reasoning as ADR-019 for `custom_attributes`: scales free with new fields, sources travel with the row, no join, render is trivial.

The strict no-fallback rule (showing ⓘ only when `field_sources[fieldName]` exists) is deliberate: substituting the row-level source as a fallback would mislead readers into thinking the marketing root URL backs a specific claim it doesn't.

**Implication:** When a new sourceable field is added to either DTO, both the backend and frontend allow-list constants must be updated in the same commit (dual maintenance, mirroring the ADR-008 / ADR-016 pattern). If a "find broken sources" feature is ever required, the JSON column trades cheaply for a normalised side table at that time — re-evaluate then.

---

## ADR-026: Organisation composite uniqueness `(name, city, country)` plus async warning UX

**Decision:** Add a composite unique constraint `@@unique([name, city, country])` to the `Organisation` model. On `POST` and `PUT`, Prisma `P2002` errors targeting `name_city_country_key` map to a `409 Conflict` with a message naming the conflicting `(name, city, country)`. In addition, the create form (only — not edit) runs a `300ms`-debounced fuzzy match against `GET /api/organisations/check-similar` on the name field's blur and surfaces a non-blocking warning panel listing similar existing organisations, with **Continue** / **Cancel and amend** actions.

**Rationale:** Hard `UNIQUE(name)` would block legitimate name reuse — there are several "Theatre Royal" venues across the UK (Bath, Newcastle, Plymouth, Drury Lane). A composite of `(name, city, country)` catches accidental duplicates without forcing valid data through workarounds. The fuzzy-match warning catches typo'd near-duplicates that the constraint cannot see (e.g. "Royal Opera House" vs "Royal Opera Hse"). Together they give a soft + hard guard:

- Hard guard at the DB layer for exact-collision rejection.
- Soft guard at the UI layer for similar-but-not-exact names, deliberately non-blocking because the user may have legitimate reasons to proceed.

PostgreSQL treats NULL as distinct in unique constraints, so two `(X, NULL, UK)` rows do not collide. This is intentionally accepted — the warning UX catches it, and forcing a city sentinel value would be more harmful than helpful for an internal MVP.

Systems do **not** need this guard. `system.name` is already hard-unique via ADR-020 because system names are vendor product names protected by IP — there is no legitimate same-name-different-city case for products.

**Implication:** Pre-flight collision check is mandatory before applying the migration in any non-throwaway environment. The fuzzy-match endpoint reuses the existing `pg_trgm` GIN index — no new indexes. Threshold (`0.4` similarity) is empirical; tune if too noisy or too strict.

---

## ADR-027: System capability column set — five new flags, custom attributes for the rest

**Decision:** Five sector-relevant capability flags added to `System` as first-class columns: `season_subscriptions_capability`, `dynamic_pricing_capability`, `multi_venue_support_capability`, `marketing_automation_capability`, `accessibility_features_capability`. All reuse the existing `CapabilityState` enum and integrate with `field_sources` (ADR-025). The remaining capabilities mentioned in the original brief (general admission, mobile wallet, API access, SSO, email marketing, audience segmentation, reporting analytics, CRM database, ticketing) are **not** added as columns — they belong in `custom_attributes` on a per-system basis when actually needed for a procurement decision.

**Rationale:** The bar for promoting a capability to a column is *defensibly fillable on at least 8 of 11 seeded Systems with a publicly verifiable source URL*. Capabilities that fail this bar produce mostly-`UNKNOWN` columns that add noise without signal. Categories of disqualification:

- **Redundant with `category`:** `ticketing` is implied by `TICKETING|INTEGRATED`; `crm_database` by `AUDIENCE_MANAGEMENT|INTEGRATED`. Adding them duplicates information.
- **Universal among modern platforms:** `api_access`, `reporting_analytics`, `email_marketing`, `mobile_wallet`. A row of 11 `YES` values differentiates nothing.
- **Genuinely sector-relevant differentiators:** the five chosen — these are the ones procurement-relevant decisions actually turn on (`Tessitura YES vs PatronBase NO` on dynamic pricing, etc.).

The five chosen carry intentional asymmetry: a `YES` or `NO` on these flags must be backed by a per-flag source URL via `field_sources` (strict source-required policy in seed data). `UNKNOWN` is the honest default and is not treated as a failure mode.

**Implication:** If a future use-case shows that one of the rejected capabilities does discriminate procurement decisions across the catalogue, promote it to a column then — additive migration, low cost. Don't pre-emptively add columns "in case they're useful". The custom-attribute carrier handles long-tail capabilities without schema churn.

---

## ADR-028: List sort query-param contract — `?sort` + `?order` with per-entity allow-list

**Decision:** Both `GET /api/organisations` and `GET /api/systems` accept `sort=<field>&order=<asc|desc>`. Each entity has a fixed allow-list (`ORGANISATION_SORT_KEYS`, `SYSTEM_SORT_KEYS`) of valid sort fields, defined in `backend/src/lib/sort-allowlists.js`. Default sort: `name asc` for both entities. Invalid `sort` or `order` returns 400 with the standard validation envelope. Multi-column sort (`?sort=country,name`) is **not** supported in v3 — single-column only.

**Rationale:** The query-param contract reads consistently with the rest of the API surface (already uses query params for filter, search, pagination). A fixed allow-list per entity prevents arbitrary user-controlled `orderBy` from reaching Prisma — both a security posture (no injection of related fields) and a maintenance posture (the API contract is documented by the constants). Default `name asc` is the most intuitive starting point and matches how operators read alphabetised lists.

Multi-column sort was rejected for v3 because the use case (tiebreaking when sorting by `country` for multi-page consistency) is theoretical at MVP scale. If pagination jitter on tied rows becomes visible, add a stable tiebreaker `[{ country: order }, { name: 'asc' }]` rather than exposing a multi-column param.

**Implication:** Frontend mirror in `frontend/src/lib/sort-options.js` with human-friendly labels ("A→Z", "newest first") must stay aligned with the backend allow-list. New sortable fields require updating both files in the same commit.

---

## ADR-029: Custom-attribute editor reuses the existing JSON column — no schema change

**Decision:** The v3 custom-attribute editor on `SystemFormPage` writes to the existing `system.custom_attributes Json?` column (introduced in ADR-019). No new table, no new column, no schema migration. The API extends `POST` and `PUT /api/systems` to accept a `customAttributes` array with strict per-element shape validation.

**Rationale:** ADR-019 already chose JSON over a side table for read-only display; v3's promotion of the editor to MVP doesn't change the storage trade-offs. Adding a `SystemCustomAttribute` table now would be over-engineering — the editor only exercises previously dormant write paths on the same column.

**Implication:** The custom-attribute shape (`{ label, value, sourceReference }`) is now load-bearing for both seed and user input. Validation lives at the API boundary (200-char caps on `label` and `value`, 500-char cap on `sourceReference`, `^https?://` scheme on `sourceReference`). Empty rows (label and value both blank) are stripped on submit; an empty post-strip array clears the column to `null`. No filter/query semantics on custom-attribute keys — same posture as before.

---

## ADR-030: Prisma `--create-only` migration drift repair (hand-edit allowed)

**Related:** **ADR-001** — Prisma remains the stack choice; this ADR is **not** permission to define schema by editing migration SQL instead of `schema.prisma`. It only allows trimming **bad** lines from a file Prisma already generated.

**Decision:** After `npx prisma migrate dev --name <name> --create-only`, if the generated `migration.sql` contains statements that **do not belong** to the intentional schema change for the story—typically **`DROP INDEX`** (or similar) emitted because indexes were created in earlier **raw-SQL** migrations and are **not** represented on Prisma models—it is **permitted** to **hand-edit that migration file** and remove **only** those unintended statements **before** applying the migration. The remaining SQL must still satisfy the story’s migration discipline (e.g. **ADR-015** / **ADR-021**: additive vs backfill vs destructive phases; Story 11.1-style additive migrations must contain only the intended DDL such as `ALTER TABLE … ADD COLUMN`).

**Rationale:** The project rule “never edit migration SQL manually” is aimed at **defining schema by editing SQL** instead of `schema.prisma`. Drift repair is different: applying Prisma’s emitted **drops** could remove production search indexes; modelling every historic raw-SQL index in `schema.prisma` is not always practical mid-stream. A narrow, reviewed edit is safer than blind apply.

**Implication:** Every drift repair is reviewed line-by-line in PR; record it in the story **Dev Agent Record**. Prefer longer-term alignment (model indexes in Prisma or dedicated index migrations) so future `--create-only` runs stop emitting spurious drops.

---

New decisions are appended to this file as they are made; see the index at the top for common audit topics.
