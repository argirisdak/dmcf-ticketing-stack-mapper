---
parent: prd.md
created: 2026-05-03
author: Mary (Strategic Business Analyst, BMad)
trigger: Supervisor and brief follow-through — per-data-point provenance, richer System capabilities, custom-attribute editing, list sorting, and duplicate prevention
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-v2-delta.md
  - docs/research-brief.md
  - docs/system-catalogue-rationale.md
documentType: prd-delta
---

# PRD v3 — Delta Document

**Scope of this document:** This is a *delta*, not a rewrite. It lists, section-by-section, what changes in [prd.md](prd.md) and [prd-v2-delta.md](prd-v2-delta.md) and what stays. Anything not mentioned here is unchanged.

**Source of the change:** Two follow-through threads from the v2 cycle:

1. The original brief specified that **every data point** should carry a source reference. The v2 delivery reduced this to one row-level `source_reference` per record, which is not sufficient — see [system-catalogue-rationale.md §5](../../docs/system-catalogue-rationale.md).
2. The supervisor's specific request: a user discovering a rare system or recording a system with non-standard traits should be able to **add custom attributes** through the UI, not only via seed data.

Plus three quality-of-life additions that emerged in the same conversation: capability expansion for richer System comparison; list sorting on both catalogues; duplicate prevention on Organisation create.

---

## The pivot, in one sentence

The catalogue moves from *"each record has a source"* to *"each material data point has a source,"* with richer System capabilities, an editable custom-attribute carrier, list sorting, and a duplicate-prevention guard on Organisation create.

## Headline impact

| Area | Direction of change |
|---|---|
| **Provenance** | Add per-field source references on Systems and Organisations via a `field_sources Json?` column. The row-level `source_reference` stays as a general fallback but no longer auto-applies to specific claims. |
| **System capabilities** | Add five sector-relevant capability flags to System (`season_subscriptions`, `dynamic_pricing`, `multi_venue_support`, `marketing_automation`, `accessibility_features`). Reuses `CapabilityState`. |
| **Custom attributes** | Promote from read-only-seeded to fully editable on the System form. No schema change — the `system.custom_attributes Json?` column already exists. |
| **List sorting** | Add `sort` + `order` query params and UI dropdowns on both Organisation and System lists. |
| **Duplicate prevention** | Composite uniqueness `(name, city, country)` on Organisation, plus an async fuzzy-match warning on the create form. Systems already have unique-on-name from ADR-020. |
| **Compare** | No change to compare semantics. ⓘ source icons appear next to fields that carry a per-field source. |
| **Seed data** | Research pass to populate the new `field_sources` and capability values for the 11 seeded Systems and the sample Organisations, with strict source-required policy. |

---

## 1. Executive Summary — wording extension

**Append** to the v2 paragraph (after *"Each record carries a source reference and system-maintained last-updated metadata."*):

> Material data points within each record — pricing model, deployment model, capability flags, geographic focus, organisation type, country — additionally carry their own source reference, so a comparison row can be checked against a specific URL rather than relying on the record's overall source.

**Stays:** the v2 catalogue framing, tribal-vs-institutional-knowledge framing, and deployment boundary statements.

---

## 2. Success Criteria — measurable outcomes update

**Add** two rows to the *Measurable Outcomes* table:

| Horizon | Signal | Target / threshold |
|---|---|---|
| **MVP / handoff** | Seeded System field-source coverage | **≥ 80%** of source-bearing fields across the 11 seeded Systems carry a `field_sources` URL. The shortfall is documented per-row and consists only of fields where the vendor publishes no defensible URL. |
| **MVP / handoff** | Seed Organisation field-source coverage | **≥ 60%** of source-bearing fields across the sample Organisations carry a `field_sources` URL. Lower threshold than Systems because Organisation facts are often verifiable only via paywalled trade press or non-public knowledge. |

**Stays:** The 60-second compare anchor, the ≥ 8 seeded Systems target (now 11 in practice), the ≥ 30 organisations target, and all Business + Technical success bullets.

---

## 3. Product Scope — MVP list extensions

**Add** to the v2 MVP bullet block:

- **Per-data-point source references** on Systems and Organisations via a `field_sources` JSON carrier; UI exposes a small ⓘ source icon next to each field that has one.
- **Five new System capability flags** — `season_subscriptions`, `dynamic_pricing`, `multi_venue_support`, `marketing_automation`, `accessibility_features` — using the existing `CapabilityState` model.
- **Custom-attribute editor** on the System form — repeating row of `{ label, value, source URL }` triples. *(This promotes the v2 read-only-seeded posture to full editing — the v2 PRD delta open question 2 is now closed.)*
- **List sorting** on both Organisation and System lists with a small allow-list of practical sort keys per entity.
- **Duplicate prevention on Organisation create** — composite DB constraint `(name, city, country)` plus an async fuzzy-match warning panel before submit.

