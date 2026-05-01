---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
assessmentInputs:
  prd:
    - _bmad-output/planning-artifacts/prd.md
    - _bmad-output/planning-artifacts/prd-v2-delta.md
  architecture:
    - _bmad-output/planning-artifacts/architecture.md
    - _bmad-output/planning-artifacts/architecture-v2-delta.md
  epics:
    - _bmad-output/planning-artifacts/epics.md
  ux:
    - _bmad-output/planning-artifacts/ux-design-specification.md
    - _bmad-output/planning-artifacts/ux-design-directions.html
confirmedByUser:
  prdScope: baseline and v2 deltas together
  supplementaryUx: ux-design-directions.html in scope
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-29  
**Project:** dmcf-app  
**Assessor:** Implementation readiness workflow (automated facilitation)

---

## Document discovery — inventory

| Class | Files |
|--------|--------|
| PRD | `prd.md`, `prd-v2-delta.md` |
| Architecture | `architecture.md`, `architecture-v2-delta.md` |
| Epics & stories | `epics.md` (v1 body + v2 delta appended) |
| UX | `ux-design-specification.md`, `ux-design-directions.html` (organisation list direction explorations; supplemental to the written spec) |

**Duplicates (whole vs sharded):** None — no sharded `index.md` trees for these types.

**Notes:** An earlier report `implementation-readiness-report-2026-04-02T17-25-47Z.md` exists; this run supersedes it for the current artefact set.

---

## PRD analysis

### Functional requirements (baseline `prd.md`)

**Organisation catalogue —** FR1: create organisation with required and optional fields. FR2: view full detail. FR3: update. FR4: delete after confirmation. FR5: tabular list with key fields.

**Discovery and navigation —** FR6: text search across designated searchable fields. FR7: predictable navigation between list, detail, create, edit, and comparison flows.

**Filtering —** FR8: filter by country. FR9: by organisation type. FR10: by ticketing provider. FR11: by CRM platform. FR12: by capability attributes (membership, donation, reserved seating). FR13: multiple filters together.

**Side-by-side comparison —** FR14: multi-select from current results. FR15: open side-by-side comparison. FR16: aligned attributes in a readable layout.

**Provenance and freshness —** FR17: view source reference. FR18: create/edit source reference. FR19: view last updated. FR20: product maintains last updated on create/change without manual clock field.

**Consistent reference dimensions —** FR21: choose ticketing provider from controlled set. FR22: choose CRM from controlled set. FR23: choose organisation type from controlled set. FR24: three-state capabilities for membership, donation, reserved seating.

**Large result sets —** FR25: browse list in segments (pagination), not whole catalogue at once.

**First-run and operability —** FR26: run full app from documented stack. FR27: load/reset sample data via documented command. FR28: second person smoke-tests from README without undocumented steps.

**Feedback and data quality —** FR29: clear feedback on validation failure or not found. FR30: optional free-text notes. FR31: optional venue capacity.

**Baseline count:** FR1–FR31 = **31** (before v2 delta).

### Functional requirements (`prd-v2-delta.md`)

**Removed / replaced for MVP:** FR21 and FR22 (lookup-based provider/CRM choice) are removed in favour of:

- **FR21′:** Link organisation to one or more **Systems** with explicit `role` (`primary_ticketing`, `primary_crm`, `integrated_suite`, `secondary`).
- **FR22′:** Per-link **source reference** and **per-link note**, distinct from System-level and Organisation-level sources.

**Reframed:** FR10 + FR11 → single **adopted System** filter (with **role** sub-filter when useful). FR6: search applies **per catalogue** (Organisations and Systems). FR7: navigation spans **both** catalogues and cross-pivot from organisation detail to linked System detail.

**Compare semantics:** Headline MVP compare is **system-to-system**; FR14–FR16 remains relevant for **organisation** compare where still in scope; delta explicitly adds System compare via FR-S7.

**New System catalogue FRs:**

| ID | Statement (summary) |
|----|---------------------|
| FR-S1 | Create System (required: name, vendor, category; optional core attributes and capability flags). |
| FR-S2 | View, update, delete System (with confirmation). |
| FR-S3 | Tabular System list. |
| FR-S4 | Text search on Systems (name, vendor, description). |
| FR-S5 | Filter Systems by category, deployment, pricing, geographic focus, capabilities. |
| FR-S6 | Multiple System filters together. |
| FR-S7 | Select 2–4 Systems; side-by-side compare (universal core + custom-attribute union). |
| FR-S8 | View adoption evidence (organisations linked, with role). |
| FR-S9 | View custom attributes as `{ label, value, source_reference }` (read-only in MVP). |
| FR-S10 | Auto `last_updated` on Systems and on `OrganisationSystem` links. |

**Success / scope additions:** Measurable outcome **≥ 8 seeded Systems** spanning category mix; MVP lists **System CRUD**, dual lists, v2 filters; seed **≥ 8 Systems** and **≥ 30 Organisations** with linkage.

