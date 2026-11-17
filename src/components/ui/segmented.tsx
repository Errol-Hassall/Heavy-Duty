import { cn } from '#/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = 'md',
}: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-lg border border-line bg-ink-900 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md font-semibold uppercase tracking-[0.08em] transition-colors',
              size === 'sm'
                ? 'px-2.5 py-1 text-[10px]'
                : 'px-3 py-1.5 text-[11px]',
              active
                ? 'bg-ink-600 text-chalk shadow-sm'
                : 'text-smoke hover:text-ash',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
