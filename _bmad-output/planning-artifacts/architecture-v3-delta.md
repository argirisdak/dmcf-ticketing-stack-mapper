---
parent: architecture.md
created: 2026-05-03
author: Winston (System Architect, BMad)
trigger: PRD v3 delta — per-data-point provenance, capability expansion, custom-attribute editor, list sorting, duplicate guard
inputDocuments:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/architecture-v2-delta.md
  - _bmad-output/planning-artifacts/prd-v3-delta.md
  - backend/src/prisma/schema.prisma
  - backend/src/prisma/seed.js
documentType: architecture-delta
---

# Architecture v3 — Delta Document

**Scope:** This is a *delta*, not a rewrite. It lists, section-by-section, what changes in [architecture.md](architecture.md) and [architecture-v2-delta.md](architecture-v2-delta.md) and what stays. Anything not mentioned here is unchanged. Patterns, naming conventions, response envelopes, frontend state-management rules, deployment posture, and all v1/v2 anti-patterns hold without modification.

**Source of the change:** [prd-v3-delta.md](prd-v3-delta.md) §3, §4, §5.

---

## 1. Headline architectural impact

| Area | Direction of change |
|---|---|
| **Data model** | Add `field_sources Json?` to `System` and `Organisation`. Add five new `CapabilityState` columns to `System`. Add composite unique constraint `@@unique([name, city, country])` to `Organisation`. No new tables, no new enums. |
| **API surface** | `POST` and `PUT` for both entities accept `fieldSources` and (System only) the five new capability fields. List endpoints accept `?sort=` and `?order=`. New `GET /api/organisations/check-similar?name=` reuses the existing trigram search. `POST /api/systems` and `PUT /api/systems/:id` accept `customAttributes` as a full editable array. |
| **Frontend** | Per-field source ⓘ icons on detail and compare pages. Source URL inputs alongside each main input on the System and Organisation forms. New custom-attribute editor row component on `SystemFormPage`. New sort dropdown on both list pages. New fuzzy-match warning panel on `OrganisationFormPage` (create only). |
| **Migration risk** | Three additive Prisma migrations: (a) `field_sources` columns, (b) capability columns, (c) Organisation composite uniqueness. Each is independently revertible. None requires backfill. The composite-unique migration must verify no existing rows collide before applying. |

---

## 2. Data model changes

### 2.1 `System` — new fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `field_sources` | `Json?` | no | Shape: `{ "<fieldName>": "<url>" }`. See §2.4 for the allow-list. |
| `season_subscriptions_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |
| `dynamic_pricing_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |
| `multi_venue_support_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |
| `marketing_automation_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |
| `accessibility_features_capability` | `CapabilityState` | yes | `@default(UNKNOWN)`. |

All other fields on `System` are unchanged. The existing row-level `source_reference` stays — it now means "general source for the record" and does **not** auto-substitute into per-field claims.

### 2.2 `Organisation` — new field and constraint

| Change | Notes |
|---|---|
| Add `field_sources Json?` | Shape and semantics identical to System. |
| Add `@@unique([name, city, country])` | Composite uniqueness. PostgreSQL treats `NULL city` as distinct (two `(X, NULL, UK)` rows do **not** collide); this is intended — see [prd-v3-delta.md §8 Q5](prd-v3-delta.md). |

All other fields on `Organisation` are unchanged.

### 2.3 No new entities, no new enums

The existing `CapabilityState` enum is reused for the five new capability flags. `field_sources` deliberately uses JSON instead of a side table — same rationale as ADR-019 for `custom_attributes`.

### 2.4 `field_sources` allow-list

Keys are validated at the API layer against a per-entity allow-list. The allow-list lives next to the DTO, so any DTO field rename is a single-file change.

**System allow-list (13 keys):**

```js
const SYSTEM_FIELD_SOURCE_KEYS = Object.freeze([
  'category',
  'vendor',
  'deploymentModel',
  'pricingModel',
  'geographicFocus',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'seasonSubscriptionsCapability',
  'dynamicPricingCapability',
  'multiVenueSupportCapability',
  'marketingAutomationCapability',
  'accessibilityFeaturesCapability',
]);
```

