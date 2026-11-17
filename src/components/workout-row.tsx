import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { formatDayParts, relativeDate } from '#/lib/dates'
import { MUSCLE_LABELS } from '#/lib/labels'
import type { WorkoutListItem } from '#/lib/types'
import { cn } from '#/lib/utils'

export function WorkoutRow({
  workout,
  className,
}: {
  workout: WorkoutListItem
  className?: string
}) {
  const parts = formatDayParts(workout.date)
  const isInProgress = workout.status === 'in_progress'

  return (
    <Link
      to="/workouts/$workoutId"
      params={{ workoutId: String(workout.id) }}
      className={cn(
        'group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-ink-800/70 sm:px-5',
        className,
      )}
    >
      <div className="flex w-10 shrink-0 flex-col items-center rounded-md border border-line bg-ink-900 py-1.5">
        <span className="font-mono text-base font-semibold leading-none text-chalk">
          {parts.day}
        </span>
        <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-smoke">
          {parts.month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-chalk">
            {workout.title}
          </span>
          {isInProgress ? <Badge tone="acid">In progress</Badge> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-smoke">
          <span>{relativeDate(workout.date)}</span>
          <span aria-hidden>·</span>
          <span>
            {workout.exerciseCount}{' '}
            {workout.exerciseCount === 1 ? 'exercise' : 'exercises'}
          </span>
          <span aria-hidden>·</span>
          <span>
            {workout.workingSetCount}{' '}
            {workout.workingSetCount === 1 ? 'working set' : 'working sets'}
          </span>
        </div>
        {workout.muscleGroups.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1 sm:hidden">
            {workout.muscleGroups.slice(0, 4).map((group) => (
              <span
                key={group}
                className="rounded bg-ink-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ash"
              >
                {MUSCLE_LABELS[group]}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden shrink-0 gap-1 sm:flex">
        {workout.muscleGroups.slice(0, 3).map((group) => (
          <span
            key={group}
            className="rounded bg-ink-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ash"
          >
            {MUSCLE_LABELS[group]}
          </span>
        ))}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-smoke transition-transform group-hover:translate-x-0.5 group-hover:text-ash" />
    </Link>
  )
}
