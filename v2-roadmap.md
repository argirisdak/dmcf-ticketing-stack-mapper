# Version 2 roadmap

This document consolidates **post-MVP direction** and **carried technical work** from:

- [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md) — **Growth Features (Post-MVP)** and **Vision (Future)**
- [_bmad-output/implementation-artifacts/deferred-work.md](_bmad-output/implementation-artifacts/deferred-work.md) — code-review deferrals
- Epic retrospectives in [_bmad-output/implementation-artifacts/](_bmad-output/implementation-artifacts/) — `epic-*-retro-*.md` (Epics 1–5)

MVP scope and functional requirements remain authoritative in the PRD and epics; this file is a **single backlog-oriented view** for “what comes next,” not a commitment order.

---

## 1. Product and experience (PRD)

### 1.1 Growth features (post-MVP)

- **Export** — CSV or clipboard export from list or compare for reporting workflows.
- **Validation polish** — Stricter rules where helpful (for example URL validation beyond MVP minima).
- **Compare performance** — Optional **batch fetch** of multiple organisations for compare if profiling shows N parallel GETs are a bottleneck.
- **Governance** — If trust and scale require it: ownership of freshness, **review workflows**, richer **source history**.
- **Accessibility (if mandated)** — Full **WCAG 2.x** audit as a release gate was explicitly out of scope for MVP unless DMCF requires it; can move here if required.
- **Notes and PII** — Optional future guardrails where free-text notes might hold personal data (PRD domain section).

### 1.2 Vision (longer horizon)

- Deepen the shift from **tribal knowledge** to **institutional knowledge**: richer **provenance**, stronger **curation** habits.
- **Integrations** only if strategy changes — still consistent with an **internal knowledge base**, not a public directory or integration hub by default.

---

## 2. Quality, testing, and CI

| Theme | Detail | Source |
|--------|--------|--------|
| **End-to-end smoke** | Scripted runner (for example Playwright/Cypress) for the README smoke path (health → meta → list → filter → compare → create). | Epic 4 E4-5, Epic 5 retro |
| **Compare URL guard** | Minimal automated test for compare URL parsing and empty state (`compare-url-params` / compare page). | Epic 4 E4-5, Epic 5 E5-3 |
| **List GET validation tests** | Assert full **AC7-style** error envelope for invalid country/capability (align with `invalid page`: `data`, `meta`, `error.message`). | Epic 3 E3-3, deferred-work |
| **Capability query normalisation** | Controller test that lowercase capability query params (for example `membership=yes`) are normalised when calling the service. | deferred-work |
| **Service-layer DELETE tests** | Unit tests for `deleteOrganisation` including Prisma error mapping. | deferred-work (2-5 review) |
| **HTTP + DB list integration** | Supertest + Prisma integration for list endpoint (not only mocked service). | deferred-work (2-1 review) |
| **Detail / page-level frontend tests** | Component or E2E coverage when the project adopts a stable frontend test pattern for pages. | deferred-work (2-3 review) |

---

## 3. API, data, and operations

| Theme | Detail | Source |
|--------|--------|--------|
| **List DTO consistency** | Consolidate public fields (`lastUpdated` vs `updatedAt`) in a deliberate API/versioning change. | Epic 3 retro, deferred-work |
| **Organisation list controller** | Split or refactor when next editing the module (list parsing vs CRUD helpers). | Epic 3 retro, deferred-work |
| **Prisma client middleware** | Re-validate that removing middleware did not drop needed cross-cutting behaviour (logging, soft rules, timestamps outside `last_updated`). | deferred-work (3-3 review) |
| **Indexes at scale** | Trigram/GIN indexes: consider **`CREATE INDEX CONCURRENTLY`** or online strategies before very large production tables. | Epic 3 retro E3-5, deferred-work |
| **Sample-org seed atomicity** | Wrap sample organisation upserts in `prisma.$transaction` if CI or operators need atomic seed (partial set today on abrupt failure). | deferred-work, Epic 5 E5-5 |
| **Concurrent edits** | Optimistic locking, ETag, or merge strategy if product requires handling **refetch while editing** (detail form vs background refetch). | deferred-work (2-4 review) |

---

## 4. Frontend and UX

| Theme | Detail | Source |
|--------|--------|--------|
| **Catch-all / 404 route** | Defined behaviour for unknown routes (404 page, redirect, or explicit “empty main” decision). | deferred-work (1-2 review) |
| **Search list remount** | `OrganisationListResults` keyed by debounced `q` resets subtree state; revisit if **focus** or filter-bar state must persist. | deferred-work (3-1 review) |
| **ESLint `react-refresh`** | `only-export-components` in `button.jsx` and selection modules — fix or rule waiver when touching those files. | Epic 1–3 retros, deferred-work |
| **Radix / shadcn imports** | Single documented convention: `radix-ui` vs `@radix-ui/react-*` per primitive (ADR or `docs/decisions.md`). | Epic 2 B2, Epic 3 E3-1, Epic 4 E4-2 |

---

## 5. Documentation and repository hygiene

| Theme | Detail | Source |
|--------|--------|--------|
| **Selection naming** | Grep planning/architecture for `SelectionContext` vs actual **`SelectionProvider` / `useSelection` / `selection-context.js`** and align prose. | Epic 4 E4-1, Epic 5 E5-1 |
| **Prisma path drift** | Architecture diagrams vs repo truth (`backend/src/prisma`); add explicit “source of truth” note. | Epic 5 retro |
| **ADR-011 tone** | Tighten rationale wording; pin Prisma version and reference middleware removal where appropriate. | deferred-work (5-2 review) |
| **README smoke checklist** | Keep filter URL / seed UUID examples in sync when seed data or Story 5.1 ids change (`United Kingdom`, `Tessitura`, compare deep-link). | deferred-work (5-2 review) |
| **Compose startup** | Optional README note on **seed-on-every-start** (duration, log noise) if operators find it confusing. | deferred-work (5-2 review) |

---

## 6. Build and tooling

| Theme | Detail | Source |
|--------|--------|--------|
| **Frontend Docker image** | Prefer **`npm ci`** over `npm install` for reproducible builds when images are not local-dev-only. | deferred-work (1-2 review) |

---

## 7. Epic 6 and planning (process)

- **`epics.md`** currently ends at Epic 5; the next slice should be authored as **Epic 6** (or equivalent) with clear FR coverage and sprint tracking updates (Epic 5 retro).

---

## How to use this file

- **Product prioritisation** — Start from §1; cut or reorder under capacity (PRD already says to cut Growth first if resources drop).
- **Hardening sprints** — §2–§6 map to concrete tickets; many items already exist in `deferred-work.md` with story/review provenance.
- **Traceability** — For full narrative and action IDs, read the linked PRD sections and retro files; this roadmap is a **merged index**, not a replacement for those artefacts.