**Organisation allow-list (7 keys):**

```js
const ORGANISATION_FIELD_SOURCE_KEYS = Object.freeze([
  'country',
  'city',
  'organisationType',
  'membershipCapability',
  'donationCapability',
  'reservedSeatingCapability',
  'capacity',
]);
```

Keys not in the allow-list are rejected by the controller with a 400. The `name` field of either entity intentionally has no source key — the name is a label, not a fact requiring evidence.

### 2.5 Custom attributes — no schema change

The `system.custom_attributes Json?` column already exists (ADR-019). The shape `[{ label, value, sourceReference }]` is preserved. The change in v3 is that the API now accepts updates, and the form renders an editor — see §3 and §4.

---

## 3. API surface changes

### 3.1 `POST /api/systems` and `PUT /api/systems/:id` — extended

**New body fields accepted:**

```json
{
  "seasonSubscriptionsCapability": "YES",
  "dynamicPricingCapability": "UNKNOWN",
  "multiVenueSupportCapability": "NO",
  "marketingAutomationCapability": "YES",
  "accessibilityFeaturesCapability": "UNKNOWN",
  "fieldSources": {
    "pricingModel": "https://www.spektrix.com/en-gb/pricing",
    "deploymentModel": "https://www.spektrix.com/en-gb/our-product"
  },
  "customAttributes": [
    { "label": "B Corp certified", "value": "Yes (since 2024)", "sourceReference": "https://..." }
  ]
}
```

**Validation rules (controller, before service):**

| Field | Rule |
|---|---|
| Five new capability fields | Same as existing capability fields — accept lowercase/uppercase, normalise to enum, reject anything else with 400. |
| `fieldSources` | Must be a plain object. Every key must be in `SYSTEM_FIELD_SOURCE_KEYS`. Every value must match `^https?://`. Empty object is valid (clears all). |
| `customAttributes` | Must be an array. Each element must be `{ label: string non-empty, value: string non-empty, sourceReference?: string matching ^https?:// }`. Length cap 200 chars per text field. Empty array is valid (clears all). |

`name` change validation gains a uniqueness pre-check (already enforced by ADR-020 unique constraint — controller surfaces 409 on Prisma `P2002` for `name` only).

### 3.2 `POST /api/organisations` and `PUT /api/organisations/:id` — extended

**New body field accepted:**

```json
{
  "fieldSources": {
    "country": "https://www.example-source.org/page",
    "membershipCapability": "https://..."
  }
}
```

Validation parallels §3.1 — keys against `ORGANISATION_FIELD_SOURCE_KEYS`, values URL-validated.

**New error mapping:** Prisma `P2002` on the composite unique `(name, city, country)` maps to **409 Conflict** with envelope:

```json
{
  "data": null,
  "error": {
    "message": "An organisation called \"<name>\" already exists in <city>, <country>.",
    "fields": [
      { "field": "name", "message": "Conflicts with existing organisation in this city and country." }
    ]
  },
  "meta": null
}
```

The error message names the conflict explicitly so the operator can act without re-querying.

### 3.3 List endpoints — sorting

Both `GET /api/organisations` and `GET /api/systems` accept:

| Param | Type | Notes |
|---|---|---|
| `sort` | string | One of the per-entity allow-list (see below). Invalid values → 400. |
| `order` | `asc \| desc` | Default `asc`. Invalid values → 400. |

**Organisation sort allow-list:** `name` (default), `country`, `lastUpdated`, `capacity`, `organisationType`.

**System sort allow-list:** `name` (default), `vendor`, `category`, `lastUpdated`, `geographicFocus`.

Service-layer translation:

```js
// example for Organisation
const ORDER_BY_MAP = {
  name: { name: order },
  country: { country: order },
  lastUpdated: { last_updated: order },
  capacity: { capacity: order },
  organisationType: { organisation_type: { name: order } },
};
```

Sort + filter + search compose by simple Prisma `orderBy` on the existing `findMany` call. Pagination is unaffected.

### 3.4 Detail endpoints — response shape

