---
parent: prd.md
created: 2026-04-29
author: Mary (Strategic Business Analyst, BMad)
trigger: Supervisor feedback — comparison axis is system-to-system, with organisations as the evidence/lens
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - docs/research-brief.md
documentType: prd-delta
---

# PRD v2 — Delta Document

**Scope of this document:** This is a *delta*, not a rewrite. It lists, section-by-section, what changes in [prd.md](prd.md) and what stays. Anything not mentioned here is unchanged.

**Source of the change:** [research-brief.md](../../docs/research-brief.md), §1–§5.

---

## The pivot, in one sentence

The catalogue's comparison axis flips from *"compare Organisations on their stack"* to *"compare ticketing / audience-management **Systems**, with the Organisation catalogue as the adoption-evidence layer."*

## Headline impact

| Area | Direction of change |
|---|---|
| **Entities** | Add `System` and `OrganisationSystem` (junction). Deprecate `TicketingProvider` and `CrmPlatform` lookup tables. |
| **Scope** | MVP gains System CRUD, System list, System filtering, and System-to-System compare. |
| **Compare semantics** | Compare is **system-to-system** (Mode A). The organisation-filtered system view (Mode B) moves to Growth. |
| **Journey 1** | Reframed entirely around selecting and comparing Systems. |
| **FR21 / FR22** | Replaced by an `OrganisationSystem` junction with an explicit `role` enum. |
| **Seed data** | Adds ≥ 8 seeded Systems alongside the existing ≥ 30 Organisations. |

---

## 1. Executive Summary — wording change

**Replace** the sentence beginning *"Staff get structured, queryable records: search (for example by ticketing provider such as Tessitura)…"* with:

> Staff get two structured, queryable catalogues — a **System catalogue** (ticketing, audience-management, and integrated platforms) and an **Organisation catalogue** showing which systems each organisation uses. They can search either, apply multi-attribute filters, view dashboards, perform full CRUD on both, and run **side-by-side comparison of Systems** — with the Organisation catalogue providing the adoption evidence behind the comparison. Each record carries a source reference and system-maintained last-updated metadata.

**Stays:** the tribal-vs-institutional-knowledge framing; the "not a public directory, not payments, not production-grade authentication" boundary.

---

## 2. Success Criteria — anchor behaviour replaced

**Replace** the User Success "Anchor behaviour" bullet with:

> **Anchor behaviour:** From the **System list view**, a staff member can apply at least one filter (e.g. `category = integrated`, or `geographic_focus = UK`), select **2–4 systems**, open a side-by-side **System compare**, and read the aligned attribute panel — in under **60 seconds**, without training or support.

**Add** one row to the *Measurable Outcomes* table:

| Horizon | Signal | Target / threshold |
|---|---|---|
| **MVP / handoff** | System catalogue depth | **≥ 8 seeded Systems**, spanning at least 3 integrated, 3 ticketing-only, 2 CRM-only |

**Stays:** Trust moment, usability bar, the ≥ 30 organisations target, and all Business + Technical success bullets.

---

## 3. Product Scope — MVP list rewritten

**Replace** the MVP bullet block with:

- Full CRUD on **Organisations** (create, read, update, delete-with-confirmation) — *unchanged from v1*.
- Full CRUD on **Systems** *(new)* with category-aware required fields.
- **List / dashboard** views for **both** Organisations and Systems.
- **Text search** across designated fields on both catalogues.
- **Multi-attribute filtering**:
  - **Organisations:** country, organisation type, capability flags, *adopted System* (replaces "ticketing provider" and "CRM platform" filters).
  - **Systems:** category, deployment model, pricing model, geographic focus, capability flags.
