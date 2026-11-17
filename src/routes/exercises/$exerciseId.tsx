import { useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  notFound,
} from '@tanstack/react-router'
import { ArrowLeft, ChartLine } from 'lucide-react'
import { PageHeader } from '#/components/ui/page-header'
import { Card, SectionLabel } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Segmented } from '#/components/ui/segmented'
import { buttonClass } from '#/components/ui/button'
import {
  ExerciseTrend,
  ExerciseTrendStats,
} from '#/components/exercise-trend'
import { getExerciseProgressFn } from '#/server/api'
import {
  addDaysISO,
  formatDate,
  relativeDate,
  todayISO,
} from '#/lib/dates'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '#/lib/labels'
import { useUnit } from '#/lib/preferences'
import { formatWeight } from '#/lib/units'
import type { WorkoutSet } from '#/lib/types'

export const Route = createFileRoute('/exercises/$exerciseId')({
  loader: async ({ params }) => {
    const id = Number(params.exerciseId)
    if (!Number.isInteger(id) || id <= 0) throw notFound()
    const progress = await getExerciseProgressFn({ data: { id } })
    if (!progress) throw notFound()
    return progress
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.exercise.name} — Heavy Duty`
          : 'Exercise — Heavy Duty',
      },
    ],
  }),
  component: ExercisePage,
})

type Range = '3m' | '6m' | '1y' | 'all'

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = {
  '3m': 90,
  '6m': 180,
  '1y': 365,
}

function ExercisePage() {
  const progress = Route.useLoaderData()
  const unit = useUnit()
  const [range, setRange] = useState<Range>('all')

  const cutoff =
    range === 'all' ? null : addDaysISO(todayISO(), -RANGE_DAYS[range])
  const sessions = useMemo(
    () =>
      cutoff
        ? progress.sessions.filter((session) => session.date >= cutoff)
        : progress.sessions,
    [progress.sessions, cutoff],
  )

  const history = useMemo(() => [...sessions].reverse(), [sessions])

  return (
    <div>
      <Link
        to="/exercises"
        className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-smoke transition-colors hover:text-chalk"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Exercise library
      </Link>

      <PageHeader
        eyebrow={MUSCLE_LABELS[progress.exercise.muscleGroup]}
        title={progress.exercise.name}
        description={
          progress.exercise.notes ??
          `${EQUIPMENT_LABELS[progress.exercise.equipment]} · ${
            progress.sessions.length
          } logged ${progress.sessions.length === 1 ? 'session' : 'sessions'}`
        }
        actions={
          progress.exercise.isCustom ? (
            <Badge tone="outline">Custom movement</Badge>
          ) : null
        }
      />

      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            <div>
              <SectionLabel>Strength over time</SectionLabel>
              <p className="mt-1 text-[11px] text-smoke">
                Working-set load per session. Numbers show reps — hover or tap
                a point for details.
              </p>
            </div>
            <Segmented
              ariaLabel="Chart range"
              value={range}
              onChange={setRange}
              options={[
                { value: '3m', label: '3M' },
                { value: '6m', label: '6M' },
                { value: '1y', label: '1Y' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
          <div className="px-2 pb-2 pt-1 sm:px-3">
            {progress.sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <ChartLine className="mb-3 h-5 w-5 text-smoke" />
                <p className="text-sm text-ash">
                  No completed working sets logged yet.
                </p>
                <p className="mt-1 max-w-xs text-xs text-smoke">
                  Finish a session with this exercise to start the trend line.
                </p>
                <Link
                  to="/workouts/new"
                  className={buttonClass('secondary', 'sm', 'mt-4')}
                >
                  Start a workout
                </Link>
              </div>
            ) : (
              <ExerciseTrend
                sessions={sessions}
                unit={unit}
                emptyMessage="No sessions in this range."
              />
            )}
          </div>
          <ExerciseTrendStats sessions={progress.sessions} unit={unit} />
        </Card>

        {progress.sessions.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-5">
              <div>
                <SectionLabel>History</SectionLabel>
                <h2 className="mt-1 font-display text-lg uppercase tracking-tight">
                  Session log
                </h2>
              </div>
              <span className="font-mono text-[10px] text-smoke">
                {history.length} shown
              </span>
            </div>

            {history.length === 0 ? (
              <p className="border-t border-line px-5 py-10 text-center text-sm text-smoke">
                No sessions in this range.
              </p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {history.map((session) => {
                  const warmups = session.sets.filter(
                    (set) => set.kind === 'warmup',
                  )
                  const working = session.sets.filter(
                    (set) => set.kind === 'working',
                  )
                  return (
                    <li key={session.workoutId} className="px-4 py-3.5 sm:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link
                            to="/workouts/$workoutId"
                            params={{
                              workoutId: String(session.workoutId),
                            }}
                            className="text-sm font-medium text-chalk underline-offset-4 hover:text-acid-300 hover:underline"
                          >
                            {formatDate(session.date, 'medium')}
                          </Link>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-smoke">
                            {relativeDate(session.date)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {working.map((set) => (
                            <SetPill
                              key={set.id}
                              set={set}
                              unit={unit}
                              highlight
                            />
                          ))}
                        </div>
                      </div>

                      {warmups.length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-wide text-smoke">
                            Warm-ups
                          </span>
                          {warmups.map((set) => (
                            <SetPill key={set.id} set={set} unit={unit} />
                          ))}
                        </div>
                      ) : null}

                      {session.notes ? (
                        <p className="mt-2 text-xs leading-relaxed text-ash">
                          {session.notes}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function SetPill({
  set,
  unit,
  highlight = false,
}: {
  set: WorkoutSet
  unit: 'kg' | 'lb'
  highlight?: boolean
}) {
  return (
    <span
      className={
        highlight
          ? 'rounded-md border border-acid-400/35 bg-acid-400/10 px-2 py-1 font-mono text-[11px] text-acid-300'
          : 'rounded-md border border-line bg-ink-900 px-2 py-1 font-mono text-[10px] text-ash'
      }
    >
      {set.weightKg === null ? 'BW' : formatWeight(set.weightKg, unit)}
      {set.reps !== null ? ` × ${set.reps}` : ''}
    </span>
  )
}
