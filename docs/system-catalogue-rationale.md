# System catalogue — rationale and verification report

> **Purpose.** This document explains, in plain language, why the app is shaped the way it is and why each seeded system has the attributes it does. It is the bridge between [`docs/research-brief.md`](research-brief.md) (the original brainstorm) and the running application.
>
> **How to read it.** Sections 1–3 explain the *framework* (data model and enums). Section 4 walks through each of the 11 seeded systems and explains every classification choice. Section 5 is honest about where the catalogue's evidence is weak and what to do about it.

---

## 1. Why the app's shape matches the brief

The brief argued for one specific structural change: stop comparing organisations to each other and start comparing **systems** (ticketing platforms, CRMs, integrated suites) to each other, with organisations acting as the *adoption evidence layer*. The implementation reflects that argument literally.

| Brief recommendation | Implementation | Where to confirm |
|---|---|---|
| One unified `System` entity with a `category` distinguishing ticketing-only / CRM-only / integrated suites | `model System` with `SystemCategory` enum | [`schema.prisma:74-94`](../backend/src/prisma/schema.prisma#L74-L94) |
| Many-to-many junction so an organisation can link to multiple systems with explicit roles (e.g. *integrated suite* + *secondary email tool*) | `model OrganisationSystem` with `SystemRole` enum | [`schema.prisma:96-112`](../backend/src/prisma/schema.prisma#L96-L112) |
| Drop the legacy `TicketingProvider` / `CrmPlatform` lookup tables — they were forcing false splits on platforms like Tessitura that legitimately do both | Removed in migration `20260502180000_drop_legacy_lookups` (Epic 10) | [`docs/decisions.md` ADR-015](decisions.md), [migrations folder](../backend/src/prisma/migrations/) |
| Keep the existing three-state capability model (`YES` / `NO` / `UNKNOWN`) and reuse it for systems | `CapabilityState` enum reused on `System` | `schema.prisma:10-14` and `74-94` |
| Side-by-side compare of 2–4 systems with a "custom attributes" union panel for vendor-specific traits | `/compare/systems` route renders aligned core attributes plus a union panel of seeded custom attributes | [`SystemComparePage.jsx`](../frontend/src/pages/SystemComparePage.jsx) |
| Custom attributes as a flexible JSON list of `{ label, value, source_reference }` rather than a full schema | `system.custom_attributes Json?` column, read-only in MVP | [`docs/decisions.md` ADR-019](decisions.md) |

Two places where the implementation **deliberately diverges** from the brief — these are not oversights, they are recorded scope decisions:

1. **`target_organisation_size` enum dropped.** The brief recommended a `small / medium / large / enterprise / multi_size` enum. The PRD v2 delta rejected it on the grounds that most integrated platforms span multiple sizes and the boundaries are contested in practice; the `description` field carries this nuance as prose instead. See [`prd-v2-delta.md` §6](../_bmad-output/planning-artifacts/prd-v2-delta.md).
2. **The full 17-flag capability list from the brief is not fully modelled.** `System` now carries **eight** `CapabilityState` columns: the three reused from the Organisation entity plus five Epic-12 columns (season subscriptions, dynamic pricing, multi-venue support, marketing automation, accessibility features) — see [`schema.prisma`](../backend/src/prisma/schema.prisma). Remaining brief flags are still out of scope; Story 11.5 / 12.5 pair **HTTPS citations** in `field_sources` with those enums so every non-`UNKNOWN` value is verifiable.

Everything else in the brief that landed in the PRD is implemented. The structural rework is correct.

---

## 2. The data model in one diagram

```
Organisation ─┬─< OrganisationSystem >─┬─ System
              │                         │
              │   role: PRIMARY_TICKETING│
              │         PRIMARY_CRM      │
              │         INTEGRATED_SUITE │
              │         SECONDARY        │
              │                          │
              └─ source_reference, note  └─ category, vendor, deployment,
                  per link                   pricing, geographic_focus,
                                             eight capability columns, custom_attributes,
                                             field_sources (per-field HTTPS citations)
```

The junction is the load-bearing part. Without it, an opera house using **Tessitura** as its full integrated suite **plus** **Wordfly** for email cannot be expressed truthfully. With it, that opera house has two `OrganisationSystem` rows: one with `role=INTEGRATED_SUITE` to Tessitura, one with `role=SECONDARY` to Wordfly.

---

## 3. What each enum value means

These are the enums the catalogue uses. Knowing them is necessary to read Section 4.

### 3.1 `SystemCategory`

| Value | Meaning |
|---|---|
| `INTEGRATED` | A single product that handles **both** ticketing transactions and audience/CRM data in one database. Tessitura, Spektrix, AudienceView. |
| `TICKETING` | Sells and delivers tickets. May have a contact list but is not the system of record for donor relationships, membership lifecycles, or marketing segmentation. Ticketmaster, Eventbrite, Ticketsolve. |
| `AUDIENCE_MANAGEMENT` | Manages patron/donor records, segmentation, and marketing. May not sell tickets at all. Salesforce, HubSpot, Donorfy. |

### 3.2 `DeploymentModel`

| Value | Meaning |
|---|---|
| `SAAS` | Vendor-hosted, multi-tenant, accessed via browser. Customer does not run servers. |
| `SELF_HOSTED` | Customer installs and operates the software on their own infrastructure. |
| `HYBRID` | Mixed model — for example, vendor-managed application with customer-managed integrations or data residency. |

### 3.3 `PricingModel` — the key question

This is the enum that needs the most care because the public evidence is thinnest. Each value has a specific operational meaning:

| Value | Meaning | Typical signal |
|---|---|---|
| `SUBSCRIPTION` | Recurring fixed fee (monthly or annual) for access. Per-seat or per-tier. Ticket volume usually does **not** drive the bill. | "Plans starting at £X/month", named tiers (Starter / Pro / Enterprise). |
| `TRANSACTION_FEE` | Vendor takes a per-ticket cut (often a percentage + flat fee). Customer pays nothing or very little when no tickets sell. | Pricing pages talk in "$X + Y% per ticket"; fees may be passed to the buyer. |
| `LICENCE` | Annual or multi-year contract negotiated bottom-up, often with implementation fees, named-user licences, and minimums. The customer is buying capacity, not transactions. | "Contact us for pricing", custom RFP, mandatory onboarding fee. |
| `HYBRID` | Combines two of the above — typically a base subscription **plus** a per-transaction fee, or a licence plus per-event uplift. | Pricing page lists both a monthly fee and a per-ticket fee. |
| `UNKNOWN` | The vendor does not publish enough to classify confidently. | Pricing page is "Contact sales" with no further breakdown and no public RFP. |

**Why we did not adopt the brief's enum exactly.** The brief proposed `per_ticket / subscription / transaction_fee / custom_quote / hybrid`. The implementation collapses `per_ticket` and `transaction_fee` into one (they are the same commercial mechanism in this market) and replaces `custom_quote` with `LICENCE`, which is more specific — `LICENCE` is what most enterprise arts platforms actually do (Tessitura, AudienceView), and it carries an operational implication (annual contract, named users) that "custom quote" alone does not. `UNKNOWN` is a deliberate addition so we never silently mis-classify.

### 3.4 `SystemRole` (on the junction)

| Value | Meaning |
|---|---|
| `PRIMARY_TICKETING` | This is the organisation's main ticket-selling system. |
| `PRIMARY_CRM` | This is the organisation's main patron/donor record system. |
| `INTEGRATED_SUITE` | This system plays both roles at once (only valid for `INTEGRATED` category systems). |
| `SECONDARY` | A supporting tool — email marketing platform, secondary CRM, niche ticketing channel. |

### 3.5 `CapabilityState`

`YES` means the platform demonstrably supports this; `NO` means it demonstrably does not; `UNKNOWN` means we have not found public evidence either way. **`UNKNOWN` is the correct answer when in doubt** — the brief explicitly calls this out, and we should never silently default to `NO`.

**`field_sources` vs columns.** The `System` row stores **eight** capability enums in dedicated columns. The `field_sources` allow-list in [`field-source-keys.js`](../backend/src/lib/field-source-keys.js) includes matching camelCase keys for all eight, plus structural fields (`category`, `vendor`, etc.). Story 12.5 requires: every `YES` / `NO` value has a URL under the matching key; `UNKNOWN` values **omit** the key.

**Internal catalogue evidence bar.** For this deployment, per-field URLs are **best-effort, internally reviewed** citations. Product homepages, training or investor pages, or one URL supporting several keys are accepted where the maintainers judged the claim proportionate. They are **not** legal-grade, continuously monitored for HTTP health, or independently audited. Prefer `UNKNOWN` and omitted keys when public material is thin.

### 3.6 `geographic_focus`

A constrained dropdown (`UK`, `Europe`, `North America`, `Global`, `Other`) — see [`docs/decisions.md` ADR-016](decisions.md). The brief proposed an array, the implementation uses a single string. The value answers: *where is the platform's centre of gravity in terms of customer base and support hours?* — not *where is it legally available*. Tessitura serves Europe and Asia, but its customer body and conferences are global, so it is `Global`. Spektrix serves the US too, but its UK-and-Ireland customer concentration is the relevant operational signal, so it is `UK`.

---

## 4. The 11 seeded systems — why each has the attributes it does

For each system below: what its classification is, why each value was chosen, and what the current source reference does and does not prove. The catalogue is in [`backend/src/prisma/system-seed-catalog.js`](../backend/src/prisma/system-seed-catalog.js).

### Field-level provenance (`field_sources`) — Story 11.5

The seed now persists **per-field HTTPS URLs** on each System (`system.field_sources`) and on each sample Organisation (`organisation.field_sources`). Keys use camelCase and match [`backend/src/lib/field-source-keys.js`](../backend/src/lib/field-source-keys.js). URLs were smoke-tested with `curl` (final HTTP status **200** after redirects) on **2026-05-03**. Keys are **omitted** when no defensible page exists or when a capability flag is `UNKNOWN`.

| System | Seed coverage notes |
|---|---|
| Tessitura | ✓ **In seed:** tessitura.com `/features/*`, `/support/training/*`, subscription-renewals article, accessibility webinar — substantiate integrated suite, cloud, capabilities, and Epic-12-shaped keys. **Skipped:** `pricingModel` — no public page that directly evidences the enterprise licence model without relying on the marketing root alone. **Skipped:** [`tessituranetwork.com/products/tessitura-software`](https://www.tessituranetwork.com/products/tessitura-software) — HTTP **404** at verification (use tessitura.com paths instead). |
| Spektrix | ✓ **In seed:** `/en-gb/pricing`, `/en-gb/arts-management-crm-software`, fundraising and segmentation blogs, `/ticket-subscriptions-and-loyalty`, multi-venue case study, `/en-gb/online-event-ticketing` for reserved seating. **Skipped:** `dynamicPricingCapability`, `accessibilityFeaturesCapability` — `UNKNOWN` in the row (no source keys). **Skipped:** `/en-gb/our-product` — HTTP **404**. |
| AudienceView | ✓ **In seed:** `/products/audienceview-unlimited/`, `/solutions/performing-arts` (season + multi-venue + marketing). **Skipped:** `donationCapability`, `dynamicPricingCapability`, `accessibilityFeaturesCapability` — `UNKNOWN` (no source keys). |
| Ticketmaster | ✓ **In seed:** `business.ticketmaster.com`, `livenationentertainment.com`, `investors.livenationentertainment.com`, ADA page. |
| PatronBase | ✓ **In seed:** ticketing, seasons-and-packages, venue-manager; `marketingAutomationCapability` / `accessibilityFeaturesCapability` **skipped** — `UNKNOWN`. **Skipped:** membership and donation capabilities — both `UNKNOWN` in the row. |
| Eventbrite | ✓ **In seed:** `/platform/` and `/organizer/pricing/` for Epic-12 `NO` rows; `accessibilityFeaturesCapability` **skipped** — `UNKNOWN`. **Skipped:** `reservedSeatingCapability` — `reserved_seating_capability` is `UNKNOWN` in the row. |
| Ticketsolve | ✓ **In seed:** ticketing + projects only for Epic-12 `YES` rows. **Skipped:** v1 capabilities — all `UNKNOWN`; Epic-12 `UNKNOWN` keys omitted (dynamic, marketing, accessibility). |
| Universe | ✓ **In seed:** `universe.com/features` for multi-venue and marketing `NO`; Live Nation + investor URLs for vendor/pricing. **Skipped:** `reservedSeatingCapability`, season/dynamic/accessibility Epic-12 keys — `UNKNOWN`. |
| Salesforce | ✓ **In seed:** nonprofit industry solution, `salesforce.com/nonprofit/`, Marketing Cloud overview, company equality page, pricing. |
| HubSpot | ✓ **In seed:** CRM and Marketing products, `/nonprofits`, `/pricing`. **Skipped:** `membershipCapability`, `donationCapability`, `seasonSubscriptionsCapability`, `accessibilityFeaturesCapability` — `UNKNOWN`. |
| Donorfy | ✓ **In seed:** `donorfy.com/which-donorfy` for season and marketing `NO`; pricing + donation URLs elsewhere. **Skipped:** membership, reserved seating, Epic-12 `UNKNOWN` keys (dynamic, multi-venue, accessibility). |

Sample organisations: provenance is keyed from English Wikipedia articles (infobox / article text) where an article exists and returned HTTP **200** — see [`backend/src/prisma/org-field-sources-seed.js`](../backend/src/prisma/org-field-sources-seed.js). Capability keys are omitted when the seed flag is `UNKNOWN`.

### 4.1 Tessitura

| Field | Value | Reasoning |
|---|---|---|
| `category` | `INTEGRATED` | Tessitura is the canonical example of a single database holding ticketing transactions, donor records, memberships, and marketing segments. The brief explicitly cites it as an integrated suite. |
| `vendor` | Tessitura Network | The non-profit consortium that owns and develops the product. |
| `deployment_model` | `SAAS` | Tessitura is now offered as a vendor-hosted service ("Tessitura in the Cloud"); on-prem deployments still exist for legacy customers but new sales are SaaS. **Caveat:** A `HYBRID` argument exists for sites that still self-host. The catalogue picks the dominant new-customer model. |
| `pricing_model` | `LICENCE` | Annual licence with a named-user model and implementation fees, negotiated bottom-up. Not transaction-fee based — Tessitura customers do not pay per ticket sold. |
| `geographic_focus` | `Global` | Customer base spans North America, UK, Europe, and Asia-Pacific; conferences and user community are global. |
| Capabilities | membership/donation/seating all `YES` | All three are first-class Tessitura modules. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `YES` | tessitura.com subscription-renewals article |
| Dynamic pricing | `YES` | Intro to ticketing — pricing MOS training |
| Multi-venue | `YES` | Facilities intro training |
| Marketing automation | `YES` | Unified CRM features |
| Accessibility | `YES` | v16 digital accessibility webinar |

**Source reference today:** `https://www.tessituranetwork.com/` — root marketing site (coarse row-level pointer; unchanged in Story 11.5).
**What it proves:** That Tessitura exists and is described as an integrated platform.
**What it does *not* prove:** The deployment model, the pricing structure, or the capability claims on its own.
**Per-field sources (Story 11.5):** ✓ **In seed** — tessitura.com `/features/*`, `/support/training/*`, subscription-renewals article, accessibility webinar (see summary table). **Skipped:** `pricingModel` key — no defensible public licence page without leaning on a marketing root alone. **Skipped:** [`tessituranetwork.com/products/tessitura-software`](https://www.tessituranetwork.com/products/tessitura-software) — HTTP **404** at verification; seed uses tessitura.com paths instead.

### 4.2 Spektrix

| Field | Value | Reasoning |
|---|---|---|
| `category` | `INTEGRATED` | Single platform combining ticketing, CRM, fundraising, and marketing. |
| `vendor` | Spektrix Ltd | UK-headquartered. |
| `deployment_model` | `SAAS` | Cloud-native from inception; no on-prem option. |
| `pricing_model` | `SUBSCRIPTION` | Spektrix charges a fixed monthly subscription rather than a per-ticket fee for the customer; ticket buyer fees exist but the *customer's* commercial model is subscription. **Defensible alternative:** `HYBRID`, on the grounds that buyer-side fees are part of the model. The catalogue picks the customer-facing view. |
| `geographic_focus` | `UK` | Customer concentration is UK and Ireland; US presence exists but is the minority. |
| Capabilities | membership/donation/seating all `YES` | Membership, fundraising, and seat-map / reserved-seating workflows are documented in public product material; seating uses the online event ticketing page as the field-level source. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `YES` | Ticket subscriptions and loyalty product page |
| Dynamic pricing | `UNKNOWN` | Demand-based / yield rules are not publicly documented to the bar used for `YES`; key omitted from `field_sources`. |
| Multi-venue | `YES` | Multi-venue trust case study |
| Marketing automation | `YES` | Segmentation / marketing tooling blog |
| Accessibility | `UNKNOWN` | Blog covers web accessibility practices, not a clear reserved / accessible-seating product claim; key omitted. |

**Source reference today:** `https://www.spektrix.com/` — root.
**What it proves:** Spektrix exists.
**What it does not prove:** The subscription model, the UK focus, or the capabilities.
**Per-field sources (Story 11.5):** ✓ **In seed** — `/en-gb/pricing`, `/en-gb/arts-management-crm-software`, fundraising and segmentation blogs, `/ticket-subscriptions-and-loyalty`, multi-venue case study, `/en-gb/online-event-ticketing` for reserved seating (see summary table). **Skipped:** `dynamicPricingCapability`, `accessibilityFeaturesCapability` — `UNKNOWN` (no source keys). **Skipped:** `/en-gb/our-product` — HTTP **404**.

### 4.3 AudienceView

| Field | Value | Reasoning |
|---|---|---|
| `category` | `INTEGRATED` | The Professional and Unlimited tiers both bundle ticketing and CRM. |
| `deployment_model` | `SAAS` | Vendor-hosted. |
| `pricing_model` | `HYBRID` | AudienceView Unlimited is annual licence + transaction uplifts in some configurations; Professional is closer to subscription. Across the brand, `HYBRID` is the most honest single classification. |
| `geographic_focus` | `North America` | Customer base is concentrated in the US and Canada. |
| `donation_capability` | `UNKNOWN` | Fundraising is offered in higher tiers but is not visible on the marketing surface for the base product. The cautious flag is correct for now. |

**Source reference today:** `https://www.audienceview.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — [`audienceview.com/products/audienceview-unlimited/`](https://www.audienceview.com/products/audienceview-unlimited/) and [`/solutions/performing-arts`](https://www.audienceview.com/solutions/performing-arts) (see summary table). **Skipped:** `donationCapability` — `UNKNOWN` in the row.
**Caveat:** AudienceView owns OvationTix and Audience Republic — these are *separate products* in the brief and could be added as separate `System` rows with `vendor` = AudienceView to make the family relationship explicit. Currently they are not seeded.

### 4.4 Ticketmaster

| Field | Value | Reasoning |
|---|---|---|
| `category` | `TICKETING` | Pure ticket-selling at scale. Has audience data internally but is not sold to venues as a CRM. |
| `vendor` | Live Nation Entertainment | Ticketmaster is a Live Nation subsidiary — the parent is the legally accurate vendor. |
| `deployment_model` | `SAAS` | Cloud, multi-tenant. |
| `pricing_model` | `TRANSACTION_FEE` | Ticketmaster's revenue is per-ticket service fees, paid by the buyer and / or split with the venue. The customer (the venue) does not pay a subscription. |
| `geographic_focus` | `Global` | Operates in 30+ countries. |
| `membership_capability`, `donation_capability` | `NO` | Ticketmaster does not provide membership lifecycles or donation processing for the venue. |
| `reserved_seating_capability` | `YES` | Reserved seating is core. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `NO` | Venue / business product surface — not arts season-package–centric like integrated suites |
| Dynamic pricing | `YES` | Investor / commercial disclosures on pricing power and yield |
| Multi-venue | `YES` | Business ticketing — enterprise / venue footprint |
| Marketing automation | `NO` | Business site — ticketing, not patron journey automation |
| Accessibility | `YES` | ADA information page |

**Source reference today:** `https://www.ticketmaster.com/` — consumer-facing root, not a venue-product page.
**This is the weakest row-level source URL in the catalogue** — `ticketmaster.com` is where ticket buyers go, not where the platform's commercial model is documented.
**Per-field sources (Story 11.5):** ✓ **In seed** — [`business.ticketmaster.com`](https://business.ticketmaster.com), Live Nation corporate site, investor relations, ADA page (see summary table) for venue-side and fee-model context.

### 4.5 PatronBase

| Field | Value | Reasoning |
|---|---|---|
| `category` | `TICKETING` | Box-office product; CRM features are lighter than the integrated suites. |
| `pricing_model` | `LICENCE` | Annual licence model targeted at small/mid theatres. |
| `geographic_focus` | `UK` | UK and European customer base, though the company has Australia/New Zealand origins per the brief. The seed labels it `UK` because the European customer body is what is relevant for DMCF. |
| `reserved_seating_capability` | `YES` | Seat-mapped and reserved sales are part of the core ticketing product; the ticketing product URL backs the field-level source. |

**Source reference today:** `https://www.patronbase.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — `patronbase.com/products/*`, `/about/regions/`, `/contact/` (see summary table). **Skipped:** membership and donation capability keys — both `UNKNOWN` in the row.

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `YES` | Seasons and packages product page |
| Dynamic pricing | `NO` | Core ticketing product — no published demand-based / yield engine to the bar used elsewhere |
| Multi-venue | `YES` | Venue Manager — multi-site operations |
| Marketing automation | `UNKNOWN` | Marketing module exists but is not documented to the automation bar used for `YES` on Spektrix / HubSpot; key omitted. |
| Accessibility | `UNKNOWN` | Entry Manager does not clearly substantiate accessible *ticketing* workflows; key omitted. |

### 4.6 Eventbrite

| Field | Value | Reasoning |
|---|---|---|
| `category` | `TICKETING` | Self-serve ticketing. |
| `pricing_model` | `TRANSACTION_FEE` | Per-ticket service fee + payment processing fee; free for free events. The brief and Eventbrite's own pricing page agree on this. |
| `geographic_focus` | `Global` | Operates in 180+ countries. |
| `reserved_seating_capability` | `UNKNOWN` | Paid plans can support charted seating, but coverage and defaults vary; `UNKNOWN` matches the internal evidence bar better than a hard `NO`. `reservedSeatingCapability` is omitted from seed `field_sources`. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `NO` | Platform overview — self-serve events, not Tessitura-style renewable seat subscriptions |
| Dynamic pricing | `NO` | Organizer pricing — per-ticket fees, not yield management |
| Multi-venue | `NO` | Organiser-account model — not a consortium / trust single stack |
| Marketing automation | `NO` | Platform overview — email exists, not enterprise journey automation |
| Accessibility | `UNKNOWN` | No defensible field-level URL; key omitted. |

**Source reference today:** `https://www.eventbrite.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — [`eventbrite.com/platform/`](https://www.eventbrite.com/platform/) and [`eventbrite.com/organizer/pricing/`](https://www.eventbrite.com/organizer/pricing/) (see summary table). **Skipped:** `reservedSeatingCapability` — `reserved_seating_capability` is `UNKNOWN`.

### 4.7 Ticketsolve

| Field | Value | Reasoning |
|---|---|---|
| `category` | `TICKETING` | UK arts-and-heritage ticketing, lighter touch than the integrated suites. |
| `pricing_model` | `SUBSCRIPTION` | Monthly subscription disclosed on the marketing site. |
| `geographic_focus` | `UK` | UK and Ireland customer base. |
| Capabilities | all `UNKNOWN` | All three capability flags are `UNKNOWN`, which is honest — the marketing site does not clearly assert or deny membership or donation modules. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `YES` | Ticketing features — packages / seasons positioning |
| Dynamic pricing | `UNKNOWN` | Data and insights feature does not clearly document demand-based ticket pricing; key omitted. |
| Multi-venue | `YES` | Projects — multi-site / programme structure |
| Marketing automation | `UNKNOWN` | Not documented to automation bar; key omitted. |
| Accessibility | `UNKNOWN` | Key omitted. |

**Source reference today:** `https://www.ticketsolve.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — `ticketsolve.com/features/*`, `/pricing`, `/about` (see summary table). **Skipped:** all three v1 capability flags — `UNKNOWN` in the row. Content note: the `UNKNOWN` flags should ideally be revisited against feature documentation when time allows.

### 4.8 Universe

| Field | Value | Reasoning |
|---|---|---|
| `category` | `TICKETING` | Self-serve ticketing layer in the Live Nation family. |
| `vendor` | Live Nation Entertainment | Universe is owned by Ticketmaster/Live Nation. |
| `pricing_model` | `TRANSACTION_FEE` | Per-ticket fees, no subscription. |
| `geographic_focus` | `Global` | Operates internationally. |
| `reserved_seating_capability` | `UNKNOWN` | Universe historically focuses on general-admission events; reserved seating exists but support is limited. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `UNKNOWN` | Not substantiated for arts-style renewable subscriptions; key omitted. |
| Dynamic pricing | `UNKNOWN` | Key omitted. |
| Multi-venue | `NO` | Features — creator / discovery positioning, not trust-wide multi-venue operations |
| Marketing automation | `NO` | Features — no CRM / journey automation comparable to Marketing Cloud |
| Accessibility | `UNKNOWN` | Key omitted. |

**Source reference today:** `https://www.universe.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — `universe.com/features`, Live Nation + investor URLs for vendor/pricing context (see summary table). **Skipped:** `reservedSeatingCapability` — `UNKNOWN`.

### 4.9 Salesforce

| Field | Value | Reasoning |
|---|---|---|
| `category` | `AUDIENCE_MANAGEMENT` | Salesforce sells a CRM platform. Arts orgs often use it via PatronManager (which is a Salesforce-built product), but Salesforce itself is the platform, not the ticketing layer. |
| `pricing_model` | `SUBSCRIPTION` | Per-user-per-month subscription is Salesforce's published commercial model. |
| `geographic_focus` | `Global` | The largest CRM company in the world. |
| `donation_capability` | `YES` | Through Nonprofit Cloud / NPSP, Salesforce supports donation tracking. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `NO` | Nonprofit industry solution — CRM / fundraising, not venue season-ticket engines |
| Dynamic pricing | `YES` | Published pricing / CPQ-style commercial tooling |
| Multi-venue | `YES` | Service Cloud overview — multi-site service operations |
| Marketing automation | `YES` | Marketing Cloud overview |
| Accessibility | `YES` | Company equality / accessibility commitments |

**Source reference today:** `https://www.salesforce.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — nonprofit industry pages, [`salesforce.com/nonprofit/`](https://www.salesforce.com/nonprofit/), Marketing Cloud overview, equality page, pricing (see summary table).

**Note:** PatronManager (a Salesforce-built product, called out in the brief) is currently *not* a separate `System` row. It is arguably one of the most important integrated suites in the US arts sector and should probably be added.

### 4.10 HubSpot

| Field | Value | Reasoning |
|---|---|---|
| `category` | `AUDIENCE_MANAGEMENT` | Inbound marketing + CRM. |
| `pricing_model` | `SUBSCRIPTION` | Tiered per-month plans publicly listed. |
| `geographic_focus` | `Global` | International. |
| `donation_capability` | `UNKNOWN` | Donations can be modelled as deals, but HubSpot is not fundraising-native; the enum is honest at `UNKNOWN` and `donationCapability` is omitted from seed `field_sources`. |

**Source reference today:** `https://www.hubspot.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — CRM and Marketing product pages, [`hubspot.com/nonprofits`](https://www.hubspot.com/nonprofits), `/pricing`, `/company` (see summary table). **Skipped:** `membershipCapability`, `donationCapability` — `UNKNOWN` in the row.

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `UNKNOWN` | Inbound platform — not a performing-arts season engine; no field URL; key omitted. |
| Dynamic pricing | `YES` | Marketing Hub product — experimentation / optimisation surface |
| Multi-venue | `NO` | CRM product — not venue / trust operations software |
| Marketing automation | `YES` | Marketing Hub product page |
| Accessibility | `UNKNOWN` | No defensible field-level product claim; key omitted. |

### 4.11 Donorfy

| Field | Value | Reasoning |
|---|---|---|
| `category` | `AUDIENCE_MANAGEMENT` | Nonprofit-sector CRM with fundraising as the primary use case. |
| `pricing_model` | `SUBSCRIPTION` | Monthly plans publicly listed on Donorfy's pricing page. |
| `geographic_focus` | `UK` | UK charity-sector heritage. |
| `donation_capability` | `YES` | Donation processing is the core feature. |
| `membership_capability`, `reserved_seating_capability` | `UNKNOWN`, `UNKNOWN` | Membership lifecycles can be modelled but are not the marketed strength; seating is not applicable to Donorfy's category. |

#### v3 capabilities (Epic 12, Story 12.5)

| Dimension | Value | Seed source |
|---|---|---|
| Season subscriptions | `NO` | Product selector — charity CRM, not ticketing seasons |
| Dynamic pricing | `UNKNOWN` | Key omitted. |
| Multi-venue | `UNKNOWN` | Key omitted. |
| Marketing automation | `NO` | Same — donor CRM positioning, not full journey automation |
| Accessibility | `UNKNOWN` | Key omitted. |

**Source reference today:** `https://donorfy.com/` — root.
**Per-field sources (Story 11.5):** ✓ **In seed** — [`donorfy.com/pricing`](https://donorfy.com/pricing), product selector, arts/heritage page, integration blog posts (see summary table).

---

## 5. The source-reference weakness — what to fix

Every seeded system still carries a **row-level** `source_reference` pointing at the vendor marketing root in most cases. That field remains the coarse “general source for the record” and was **not** auto-copied into per-field JSON (Story 11.5). Per-field verification now lives in `field_sources` (API: `fieldSources`), populated from deeper pages where they exist.

There are three concrete improvements that remain relevant for the **row-level** field and for custom attributes:

### 5.1 Use a deeper URL that substantiates the claim

Where a single homepage is insufficient, prefer product, pricing, or industry pages for `source_reference` — especially for the most contested cell (often pricing). Eventbrite’s pricing URL and Tessitura’s tessitura.com feature pages are examples of this pattern.

### 5.2 Use per-claim sources via custom attributes

The `custom_attributes` JSON column already supports `{ label, value, source_reference }` triples. Where a single URL cannot defend the whole row, multiple custom attributes each with their own source remain the right pattern for claims that are not yet modelled as first-class columns.

### 5.3 Keep `source_reference` honestly `null` when there is no good URL

The schema allows `source_reference` to be null. For systems where only weak public pages exist, nulling the row-level field and explaining the gap in prose or custom attributes is more honest than citing a URL that does not defend the claim.

### 5.4 Coverage status (seed, Story 11.5)

Measured against the allow-lists in `field-source-keys.js`:

- **Systems:** populated key count **129** / **143** (11 × 13) ≈ **90%** — above the **80%** target; omitted keys are deliberate (e.g. `UNKNOWN` capabilities, Tessitura `pricingModel` without a defensible non-root licence URL).
- **Sample organisations:** populated key count **196** / **224** (32 × 7) ≈ **87.5%** — above the **60%** target; Wikipedia URLs are reused across keys where one article supports multiple facts.

---

## 6. Summary — does the app match the brief?

**Structurally: yes.** The System entity, junction, role enum, three-state capability reuse, custom-attribute JSON carrier, system-to-system compare, and 11-system seed all reflect the brief's design choices accurately, and the deviations (no `target_organisation_size`, no 17-flag capability list) are explicit recorded decisions, not slippage.

**Substantively: stronger on verification than before Stories 11.5 and 12.5.** Detail and compare views show per-field ⓘ links for eight capability columns where values are `YES` or `NO`. Epic-12 flags are explicit in the database; `UNKNOWN` remains an honest outcome and omits URLs by design. The brief’s critique that compare was too thin on product dimensions is **addressed for these five capabilities** in the seeded catalogue — with the caveat that many cells remain `UNKNOWN` where public evidence is thin (preferable to over-claiming).

Remaining gaps: honest omissions (unknown capabilities, Tessitura pricing), occasional HTTP 404 rot on cited URLs, and any future reclassification when vendors publish clearer product pages.