`GET /api/systems/:id` and `GET /api/organisations/:id` add `fieldSources` to the response (camelCased, mirrors what was sent in). On the System detail, `customAttributes` is unchanged. On both, the row-level `sourceReference` is unchanged.

List endpoints (`GET /api/systems`, `GET /api/organisations`) **also** include `fieldSources` so the list page can pre-populate the ⓘ icons without a refetch — this respects P2.

### 3.5 New — `GET /api/organisations/check-similar`

| Query param | Type | Notes |
|---|---|---|
| `name` | string | Required, min 2 chars. |
| `excludeId` | UUID | Optional. Excludes a specific organisation from results — used by the edit form so a record doesn't flag itself. |

**Response:** `{ data: [{ id, name, city, country }], error: null, meta: null }`.

**Implementation:** Reuses the existing `pg_trgm` GIN index on `organisation.name`. SQL pattern:

```sql
SELECT id, name, city, country FROM organisation
WHERE id <> COALESCE($2, '00000000-0000-0000-0000-000000000000')
  AND (name ILIKE $1 || '%' OR name ILIKE '%' || $1 || '%' OR similarity(name, $1) > 0.4)
ORDER BY similarity(name, $1) DESC
LIMIT 5;
```

Threshold `0.4` is a starting value — tuneable. Per [prd-v3-delta.md §8 Q4](prd-v3-delta.md), this delta uses a deterministic substring-OR-trigram rule rather than a strict threshold-only filter.

A brand-new endpoint (rather than overloading `?q=`) keeps the contract narrow — the search endpoint returns full DTOs with all fields and pagination; this endpoint returns a minimal warning-list shape.

### 3.6 Unchanged

- All existing endpoints' contracts beyond the additions above.
- `GET /api/health`, `GET /api/meta/organisation-types`.
- All response-envelope rules (`{ data, error, meta }`).
- All naming, date format, capability-string, and JSON-camelCase rules.
- Per-link `OrganisationSystem` source and note — those are unaffected; field sources sit on the entity rows, link sources on the junction.

---

## 4. Frontend changes

### 4.1 Detail and compare — ⓘ source icons

Both `SystemDetailPage` and `OrganisationDetailPage` add a small ⓘ icon next to each field that has a corresponding key in `fieldSources`. Click opens the URL in a new tab. Hovering shows the URL as a tooltip.

`SystemComparePage` and `ComparePage` (organisations) render the same ⓘ icon next to each field cell when a value is present in that record's `fieldSources` for that key. The icon is column-local — one System having a source for `pricingModel` does not surface an icon on a neighbouring System that lacks one.

**Component:** new `FieldSourceIcon.jsx` in `frontend/src/components/`. Props: `{ url: string | null }`. Returns `null` if `url` is null. Uses the existing Lucide `Info` icon at `text-slate-400 hover:text-blue-600`.

### 4.2 Forms — per-field Source URL inputs

`SystemFormPage` and `OrganisationFormPage` get an inline "Source URL" input next to each field that participates in the allow-list. The form holds a single `fieldSources` state object; on change of `pricingModelSource`, the form sets `fieldSources.pricingModel`. On submit, the entire object is sent in the body.

Layout: source input lives on a second line below its main input, half-width, with placeholder "Source URL (optional)". Validation is client-side `http(s)://` only — server enforces strictly.

**Component:** new `FieldWithSource.jsx` wraps an existing input child and exposes a paired source-URL input. Props: `{ fieldName, label, children, sourceValue, onSourceChange }`.

### 4.3 System form — custom-attribute editor

New section on `SystemFormPage` titled "Custom attributes". A repeating row component:

| Column | Component |
|---|---|
| Label | `<input>` (text, max 200 chars) |
| Value | `<input>` (text, max 200 chars) |
| Source URL | `<input>` (text, max 500 chars, validates `http(s)://` if non-empty) |
| Actions | `<button>` Remove (ghost) |

Below the rows: `+ Add custom attribute` button. Empty rows (label and value both blank) are stripped on submit so a half-typed row doesn't persist as garbage.

**Component:** new `CustomAttributeEditor.jsx`. Props: `{ value: CustomAttribute[], onChange }`.

### 4.4 List pages — sort dropdown

