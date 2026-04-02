import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      /** UX-DR12: distinct muted hues for lookup labels at table density */
      tone: {
        type: 'border-violet-200 bg-violet-50 text-violet-800',
        ticketing: 'border-sky-200 bg-sky-50 text-sky-800',
        crm: 'border-amber-200 bg-amber-50 text-amber-900',
        default: 'border-slate-200 bg-slate-100 text-slate-700',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  }
)

function Badge({ className, tone, ...props }) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge }
