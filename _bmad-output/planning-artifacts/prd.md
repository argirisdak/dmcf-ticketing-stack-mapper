---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28T15-59-03Z.md
  - _bmad-output/phase-1-analysis-dmcf-ticketing-stack-mapper.md
workflowType: prd
briefCount: 0
researchCount: 1
brainstormingCount: 1
projectDocsCount: 0
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - dmcf-app

**Author:** Argirisdak
**Date:** 2026-03-28

## Executive Summary

DMCF Ticketing Stack Mapper is an **internal web application** for DMCF programme and research staff who maintain a **single catalogue** of cultural organisations’ ticketing stacks, CRM/audience tools, and key capabilities. It addresses the failure mode where that knowledge lives in **spreadsheets and individual memory**—so no one can be sure information is **current, complete, or consistent**, which slows research and weakens confidence in procurement, partnerships, and written outputs.

Staff get **structured, queryable** records: **search** (for example by ticketing provider such as Tessitura), **multi-attribute filters** (country, organisation type, provider, CRM, capability flags), a **dashboard-style list**, **full CRUD** on organisations (including **delete with confirmation**), and **side-by-side comparison** of selected entries. Each organisation record carries a **source reference** and **system-maintained last updated** metadata. **Success** means faster onboarding, decisions grounded in a **shared, citable** view of the field, and less reliance on informal recall. **MVP** stays internal: not a public directory, not payments, not production-grade authentication.

### What Makes This Special

The advantage is **not** “nicer than a spreadsheet” alone—it is **consistent dimensions**, **explicit provenance**, and **reliable multi-dimensional queries** (for example country and membership capability simultaneously) that return **clean, trustworthy** results quickly. The **core insight** is that ticketing stack knowledge in cultural organisations is **tribal** and **brittle**; when people leave, it goes with them. **Centralising** stack facts **with sources** turns personal recall into **institutional knowledge**—so the organisation can ground platform, partnership, and procurement choices in **verifiable data**, not whoever happens to remember which venue uses which system.

## Project Classification

| Dimension | Value |
|-----------|--------|
| **Project type** | **Web application** (`web_app`) — browser-based client with REST API |
| **Domain** | **General** (in practice: **arts & culture / nonprofit** internal operations and research enablement—no dedicated row in the domain taxonomy) |
| **Complexity** | **Medium** — emphasis on lookup consistency, filter/compare behaviour, and usability for non-technical staff; **lower** external compliance burden than regulated verticals |
| **Project context** | **Greenfield** product documentation and delivery in this repository; implementation conventions and stack defined in project context (React, Express, PostgreSQL, Prisma, Docker Compose) |

## Success Criteria

### User Success

- **Anchor behaviour:** From the **organisation list view**, a staff member can apply **two or more filters** (for example **country** and **ticketing provider**), review matching organisations, select entries, and open a **side-by-side comparison**—all in **under 60 seconds**, **without training or support**.
- **Trust moment:** A new team member, when asked what ticketing system a venue uses, can find a **sourced, up-to-date** answer **in the tool alone**, without chasing colleagues or trawling ad hoc files.
- **Usability bar:** Routine tasks remain understandable for **non-technical internal staff** (consistent labels, forgiving search, clear navigation between list, detail, create/edit, and compare).

### Business Success

- **Short term (demo / handoff):**
  - **Zero critical blockers** during a leadership or stakeholder walkthrough.
  - All **Must-level** functional scope from the agreed requirements is **demonstrable end-to-end** using **seeded data**.
  - A **second person** (not the original author) can bring up DB, API, and UI **from the README alone**, with no undocumented steps.
- **Longer term (if adopted):**
  - At least **30 organisation records** exist with **source references** (and system-maintained freshness metadata behaving as designed).
  - The application is the **first place** staff check **before** starting **ticketing landscape** research.

### Technical Success

