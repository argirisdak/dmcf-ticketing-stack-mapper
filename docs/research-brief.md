# Ticketing and Audience-Management Systems — Research Brief

**Purpose:** This document supports the rework of the DMCF Ticketing Stack Mapper. It defines what a ticketing/audience-management system is, what attributes are used to compare them in real-world cultural-sector procurement and research, and which systems should be in the catalogue.

---

## 1\. What we're actually comparing

### 1.1 Two adjacent system categories — often blurred

Cultural organisations typically use one or both of:

- **Ticketing systems** — manage inventory, seat selection, pricing, transactions, and ticket delivery. Examples: Ticketmaster, See Tickets, ThunderTix.  
- **Audience-management systems (sector-specific CRMs)** — manage patron records, donor relationships, membership lifecycles, segmentation, and marketing. Examples: PatronManager, Donorfy.

A meaningful subset of platforms — **Tessitura, Spektrix, AudienceView, PatronManager, Theatre Manager** — combine both into a single integrated suite. This is the dominant pattern in the performing arts sector because patron data, ticketing transactions, and donor records are deeply interrelated.

For our app, the pragmatic decision is to model these as a **single entity called `System`** with a `category` attribute (`ticketing`, `audience_management`, or `integrated`). Treating them as two separate entities would force false splits on platforms like Tessitura, which legitimately do both.

### 1.2 Why this matters for the comparison

The comparison view should answer questions like:

- "What are the differences between Tessitura and Spektrix for a mid-sized opera house?"  
- "Which integrated systems support both ticketing and CRM, and how do they differ on pricing model?"  
- "Which systems offer a dedicated fundraising module versus relying on Salesforce?"

These are **system-to-system** comparisons, contextualised by **organisation size and type**. The organisation catalogue you've already built becomes the evidence layer — showing which real organisations adopt each system and at what scale.

---

## 2\. Core comparison attributes

These are the attributes consistently used in real-world procurement evaluations across the sources I reviewed. They form the **universal core** of the data model.

### 2.1 Identity and category

| Attribute | Type | Notes |
| :---- | :---- | :---- |
| `name` | text | e.g. "Tessitura", "Spektrix" |
| `vendor` | text | The company behind it (some systems share vendors via acquisition) |
| `category` | enum | `ticketing`, `audience_management`, `integrated` |
| `vendor_country` | text | Affects support hours, regulatory alignment |
| `year_founded` | integer | Maturity signal |
| `description` | text | One-paragraph summary |

### 2.2 Deployment and pricing model

| Attribute | Type | Notes |
| :---- | :---- | :---- |
| `deployment_model` | enum | `cloud`, `on_premise`, `hybrid` |
| `pricing_model` | enum | `per_ticket`, `subscription`, `transaction_fee`, `custom_quote`, `hybrid` |
| `pricing_transparency` | enum | `public`, `quote_required`, `tiered_public` |
| `entry_price_indication` | text | e.g. "Custom quote, typically $5,000+/month" — qualitative because real prices are negotiated |
| `nonprofit_pricing` | enum | `yes`, `no`, `unknown` |
| `donation_fees_charged` | enum | `yes`, `no`, `unknown` — relevant for nonprofits where donation revenue matters |

### 2.3 Target market

| Attribute | Type | Notes |
| :---- | :---- | :---- |
| `target_organisation_size` | enum | `small`, `medium`, `large`, `enterprise`, `multi_size` |
| `target_organisation_types` | array of text | e.g. `["theatre", "opera", "museum", "festival"]` |
| `geographic_focus` | array of text | e.g. `["UK", "US", "Canada", "EU"]` |

### 2.4 Core capabilities (boolean flags)

These are the binary "does it do this?" capabilities. Use the same three-state model your app already uses (`YES` / `NO` / `UNKNOWN`):