Both `OrganisationListPage` and `SystemListPage` add a sort dropdown to the right of the search box. Options drawn from the per-entity allow-list (§3.3). The sort state lives in the URL via `useSearchParams` — selection updates the URL, `useOrganisations` / `useSystems` hooks pick up the new params and refetch.

When sort changes, the page resets to 1 (`?page=1` written explicitly to the URL).

**Component:** new `SortDropdown.jsx`. Props: `{ options: { value, label }[], sort, order, onChange }`.

### 4.5 Organisation form — fuzzy-match warning

`OrganisationFormPage` (create mode only — not edit) runs an async lookup against `GET /api/organisations/check-similar` when the user blurs the name field with ≥3 characters. If matches return, a non-blocking warning panel appears between the form fields and the submit button:

```
⚠ An organisation with a similar name already exists:
   • Royal Opera House — London, United Kingdom
   • Royal Opera Hse — Manchester, United Kingdom

   Continue creating "<your name>" anyway?
   [Continue] [Cancel and amend]
```

Pressing **Continue** sets a local "user-confirmed-duplicates" flag and submission proceeds. **Cancel and amend** clears the form's name field and refocuses it. The warning re-runs if the name is changed again.

**Component:** new `SimilarOrganisationsWarning.jsx`. Props: `{ matches, currentName, onContinue, onCancel }`.

### 4.6 Hooks and api utilities

| File | Change |
|---|---|
| `frontend/src/api/organisations.js` | Add `checkSimilarOrganisations(name, excludeId?)`. |
| `frontend/src/hooks/useSimilarOrganisations.js` | NEW. Debounced (300ms) lookup hook. |
| `frontend/src/api/systems.js` | Update `createSystem` / `updateSystem` to accept `customAttributes` and `fieldSources` and the five new capability fields. |
| `frontend/src/api/organisations.js` | Update `createOrganisation` / `updateOrganisation` to accept `fieldSources`. |
| `frontend/src/hooks/useOrganisations.js`, `useSystems.js` | Accept `sort` and `order` params; reset to `page=1` on sort change. |

### 4.7 Unchanged

- Routing.
- `OrganisationSelectionProvider` / `SystemSelectionProvider`.
- All `CapabilityBadge`, `ActiveFilterChips`, `CompareSelectionBar`, `OrganisationCard`, `SystemCard` core anatomy. The compare cards gain ⓘ icons via §4.1; nothing else changes.

---

## 5. Project-structure changes

```
backend/src/
  controllers/
    organisation-controller.js          ← updated (fieldSources validation, 409 on composite unique, similar-check handler)
    system-controller.js                ← updated (fieldSources, customAttributes, capability validation)
  services/
    organisation-list-dto.js            ← updated (fieldSources in DTO, sort param translation)
    organisation-service.js             ← updated (sort orderBy, similar-check query)
    system-list-dto.js                  ← updated (fieldSources, capability fields, sort param translation)
    system-service.js                   ← updated (sort orderBy, capability filters)
  lib/
    field-source-keys.js                ← NEW (SYSTEM_FIELD_SOURCE_KEYS, ORGANISATION_FIELD_SOURCE_KEYS)
    sort-allowlists.js                  ← NEW (ORGANISATION_SORT_KEYS, SYSTEM_SORT_KEYS)
  prisma/
    schema.prisma                       ← updated (fieldSources, 5 capability columns, composite unique)
    seed.js                             ← updated (populate field_sources, capability values)
    system-seed-catalog.js              ← updated (capability values + field_sources for 11 systems)
    sample-organisations-seed-data.js   ← updated (field_sources for sample orgs)
    migrations/
      <timestamp>_add_field_sources/migration.sql                ← NEW (additive)
      <timestamp>_add_system_capabilities_v3/migration.sql       ← NEW (additive)
      <timestamp>_organisation_composite_unique/migration.sql    ← NEW (constraint)

frontend/src/
  api/
    organisations.js                    ← updated (fieldSources, checkSimilar)
    systems.js                          ← updated (fieldSources, customAttributes, capabilities)
  components/
    FieldSourceIcon.jsx                 ← NEW
    FieldWithSource.jsx                 ← NEW
    CustomAttributeEditor.jsx           ← NEW
    SortDropdown.jsx                    ← NEW
    SimilarOrganisationsWarning.jsx     ← NEW
  hooks/
    useSimilarOrganisations.js          ← NEW
    useOrganisations.js                 ← updated (sort/order)
    useSystems.js                       ← updated (sort/order)
  pages/
    OrganisationListPage.jsx            ← updated (sort dropdown)
    OrganisationDetailPage.jsx          ← updated (ⓘ icons, fieldSources display)
    OrganisationFormPage.jsx            ← updated (fieldSources inputs, similar-name warning)
    SystemListPage.jsx                  ← updated (sort dropdown, 5 new capability filters under collapsible group)
    SystemDetailPage.jsx                ← updated (ⓘ icons, 5 new capabilities, fieldSources display)
    SystemFormPage.jsx                  ← updated (fieldSources inputs, custom-attribute editor, 5 new capabilities)
    SystemComparePage.jsx               ← updated (ⓘ icons, 5 new capability rows)
    ComparePage.jsx                     ← updated (ⓘ icons on org compare)
```

