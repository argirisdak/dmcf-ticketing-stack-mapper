# Systems data fields — rationale and recent-updates report

> **Purpose.** This report walks through every data field on the `System` entity and explains: what it *is* (technical shape), what it *represents* (semantic meaning), and why it's *useful* to a Sam-style researcher comparing platforms for a cultural organisation. It is intended to be read alongside [`research-brief.md`](research-brief.md) (the original problem framing) and [`system-catalogue-rationale.md`](system-catalogue-rationale.md) (the per-system seed reasoning).
>
> **Why this document exists now.** The application has gone through three rounds of delta work — `prd-v2-delta` / `architecture-v2-delta`, `prd-v3-delta` / `architecture-v3-delta`, and an in-flight set of UX corrections (category-conditional capabilities, deployment de-emphasis, multi-region geographic focus). The Systems shape that resulted is not obvious from the brief alone, and a future maintainer (or operator) needs a single document that justifies every column without making them re-derive the trail.

---

## 1. What changed across the deltas

| Round | Headline impact on Systems | Source delta |
|---|---|---|
| **v2** | New `System` entity replaces the legacy `TicketingProvider` / `CrmPlatform` lookups; introduces `SystemCategory`, `DeploymentModel`, `PricingModel`, `geographic_focus`, three reused `CapabilityState` columns, `custom_attributes` JSON, and the `OrganisationSystem` junction with `SystemRole`. | [`prd-v2-delta.md`](../_bmad-output/planning-artifacts/prd-v2-delta.md), [`architecture-v2-delta.md`](../_bmad-output/planning-artifacts/architecture-v2-delta.md) |
| **v3** | Adds five sector-relevant capability columns (`season_subscriptions`, `dynamic_pricing`, `multi_venue_support`, `marketing_automation`, `accessibility_features`); promotes `custom_attributes` from read-only-seeded to fully editable; adds `field_sources` JSON for per-claim provenance; adds list sorting and (Organisation only) duplicate prevention. | [`prd-v3-delta.md`](../_bmad-output/planning-artifacts/prd-v3-delta.md), [`architecture-v3-delta.md`](../_bmad-output/planning-artifacts/architecture-v3-delta.md) |
| **Post-v3 UX corrections** (this report) | Category-aware capability rendering — five capabilities are conceptually ticketing-only and are hidden for `AUDIENCE_MANAGEMENT` systems on detail/form, rendered as N/A on compare. Deployment row hidden on detail when value is `SAAS` (low-info row when 11/11 systems are cloud-native). `geographic_focus` migrated from a single string to `String[]` so platforms with genuine multi-region presence (Spektrix UK+US, AudienceView NA+UK+EU, PatronBase UK+ANZ) stop being squashed into one tag. Seed cleanup step deletes unlinked stale systems so the seed invariant stays accurate across catalogue changes. | This report; [`SystemDetailPage.jsx`](../frontend/src/pages/SystemDetailPage.jsx), [`system-capabilities.js`](../frontend/src/lib/system-capabilities.js), [`SystemCard.jsx`](../frontend/src/components/SystemCard.jsx), migration `20260507100000_geographic_focus_array`, [`seed.js`](../backend/src/prisma/seed.js) |

The rest of this document treats the post-v3 state as the current truth. Where a field changed shape between rounds, the reasoning explains the *current* shape, not the historical one.

---

## 2. Field-by-field rationale

The fields are grouped by what they *do for the user*, not by their order in the schema. Each block answers three questions:

- **What it is** — type, nullability, allow-list, default.
- **What it represents** — the business question the field answers.
- **Why it's useful** — what a Sam-style operator can do with it that they couldn't do without it.

### 2.1 Identity fields — *which platform are we talking about?*

#### `name` — `String`, unique, required

- **What it is.** A unique vendor-canonical product name (`Tessitura`, `Spektrix`, `Eventbrite`). Database-enforced uniqueness via `@unique` on the column, plus a frontend trigger that flags conflicts at create-time with a 409 from Prisma's `P2002`.
- **What it represents.** The label the cultural-sector audience already knows the platform by. Not the legal product name, not the marketing slug — the conversational name.
- **Why it's useful.** Every other piece of evidence (research notes, vendor URLs, customer testimonials) is keyed to this name in the wild. Forcing uniqueness here means a single canonical row owns all the comparison data for that platform, regardless of how many people enter it.