- **Trustworthy data and compare UX:** Multi-filter results use **normalised reference data** where designed so combinations (for example country × provider) are **consistent and explainable**; the **compare** experience stays **legible** for non-technical users. Further detail: **Web Application Specific Requirements** (performance targets, compare fetch patterns) and **Non-Functional Requirements** (P1–P3, A1).
- **Operability:** Reproducible local stack, documentation, seeding, consistent API error handling, and **segmented** list retrieval are specified in **Web Application Specific Requirements** (Technical Architecture, Implementation Considerations) and **Non-Functional Requirements** (P3, S1).

### Measurable Outcomes

| Horizon | Signal | Target / threshold |
|--------|--------|-------------------|
| **MVP / handoff** | Demo readiness | **No critical blockers** in walkthrough; **all Must FRs** demonstrable with seed data |
| **MVP / handoff** | Onboarding | **Second person** runs stack **from README** without extra help |
| **User anchor** | Filter → compare | **< 60 seconds** from list view, **>= 2 filters**, **no training** |
| **Adoption (later)** | Institutional coverage | **>= 30** organisations with **sources** |
| **Adoption (later)** | Workflow default | Tool is **first check** before ticketing landscape research |

## Product Scope

### MVP - Minimum Viable Product

- All items in the **Must** priority set from the Phase 1 requirements analysis: **full CRUD** for organisations (create, read, update, delete with confirmation); **list/dashboard** view; **text search** across designated fields; **multi-attribute filtering** (country, organisation type, ticketing provider, CRM platform, capability flags as defined); **multi-select compare view**; **source reference** per record; **last updated** visibility; **seed/sample data** and **README** covering setup and basic troubleshooting; **full stack via Docker Compose** with documented ports and environment variables.
- **CSV export** remains **out of MVP** (stays **Could / stretch** unless reprioritised later).

### Growth Features (Post-MVP)

- **CSV or clipboard export** from list or compare for reporting workflows.
- Further **validation** polish (for example stricter URL rules) beyond MVP minima.
- Optional efficiency improvements such as **batch fetch** of multiple organisations for compare, if profiling shows need.
- Deeper **governance** (ownership of freshness, review workflows, richer source history) if trust and scale require it.

### Vision (Future)

- Sustain the shift from **tribal knowledge** to **institutional knowledge**: richer provenance, stronger curation habits, and optional integrations **only** if strategy changes—still consistent with an internal knowledge base, not a public directory or integration hub by default.

## User Journeys

**MVP user model:** A single internal user type (“Sam”)—all staff who use the tool may **read, create, and edit** records. Journeys below are **scenarios** for that same role, not separate RBAC personas.

### Journey 1 — Primary success path: filter → compare → decide

**Opening:** Sam needs a shortlist of organisations in a given **country** on a given **ticketing provider**, to prepare an internal note on landscape patterns. Spreadsheets previously meant tab switching and informal messages to colleagues.

**Rising action:** From the **list view**, Sam sets **country** and **ticketing provider**, scans results, selects organisations that matter, and opens **Compare**.

**Climax:** In one flow—within the **60-second** anchor from the list—Sam sees **aligned fields** (provider, CRM, capabilities, source) without hunting files.

**Resolution:** Sam can brief others with confidence that **filters matched reality**, not a stale personal sheet.

### Journey 2 — Edge case: results feel wrong—trust must recover

**Opening:** Sam applies filters (for example **provider** and **membership capability**) and the result set **feels off**—a known venue missing, or a row that contradicts what they remember.

**Rising action:** Sam opens **detail**, checks **source reference** and **last updated**, searches by venue name, narrows filters, then **creates** or **edits** records with a **source** so the catalogue improves.

**Climax:** Trust returns because Sam can see **why** the system shows what it shows (provenance and freshness) and **correct forward** without mystery.

**Resolution:** The tool earns authority when bad rows become **fixable** and **traceable**, not when debate replaces data.

### Journey 3 — First-week trust moment: sourced answer without a colleague ping

**Opening:** Sam is new and is asked what ticketing system a **venue** uses. The old pattern was Slack archaeology.

**Rising action:** Sam **searches** by name, opens **detail**, uses the **source** (link or citation) and checks **last updated**.

**Climax:** They answer in a meeting with a **verifiable** fact the room can check—not “I heard…”