---

## 6. Migration plan

Three independent additive migrations. Each is generated with `npx prisma migrate dev --create-only`, reviewed, and applied. None requires a backfill step.

### 6.1 Migration A — `add_field_sources`

```prisma
model System {
  // ...existing fields...
  field_sources Json?
}

model Organisation {
  // ...existing fields...
  field_sources Json?
}
```

Generated SQL:

```sql
ALTER TABLE "system" ADD COLUMN "field_sources" JSONB;
ALTER TABLE "organisation" ADD COLUMN "field_sources" JSONB;
```

Existing rows get NULL — UI renders no ⓘ icons until the seed runs (Story 11.5) or users edit records.

### 6.2 Migration B — `add_system_capabilities_v3`

```prisma
model System {
  // ...existing capability fields...
  season_subscriptions_capability   CapabilityState @default(UNKNOWN)
  dynamic_pricing_capability        CapabilityState @default(UNKNOWN)
  multi_venue_support_capability    CapabilityState @default(UNKNOWN)
  marketing_automation_capability   CapabilityState @default(UNKNOWN)
  accessibility_features_capability CapabilityState @default(UNKNOWN)
}
```

Generated SQL:

```sql
ALTER TABLE "system" ADD COLUMN "season_subscriptions_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "system" ADD COLUMN "dynamic_pricing_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "system" ADD COLUMN "multi_venue_support_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "system" ADD COLUMN "marketing_automation_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "system" ADD COLUMN "accessibility_features_capability" "CapabilityState" NOT NULL DEFAULT 'UNKNOWN';
```

Existing rows get `UNKNOWN` — the honest default until Story 12.5 populates them.

### 6.3 Migration C — `organisation_composite_unique`

```prisma
model Organisation {
  // ...existing fields and constraints...
  @@unique([name, city, country])
}
```

Generated SQL:

```sql
CREATE UNIQUE INDEX "organisation_name_city_country_key" ON "organisation"("name", "city", "country");
```

**Pre-flight check** (Story 15.1 task): run the following before applying, to surface any existing collisions:

```sql
SELECT name, city, country, count(*) AS c
FROM organisation
GROUP BY name, city, country
HAVING count(*) > 1;
```

Expected result: zero rows. If any rows return, resolve manually before applying — the migration will fail otherwise.

### 6.4 Order of application

A → B → C, but they are independent and the order is for human review convenience. Each can be deployed separately.

### 6.5 Rollback strategy

All three migrations are reversible by `DROP COLUMN` / `DROP INDEX` SQL. None destroys data that wasn't user-input. Migration C may require deduplicating before re-applying if rolled back after data has been entered.

---

## 7. Frontend state and rendering rules

### 7.1 ⓘ icon — visibility rule

Rendered if and only if `record.fieldSources?.[fieldName]` is a non-empty string. No fallback to the row-level source — that would mislead readers into thinking a generic URL backs a specific claim. See [system-catalogue-rationale.md §5](../../docs/system-catalogue-rationale.md).

### 7.2 Sort state — URL contract