- **System-to-system compare** (Mode A) — select 2–4 Systems, see universal-core attributes aligned, plus a "Custom attributes" union panel.
- **Organisation–System linking** via the `OrganisationSystem` junction with a `role` enum (`primary_ticketing`, `primary_crm`, `integrated_suite`, `secondary`).
- **Source reference + last-updated** on Systems, Organisations, **and** each junction link.
- **Seed/sample data** — ≥ 8 Systems and ≥ 30 Organisations with realistic linkage.
- **Full stack via Docker Compose**, README, smoke-test path.

**Growth (post-MVP) — additions to the existing list:**

- **Mode B** — organisation-filtered System compare ("which Systems do mid-sized UK opera houses use, and how do they differ?").
- **Custom-attribute editor** with rich source attribution (in MVP, seeded custom attributes display read-only inside System detail and the Compare view).
- Everything previously in Growth (CSV/clipboard export, validation polish, batch fetch, deeper governance) — **stays**.

**Vision section:** unchanged.

---

## 4. User Journeys — deltas

The user model ("a single internal user, Sam") is unchanged.

### Journey 1 — *rewritten* (this is the heart of the pivot)

**Replace** the journey body with:

> **Opening:** Sam needs to brief a colleague on the differences between Tessitura, Spektrix, and AudienceView Professional for a mid-sized opera-house procurement question.
>
> **Rising action:** From the **System list**, Sam filters by `category = integrated`, scans the description field to sense-check which platforms are relevant for mid-to-large performing arts venues, ticks Tessitura, Spektrix, and AudienceView Professional, and opens **Compare**.
>
> **Climax:** Within the 60-second anchor, Sam sees aligned rows — pricing model, deployment, capability flags, integration partners, sources — without hunting files. Any custom attributes seeded against those Systems (e.g. "B Corp certified") appear in a clearly demarcated section.
>
> **Resolution:** Sam briefs the room with a citable, system-level comparison rather than impressionistic recall.

### Journey 2 — *minor edit*

Trust recovery now applies to **both** catalogues. Replace *"Sam opens detail, checks source reference and last updated…"* with *"Sam opens **System or Organisation** detail, checks source reference and last updated…"*. Otherwise unchanged.

### Journey 3 — *minor extension*

The "what ticketing system does venue X use?" path still works. After the existing Resolution, **add**:

> Sam can pivot from the venue's record into the **System record itself** to read its capabilities, pricing model, and source — useful when the next question in the meeting is "and what does Tessitura actually do?"

### Journey 4 — *retitled and rewritten*

**New title:** *Maintenance: keep both catalogues honest under time pressure.*

**Replace body with:**

> **Opening:** Sam learns that an organisation has migrated from PatronManager to Tessitura, and separately that Spektrix has changed pricing model.
>
> **Rising action (organisation change):** Sam opens the organisation, edits its `OrganisationSystem` links — removes the PatronManager link (with confirmation), adds a new link to Tessitura with `role = integrated_suite` and a source reference. **Last updated** on the link reflects the change.
>
> **Rising action (system change):** Sam opens the **Spektrix System record** (not every adopter) and edits the pricing-model field once, with a fresh source. Every Compare view that includes Spektrix now reflects the truth.
>
> **Climax:** A single edit to a System record corrects every downstream comparison; a per-organisation edit captures organisation-level adoption changes without rewriting platform facts.
>
> **Resolution:** Institutional memory tracks both *what platforms exist* and *who adopts them* — with neither set conflated into the other.

### Journey 5 — *new* — *curating the System catalogue*

> **Opening:** A platform shows up in research that doesn't yet have a System record (e.g. a regional ticketing provider).
>
> **Rising action:** Sam opens the **System list**, clicks **New System**, fills the universal-core attributes (name, vendor, category, deployment, pricing, geographic focus, description, capability flags), attaches a source URL, and saves. If the platform has a distinguishing trait that doesn't fit the universal core, Sam adds it as a **custom attribute** with its own source. *(Editor is Growth; in MVP, custom attributes arrive via seed.)*
>
> **Resolution:** The next person who filters Systems sees this platform as a first-class candidate, not a free-text note buried inside an Organisation row.

