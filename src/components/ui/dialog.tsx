import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-ink-850 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6',
          sizes[size],
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="dialog-title"
              className="font-display text-lg uppercase leading-tight tracking-tight text-chalk"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-ash">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md p-2 text-smoke transition-colors hover:bg-ink-700 hover:text-chalk"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  busy?: boolean
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-ash transition-colors hover:bg-ink-700 hover:text-chalk"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg border border-ember-500/40 bg-ember-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-ember-400 transition-colors hover:bg-ember-500/20 disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    />
  )
}
