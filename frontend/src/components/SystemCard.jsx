import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SystemNotFoundError } from '../api/systems.js'
import { CapabilityBadge } from './CapabilityBadge.jsx'
import { CompareColumnShell } from './CompareColumnShell.jsx'
import { SourceReferenceDisplay } from './SourceReferenceDisplay.jsx'
import { Button } from './ui/button.jsx'
import { formatLastUpdated, isHttpOrHttpsUrl } from '../lib/format-and-url-helpers.js'
import { pickFieldSourceUrl, systemCompareRowFieldSourceKey } from '../lib/field-source-keys.js'
import {
  SYSTEM_COMPARE_CAPABILITY_BLOCK_START_ROW,
  SYSTEM_COMPARE_STATIC_PREFIX_ROW_COUNT,
  buildSystemCompareRowLabels,
  findCustomAttributeByLabel,
  systemCompareSectionDividerRowIndexes,
} from '../lib/system-compare-union-labels.js'
import FieldSourceIcon from './FieldSourceIcon.jsx'
import { cn } from '../lib/utils.js'
import { CAPABILITY_ROWS } from '../lib/system-capabilities.js'

const ATTR_ROW_CLASS = 'flex min-h-0 items-center px-4 py-3 text-sm'

const CATEGORY_CONFIG = {
  INTEGRATED: { label: 'Integrated', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  TICKETING: { label: 'Ticketing', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  AUDIENCE_MANAGEMENT: {
    label: 'Audience management',
    cls: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
}

function SystemCategoryBadge({ category }) {
  const { label, cls } = CATEGORY_CONFIG[category] ?? {
    label: category != null && category !== '' ? String(category) : '—',
    cls: 'bg-slate-50 text-slate-700 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function scalarCompareCell(value) {
  if (value == null || value === '') {
    return <span className="text-slate-300">—</span>
  }
  return <span className="text-slate-800">{String(value)}</span>
}

/** Match `CustomAttributesPanel` / `displayText` on `SystemDetailPage.jsx` (no URL links on values). */
function customAttributeDisplayText(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

function CustomAttributeCompareCell({ attr }) {
  if (!attr) {
    return <span className="text-slate-300">—</span>
  }
  const rawVal = attr.value
  const source = attr.sourceReference
  const valueShown = customAttributeDisplayText(rawVal)

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <div className="min-w-0">
        {valueShown === '—' ? (
          <span className="text-slate-300">—</span>
        ) : (
          <span className="text-slate-800 break-words">{valueShown}</span>
        )}
      </div>
      {source != null && String(source).trim() !== '' ? (
        <div className="min-w-0 text-xs text-slate-600">
          {isHttpOrHttpsUrl(String(source)) ? (
            <a
              href={String(source)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {String(source)}
            </a>
          ) : (
            <span className="break-all">{String(source)}</span>
          )}
        </div>
      ) : null}
    </div>
  )
}

function DescriptionCompareCell({ text }) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || expanded) return
    const ro = new ResizeObserver(() => {
      setHasOverflow(el.scrollHeight > el.clientHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, expanded])

  if (text == null || String(text).trim() === '') {
    return <span className="text-slate-300">—</span>
  }

  const s = String(text)
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <div
        ref={contentRef}
        className={cn(
          'min-w-0 text-sm text-slate-800 whitespace-pre-wrap',
          !expanded && 'line-clamp-4',
        )}
      >
        {s}
      </div>
      {(expanded || hasOverflow) ? (
        <button
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   compareGridColumn?: number
 *   unionCustomAttributeLabels: string[]
 * }} props
 */
function SystemCardSkeleton({ compareGridColumn, unionCustomAttributeLabels }) {
  const rowKeys = buildSystemCompareRowLabels(unionCustomAttributeLabels)
  const inner = (
    <>
      <div className="sticky top-0 z-10 space-y-3 border-b bg-white p-4 shadow-sm">
        <div className="h-6 w-3/4 rounded bg-slate-200" />
        <div className="h-5 w-24 rounded-md bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-100" />
        <div className="flex justify-end gap-2 pt-1">
          <div className="h-4 w-10 rounded bg-slate-200" />
          <div className="h-9 w-9 rounded-md bg-slate-100" />
        </div>
      </div>
      {rowKeys.map((label, i) => (
        <div
          key={`${i}-${label}`}
          className={`${ATTR_ROW_CLASS} border-b border-slate-100 last:border-b-0`}
        >
          <div className="h-4 w-full max-w-[10rem] rounded bg-slate-100" />
        </div>
      ))}
    </>
  )

  if (compareGridColumn != null) {
    return (
      <CompareColumnShell gridColumn={compareGridColumn} className="animate-pulse" aria-hidden>
        {inner}
      </CompareColumnShell>
    )
  }

  return (
    <div
      className="flex w-72 shrink-0 animate-pulse flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      aria-hidden
    >
      {inner}
    </div>
  )
}

/**
 * @param {{
 *   systemId: string
 *   query: import('@tanstack/react-query').UseQueryResult<unknown, Error>
 *   onRemove: () => void
 *   compareGridColumn?: number
 *   unionCustomAttributeLabels: string[]
 * }} props
 */
export function SystemCard({ systemId, query, onRemove, compareGridColumn, unionCustomAttributeLabels }) {
  const { isPending, isError, error, data: envelope, isSuccess } = query
  const rowKeys = buildSystemCompareRowLabels(unionCustomAttributeLabels)
  const bodyRows = rowKeys.length
  const sectionDividers = useMemo(
    () => systemCompareSectionDividerRowIndexes(unionCustomAttributeLabels.length),
    [unionCustomAttributeLabels.length],
  )
  const lastRowIndex = bodyRows - 1
  const bodyRowClass = (rowIndex) =>
    cn(
      ATTR_ROW_CLASS,
      'border-b border-slate-100',
      rowIndex === lastRowIndex && 'last:border-b-0',
      sectionDividers.has(rowIndex) && 'border-t border-slate-200',
    )

  if (isPending) {
    return (
      <SystemCardSkeleton compareGridColumn={compareGridColumn} unionCustomAttributeLabels={unionCustomAttributeLabels} />
    )
  }

  const notFound = isError && error instanceof SystemNotFoundError

  const placeholderRows = rowKeys.map((label, i) => (
    <div
      key={`ph-${i}-${label}`}
      className={`${ATTR_ROW_CLASS} border-b border-slate-100 bg-slate-50/40 last:border-b-0`}
    />
  ))

  if (notFound) {
    const inner = (
      <>
        <div className="sticky top-0 z-10 space-y-3 border-b bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">This system could not be found</p>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
        {placeholderRows}
      </>
    )

    if (compareGridColumn != null) {
      return <CompareColumnShell gridColumn={compareGridColumn}>{inner}</CompareColumnShell>
    }
    return (
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {inner}
      </div>
    )
  }

  if (isError) {
    const inner = (
      <>
        <div className="sticky top-0 z-10 space-y-3 border-b border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-800" role="alert">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
        {rowKeys.map((label, i) => (
          <div
            key={`err-${i}-${label}`}
            className={`${ATTR_ROW_CLASS} border-b border-red-100 bg-red-50 last:border-b-0`}
          />
        ))}
      </>
    )

    if (compareGridColumn != null) {
      return (
        <CompareColumnShell
          gridColumn={compareGridColumn}
          className="border-red-200 bg-red-50 shadow-sm"
        >
          {inner}
        </CompareColumnShell>
      )
    }
    return (
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-red-200 bg-red-50 shadow-sm">
        {inner}
      </div>
    )
  }

  const sys =
    isSuccess &&
    envelope != null &&
    typeof envelope === 'object' &&
    /** @type {{ data?: unknown }} */ (envelope).data != null &&
    typeof /** @type {{ data?: unknown }} */ (envelope).data === 'object'
      ? /** @type {Record<string, unknown>} */ (
          /** @type {{ data: unknown }} */ (envelope).data
        )
      : null

  if (!sys) {
    const inner = (
      <>
        <div className="sticky top-0 z-10 space-y-3 border-b border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-800" role="alert">
            System data could not be displayed
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
        {rowKeys.map((label, i) => (
          <div
            key={`nodata-${i}-${label}`}
            className={`${ATTR_ROW_CLASS} border-b border-red-100 bg-red-50 last:border-b-0`}
          />
        ))}
      </>
    )
    if (compareGridColumn != null) {
      return (
        <CompareColumnShell
          gridColumn={compareGridColumn}
          className="border-red-200 bg-red-50 shadow-sm"
        >
          {inner}
        </CompareColumnShell>
      )
    }
    return (
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-red-200 bg-red-50 shadow-sm">
        {inner}
      </div>
    )
  }

  const orgs = Array.isArray(sys.organisations) ? sys.organisations : []
  const adoptionCount = orgs.length

  const attrs = Array.isArray(sys.customAttributes) ? sys.customAttributes : []
  const capabilityBlockStartRow = SYSTEM_COMPARE_CAPABILITY_BLOCK_START_ROW
  const descriptionRowIndex = capabilityBlockStartRow + CAPABILITY_ROWS.length
  const sourceReferenceRowIndex = descriptionRowIndex + 1
  const lastUpdatedRowIndex = descriptionRowIndex + 2
  const unionStartRow = SYSTEM_COMPARE_STATIC_PREFIX_ROW_COUNT + 2
  const L = unionCustomAttributeLabels.length
  const fieldSources = sys.fieldSources

  /**
   * @param {number} rowIndex
   * @param {string} fieldLabel
   * @param {import('react').ReactNode} node
   */
  const cellWithFieldSource = (rowIndex, fieldLabel, node) => {
    const k = systemCompareRowFieldSourceKey(rowIndex, L)
    const showIcon = compareGridColumn != null && k
    return (
      <div className={bodyRowClass(rowIndex)}>
        <span className="inline-flex min-w-0 items-center gap-1">
          {node}
          {showIcon ? (
            <>
              {/* Per-field source only; compare grid only — matches OrganisationCard compare variant (Story 11.3). */}
              <FieldSourceIcon url={pickFieldSourceUrl(fieldSources, k)} fieldLabel={fieldLabel} />
            </>
          ) : null}
        </span>
      </div>
    )
  }

  const inner = (
    <>
      <div className="sticky top-0 z-10 space-y-2 border-b bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {sys.name != null && String(sys.name).trim() !== '' ? (
            String(sys.name)
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </h2>
        <SystemCategoryBadge category={sys.category} />
        <p className="text-sm text-slate-500">
          {sys.vendor != null && String(sys.vendor).trim() !== '' ? (
            String(sys.vendor)
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Link
            to={`/systems/${encodeURIComponent(systemId)}/edit`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-slate-600"
            aria-label="Remove from compare"
            onClick={onRemove}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {cellWithFieldSource(0, 'Name', scalarCompareCell(sys.name))}
      {cellWithFieldSource(1, 'Vendor', scalarCompareCell(sys.vendor))}
      {cellWithFieldSource(2, 'Category', <SystemCategoryBadge category={sys.category} />)}
      {cellWithFieldSource(3, 'Deployment model', scalarCompareCell(sys.deploymentModel))}
      {cellWithFieldSource(4, 'Pricing model', scalarCompareCell(sys.pricingModel))}
      {cellWithFieldSource(
        5,
        'Geographic focus',
        Array.isArray(sys.geographicFocus) && sys.geographicFocus.length > 0 ? (
          <span className="text-slate-800">{sys.geographicFocus.join(', ')}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
      )}
      {CAPABILITY_ROWS.map(({ key: capKey, label, ticketingOnly }, i) => (
        <Fragment key={capKey}>
          {ticketingOnly && sys.category === 'AUDIENCE_MANAGEMENT' ? (
            <div className={bodyRowClass(capabilityBlockStartRow + i)}>
              <span className="text-xs text-slate-400 italic">N/A</span>
            </div>
          ) : (
            cellWithFieldSource(
              capabilityBlockStartRow + i,
              label,
              <CapabilityBadge variant="labelled" value={sys[capKey]} />,
            )
          )}
        </Fragment>
      ))}
      {cellWithFieldSource(descriptionRowIndex, 'Description', <DescriptionCompareCell text={sys.description} />)}

      <div className={bodyRowClass(sourceReferenceRowIndex)}>
        <SourceReferenceDisplay value={sys.sourceReference} emptyLabel="None recorded" />
      </div>
      <div className={bodyRowClass(lastUpdatedRowIndex)}>
        <span className="text-xs text-slate-500">{formatLastUpdated(sys.lastUpdated)}</span>
      </div>

      {unionCustomAttributeLabels.map((label, i) => (
        <div key={label} className={bodyRowClass(unionStartRow + i)}>
          <CustomAttributeCompareCell attr={findCustomAttributeByLabel(attrs, label)} />
        </div>
      ))}

      <div className={bodyRowClass(unionStartRow + L)}>
        {adoptionCount > 0 ? (
          <Link
            to={`/systems/${encodeURIComponent(systemId)}`}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {adoptionCount === 1
              ? 'Adopted by 1 organisation'
              : `Adopted by ${adoptionCount} organisations`}
          </Link>
        ) : (
          <span className="text-sm text-slate-500">Not yet adopted</span>
        )}
      </div>
    </>
  )

  if (compareGridColumn != null) {
    return <CompareColumnShell gridColumn={compareGridColumn}>{inner}</CompareColumnShell>
  }

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {inner}
    </div>
  )
}