| Capability | Notes |
| :---- | :---- |
| `ticketing` | Sells and delivers tickets |
| `reserved_seating` | Seat-by-seat selection with seat maps |
| `general_admission` | Non-seated event handling |
| `season_subscriptions` | Renewable seated subscription packages (critical for arts) |
| `dynamic_pricing` | Demand-based price adjustment |
| `crm_database` | Centralised patron records |
| `membership_management` | Membership tiers, renewals, benefits |
| `fundraising_donations` | Donation processing and donor records |
| `email_marketing` | Native email campaign tools |
| `marketing_automation` | Triggered/segmented campaigns |
| `audience_segmentation` | Behavioural and demographic segmentation |
| `reporting_analytics` | Built-in reporting and dashboards |
| `mobile_app_or_wallet` | Apple/Google Wallet, mobile scan |
| `api_access` | Public or partner API for integrations |
| `sso_support` | Single sign-on for member-only website content |
| `multi_venue_support` | Single deployment serving multiple venues |
| `accessibility_features` | Accessible seating workflows, wheelchair bookings |

### 2.5 Integration ecosystem

| Attribute | Type | Notes |
| :---- | :---- | :---- |
| `integration_partners` | array of text | e.g. `["Wordfly", "Dotdigital", "Mailchimp"]` |
| `built_on_platform` | text or null | e.g. PatronManager is built on Salesforce; relevant for customisation/cost analysis |

### 2.6 Source and freshness (already in your model)

| Attribute | Type | Notes |
| :---- | :---- | :---- |
| `source_reference` | text | URL or citation |
| `last_updated` | timestamp | Auto-managed — keep your existing pattern |

### 2.7 Custom attributes — the flexible layer

To handle system-specific traits that don't fit the universal core (your instinct here was correct), add:

| Attribute | Type | Notes |
| :---- | :---- | :---- |
| `custom_attributes` | JSON object (key-value pairs) | Free-form. Each entry is `{ "label": "...", "value": "...", "source_reference": "..." }` |

Examples of legitimate custom attributes:

- Tessitura's "v16 upgrade required by December 2027"  
- Spektrix's "B Corp certified"  
- AudienceView's "owns Audience Republic marketing platform"  
- PatronManager's "built on Salesforce Lightning"

The user adds these manually when they encounter a distinguishing trait that doesn't fit the universal core. Comparing custom attributes across systems is straightforward in the UI: show all custom labels found across the selected systems, render values where present, "Not recorded" where absent.

---

## 3\. Recommended system catalogue (seed data)

Based on the research, these are the systems most relevant to DMCF's likely scope. Seed at least these to make the comparison feature meaningful from day one.

### Integrated systems (ticketing \+ CRM combined)

| Name | Vendor | Category | Target size | Notes |
| :---- | :---- | :---- | :---- | :---- |
| **Tessitura** | Tessitura Network | integrated | medium-large | Industry standard for major performing arts venues. Custom pricing. |
| **Spektrix** | Spektrix Ltd | integrated | medium-large | UK-origin, B Corp, strong website integration focus. |
| **AudienceView Professional** | AudienceView (incl. Audience Republic) | integrated | small-medium | All-in-one for performing arts. |
| **AudienceView Unlimited** | AudienceView | integrated | large-enterprise | Multi-venue, advanced automation tier. |
| **PatronManager** | Leap Event Technology | integrated | small-medium | Built on Salesforce. |
| **Theatre Manager** | Arts Management Systems | integrated | small-medium | Long-established theatre-specific suite. |
| **OvationTix** | AudienceView (acquired) | integrated | small-medium | Affordable nonprofit tier. |
| **Blackbaud Altru** | Blackbaud | integrated | medium | CRM-led with ticketing; museum-leaning. |

### Ticketing-only systems

| Name | Vendor | Target size | Notes |
| :---- | :---- | :---- | :---- |
| **Ticketmaster** | Live Nation | enterprise | Dominant in commercial/large venue space. |
| **See Tickets** | CTS Eventim | medium-large | UK and EU presence. |
| **Eventbrite** | Eventbrite | small-medium | Mass-market self-service. |
| **ThunderTix** | ThunderTix | small-medium | Reserved seating focused, theatre-friendly. |
| **TicketSolve** | TicketSolve | small-medium | UK arts and heritage. |
| **Universe** | Live Nation | small | Self-serve general events. |
| **PatronBase** | PatronBase | small-medium | Australia/NZ origin, arts focus. |
| **Ludus** | Ludus | small | Built for K-12/community theatre. |

