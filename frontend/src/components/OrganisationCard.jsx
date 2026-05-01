import { Ticket, Users, Layers, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from './ui/badge.jsx'
import { Button } from './ui/button.jsx'
import { CapabilityBadge } from './CapabilityBadge.jsx'
import { SourceReferenceDisplay } from './SourceReferenceDisplay.jsx'
import { OrganisationNotFoundError } from '../api/organisations.js'
import { cn } from '../lib/utils.js'

const ATTR_ROW_CLASS = 'flex min-h-0 items-center px-4 py-3 text-sm'

const ROLE_ICON_MAP = {
  PRIMARY_TICKETING: Ticket,
  PRIMARY_CRM: Users,
  INTEGRATED_SUITE: Layers,
  SECONDARY: Link2,
}

const ROLE_LABELS = {
  PRIMARY_TICKETING: 'Primary ticketing',
  PRIMARY_CRM: 'Primary CRM',
  INTEGRATED_SUITE: 'Integrated suite',
  SECONDARY: 'Secondary',
}

const CATEGORY_CONFIG = {
  INTEGRATED: 'bg-blue-50 text-blue-700 border border-blue-200',
  TICKETING: 'bg-amber-50 text-amber-700 border border-amber-200',
  AUDIENCE_MANAGEMENT: 'bg-purple-50 text-purple-700 border border-purple-200',
}

/** @param {{ id?: unknown, name?: unknown, category?: unknown } | null | undefined} system */
function linkedSystemPresentation(system) {
  const rawName =
    system != null && system.name != null && String(system.name).trim() !== ''
      ? String(system.name).trim()
      : null
  const name = rawName ?? 'Unnamed system'
  let id = null
  if (system != null && system.id != null) {
    const s = String(system.id).trim()
    if (s !== '') id = s
  }
  const href = id !== null ? `/systems/${encodeURIComponent(id)}` : null
  return { name, href, category: system?.category }
}

function SystemsChipStrip({ systems }) {
  if (!systems || systems.length === 0) {
    return <span className="text-xs text-slate-400 italic">No systems linked</span>
  }
  const visible = systems.slice(0, 3)
  const overflow = systems.length - 3
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((link) => {
        const Icon = ROLE_ICON_MAP[link.role] ?? Link2
        const { name } = linkedSystemPresentation(link.system)
        return (
          <span
            key={link.id}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
          >
            <Icon size={11} aria-hidden />
            {name}
          </span>
        )
      })}
      {overflow > 0 && <span className="text-xs text-slate-400">+{overflow} more</span>}
    </div>
  )
}

function SystemsCompareList({ systems }) {
  if (!systems || systems.length === 0) {
    return <span className="text-xs text-slate-400 italic">No systems linked</span>
  }
  return (
    <div className="flex flex-col gap-1.5">
      {systems.map((link) => {
        const { href, name, category } = linkedSystemPresentation(link.system)
        const catCls =
          CATEGORY_CONFIG[category] ?? 'bg-slate-50 text-slate-700 border border-slate-200'
        const roleLabel = ROLE_LABELS[link.role] ?? link.role
        return (
          <div key={link.id} className="flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${catCls}`}>
              {roleLabel}
            </span>
            {href !== null ? (
              <Link to={href} className="text-blue-600 hover:text-blue-800">
                {name}
              </Link>
            ) : (
              <span className="text-slate-600">{name}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** @param {{ gridColumn: number, className?: string, children: import('react').ReactNode } & import('react').ComponentProps<'div'>} props */
function CompareColumnShell({ gridColumn, className, children, ...rest }) {
  return (
    <div
      className={cn(
        'row-span-full grid min-w-0 grid-rows-subgrid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
      style={{ gridColumn }}
      {...rest}
    >
      {children}
    </div>
  )
}

function formatCompareDateTime(iso) {
  if (iso == null || iso === '') return 'Not recorded'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return 'Not recorded'
  }
}

function textCell(value) {
  if (value == null || value === '') {
    return <span className="text-slate-500">Not recorded</span>
  }
  return <span className="text-slate-800">{String(value)}</span>
}

/**
 * @param {{ compareGridColumn?: number }} props
 */
function OrganisationCardSkeleton({ compareGridColumn }) {
  const inner = (
    <>
      <div className="sticky top-0 z-10 space-y-3 border-b bg-white p-4 shadow-sm">
        <div className="h-6 w-3/4 rounded bg-slate-200" />
        <div className="h-5 w-20 rounded-md bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-100" />
        <div className="flex gap-2 pt-1">
          <div className="h-9 w-16 rounded-md bg-slate-200" />
          <div className="h-9 w-20 rounded-md bg-slate-100" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`${ATTR_ROW_CLASS} border-b border-slate-100 last:border-b-0`}>
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
 *   organisationId: string
 *   query: import('@tanstack/react-query').UseQueryResult<unknown, Error>
 *   onRemove: () => void
 *   compareGridColumn?: number
 * }} props
 */
export function OrganisationCard({ organisationId, query, onRemove, compareGridColumn, variant = 'summary' }) {
  const { isPending, isError, error, data, isSuccess } = query

  if (isPending) {
    return <OrganisationCardSkeleton compareGridColumn={compareGridColumn} />
  }

  const notFound = isError && error instanceof OrganisationNotFoundError

  if (notFound) {
    const inner = (
      <>
        <div className="sticky top-0 z-10 space-y-3 border-b bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">This organisation could not be found</p>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`${ATTR_ROW_CLASS} border-b border-slate-100 bg-slate-50/40 last:border-b-0`}
          />
        ))}
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
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
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

  if (!isSuccess) {
    return null
  }

  const org = /** @type {Record<string, unknown>} */ (
    data != null && typeof data === 'object' ? data : {}
  )
  const typeName =
    org.organisationType && typeof org.organisationType === 'object' && org.organisationType !== null
      ? /** @type {{ name?: string }} */ (org.organisationType).name
      : undefined
  const systems = Array.isArray(org.systems) ? org.systems : []

  const headerCountry =
    org.country != null && org.country !== '' ? String(org.country) : 'Not recorded'

  const inner = (
    <>
      <div className="sticky top-0 z-10 space-y-2 border-b bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {org.name != null && org.name !== '' ? String(org.name) : 'Not recorded'}
        </h2>
        {typeName != null && String(typeName).trim() !== '' ? (
          <Badge tone="type">{String(typeName)}</Badge>
        ) : (
          <Badge tone="default">Not recorded</Badge>
        )}
        <p className="text-sm text-slate-600">{headerCountry}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary" size="sm">
            <Link to={`/organisations/${encodeURIComponent(organisationId)}/edit`}>Edit</Link>
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>{textCell(org.country)}</div>
      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
        {typeName != null && String(typeName).trim() !== '' ? (
          <Badge tone="type">{String(typeName)}</Badge>
        ) : (
          textCell(null)
        )}
      </div>
      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
        {variant === 'compare'
          ? <SystemsCompareList systems={systems} />
          : <SystemsChipStrip systems={systems} />
        }
      </div>
      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
        <CapabilityBadge variant="labelled" value={org.membershipCapability} />
      </div>
      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
        <CapabilityBadge variant="labelled" value={org.donationCapability} />
      </div>
      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
        <CapabilityBadge variant="labelled" value={org.reservedSeatingCapability} />
      </div>
      <div className={`${ATTR_ROW_CLASS} border-b border-slate-100`}>
        <SourceReferenceDisplay value={org.sourceReference} />
      </div>
      <div className={ATTR_ROW_CLASS}>
        <span className="text-slate-800">{formatCompareDateTime(org.lastUpdated)}</span>
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