### Journey Requirements Summary — replace the table

| Journey | Capabilities surfaced |
|---|---|
| **1 — System filter → System compare** | System list with multi-filter; selection of 2–4; aligned compare; custom-attribute union panel; sources visible |
| **2 — Trust recovery (both catalogues)** | Detail + provenance on **both** entities; search; create/edit; clear validation |
| **3 — New staff, cited answer** | Organisation search; Organisation detail; pivot to linked Systems via the junction; System detail with sources |
| **4 — Maintenance (both catalogues)** | `OrganisationSystem` link edit (role-aware); System record edit; freshness; validation |
| **5 — System catalogue curation** *(new)* | System CRUD; controlled enums for category / pricing / deployment; free-text description; three-state capability flags; custom-attribute carrier |

---

## 5. Data model — what the PRD says about it

The v1 PRD encoded the data model implicitly via **FR21–FR24** ("controlled set of provider options," etc.). The delta is below. Detailed schema lives in [architecture.md](architecture.md) — see *Downstream impact* (§7).

### Remove from MVP

- **FR21** — *"choose a ticketing provider from a controlled set."* (The lookup table is gone.)
- **FR22** — *"choose a CRM platform from a controlled set."* (Same.)

### Add (replacing FR21 / FR22)

- **FR21′** — A staff member can link an Organisation to one or more **Systems** via an explicit `role` (`primary_ticketing`, `primary_crm`, `integrated_suite`, `secondary`).
- **FR22′** — A staff member can attach a **per-link source reference** and a **per-link note**, distinct from the System's own source and the Organisation's own source.

### Unchanged

- **FR23** — controlled set of organisation types.
- **FR24** — three-state capability model (yes / no / unknown). **Now reused on the System entity** as well as the Organisation entity.

### New — System catalogue functional requirements

| FR | Statement |
|---|---|
| **FR-S1** | A staff member can create a System record with required fields (`name`, `vendor`, `category`) and optional universal-core attributes (deployment model, pricing model, geographic focus, free-text description, capability flags). |
| **FR-S2** | A staff member can view, update, and delete (with confirmation) a System record. |
| **FR-S3** | A staff member can view a tabular **System list** with key fields visible at a glance. |
| **FR-S4** | A staff member can search Systems by text across designated fields (name, vendor, description). |
| **FR-S5** | A staff member can filter Systems by `category`, `deployment_model`, `pricing_model`, `geographic_focus`, and capability flags. |
| **FR-S6** | A staff member can apply multiple System filters together. |
| **FR-S7** | A staff member can select 2–4 Systems and open a side-by-side **Compare** view that aligns universal-core attributes plus a union panel of custom attributes. |
| **FR-S8** | A staff member can view a System's **adoption evidence** — the list of Organisations linked to it, with each link's `role`. |
| **FR-S9** | A staff member can view a System's **custom attributes** as `{ label, value, source_reference }` triples. *(Read-only display in MVP; full editor is Growth.)* |
| **FR-S10** | The product automatically maintains `last_updated` on Systems and on `OrganisationSystem` links — no manual clock fields. |

### Decision: `target_organisation_size` enum dropped

`target_organisation_size` (`small / medium / large / enterprise / multi_size`) is removed from the System entity. The `description` text field (already part of the universal-core attributes) carries this nuance as prose — e.g. *"designed for mid-to-large performing arts venues."* An enum creates false precision: most integrated platforms serve a range of sizes, and the boundaries are contested in practice. This overrides the recommendation in [research-brief.md](../../docs/research-brief.md) §2.3.

### Lookup-table deprecation

`TicketingProvider` and `CrmPlatform` lookup tables are removed. The seed migration converts their existing rows into `System` rows with appropriate `category` values (`ticketing`, `audience_management`, or — where the same platform was historically split into both lookups — collapsed into a single `integrated` row).

