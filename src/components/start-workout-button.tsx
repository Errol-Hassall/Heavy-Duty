import { useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { buttonClass } from '#/components/ui/button'
import { createWorkoutFn } from '#/server/api'
import { todayISO } from '#/lib/dates'
import { cn } from '#/lib/utils'
import type { WorkoutStatus } from '#/lib/types'

interface StartWorkoutButtonProps {
  templateSlug: string | null
  date?: string
  status?: WorkoutStatus
  title?: string
  label?: string
  variant?: 'primary' | 'secondary' | 'acid-ghost'
  size?: 'md' | 'lg'
  block?: boolean
  className?: string
}

export function StartWorkoutButton({
  templateSlug,
  date,
  status,
  title,
  label = 'Start session',
  variant = 'primary',
  size = 'lg',
  block = false,
  className,
}: StartWorkoutButtonProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    const sessionDate = date ?? todayISO()
    try {
      const workoutId = await createWorkoutFn({
        data: {
          date: sessionDate,
          status:
            status ?? (sessionDate < todayISO() ? 'completed' : 'in_progress'),
          templateSlug,
          title,
        },
      })
      await router.invalidate()
      await navigate({
        to: '/workouts/$workoutId',
        params: { workoutId: String(workoutId) },
      })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not start the workout.',
      )
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', block && 'w-full')}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={buttonClass(variant, size, cn(block && 'w-full', className))}
      >
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : null}
        {busy ? 'Starting…' : label}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-ember-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}
