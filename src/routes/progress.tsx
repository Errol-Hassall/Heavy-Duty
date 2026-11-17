import { useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  ArrowRight,
  ChartLine,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '#/components/ui/page-header'
import { Card, SectionLabel } from '#/components/ui/card'
import { buttonClass } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/ui/dialog'
import { Select } from '#/components/ui/field'
import { Segmented } from '#/components/ui/segmented'
import { BodyweightForm } from '#/components/bodyweight-form'
import { TrendChart } from '#/components/trend-chart'
import {
  ExerciseTrend,
  ExerciseTrendStats,
} from '#/components/exercise-trend'
import {
  deleteBodyMetricFn,
  getExerciseProgressFn,
  listBodyMetricsFn,
  listExercisesFn,
} from '#/server/api'
import {
  addDaysISO,
  formatDate,
  formatShortDate,
  relativeDate,
  todayISO,
} from '#/lib/dates'
import { useUnit } from '#/lib/preferences'
import {
  formatWeight,
  formatWeightDelta,
  toDisplayWeight,
} from '#/lib/units'
import type { BodyMetric, ExerciseProgress } from '#/lib/types'
import { cn, formatNumber } from '#/lib/utils'

type Range = '3m' | '6m' | '1y' | 'all'

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = {
  '3m': 90,
  '6m': 180,
  '1y': 365,
}

export const Route = createFileRoute('/progress')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { exercise?: number } => {
    const raw = search.exercise
    const parsed =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : Number.NaN
    return Number.isInteger(parsed) && parsed > 0
      ? { exercise: parsed }
      : {}
  },
  loaderDeps: ({ search }) => ({ exercise: search.exercise }),
  loader: async ({ deps }) => {
    const [bodyweight, exercises] = await Promise.all([
      listBodyMetricsFn(),
      listExercisesFn(),
    ])
    const trained = exercises
      .filter((exercise) => exercise.sessionCount > 0)
      .sort((a, b) =>
        (b.last?.date ?? '').localeCompare(a.last?.date ?? ''),
      )
    const selectedId = deps.exercise ?? trained[0]?.id ?? null
    const progress = selectedId
      ? await getExerciseProgressFn({ data: { id: selectedId } })
      : null
    return { bodyweight, exercises, progress, trained }
  },
  head: () => ({ meta: [{ title: 'Progress — Heavy Duty' }] }),
  component: ProgressPage,
})

function ProgressPage() {
  const data = Route.useLoaderData()

  return (
    <div>
      <PageHeader
        eyebrow="Trends"
        title="Progress"
        description="Bodyweight and strength over time. One working set at a time, the numbers tell the truth."
      />

      <div className="space-y-4">
        <BodyweightSection metrics={data.bodyweight} />
        <StrengthSection
          progress={data.progress}
          trained={data.trained}
          exercises={data.exercises}
        />
      </div>
    </div>
  )
}