**Resolution:** Onboarding succeeds because the habit forms early: **check the tool first**.

### Journey 4 — Maintenance: keep the catalogue honest under time pressure

**Opening:** After an event, Sam learns organisations **changed stacks**. Stale rows undermine filters for everyone.

**Rising action:** Sam finds each organisation, **edits** provider, CRM, capabilities as needed, **updates the source** to new evidence, saves; **last updated** reflects the change.

**Climax:** The next person who filters **country × provider** gets **current** results—no silent staleness.

**Resolution:** Institutional memory tracks the **field**, not who happens to be in the office.

### Journey Requirements Summary

| Journey | Capabilities surfaced |
|--------|------------------------|
| **1 — Filter → compare** | Multi-filter list; selection; compare layout; normalised reference data; responsive list at MVP scale |
| **2 — Trust recovery** | Detail + provenance; search; create/edit; clear validation; recoverable trust after doubt |
| **3 — New staff, cited answer** | Search UX; readable detail; source affordance; **last updated** visibility |
| **4 — Maintenance** | Full edit flow; lookup integrity; freshness rules; validation |

## Domain-Specific Requirements

### Compliance and regulatory

- **Scope:** The MVP is an **internal** research and operations tool, not a consumer-facing product or a regulated system of record for payments or health data.
- **Data protection (UK / EU):** Catalogue entries are primarily **about organisations**; however, **free-text notes** or incidental details could include **personal data**. Treat **notes** as potentially sensitive: follow **organisation policy** on retention and minimisation; avoid collecting personal data in notes unless there is a clear need.
- **Out of scope for MVP:** PCI DSS, HIPAA, clinical validation, government procurement regimes.

### Technical constraints

- **Deployment model:** **No production-grade authentication** in MVP (`project-context`). Success depends on **trusted-network** deployment; the **README** must warn against public internet exposure and clarify the threat model (honesty over false assurance).
- **Security hygiene:** Secrets only in **environment variables**; no secrets in the repository; database not exposed on the host by default (Compose rules).
- **Usability:** **Non-technical internal staff** are the users; language, density, and compare readability are **domain-adjacent requirements** (research quality depends on comprehension).

### Integration requirements

- **None for MVP** (manual entry; no external API integrations per `project-context`).

### Risk mitigations

- **Misdeployment / accidental exposure** without auth: README and runbook-style warnings; bind to localhost or private networks as appropriate.
- **Data quality vs trust:** Normalised reference data and visible **source** + **last updated** to prevent “confident wrong answers.”
- **PII creep in notes:** Optional future guardrails (Growth); for MVP, **clear field intent** in UI copy and contributor practice.

## Web Application Specific Requirements

### Project-Type Overview

The product is a **browser-based web application**: a **React** SPA talking to a **Node.js (Express)** API over HTTPS in production and the Docker Compose network locally. Users are **internal staff** on desktop or laptop browsers. The experience centres on **data-dense tables**, **filters**, **forms**, and a **comparison** view—clarity and trust beat marketing polish.

### Technical Architecture Considerations

- **Client:** React (functional components, hooks), **Vite**-style dev/build pipeline as in Phase 1 analysis; **Tailwind CSS** for styling per `project-context`.
- **Data fetching:** Centralised API helpers or hooks; **TanStack Query** (or equivalent) is appropriate for caching, loading states, and refetch after create/update/delete.
- **Server:** REST + JSON, consistent `{ data, error, meta }` response shape; **pagination** on list endpoints from day one (default page size 20 per `project-context`).
- **Auth:** **None** in MVP per `project-context`; security relies on **deployment context** and documented threat model (see Domain-Specific Requirements).

### Browser matrix

| Browser | MVP expectation |
|---------|------------------|
| **Chrome / Edge (Chromium)** | Fully supported |
| **Firefox** | Fully supported |
| **Safari (current)** | Supported for typical internal use |
| **Legacy / IE** | **Out of scope** |

### Responsive design