#### `vendor` — `String`, required

- **What it is.** The legal entity selling the product.
- **What it represents.** Who the customer signs the contract with, who answers a procurement RFP, who shows up to the user-group conference.
- **Why it's useful.** Vendor consolidation matters in this market — *AudienceView* owns *OvationTix* and *Audience Republic*; *Live Nation Entertainment* owns *Ticketmaster* and *Universe*. Knowing the vendor exposes that two seemingly independent products may share a sales motion, integration roadmap, or pricing power. The catalogue currently lists the parent (`Live Nation Entertainment`, `Tessitura Network`, `Salesforce, Inc.`) so this question is answerable without a second click.

#### `category` — `SystemCategory` enum, required

- **What it is.** One of `INTEGRATED`, `TICKETING`, `AUDIENCE_MANAGEMENT`. No `UNKNOWN` value — every platform must declare a primary identity.
- **What it represents.** The *core operational role* the platform plays for the organisation:
  - `INTEGRATED` — single database for ticketing transactions **and** patron/donor records (Tessitura, Spektrix, AudienceView).
  - `TICKETING` — sells tickets; may have a contact list but isn't the system of record for fundraising or membership lifecycles (Ticketmaster, Eventbrite, Ticketsolve).
  - `AUDIENCE_MANAGEMENT` — manages patron records, donations, segmentation, marketing; may not sell tickets at all (Salesforce, HubSpot, Donorfy).
- **Why it's useful.** This is the single most important filter when shortlisting. An organisation evaluating "do we replace Spektrix or just bolt a CRM onto our existing ticketing?" has fundamentally different shortlists in each direction, and `category` is what makes those shortlists computable.
- **Post-v3 corollary.** `category` now also drives *which capability rows the UI shows*. A CRM-only platform doesn't get asked "do you support reserved seating?" because the question is meaningless for that category. See [§2.5 Capabilities](#25-capabilities--what-can-this-platform-actually-do).

### 2.2 Operational shape — *how does it run, how do they charge?*

#### `deployment_model` — `DeploymentModel?`, optional