function BodyweightSection({ metrics }: { metrics: BodyMetric[] }) {
  const router = useRouter()
  const unit = useUnit()
  const [range, setRange] = useState<Range>('all')
  const [deleteTarget, setDeleteTarget] = useState<BodyMetric | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const cutoff =
    range === 'all' ? null : addDaysISO(todayISO(), -RANGE_DAYS[range])
  const filtered = useMemo(
    () =>
      cutoff ? metrics.filter((metric) => metric.date >= cutoff) : metrics,
    [metrics, cutoff],
  )

  const latest = metrics[metrics.length - 1]
  const firstInRange = filtered[0]
  const lastInRange = filtered[filtered.length - 1]
  const change =
    firstInRange && lastInRange && firstInRange.id !== lastInRange.id
      ? lastInRange.weightKg - firstInRange.weightKg
      : null

  const start = metrics[0]
  const totalChange =
    latest && start && latest.id !== start.id
      ? latest.weightKg - start.weightKg
      : null

  const points = filtered.map((metric) => ({
    x: new Date(`${metric.date}T00:00:00`).getTime(),
    y: toDisplayWeight(metric.weightKg, unit),
    title: formatDate(metric.date, 'short'),
    value: formatWeight(metric.weightKg, unit),
    ariaLabel: `${formatDate(metric.date, 'medium')}: ${formatWeight(metric.weightKg, unit)}`,
  }))

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await deleteBodyMetricFn({ data: { id: deleteTarget.id } })
      setDeleteTarget(null)
      await router.invalidate()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div>
          <SectionLabel>Bodyweight</SectionLabel>
          {latest ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-3xl font-semibold tabular-nums text-chalk">
                {formatNumber(toDisplayWeight(latest.weightKg, unit), 1)}
                <span className="ml-1 text-sm font-normal text-smoke">
                  {unit}
                </span>
              </span>
              {change !== null ? (
                <span
                  className={cn(
                    'font-mono text-xs',
                    change > 0
                      ? 'text-ember-400'
                      : change < 0
                        ? 'text-acid-400'
                        : 'text-smoke',
                  )}
                >
                  {formatWeightDelta(change, unit)} this range
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ash">
              Add your bodyweight to start the trend.
            </p>
          )}
          <p className="mt-1 text-[10px] uppercase tracking-wide text-smoke">
            {latest
              ? `Last logged ${relativeDate(latest.date).toLowerCase()}`
              : 'No entries yet'}
          </p>
        </div>
        <Segmented
          ariaLabel="Bodyweight chart range"
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

      <div className="px-2 pb-1 pt-3 sm:px-3">
        {points.length >= 1 ? (
          <TrendChart
            points={points}
            height={280}
            unitLabel={unit}
            formatX={formatShortDate}
            accent="ember"
            emptyMessage="No entries in this range."
          />
        ) : (
          <div className="mx-2 flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-line text-center">
            <Scale className="mb-3 h-5 w-5 text-smoke" />
            <p className="px-6 text-sm text-smoke">
              Weight entries will plot here. Log one below to begin.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-line border-y border-line">
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
            Entries
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-chalk">
            {metrics.length}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
            Starting
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-chalk">
            {start ? formatWeight(start.weightKg, unit) : '—'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
            All-time change
          </p>
          <p
            className={cn(
              'mt-1 font-mono text-sm font-semibold',
              totalChange === null
                ? 'text-chalk'
                : totalChange > 0
                  ? 'text-ember-400'
                  : totalChange < 0
                    ? 'text-acid-400'
                    : 'text-chalk',
            )}
          >
            {totalChange !== null ? formatWeightDelta(totalChange, unit) : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ash">
            Log bodyweight
          </h3>
          <p className="mb-3 mt-1 text-[11px] leading-relaxed text-smoke">
            Weigh in under the same conditions. Trends matter more than single
            readings.
          </p>
          <BodyweightForm withDate />

          {metrics.length > 0 ? (
            <div className="mt-5">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ash">
                Recent entries
              </h3>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {[...metrics]
                  .reverse()
                  .slice(0, 8)
                  .map((metric) => (
                    <li
                      key={metric.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs text-chalk">
                          {formatDate(metric.date, 'medium')}
                        </p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-wide text-smoke">
                          {relativeDate(metric.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ash">
                          {formatWeight(metric.weightKg, unit)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(metric)}
                          aria-label={`Delete bodyweight entry from ${formatDate(metric.date, 'short')}`}
                          className="rounded p-1 text-smoke transition-colors hover:bg-ember-500/10 hover:text-ember-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-line bg-ink-900/40 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ash">
            Reading the trend
          </h3>
          <ul className="mt-3 space-y-3 text-[11px] leading-relaxed text-smoke">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ember-500" />
              Day-to-day fluctuations are noise. Look at the direction over
              weeks.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ember-500" />
              Heavy Duty is not a cut. Recovery depends on eating enough to
              support the training.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ember-500" />
              If bodyweight is stable while lifts climb, recomposition is
              happening.
            </li>
          </ul>
          {latest ? (
            <p className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-smoke">
              30-day change:{' '}
              <span className="font-mono text-ash">
                {(() => {
                  const cutoff = addDaysISO(latest.date, -30)
                  const baseline = [...metrics]
                    .reverse()
                    .find((metric) => metric.date <= cutoff)
                  if (!baseline || baseline.id === latest.id) return '—'
                  return formatWeightDelta(
                    latest.weightKg - baseline.weightKg,
                    unit,
                  )
                })()}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete weight entry?"
        description={
          deleteTarget
            ? `${formatDate(deleteTarget.date, 'medium')} · ${formatWeight(
                deleteTarget.weightKg,
                unit,
              )} will be removed from the trend.`
            : ''
        }
        confirmLabel="Delete entry"
        busy={deleteBusy}
      />
    </Card>
  )
}

function StrengthSection({
  progress,
  trained,
  exercises,
}: {
  progress: ExerciseProgress | null
  trained: Array<{ id: number; name: string }>
  exercises: Array<{ id: number; name: string }>
}) {
  const navigate = useNavigate()
  const unit = useUnit()

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4 sm:flex-row sm:items-end sm:justify-between sm:px-5 sm:pt-5">
        <div>
          <SectionLabel>Exercise strength</SectionLabel>
          <h2 className="mt-1 font-display text-lg uppercase tracking-tight">
            Working-set load
          </h2>
        </div>
        {trained.length > 0 ? (
          <div className="w-full sm:w-64">
            <label htmlFor="exercise-select" className="sr-only">
              Exercise
            </label>
            <Select
              id="exercise-select"
              value={progress ? String(progress.exercise.id) : ''}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isInteger(value) || value <= 0) return
                void navigate({
                  to: '/progress',
                  search: { exercise: value },
                  replace: true,
                })
              }}
              className="h-10 py-1.5 text-sm"
            >
              {trained.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {progress ? (
        <>
          <div className="px-2 pb-2 pt-1 sm:px-3">
            <ExerciseTrend sessions={progress.sessions} unit={unit} />
          </div>
          <ExerciseTrendStats sessions={progress.sessions} unit={unit} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
            <p className="text-[10px] leading-relaxed text-smoke">
              Hover or tap a point for reps and warm-up count.
            </p>
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: String(progress.exercise.id) }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-acid-300 transition-colors hover:text-acid-200"
            >
              Full history
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </>
      ) : (
        <div className="mx-4 mb-4 flex flex-col items-center rounded-lg border border-dashed border-line px-5 py-12 text-center sm:mx-5">
          <ChartLine className="mb-3 h-5 w-5 text-smoke" />
          <p className="text-sm text-ash">
            {exercises.length === 0
              ? 'No exercises in the library.'
              : 'Log a working set to unlock exercise trends.'}
          </p>
          <Link
            to={exercises.length === 0 ? '/exercises' : '/workouts/new'}
            className={buttonClass('secondary', 'sm', 'mt-4')}
          >
            {exercises.length === 0 ? 'Open exercise library' : 'Start a workout'}
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </Card>
  )
}
