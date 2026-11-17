import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

type Tone = 'acid' | 'outline' | 'ember' | 'muted' | 'solid'

const tones: Record<Tone, string> = {
  acid: 'border-acid-400/40 bg-acid-400/10 text-acid-300',
  outline: 'border-line-strong bg-transparent text-ash',
  ember: 'border-ember-500/40 bg-ember-500/10 text-ember-400',
  muted: 'border-line bg-ink-800 text-ash',
  solid: 'border-transparent bg-acid-400 text-ink-950',
}

export function Badge({
  children,
  tone = 'outline',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.1em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