`?sort=<field>&order=<asc|desc>&page=<n>`. When sort changes, the hook explicitly writes `page=1` to the URL. The dropdown reads from `useSearchParams`; no separate React state.

### 7.3 Custom-attribute form state

The editor holds a local array. Each row has a local `_key` (UUID) for React's `key=` to keep input focus stable across reorders or removals. On submit, `_key` is stripped and rows where `label.trim() === '' && value.trim() === ''` are filtered out.

### 7.4 Similar-name warning — UX rules

- Triggers on blur of the name field, only in create mode.
- Triggers only if name length ≥3.
- Debounced 300ms.
- Warning panel renders `aria-live="polite"` so screen readers announce it without stealing focus.
- "Continue" sets a `userAcknowledgedDuplicates` flag in form state — does not bypass server-side composite uniqueness, which still returns 409 if `(name, city, country)` actually collides.
- The 409 from server is surfaced as an inline error on the name field — different from the warning, because at that point the user has *committed* a duplicate that the DB also rejects.

---

## 8. New decisions for `docs/decisions.md`

The following ADRs are added when the v3 work begins. The full text of each lives in `docs/decisions.md`; this delta records the **what** and **why** in one line each:

| ADR | Subject | One-line rationale |
|---|---|---|
| **ADR-025** | `field_sources` JSON column on System and Organisation | Same JSON-column reasoning as ADR-019; sources travel with the row, scales free with new fields, no join, render is trivial. |
| **ADR-026** | Organisation composite uniqueness `(name, city, country)` + UX warning | Hard `UNIQUE(name)` blocks legitimate "Theatre Royal" reuse across cities; composite uniqueness + fuzzy-match warning gives soft + hard guard. |
| **ADR-027** | System capability column set scope | Bar for promotion to a column is "defensibly fillable on at least 8 of 11 systems with a public source URL"; everything else is custom attributes. |
| **ADR-028** | List sort query-param contract | `?sort=<field>&order=<asc\|desc>` with per-entity allow-list; aligns with existing query-param shape; rejects unknown sorts with 400. |
| **ADR-029** | Custom-attribute editor — JSON column reused | Same column as ADR-019, no schema change; the editor only exercises previously dormant JSON write paths. |

---

## 9. Risk register

| Risk | Mitigation |
|---|---|
| Allow-list drift between DTO field names and source key names | Co-locate the constant in `lib/field-source-keys.js` and import in both controller and DTO; lint test asserts every DTO field with `_capability` suffix has a corresponding allow-list entry. |
| ⓘ icon visual clutter on detail pages | Single icon style (`text-slate-400 size-3.5`); no badges, no counters; users can still scan the page without parsing icons. Re-evaluate after first review. |
| URL validation false positives | Client-side: warn on missing scheme. Server-side: regex `^https?://`. Reject `javascript:` and `data:` schemes implicitly. |
| Sort + filter + search Prisma `orderBy` regressions | Add one integration test per entity covering `sort + filter + search + pagination` together. |
| Composite uniqueness migration fails on existing data | Pre-flight check in Story 15.1. Production deploy gated on the pre-flight returning zero rows. |
| Fuzzy-match endpoint becomes a hot path | Limit to 5 results, leverage existing `pg_trgm` index (no new index needed), debounce 300ms client-side, no per-keystroke calls. |
| Custom-attribute editor produces dirty data (whitespace-only labels) | `.trim()` on submit; rows with empty trimmed label OR value are filtered out. |
| Field source URL rot | Out of scope for v3. Future "broken link audit" feature is the natural follow-up — that's the ADR-025 trade-off acknowledged upfront. |

---

## 10. What stays untouched

- All v1 / v2 entities, junction, enums, indexes (other than the additions above).
- Compare semantics, cardinality, route shape.
- Selection contexts.
- Auth posture (none — internal trusted-network).
- Docker Compose layout.
- Express 5 / Prisma 6 / Tailwind v3 / shadcn copy-paste patterns.
- The three-migration discipline from ADR-015 — *but only because v3's migrations are purely additive*. Any future schema change that moves data still follows ADR-015's additive → backfill → destructive sequence.