### CRM / audience-management only

| Name | Vendor | Notes |
| :---- | :---- | :---- |
| **Salesforce** | Salesforce | Platform; arts orgs use it via PatronManager or custom builds. |
| **HubSpot** | HubSpot | Cross-industry CRM, used by some venues for marketing only. |
| **Donorfy** | Donorfy | UK nonprofit-focused fundraising CRM. |
| **Wordfly** | Wordfly | Arts-specific email marketing, integrates with Tessitura/Spektrix. |
| **Dotdigital** | Dotdigital | Marketing automation, ticketing system integrations. |

You don't need all 21 in the seed for MVP. **A pragmatic minimum is 8-10 systems** covering at least 3 integrated, 3 ticketing-only, and 2 CRM-only. The rest can be added by users.

---

## 4\. Proposed data model changes

### 4.1 New entity: `System`

System

\- id (UUID)

\- name (string, required, unique)

\- vendor (string, required)

\- category (enum: ticketing | audience\_management | integrated)

\- vendor\_country (string, optional)

\- year\_founded (int, optional)

\- description (text, optional)

\- deployment\_model (enum: cloud | on\_premise | hybrid)

\- pricing\_model (enum)

\- pricing\_transparency (enum)

\- entry\_price\_indication (text, optional)

\- nonprofit\_pricing (capability\_state)

\- donation\_fees\_charged (capability\_state)

\- target\_organisation\_size (enum: small | medium | large | enterprise | multi\_size)

\- target\_organisation\_types (text\[\] — array of strings)

\- geographic\_focus (text\[\])

\- integration\_partners (text\[\])

\- built\_on\_platform (string, optional)

\- capabilities (JSON or relation to capability table)

  \- reserved\_seating, season\_subscriptions, dynamic\_pricing, crm\_database, etc.

\- custom\_attributes (JSON: array of { label, value, source\_reference })

\- source\_reference (text)

\- last\_updated (timestamp, auto-managed)

\- created\_at (timestamp)

### 4.2 Relationship to existing `Organisation` entity

Replace the current `ticketing_provider_id` and `crm_platform_id` foreign keys on `Organisation` with a richer linking table:

OrganisationSystem (junction)

\- organisation\_id (FK)

\- system\_id (FK)

\- role (enum: primary\_ticketing | primary\_crm | integrated\_suite | secondary)

\- notes (text, optional)

\- source\_reference (text, optional)

\- last\_updated (timestamp)

This lets a single organisation be linked to multiple systems with explicit roles — for example, an organisation might use Tessitura as their integrated suite plus Wordfly for email marketing.

### 4.3 What stays exactly as it is

- The entire `Organisation` entity, minus the two FKs that move to the junction table  
- The `OrganisationType` lookup  
- Source tracking pattern (one source field per record)  
- Last-updated auto-management  
- Three-state capability model — reused for system capabilities

### 4.4 What gets removed

- `TicketingProvider` lookup table — replaced by the richer `System` entity  
- `CrmPlatform` lookup table — replaced by the richer `System` entity

The seed data migration converts existing `TicketingProvider` and `CrmPlatform` rows into `System` rows with appropriate categories.

**IMPORTANT NOTE**: The `source_reference` field on both `System` and `Organisation` records means: the URL or citation that justifies the research claim — where did we find this information? It is not a generic homepage link.

---

## 5\. Comparison feature — UX direction

The compare page now has two modes:

**Mode A — System-to-system comparison.** User selects 2-4 systems from a system list page. The compare view shows them side-by-side with all universal core attributes aligned, plus a "Custom attributes" section showing any custom labels found across the selected systems.

**Mode B — System comparison filtered by organisation context.** User filters organisations (e.g. UK opera houses, mid-sized venues) and the compare view shows the systems used by those organisations, ranked by adoption count, with the same attribute comparison.

Mode A is the simpler MVP feature. Mode B is the more sophisticated "what do organisations like ours actually use?" view — implement it second.