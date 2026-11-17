import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '#/lib/utils'

const controlClass =
  'w-full rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-base text-chalk placeholder:text-smoke transition-colors hover:border-line-strong focus:border-acid-400/70 focus:outline-none focus:ring-2 focus:ring-acid-400/15 disabled:opacity-50'

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClass, 'min-h-20 resize-y leading-relaxed', className)}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(controlClass, 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke"
      />
    </div>
  )
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ash',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string | null
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-ember-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-smoke">{hint}</p>
      ) : null}
    </div>
  )
}