- **Primary:** **Desktop-first** layouts for tables, filters, and compare (minimum practical width documented in UX, e.g. ~1280px comfortable).
- **Tablet/narrow:** Layouts should **degrade gracefully** (scroll, stacked filters) but **need not** be mobile-optimised for MVP.

### Performance targets

- **List + search + filter** interactions should feel **responsive** for **hundreds to low thousands** of rows (NFR from analysis), with **server-side pagination** and sensible indexes—not client-side loading of full datasets.
- **Compare view:** Avoid N+1 fetches; batch or parallel fetch of selected organisation IDs within acceptable latency for internal use.

### SEO strategy

- **Not applicable** to MVP: app is **internal**, not publicly indexed. **No** SEO engineering beyond not leaking staging URLs in public DNS (operational hygiene).

### Accessibility level

- **Target:** Reasonable **keyboard** access to primary flows, **visible focus**, **semantic** headings and tables where used, **colour contrast** suitable for long sessions.
- **Explicit non-goal for MVP:** Full WCAG 2.2 AA audit as a **release gate**—unless DMCF mandates it; can move to Growth if required.

### Implementation Considerations

- **Environment:** `VITE_*` (or equivalent) for **public** API base URL; never embed secrets in the client bundle.
- **Errors:** User-visible messages for **validation** and **not found**; avoid raw stack traces in UI.
- **Docker:** Frontend service as in `project-context` (dev server or static + reverse proxy for local); **CORS** or **proxy** configuration documented for API calls from browser.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approach:** **Problem-solving MVP** — ship the smallest proof that **institutional knowledge** works: staff can **find**, **filter**, **compare**, and **maintain** records with **sources** and **freshness**, end-to-end, on a **reproducible** local stack.

**Usefulness bar:** Without a working multi-filter list, compare, CRUD with confirmation, search, normalised lookups, seed data, and Compose + README, the product **does not replace** spreadsheets. **Concrete MVP features** are defined in **Product Scope** and **Functional Requirements**. **CSV export** remains **Growth** (Could / stretch).

**Resources:** A **small team** (for example **one** full-stack developer or **frontend + backend** pair) with **React**, **Express**, **PostgreSQL/Prisma**, and **Docker Compose**; occasional **internal reviewer** for UX copy and seed credibility.

### Journey and scope traceability

All four **Sam** journeys must be **usable** for MVP. **User Journeys** and the **Journey Requirements Summary** map to **Functional Requirements** (FR1–FR31).

### Phased roadmap

**Growth** and **Vision** content is **authoritative** in **Product Scope** (Growth Features; Vision). This section does not duplicate those lists.

### Risk Mitigation Strategy

- **Technical:** **Compare clutter** and **filter trust** — mitigate with **aligned columns**, **empty-state handling**, **normalised lookups**, and **indexes** on filter columns; avoid loading the **entire catalogue** on the client.
- **Adoption (internal):** Weak **seed** or an unreadable **README** — mitigate with **curated seed**, a **smoke-test path** in the README, and **demo** alignment with success criteria.
- **Resources:** **Cut Growth first** if capacity drops; **never** ship MVP without **Must** journeys demonstrable end-to-end with **seeded** data.

## Functional Requirements

### Organisation catalogue

- **FR1:** A staff member can create a new organisation record with required and optional fields.
- **FR2:** A staff member can view the full detail of a single organisation.
- **FR3:** A staff member can update an existing organisation record.
- **FR4:** A staff member can delete an organisation record after confirming the action.
- **FR5:** A staff member can view a tabular list of organisations with key fields visible at a glance.

### Discovery and navigation

- **FR6:** A staff member can search for organisations using text across designated searchable fields (for example name, city, provider, notes, and other fields agreed for search).
- **FR7:** A staff member can navigate between list, detail, create, edit, and comparison flows in a predictable way.

### Filtering

- **FR8:** A staff member can filter organisations by country.
- **FR9:** A staff member can filter organisations by organisation type.
- **FR10:** A staff member can filter organisations by ticketing provider.
- **FR11:** A staff member can filter organisations by CRM platform.
- **FR12:** A staff member can filter organisations by capability attributes (membership, donation, reserved seating) where those attributes exist on a record.
- **FR13:** A staff member can apply multiple filters together to narrow the result set.