### Existing FRs — minor wording touch-ups

- **FR10 / FR11** — instead of "filter by ticketing provider" / "filter by CRM platform," the Organisation list filters by **adopted System**. One filter, not two; the `role` field is exposed as a sub-filter when useful.
- **FR6** — *search across designated fields* now applies separately to each catalogue.
- **FR7** — *navigation between list, detail, create, edit, comparison flows* now spans **both** catalogues, plus the cross-pivot from Organisation detail into linked System detail.

---

## 6. What stays untouched

| Section | Reason |
|---|---|
| Project Classification | No change to type / domain / complexity / context. |
| Domain-Specific Requirements (compliance, technical constraints, integrations, risk mitigations) | The pivot is structural, not regulatory. |
| Web Application Specific Requirements (stack, browser matrix, responsive design, performance approach, SEO non-goal, accessibility level, implementation considerations) | All hold without modification. |
| Non-Functional Requirements P1–P3, S1–S3, SC1–SC2, A1–A2 | Targets generalise from "list of Organisations" to "list of records" — no numerical change required. The Compare-responsiveness target (P2) covers System Compare too. |
| FR1–FR5 (Organisation CRUD), FR8–FR9 (country / type filters), FR12–FR16 (capability filter, multi-filter, multi-select, compare layout — re-targeted at Systems for compare, Organisations for filter), FR17–FR20 (provenance / freshness — extended in spirit to Systems and links via FR-S10), FR23–FR24, FR25–FR31 | Org-side scope intact. The Organisation entity itself is fundamentally unchanged save for the FK→junction migration. |
| MVP philosophy (Problem-solving MVP), Risk Mitigation Strategy, Phased roadmap framing | Hold. |

---

## 7. Downstream artefacts — flagged, not in scope of this delta

| Artefact | Required follow-up |
|---|---|
| [architecture.md](architecture.md) | Add `System` and `OrganisationSystem` schemas; remove `TicketingProvider` / `CrmPlatform`; update REST routes (`/api/systems`, `/api/systems/:id`, `/api/organisations/:id/systems`); update seed plan. |
| [ux-design-specification.md](ux-design-specification.md) | Add System list, System detail, and System Compare screens. Modify Organisation detail to include a "Linked Systems" panel keyed by `role`. Modify the Organisation list filter sidebar (single "adopted System" filter replaces two). |
| [epics.md](epics.md) | Likely a new epic *"System catalogue"* alongside edits to *"Organisation catalogue"* and *"Compare."* |
| [implementation-readiness-report-2026-04-02T17-25-47Z.md](implementation-readiness-report-2026-04-02T17-25-47Z.md) | Re-run readiness check after the above three are updated. |
| Backend seed ([backend/src/prisma/seed.js](../../backend/src/prisma/seed.js)) | Migrate existing provider / CRM seed rows into System rows; create realistic `OrganisationSystem` links. |

---

## 8. Open questions worth resolving before architecture rework

1. **Compare cardinality on Systems** — confirm 2–4 (matches Organisation Compare in v1). The brief implies the same range; this delta assumes it.
2. **Custom-attribute editor in MVP, or read-only?** — this delta assumes **read-only** in MVP (seeded only) and editor in Growth. Confirm.
3. **Mode B (organisation-filtered System compare) — definitively Growth?** — the brief recommends it; this delta places it there. Confirm.
4. **Inactive vs hard-deleted `OrganisationSystem` links** — Journey 4 implies a soft-delete or `active` flag could capture historical adoption. The brief is silent. This delta assumes **hard delete with confirmation** (mirroring Organisation delete) unless adoption history is explicitly in scope.
5. **Filter-by-role on the Organisation list** — should the "adopted System" filter expose the link's `role` as a sub-filter (e.g. *"Organisations using Tessitura as their integrated suite"*)? This delta recommends **yes** — it's a small UI addition that pays off for procurement-pattern questions.
