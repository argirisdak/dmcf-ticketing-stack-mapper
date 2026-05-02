import { cn } from '../lib/utils.js'

/** @param {{ gridColumn: number, className?: string, children: import('react').ReactNode } & import('react').ComponentProps<'div'>} props */
export function CompareColumnShell({ gridColumn, className, children, ...rest }) {
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