**Growth (post-MVP) — no changes from v2.** The custom-attribute editor moves *out* of Growth because it is now MVP.

**Stays:** All v2 MVP bullets, all Vision items.

---

## 4. User Journeys — deltas

The user model ("a single internal user, Sam") is unchanged. The five v2 journeys are unchanged in structure. Two get small extensions.

### Journey 1 — *minor extension*

After the existing v2 Climax line *("…sources visible…"),* **append:**

> Each row in the comparison shows a small ⓘ icon when a per-field source is available. Sam can confirm a specific claim — say, "Tessitura's pricing is licence-based" — by clicking through to the URL that backs that single row, rather than the System's general source. When a row has no per-field source, the icon is absent — Sam can tell at a glance which claims are individually backed and which fall back to the record-level reference.

### Journey 4 — *minor extension*

After the existing Resolution, **append:**

> When Sam updates Spektrix's pricing model, the form's Source URL input next to that field captures the URL that justifies the new value. Future readers can verify the change without trusting Sam's edit on faith.

### Journey 5 — *rewritten Rising action* (curating the System catalogue)

**Replace** the Rising action with:

> **Rising action:** Sam opens the **System list**, clicks **New System**, fills the universal-core attributes plus the five new capability flags, attaches a Source URL alongside each field where one is known, and saves. If the platform has a distinguishing trait that doesn't fit the universal core, Sam adds it as a **custom attribute** with its own source — directly in the form, not via a seed file. Sources travel with each individual claim, not just the record as a whole.

### Journey Requirements Summary — replace one row

Replace the *Journey 5* row with:

| Journey | Capabilities surfaced |
|---|---|
| **5 — System catalogue curation** | System CRUD; controlled enums for category / pricing / deployment; free-text description; eight-state capability flags (3 v1 + 5 v3); custom-attribute editor; per-field source URLs |

---

## 5. Functional requirements — additions and revisions

### Revised — FR17, FR18 (provenance)

The v1 wording ("A staff member can view / create / edit a source reference for each organisation") is preserved for the row-level reference. **Add** two new FRs to clarify per-field semantics:

- **FR17′** — A staff member can view a per-field source reference for any data point that has one, distinct from the record-level source.
- **FR18′** — A staff member can attach a source URL alongside any data-point input on the System or Organisation form. URLs are validated as `http(s)://` schemes.

### Revised — FR-S9 (system custom attributes)

The v2 wording placed the editor in Growth and made MVP read-only. **Replace** with:

> **FR-S9′** — A staff member can view, add, edit, and remove a System's **custom attributes** as `{ label, value, sourceReference }` triples through the System form. Attributes display read-only on the System detail and Compare pages.

### New — system capabilities

| FR | Statement |
|---|---|
| **FR-S11** | A staff member can record a System's **season subscriptions** capability using the three-state model. |
| **FR-S12** | A staff member can record a System's **dynamic pricing** capability using the three-state model. |
| **FR-S13** | A staff member can record a System's **multi-venue support** capability using the three-state model. |
| **FR-S14** | A staff member can record a System's **marketing automation** capability using the three-state model. |
| **FR-S15** | A staff member can record a System's **accessibility features** capability using the three-state model. |
| **FR-S16** | A staff member can filter Systems by any of the five new capability flags. |

### New — sorting

| FR | Statement |
|---|---|
| **FR-32** | A staff member can sort the Organisation list by `name`, `country`, `lastUpdated`, `capacity`, or `organisationType`, ascending or descending. The sort persists in the URL. |
| **FR-S17** | A staff member can sort the System list by `name`, `vendor`, `category`, `lastUpdated`, or `geographicFocus`, ascending or descending. The sort persists in the URL. |

### New — duplicate prevention

| FR | Statement |
|---|---|
| **FR-33** | The system rejects an Organisation create or update that would result in two rows sharing the same `(name, city, country)`. The error response is `409 Conflict` with a clear message naming the conflicting record. |
| **FR-34** | When a staff member types an Organisation name on the create form, the form runs an asynchronous fuzzy-match lookup and surfaces a non-blocking warning panel listing similar existing organisations (name + city). The user can dismiss the warning and continue, or cancel and amend. |

### Decision — capability set scoping

The brief recommended ~17 capability flags. The PRD v3 includes only five, on top of the three reused from Organisation. The bar for promotion to a column is **"the value is defensibly fillable on at least 8 of 11 seeded Systems with a publicly verifiable source URL."** Capabilities that fail that bar — `general_admission`, `mobile_wallet`, `api_access`, `sso_support`, `email_marketing`, `audience_segmentation`, `reporting_analytics`, `crm_database` (redundant with `category`), `ticketing` (redundant with `category`) — go into custom attributes when an actual procurement decision needs them, not into columns. See [system-catalogue-rationale.md §1](../../docs/system-catalogue-rationale.md).

### Decision — duplicate prevention shape

A hard `UNIQUE(name)` on Organisation is rejected. There are legitimately multiple "Theatre Royal" venues across the UK (Bath, Newcastle, Plymouth, Drury Lane). Composite uniqueness `(name, city, country)` catches accidental duplicates while permitting legitimate name reuse across different cities. The async fuzzy-match warning catches typo'd near-duplicates that the constraint can't see (e.g. "Royal Opera House" vs "Royal Opera Hse"). Together they give a soft + hard guard. Systems do not need this — `system.name` is already hard-unique per ADR-020 because system names are vendor product names protected by IP.

### Decision — `field_sources` shape

A JSON column on System and Organisation, shape `{ "<fieldName>": "<url>" }`, with field-name keys validated against a per-entity allow-list. Alternatives considered:

- **Companion column per field** (`pricing_model_source`, `deployment_model_source`, ...) — rejected: schema sprawls, every new attribute requires a migration.
- **Side table `FieldSource(entity, entity_id, field_name, source_reference)`** — rejected: extra join on every read, more migration ceremony, no concrete query need yet that would benefit from relational shape.
- **JSON column on the entity row** — chosen. Same rationale as ADR-019 for `custom_attributes`: scales free with new fields, sources travel with the row, no join, render is trivial. Re-evaluate if a "find broken sources" feature is ever needed.

---

## 6. What stays untouched

| Section | Reason |
|---|---|
| Project Classification | No change. |
| Domain-Specific Requirements (compliance, technical constraints, integrations, risk mitigations) | All hold. |
| Web Application Specific Requirements (stack, browser matrix, responsive, performance, SEO, accessibility, implementation considerations) | All hold. |
| Non-Functional Requirements P1–P3, S1–S3, SC1–SC2, A1–A2 | Targets generalise; no numeric change. The new field-source UI must respect P2 (no extra round-trips) — implemented by sending `fieldSources` inline in detail responses, not as a separate fetch. |
| FR1–FR16, FR19–FR31, all v2 FR-S series except FR-S9 | All hold. |
| MVP philosophy (Problem-solving MVP), Risk Mitigation Strategy, Phased roadmap framing | Hold. |
| All v2 user journeys, structurally | Only Journeys 1, 4, and 5 receive minor textual extensions. |
| Compare cardinality (2–4 systems), compare URL shape, selection-context split | All hold. |

---

## 7. Downstream artefacts — flagged, not in scope of this delta

| Artefact | Required follow-up |
|---|---|
| [architecture.md](architecture.md) and [architecture-v2-delta.md](architecture-v2-delta.md) | New `architecture-v3-delta.md` covers schema, API, DTO, and UI changes for all five v3 features. |
| [ux-design-specification.md](ux-design-specification.md) | Add ⓘ source icon spec, custom-attribute editor row component, sort dropdown component, fuzzy-match warning panel. |
| [epics.md](epics.md) | Append Epics 11–15 alongside the existing 1–10. |
| [implementation-readiness-report-2026-04-29.md](implementation-readiness-report-2026-04-29.md) | Re-run readiness check after architecture-v3-delta lands. |
| Backend seed ([backend/src/prisma/seed.js](../../backend/src/prisma/seed.js), [system-seed-catalog.js](../../backend/src/prisma/system-seed-catalog.js), [sample-organisations-seed-data.js](../../backend/src/prisma/sample-organisations-seed-data.js)) | Populate `field_sources` and the five new capability values for all 11 seeded Systems and the sample Organisations. |

---

## 8. Open questions worth resolving before architecture rework

1. **Field allow-list governance.** Per-entity allow-lists for `field_sources` keys must stay in lockstep with the DTOs. This delta recommends co-locating the allow-list constant with the DTO module so the linter can catch drift. Confirm.
2. **ⓘ icon visibility default.** Always-visible vs hover-only. This delta recommends always-visible at icon size with `text-slate-400`, so users can scan which fields are sourced and which aren't. Confirm.
3. **Sort-on-relation columns.** Sorting Organisation by `organisationType` and System by `vendor` requires Prisma `orderBy` on a related field. Confirm the join-vs-denormalise call (this delta assumes join — already present in the list query).
4. **Fuzzy-match threshold.** The async name lookup uses the existing trigram-backed `?q=` search. Confirm whether the warning fires on **any** match (lower friction, more false positives) or only when the trigram score exceeds a threshold (more precise). This delta recommends "any match where the user's input is a substring of an existing name OR vice versa" as a simple deterministic rule, deferring threshold tuning until use shows it matters.
5. **Empty `city` interaction with composite uniqueness.** PostgreSQL treats `NULL` as distinct in unique constraints, so two rows with `city = NULL` will not collide. This delta accepts the looser semantics — Organisation creators are encouraged but not forced to enter a city, and the warning UX catches the rest. Confirm.
