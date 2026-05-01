# Architecture Decisions

This file records all meaningful architectural decisions made during implementation. Each entry states what was decided and why.

**Index (quick find for handoff / audits):** Prisma v6 — **ADR-001**; Tailwind v3 pin — **ADR-005**; shadcn/ui copy-paste — **ADR-006**; React Router v6 via `react-router-dom` — **ADR-007**; country list dual maintenance — **ADR-008**; list pagination when `page` is past the end — **ADR-010**; organisation `last_updated` via `@updatedAt` (no `$use`) — **ADR-011**; GET organisation by id — 404 for missing and malformed ids — **ADR-012**; compare selection preserved after navigating to compare — **ADR-013**; sample organisations — fixed UUID upserts — **ADR-014**; v2 schema migration — three-step sequence — **ADR-015**; system `geographic_focus` list dual maintenance — **ADR-016**; `GET /api/systems` multi-value `category` filter — **ADR-017**.

---

## ADR-001: Prisma v6 (not v7)

**Decision:** Pin to Prisma v6 (`prisma@6`, `@prisma/client@6`).

**Rationale:** Prisma v7 requires ESM and a `prisma.config.ts` file (TypeScript in a JS project). v6 runs in CommonJS without modification and has no confirmed EOL date for an internal MVP timeline. Organisation freshness is maintained via **`@updatedAt` on `last_updated`** (see **ADR-011**), not `$use` middleware.

**Implication:** If the project migrates to TypeScript or ESM in a future phase, reassess the Prisma major version and config model independently of `last_updated` mechanics.

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

**Rationale:** The Prisma client exposes snake_case property names that match `schema.prisma`, while the public API contract requires camelCase JSON and nested lookup objects (`organisationType`, `ticketingProvider`, `crmPlatform`). A dedicated mapper keeps that boundary explicit and easy to reuse in Story 2.2+ for create/detail/update responses.

**Implication:** New organisation endpoints should reuse or extend the same mapping pattern rather than serialising Prisma rows directly.

**POST `/api/organisations` (Story 2.2):** Request bodies use **camelCase** keys (`name`, `country`, `organisationTypeId`, optional FK ids, three `*Capability` enums as `YES` | `NO` | `UNKNOWN`, optional `sourceReference`, `notes`, `capacity`). The handler strips client-supplied `id` and timestamp fields before persist. Successful **201** responses use the same **`toOrganisationDto`** mapper as the list (including `updatedAt`).

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

New decisions are appended to this file as they are made; see the index at the top for common audit topics.
