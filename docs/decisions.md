# Architecture Decisions

This file records all meaningful architectural decisions made during implementation. Each entry states what was decided and why.

---

## ADR-001: Prisma v6 (not v7)

**Decision:** Pin to Prisma v6 (`prisma@6`, `@prisma/client@6`).

**Rationale:** Prisma v7 requires ESM and a `prisma.config.ts` file (TypeScript in a JS project). v7 also removes `$use` middleware, which is the chosen mechanism for auto-setting `last_updated` on organisation updates. v6 supports `$use` cleanly, runs in CommonJS without modification, and has no confirmed EOL date for an internal MVP timeline.

**Implication:** If the project migrates to TypeScript or ESM in a future phase, `$use` must be replaced with a Prisma Client Extension or a PostgreSQL trigger.

---

## ADR-002: City column excluded from MVP Organisation schema

**Decision:** No `city` column on the `Organisation` table in this MVP.

**Rationale:** The architecture document referenced a GIN trigram index on `city` alongside `name`, but the data model requirements (epics.md) do not include a city field on the organisation entity. The schema was defined without it. Story 3.1 text search will therefore cover `name`, `notes`, and the joined `ticketing_provider.name` only — not city. If a city field is added in a future phase, it should get its own GIN index migration at that point.

**Implication:** Story 3.1 must not attempt to search across a `city` column. The initial migration includes only a GIN index on `organisation.name`.

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
| Country list dual maintenance (seed + frontend) | **ADR-008** |

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

**Decision:** The canonical country list lives in **`backend/src/prisma/seed.js`** as a **named CommonJS export** `COUNTRIES`:

```js
module.exports = { COUNTRIES };
```

Consumers in the backend destructure it, for example:

```js
const { COUNTRIES } = require('../prisma/seed.js');
```

(Adjust the relative path from the importing file.) The same list is **mirrored** in **`frontend/src/lib/countries.js`**. There is **no** `GET /api/meta/countries` endpoint.

**Rationale:** Reference countries are needed for seeding and for the UI without adding a read-only meta route solely for static geography. Keeping two explicit sources forces a deliberate sync when the list changes and avoids an extra API hop for static data.

**Implication:** Whenever the country list changes, **update both** `seed.js` and `frontend/src/lib/countries.js` in the same change. Record that dual update in commit messages or PR descriptions.

---

## ADR-009: Organisation list API uses an explicit camelCase DTO

**Decision:** `GET /api/organisations` maps each Prisma row through `toOrganisationListDto` in `backend/src/services/organisation-list-dto.js` instead of returning raw `findMany` results.

**Rationale:** The Prisma client exposes snake_case property names that match `schema.prisma`, while the public API contract requires camelCase JSON and nested lookup objects (`organisationType`, `ticketingProvider`, `crmPlatform`). A dedicated mapper keeps that boundary explicit and easy to reuse in Story 2.2+ for create/detail/update responses.

**Implication:** New organisation endpoints should reuse or extend the same mapping pattern rather than serialising Prisma rows directly.

---

*Further decisions will be recorded in later stories as the product evolves.*