### Side-by-side comparison

- **FR14:** A staff member can select multiple organisations from the current results for comparison.
- **FR15:** A staff member can open a side-by-side comparison view for the selected organisations.
- **FR16:** A staff member can compare aligned attributes across selected organisations in a readable layout.

### Provenance and freshness

- **FR17:** A staff member can view a source reference for each organisation.
- **FR18:** A staff member can create or edit a source reference for each organisation.
- **FR19:** A staff member can view a last updated time for each organisation.
- **FR20:** The product automatically maintains last updated metadata when an organisation record is created or changed, without staff manually setting a “last updated” clock field.

### Consistent reference dimensions

- **FR21:** A staff member can choose a ticketing provider from a controlled set of provider options when creating or editing an organisation.
- **FR22:** A staff member can choose a CRM platform from a controlled set of CRM options when creating or editing an organisation.
- **FR23:** A staff member can choose an organisation type from a controlled set of type options when creating or editing an organisation.
- **FR24:** A staff member can set capability attributes using a consistent model that distinguishes unknown, yes, and no (or an equivalent agreed model) for membership, donation, and reserved seating.

### Large result sets

- **FR25:** A staff member can browse organisation list results in segments when the dataset is large, rather than being required to load the entire catalogue at once.

### First-run experience and operability

- **FR26:** A team member can run the full application locally using a single documented stack definition and steps.
- **FR27:** A team member can load or reset sample organisations using a documented command or process so demos and learning do not depend on manual entry.
- **FR28:** Documentation enables a second team member to run the stack and perform basic smoke checks without undocumented steps.

### Feedback and data quality

- **FR29:** A staff member receives clear, actionable feedback when input fails validation or when a requested organisation cannot be found.
- **FR30:** A staff member can optionally enter free-text notes on an organisation.
- **FR31:** A staff member can optionally record venue capacity when known.

## Non-Functional Requirements

### Performance

- **P1 — Interactive list operations:** For expected catalogue sizes (**hundreds to low thousands** of organisations), routine list interactions (**apply filters, change page, run text search, open detail**) complete fast enough that a typical staff member does not perceive **avoidable lag** during normal work (validate with smoke testing and informal timing on representative hardware).
- **P2 — Compare responsiveness:** Opening the **comparison view** for a small number of selected organisations (typical internal use) does not introduce **noticeable multi-second waits** attributable to avoidable round trips or unbounded data loading.
- **P3 — Server-backed segmentation:** Organisation list retrieval supports **segmented retrieval** appropriate to the dataset so the client is not required to download the **entire catalogue** to render or filter.

### Security

- **S1 — Secrets handling:** Secrets and environment-specific configuration are **not** committed to source control; only **documented placeholders** appear in example env files.
- **S2 — Deployment posture:** The MVP assumes **internal/trusted-network** deployment consistent with **no production-grade authentication**; documentation states the **threat model** (for example: mis-exposure risk if deployed to the public internet).
- **S3 — Data minimisation for notes:** Because **free-text notes** may accidentally contain **personal data**, the product and documentation encourage **minimal necessary** content and align with **organisational** data-handling expectations (not a substitute for legal advice).

### Scalability

- **SC1 — Expected concurrency:** The system is designed for **small concurrent staff usage** (internal tool), not public-scale traffic spikes.
- **SC2 — Dataset growth:** Architecture and indexing assumptions support **at least** the **hundreds to low thousands** of organisation rows described in discovery without requiring a redesign of core list/filter behaviour.

### Accessibility

- **A1 — Pragmatic accessibility:** Primary flows support **keyboard operation** at a basic level, **visible focus**, and **readable contrast** for long sessions on desktop browsers.
- **A2 — Non-goal unless mandated:** A full **WCAG 2.x formal audit** as a **release gate** is **out of scope for MVP** unless DMCF explicitly requires it (may move to Growth).

### Integration

_Not applicable for MVP (no external system integrations; manual data entry only)._
