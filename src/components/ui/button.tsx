import type { ButtonHTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'acid-ghost'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary:
    'bg-acid-400 text-ink-950 hover:bg-acid-300 active:bg-acid-500 shadow-[0_0_0_1px_rgba(207,247,90,0.25)]',
  secondary:
    'border border-line-strong bg-ink-800 text-chalk hover:border-ash/50 hover:bg-ink-700',
  ghost: 'text-ash hover:text-chalk hover:bg-ink-700',
  danger:
    'border border-ember-500/40 text-ember-400 hover:bg-ember-500/10 hover:border-ember-500/60',
  'acid-ghost':
    'border border-acid-400/35 text-acid-300 hover:bg-acid-400/10 hover:border-acid-400/60',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[11px]',
  md: 'h-10 px-4 text-xs',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-11 w-11',
  'icon-sm': 'h-9 w-9',
}

export function buttonClass(
  variant: Variant = 'secondary',
  size: Size = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-lg font-semibold uppercase tracking-[0.08em] transition-colors disabled:pointer-events-none disabled:opacity-40',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  )
}