- **What it is.** One of `SAAS`, `SELF_HOSTED`, `HYBRID`, or null. Nullable because the answer isn't always public.
- **What it represents.** Where the software actually runs. Vendor-hosted multi-tenant cloud (`SAAS`), customer-operated on their own infrastructure (`SELF_HOSTED`), or a mix.
- **Why it's useful.** Three procurement-relevant downstream questions hinge on this: data residency / GDPR, IT department workload, integration model. A self-hosted Tessitura deployment is a very different cost-of-ownership conversation from a cloud-only Spektrix deployment.
- **Honesty note (post-v3).** In the current 11-system catalogue, every value is `SAAS`. SaaS has won the cultural-sector platform race. Rather than render an 11-row column that says "SaaS" 11 times, the detail page now hides the Deployment row when value is `SAAS` ([`SystemDetailPage.jsx:569-579`](../frontend/src/pages/SystemDetailPage.jsx#L569-L579)). The form still prompts for it (a future on-prem entry should still be capturable), the compare grid still shows it (alignment), but the detail page recovers vertical space for the rows that actually differentiate. The first time a `SELF_HOSTED` Theatre Manager or `HYBRID` legacy Tessitura customer is added, the row reappears organically.

#### `pricing_model` — `PricingModel?`, optional

- **What it is.** One of `SUBSCRIPTION`, `TRANSACTION_FEE`, `LICENCE`, `HYBRID`, `UNKNOWN`. Nullable for "we don't know yet" (preferred over guessing). The `UNKNOWN` enum value is a deliberate *first-class* answer, distinct from the column being null.
- **What it represents.** The commercial model from the *customer's* perspective:
  - `SUBSCRIPTION` — recurring fixed fee, ticket volume doesn't drive the bill.
  - `TRANSACTION_FEE` — per-ticket cut, often passed to the buyer.
  - `LICENCE` — annual contract, named-user licences, implementation fees, RFP-led.
  - `HYBRID` — base subscription plus per-transaction uplift, or licence plus per-event fee.
  - `UNKNOWN` — vendor doesn't publish enough to classify confidently.
- **Why it's useful.** This is the second-most-important filter after `category`. A small theatre selling 5,000 tickets a year cannot afford a `LICENCE` model; a stadium selling 5M tickets a year cannot tolerate a `TRANSACTION_FEE` percentage. The value answers "is this commercially survivable for us?" before any feature comparison happens.
- **Why this enum and not the brief's.** The brief proposed `per_ticket / subscription / transaction_fee / custom_quote / hybrid`. The implementation collapses `per_ticket` into `TRANSACTION_FEE` (same commercial mechanism) and replaces `custom_quote` with `LICENCE` (more specific — `LICENCE` carries operational implications that "custom quote" alone does not). See [`system-catalogue-rationale.md` §3.3](system-catalogue-rationale.md).

### 2.3 Geographic positioning — *is this platform actually for us?*

#### `geographic_focus` — `String[]`, defaults to `[]`, **changed in post-v3**

- **What it is.** An array of region tags drawn from the controlled allow-list `['UK', 'Europe', 'North America', 'Global', 'Other']` (see [`backend/src/lib/system-geographic-focus.js`](../backend/src/lib/system-geographic-focus.js)). Empty array means "not specified." Frontend renders as comma-separated; the form is a checkbox group; the list filter is a chip-style multi-select.
- **What it represents.** Where the platform's *centre of operational gravity* lies in terms of customer base and support hours, **not** where it's legally available. A platform tagged `['UK']` may legally sell to anyone, but its support shift, reference customer pool, sector-conferences attended, and template content all track its UK customer concentration.
- **Why it's useful.** Geographic fit drives several real procurement decisions: support timezone overlap, currency / tax handling (Gift Aid for UK, 501(c)(3) for US), regulatory alignment (GDPR specifics, PCI), language defaults, and crucially the *peer-organisation reference base* — "show me the systems that Mid-sized UK opera houses actually use" only works if you can filter on this dimension.
- **Why an array and not a single string.** The original schema had `geographic_focus String?`. That forced platforms with genuine multi-region presence into one tag, and the seed had to either lie or default to `Global`:
  - **Spektrix** — collapsed to `'UK'`, hiding their substantial US/Canada client base.
  - **PatronBase** — collapsed to `'UK'`, hiding the AU/NZ origin the brief explicitly calls out.
  - **AudienceView** — collapsed to `'North America'`, hiding UK/EU clients picked up via the OvationTix line.
  - **Ticketsolve** — collapsed to `'UK'`, hiding the Ireland market that's a meaningful share of their book.

  Migrating to `String[]` (migration [`20260507100000_geographic_focus_array`](../backend/src/prisma/migrations/20260507100000_geographic_focus_array/migration.sql)) lets each system declare every region it has a genuine operational presence in. Filtering uses Postgres `hasSome` semantics — `?geographic_focus=UK&geographic_focus=Europe` returns systems whose array contains *any* of the requested regions.

  The five-value allow-list is intentionally coarse. Country-level tagging would be more precise but would multiply maintenance and create false specificity where the underlying claim ("Tessitura is used widely in the US") doesn't actually warrant country-level tags. If a future need requires higher resolution (e.g. distinguishing UK from Ireland within Europe), the allow-list can be extended without further schema work.

### 2.4 Description — *the editorial layer*

#### `description` — `Text?`, optional

- **What it is.** Free-text paragraph, no structured constraints.
- **What it represents.** The editor's plain-language summary of the platform — what it does, who it's for, what its tribal-knowledge reputation is. Captures nuance that doesn't fit a column ("strong in small-to-mid halls and multi-venue trusts," "owns Audience Republic marketing platform").
- **Why it's useful.** The columns are good at YES/NO and enum questions, terrible at the texture that operators actually care about ("how much pain to migrate," "what kind of vendor are they to deal with"). The description is the catch-all for that texture and gets the centre of vertical attention on the detail page.
- **Editorial note.** The description is *not* the place for a feature checklist — those go to the capability columns and custom attributes. Reserve description prose for things that wouldn't fit in a structured column even if you tried.

### 2.5 Capabilities — *what can this platform actually do?*

#### Eight `CapabilityState` columns

The capability columns are the heart of the side-by-side comparison. Each is the same enum (`YES | NO | UNKNOWN`) but the *applicability* varies by category — a critical post-v3 distinction.

| Column | Applies to | What it represents | Why it's useful |
|---|---|---|---|
| `membership_capability` | All categories | Tier-based membership lifecycles (renewal, benefits, comp tickets) | Membership-driven venues need this as a first-class workflow, not bolted on |
| `donation_capability` | All categories | Donation processing + donor record-keeping | Nonprofits whose unrestricted income is donor-driven cannot operate without it; whether the platform owns this or hands it off determines the integration burden |
| `marketing_automation_capability` | All categories | Triggered/segmented campaigns beyond manual broadcast email | The differentiator between "we send a newsletter" and "lapsed donors get a personalised outreach 14 days after their last gift anniversary" |
| `reserved_seating_capability` | **Ticketing-relevant only** | Seat-by-seat selection with seat maps | Core for any seated venue; meaningless for a CRM |
| `season_subscriptions_capability` | **Ticketing-relevant only** | Renewable seated subscription packages (the arts-sector "season ticket") | Critical for operas, symphonies, repertory theatres; differentiates integrated suites from event-only platforms |
| `dynamic_pricing_capability` | **Ticketing-relevant only** | Demand-based price adjustment for tickets/events | Major revenue lever for high-demand venues; absent in most arts-focused tools, present in commercial ticketing |
| `multi_venue_support_capability` | **Ticketing-relevant only** | Single deployment serving multiple venues from one configuration | Essential for venue trusts, presenting organisations, and consortiums; nice-to-have but not core for single-site venues |
| `accessibility_features_capability` | **Ticketing-relevant only** | Accessible seating workflows, wheelchair bookings, companion-seat policies | Increasingly a procurement gate, especially for publicly-funded venues |

**The applicability split — and why it matters.** Five of the eight capabilities are framed in terms of seats, events, or venues. Asking "does Salesforce support reserved seating?" is a category error — the question doesn't apply to a generic CRM. The `CapabilityState` enum has only `YES | NO | UNKNOWN`, so an `AUDIENCE_MANAGEMENT` row with `reserved_seating_capability = UNKNOWN` reads as "we haven't researched this yet" when the truthful answer is "this question is meaningless." Three places in the UI now correct for this:

1. **Detail page** — `getVisibleCapabilityRows(category)` ([`system-capabilities.js`](../frontend/src/lib/system-capabilities.js)) filters out the five ticketing-only rows for `AUDIENCE_MANAGEMENT` systems. A Donorfy detail page shows three capability rows, not eight.
2. **Form** — same helper drives which capability inputs render. If the user changes `category` from `TICKETING` to `AUDIENCE_MANAGEMENT` mid-edit, the five irrelevant inputs disappear from view (their stored values stay in the DB; they're just not surfaced).
3. **Compare grid** — keeps all eight rows for grid alignment but renders an italic "N/A" cell for ticketing-only capabilities on `AUDIENCE_MANAGEMENT` columns ([`SystemCard.jsx`](../frontend/src/components/SystemCard.jsx)). The cell skips the per-field source-icon wrapper entirely so any seeded `field_sources` entry on a now-irrelevant key cannot produce a misleading clickable icon.

**Why eight and not the brief's seventeen.** The brief proposed a 17-flag list. The implementation promotes a flag to a column only when the value is *defensibly fillable on at least 8 of 11 seeded systems with a publicly verifiable source* (ADR-027). Capabilities that fail that bar (`general_admission`, `mobile_wallet`, `api_access`, `sso_support`, `email_marketing`, `audience_segmentation`, `reporting_analytics`) are routed to `custom_attributes` so they can be added per-platform when an actual procurement decision needs them, without bloating the schema with mostly-`UNKNOWN` columns.

### 2.6 Provenance — *can I trust this row?*

#### `source_reference` — `String?`, optional (row-level)

- **What it is.** A free-text URL or citation for the record as a whole.
- **What it represents.** The general-purpose source the editor leaned on while filling out the row — typically the vendor homepage or an evaluation report.
- **Why it's useful.** A single click-through that says "if you want to start verifying this row, start here." Not a per-claim citation — that's what `field_sources` is for.

#### `field_sources` — `Json?`, **added in v3**

- **What it is.** A JSON object keyed by camelCase field name (`vendor`, `pricingModel`, `seasonSubscriptionsCapability`, …), values are HTTPS URLs. Keys validated against a per-entity allow-list ([`field-source-keys.js`](../backend/src/lib/field-source-keys.js)). Empty object is valid (clears all). Keys not in the allow-list are rejected at the controller with 400.
- **What it represents.** Per-claim provenance. "Tessitura's pricing model is `LICENCE`" should be backed by a specific URL that supports *that specific claim* — not by the homepage that supports the existence of the platform overall.
- **Why it's useful.** The brief was explicit: "every data point should carry a source reference." The v2 implementation reduced this to one row-level `source_reference`, which let a generic homepage URL silently back twelve specific claims. The v3 `field_sources` change reverses that compression — the UI now renders a small ⓘ icon next to each field that has a per-field URL, and *only* renders it when there's a per-field URL. No fallback to the row-level source. A reader can tell at a glance which claims are individually verifiable and which fall back to the editor's word.
- **What it does not do.** `field_sources` is not validated for HTTP health, not continuously monitored, not legally audited. URLs can rot. The current bar is "best-effort, internally reviewed at seed time" (verified once with `curl` for HTTP 200). A future "broken-link audit" feature is the natural follow-up — that's the trade-off ADR-025 acknowledges upfront.

### 2.7 Custom attributes — *the flexible layer*

#### `custom_attributes` — `Json?`, **promoted to fully editable in v3**

- **What it is.** JSON array of `{ label, value, sourceReference }` triples. Up to 200 chars per text field. Empty array is valid (clears all). Whitespace-only rows are stripped on submit.
- **What it represents.** Vendor-specific traits that don't fit any of the universal columns: "B Corp certified" for Spektrix, "v16 upgrade required by December 2027" for Tessitura, "owns Audience Republic marketing platform" for AudienceView.
- **Why it's useful.** The columns will never cover everything. New traits emerge — a vendor gets acquired, a product gains a certification, a deprecation deadline appears. Without this column, the editor either pollutes `description` with structured-but-unstructured text or files a feature request to add a new column for a one-off claim. With it, the editor adds a row with its own source URL, and the compare page picks it up automatically — the system-compare grid takes the *union* of all custom-attribute labels across the selected systems and renders them as additional comparison rows ([`system-compare-union-labels.js`](../frontend/src/lib/system-compare-union-labels.js)).
- **Editor flow (v3).** A repeating-row editor on `SystemFormPage` ([`CustomAttributeEditor.jsx`](../frontend/src/components/CustomAttributeEditor.jsx)) lets the user add, edit, and remove triples directly. Before v3 this was seed-only and read-only; the v3 delta promotes it to MVP-editable.

### 2.8 Lineage — *when did this last change?*

#### `last_updated` — `DateTime`, auto-managed

- **What it is.** Prisma `@updatedAt` — written by the database on every update, never accepted from request bodies (ADR-011).
- **What it represents.** When this row was last edited. Not when the underlying vendor product last changed.
- **Why it's useful.** Source-of-truth date for "is this row stale?" An editor scanning the catalogue can sort by `lastUpdated` ascending and walk through the rows that haven't been touched in a while.

#### `created_at` — `DateTime`, default `now()`

- **What it is.** Set on insert, never changes thereafter.
- **What it represents.** When this row entered the catalogue.
- **Why it's useful.** Timeline reconstruction. Less load-bearing than `last_updated` but free to maintain.

---

## 3. UX rules driven by these fields (post-v3 corrections)

The fields above are not consumed uniformly. Three category-aware rules now govern rendering:

### 3.1 Capability visibility by category

```
TICKETING     → all 8 capabilities visible
INTEGRATED    → all 8 capabilities visible
AUDIENCE_MANAGEMENT → 3 capabilities visible (membership, donation, marketing automation)
                      5 ticketing-only capabilities hidden on detail/form,
                      rendered as "N/A" on compare
```

This is enforced through a single `getVisibleCapabilityRows(category)` helper that reads a `ticketingOnly: true` tag on the relevant rows of `CAPABILITY_ROWS`. Adding a future capability requires only setting the tag correctly.

### 3.2 Deployment row hidden when value is `SAAS`

The detail page renders the Deployment row only when the value is non-null and non-`SAAS`. The day a self-hosted or hybrid platform is added, the row reappears for that record without any code change. The form, list filter, and compare grid still show the field unconditionally because they need to support data entry and column alignment respectively.

### 3.3 Multi-region geographic focus filtering

The list page filter uses chip-style multi-select (`toggleGeographicFocus`, `?geographic_focus=UK&geographic_focus=Europe`) with OR semantics — a system matches if its `geographic_focus` array contains *any* selected region. The active-filter chip strip emits one chip per selected region with individual removal. This mirrors how the existing `category` multi-select works, so the UX language is consistent across the two multi-value filters.

---

## 4. The 11-system catalogue at a glance (post-v3)

| Name | Vendor | Category | Pricing | Geography (post-array) |
|---|---|---|---|---|
| Tessitura | Tessitura Network | Integrated | Licence | Global |
| Spektrix | Spektrix Ltd | Integrated | Subscription | UK, North America |
| AudienceView | AudienceView | Integrated | Hybrid | North America, UK, Europe |
| Ticketmaster | Live Nation Entertainment | Ticketing | Transaction fee | Global |
| PatronBase | PatronBase | Ticketing | Licence | UK, Other (AU/NZ) |
| Eventbrite | Eventbrite, Inc. | Ticketing | Transaction fee | Global |
| Ticketsolve | Ticketsolve | Ticketing | Subscription | UK, Europe |
| Universe | Live Nation Entertainment | Ticketing | Transaction fee | Global |
| Salesforce | Salesforce, Inc. | Audience management | Subscription | Global |
| HubSpot | HubSpot, Inc. | Audience management | Subscription | Global |
| Donorfy | Donorfy | Audience management | Subscription | UK |

For per-system reasoning (capability values, evidence URLs, edge cases), see [`system-catalogue-rationale.md` §4](system-catalogue-rationale.md).

---

## 5. What's still open

These are fields the brief proposed that the implementation has *deliberately* not added, with the reasoning recorded so a future contributor doesn't re-litigate them.

| Field from brief | Status | Why deferred |
|---|---|---|
| `vendor_country` | Not in schema | Most operational consequences (support hours, currency) are already captured by `geographic_focus`; adding this column would add a second classification with no new query power. Reconsider if a "support timezone" filter becomes a real ask. |
| `year_founded` | Not in schema | Maturity is implied by the description and by adoption count. A column would be one more `UNKNOWN`-prone field with thin operational value. |
| `target_organisation_size` | Considered and rejected | PRD v2 delta §6 — most integrated platforms span sizes; the boundaries are contested. Description prose carries the nuance instead. |
| `target_organisation_types` (array) | Not in schema | The same data is reachable via the adoption-evidence layer — querying which `organisation_type`s have linked to a system gives a *grounded* answer rather than a vendor-marketing answer. |
| `integration_partners` (array) | Not in schema | Listed integrations are usually directional ("we have a Wordfly connector") but not symmetric or current. Custom attributes carry this where it's real. |
| `built_on_platform` | Not in schema | Useful for one specific case (PatronManager being built on Salesforce). Adding a column for a one-off would over-fit the schema; goes to custom attributes. |
| `pricing_transparency`, `entry_price_indication`, `nonprofit_pricing`, `donation_fees_charged` | Not in schema | All four would be `UNKNOWN`-heavy — vendors don't publish the underlying answers consistently. Better captured in description prose where context can do the work that a coarse enum cannot. |

**The bar for promotion.** A field becomes a column when it (a) answers a question that real procurement decisions hinge on, (b) is fillable on a clear majority of seeded platforms with a public source, and (c) has a small bounded value set or a clear comparison semantics. Anything that fails (b) or (c) is better-served by a `custom_attributes` row plus its own source URL — a path that scales free with new fields and doesn't bloat the schema with mostly-empty columns.

---

## 6. Reading guide for future maintainers

- **You're adding a system.** Use the form. The capability inputs and source-URL inputs are paired; fill them together. Prefer `UNKNOWN` and an empty `field_sources` key over a guess.
- **You're adding a vendor-specific trait that doesn't fit the columns.** Add it as a custom attribute with a label, value, and source URL. If you find yourself wanting to add the same custom-attribute label to 5+ systems, that's a candidate for column promotion — open a discussion.
- **You're trying to figure out why a capability says `UNKNOWN`.** Check the description. If the description doesn't address it, the seed editor genuinely couldn't find a defensible public source. That's the correct answer.
- **You're trying to figure out why a row's deployment is hidden.** It's `SAAS`. The row hides when the value is `SAAS` to recover space. Edit the system to see it (the form always shows it) or read the seed catalogue.
- **You're trying to figure out why a CRM-only system has no "reserved seating" row.** It's a category-applicability hide. Change the system to `INTEGRATED` or `TICKETING` and the row reappears.
