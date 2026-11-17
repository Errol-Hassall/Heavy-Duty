import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-acid-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[30px] uppercase leading-[0.95] tracking-tight text-chalk sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 text-sm leading-relaxed text-ash">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-900/40 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-ink-800 text-smoke">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-base uppercase tracking-tight text-chalk">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ash">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