**Effective functional requirement count (v2):** 31 − 2 + 2 + 10 = **41** numbered items (FR1–FR20, FR21′, FR22′, FR23–FR31, FR-S1–FR-S10).

### Non-functional requirements (baseline; delta confirms they still apply)

**Performance —** P1: interactive list operations feel responsive for hundreds–low thousands of rows. P2: compare view avoids noticeable multi-second waits from avoidable round trips. P3: server-backed segmentation; client must not download entire catalogue.

**Security —** S1: no secrets in repo. S2: internal/trusted-network posture; documented threat model. S3: data minimisation guidance for notes/PII creep.

**Scalability —** SC1: small concurrent internal use. SC2: indexing supports hundreds–low thousands of organisation rows without redesign (extends to “records” in practice).

**Accessibility —** A1: pragmatic keyboard, focus, contrast. A2: full WCAG audit not an MVP gate unless mandated.

**Integration:** None for MVP (manual entry).

**Total NFR labels:** P1–P3, S1–S3, SC1–SC2, A1–A2 = **10**.

### Additional requirements and constraints (PRD narrative)

- Internal-only MVP; no production-grade auth; trusted-network deployment.
- UK/EU: treat notes as potentially sensitive; no PCI/HIPAA scope.
- Stack implied: React SPA, Express REST, `{ data, error, meta }`, pagination, Docker Compose, British English **organisation**.

### PRD completeness (initial)

- v1 PRD is fully enumerated for FR/NFR; v2 delta is explicit about replacements and additions.
- Open questions in delta (compare cardinality 2–4, custom attributes read-only in MVP, Mode B in Growth, hard delete on links, role sub-filter) are **decided in delta text** with residual risk only where marked “confirm.”

---

## Epic coverage validation

### Epic FR coverage (authoritative sources in `epics.md`)

| Requirement | PRD intent (v2) | Where covered in epics | Status |
|-------------|-----------------|-------------------------|--------|
| FR1–FR5 | Org CRUD + list | Epic 2 | ✓ |
| FR6 | Org search (+ delta: per-catalogue) | Epic 3 (org); FR-S4 / Epic 7 (Systems) | ✓ |
| FR7 | Nav + compare flows (+ delta: both catalogues) | Epic 2 / 3 / 4 + Epic 7 (Systems nav/shell) / Epic 9 | ✓ |
| FR8–FR9 | Org filters | Epic 3 | ✓ |
| FR10–FR11 | **v2:** adopted System + role (single filter) | Epic 8 (v2 map); **not** Epic 3 provider/CRM | ✓ (see stale map below) |
| FR12–FR13 | Org capabilities + multi-filter | Epic 3 | ✓ |
| FR14–FR16 | Org multi-select / compare / layout | Epic 4; delta also drives headline compare via FR-S7 | ✓ |
| FR17–FR20 | Provenance + auto last_updated (org) | Epic 2 | ✓ |
| FR21–FR22 | **v1 only — removed in v2** | Legacy map → Epic 2 (**obsolete for v2**) | ⚠ traceability |
| FR21′–FR22′ | Junction links + per-link source/note | Epic 8 | ✓ |
| FR23–FR24 | Org type + capabilities | Epic 2 | ✓ |
| FR25 | Pagination | Epic 3 | ✓ |
| FR26–FR28 | Stack / seed / README | Epics 1, 5 (+ v2 seed in Epic 6) | ✓ |
| FR29–FR31 | Validation, notes, capacity | Epic 2 | ✓ |
| FR-S1–FR-S6, FR-S8–FR-S9 | System catalogue | Epic 7 | ✓ |
| FR-S7 | System compare | Epic 9 | ✓ |
| FR-S10 | Auto last_updated System + links | Epic 6 | ✓ |
| P1–P3, S1–S3, SC1–SC2, A1–A2 | NFR set | Woven through epics + story ACs | ✓ (Epics **Additional Requirements** block mirrors PRD) |

### Missing FR coverage

**No critical FR from the combined PRD appears entirely absent** from the v2 epic map and v1 epics (where still valid).

### Documentation / traceability gaps (not missing epics)

1. **Dual FR Coverage Map:** The first map (lines ~117–151) still assigns FR10/FR11 to provider/CRM Epic 3 and FR21/FR22 to Epic 2. For v2, **`v2 FR Coverage Map`** (lines ~955–971) is authoritative; the top map is **misleading** if read in isolation.
2. **Requirements inventory block** at top of `epics.md` still lists v1 FR6–FR24 verbatim (including FR10/11/21/22 wording). It does **not** reflect FR21′/FR22′ or FR-S1–S10 in the numbered list (those appear only in the v2 delta section).
3. **NFR P2** text in epics still says “selected organisations”; PRD extends the same bar to **System** compare — **editorial** only, behaviour covered by Epic 9.

### Coverage statistics (v2 effective FR set)

| Metric | Value |
|--------|--------|
| Total PRD FR items (v2) | 41 |
| Covered in epics (with v2 map + Epics 1–5 legacy) | 41 |
| Coverage | **100%** (by explicit or superseded mapping) |

---

## UX alignment assessment

### UX document status

**Found:** `ux-design-specification.md` (full spec + **v2 delta** sections D1–D11). **Supplemental:** `ux-design-directions.html` — four **organisation list** layout prototypes; aligns with slate/blue-600/Lucide vocabulary in the spec’s visual foundation.

### Alignment: UX ↔ PRD (v2)

- v2 PRD pivot (System catalogue, system-to-system compare, junction, adopted-system filter) is reflected in UX delta (**D1** nav shell, **D2**–**D5** System list/detail/compare, **D6**–**D7** organisation reshaping, **D9**–**D11** components and URL table).
- Older journey diagrams in the main “User Journey Flows” section still emphasise **organisation-first** language in places; the **v2 delta flows** (e.g. System list entry) carry the **authoritative** compare-path narrative for MVP. **Risk:** readers who stop before the delta misunderstand the primary anchor.

### Alignment: UX ↔ Architecture

- `epics.md` v2 block cites architecture-v2-delta and UX §§D1–D11; API routes (`/api/systems`, junction CRUD, compare URLs) match UX **D11** route table.
- Performance and compare-fetch patterns (parallel `GET /api/systems/:id`) support UX compare layout expectations.

### Warnings

- **`ux-design-directions.html`** is **not** a normative contract — it is exploratory UI; implementation should follow **ux-design-specification.md** + UX-DR\* in epics when they conflict.
- Ensure **Design Direction Decision** in the main UX spec remains consistent with HTML “recommended” direction if designers iterate the HTML only.

---

## Epic quality review (create-epics-and-stories norms)

### Checklist summary

| Epic | User-centric title | Independence / notes |
|------|-------------------|----------------------|
| Epic 1 | ✓ Runnable stack for team | ✓ Foundation |
| Epic 2–5 | ✓ Org catalogue, discovery, org compare, seed | ✓ v1 sequencing |
| Epic 6 | Borderline: **migration** heavy | Framed as enabling greenfield→v2 data shape; **🟡** technical depth — acceptable for stated pivot if team accepts “platform” epic |
| Epic 7–9 | ✓ System catalogue, linking, system compare | See dependency violation |
| Epic 10 | Legacy decommission | ✓ Completion epic |

### Critical / major / minor

#### 🟠 Major: forward cross-epic dependency

- **Story 7.3** (navigation shell / `CompareSelectionBar` paths) is documented as depending on **9.1** (`/compare/systems` and `/compare/organisations` routes). That is **Epic 7 depending on Epic 9** (higher epic number). The sequencing table explicitly calls this out as intentional; it still **violates strict epic-independence rules** and should be managed as a **critical-path scheduling constraint** (merge 9.1 earlier, or temporarily stub routes).

#### 🟡 Minor: “technical milestone” epics

- **Epic 6** is primarily schema/migration/seed. It is **not** written as pure user-facing value; for a **pivot**, that is often tolerated. Flag for sponsors who expect every epic to be purely “Sam-facing.”

#### 🟡 Minor: database upfront in Epic 1

- Full Prisma model in early stories is **normal for greenfield** in this repo; the generic BMad rule “tables only when needed” is **relaxed** here by project-context reality.

#### 🟡 Minor: duplicate FR inventory narrative

- Same as coverage section: **stale v1 FR list** at top of epics **increases** mis-implementation risk despite good v2 sections.

---

## Summary and recommendations

### Overall readiness status

**NEEDS WORK** — artefacts are **substantively complete** for v2 (FR coverage and UX/architecture alignment are strong), but **planning hygiene** (single source of truth for FR numbering in epics, forward story dependency) should be cleaned up **before** cutting implementation work in the wrong order.

### Critical issues requiring immediate action

1. **Reconcile the primary FR Coverage Map** in `epics.md`: either replace the v1 map with a **single merged map** or add a prominent banner: *“For v2, use § v2 FR Coverage Map only; ignore FR10/11/21/22 lines in the block above.”*
2. **Schedule Story 9.1 before or in parallel with 7.3** (or stub compare routes) so Epic 7 does not **block** on Epic 9 in a way that confuses sprint ordering.

### Recommended next steps

1. Edit `epics.md` **Requirements Inventory** to include FR21′, FR22′, FR-S1–S10 and strike or footnote obsolete FR10/11/21/22 for v2 readers.
2. Align **NFR P2** wording in epics with “organisation and/or system compare.”
3. In `ux-design-specification.md`, add a short **pointer** at the legacy Journey 1 heading to the v2 System-first anchor (or swap order) to reduce misread.
4. Keep `ux-design-directions.html` as **reference** only; track final decisions in the `.md` spec.

### Final note

This assessment identified **4** issue **clusters** (traceability/doc staleness, forward dependency, epic “technical” framing, UX primary-journey discoverability). None of them voids the v2 design; they **do** raise execution risk if unaddressed. You may proceed with implementation **after** triaging the two **critical** items above to your comfort level.

---

**Implementation Readiness Assessment Complete**

Report path: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-29.md`

For further BMad routing, invoke the **`bmad-help`** skill.
