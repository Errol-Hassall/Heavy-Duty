import { TrendChart } from './trend-chart'
import { formatDate, formatShortDate } from '#/lib/dates'
import type { ExerciseSession, WeightUnit } from '#/lib/types'
import { formatWeight, toDisplayWeight } from '#/lib/units'
import { formatNumber } from '#/lib/utils'

function workingSet(session: ExerciseSession) {
  const sets = session.sets.filter(
    (set) => set.kind === 'working' && (set.weightKg !== null || set.reps !== null),
  )
  if (sets.length === 0) return null
  return [...sets].sort((a, b) => {
    const weightDelta = (b.weightKg ?? 0) - (a.weightKg ?? 0)
    if (weightDelta !== 0) return weightDelta
    return (b.reps ?? 0) - (a.reps ?? 0)
  })[0]
}

export function ExerciseTrend({
  sessions,
  unit,
  emptyMessage,
}: {
  sessions: ExerciseSession[]
  unit: WeightUnit
  emptyMessage?: string
}) {
  const withWorking = sessions
    .map((session) => ({ session, working: workingSet(session) }))
    .filter(
      (entry): entry is { session: ExerciseSession; working: NonNullable<ReturnType<typeof workingSet>> } =>
        entry.working !== null,
    )

  const hasLoad = withWorking.some(({ working }) => working.weightKg !== null)

  const points = withWorking.flatMap(({ session, working }) => {
    if (hasLoad && working.weightKg === null) return []
    const y = hasLoad
      ? toDisplayWeight(working.weightKg!, unit)
      : (working.reps ?? 0)
    const reps = working.reps ?? 0
    const warmups = session.sets.filter((set) => set.kind === 'warmup').length
    return [
      {
        x: new Date(`${session.date}T00:00:00`).getTime(),
        y,
        tag: `${reps}`,
        title: formatDate(session.date, 'short'),
        value: hasLoad
          ? formatWeight(working.weightKg, unit)
          : `${reps} reps`,
        details: [
          { label: 'Reps', value: `${reps}` },
          { label: 'Warm-ups', value: `${warmups}` },
        ],
        ariaLabel: `${formatDate(session.date, 'medium')}: ${formatWeight(
          working.weightKg,
          unit,
        )} for ${reps} reps`,
      },
    ]
  })

  return (
    <TrendChart
      points={points}
      height={270}
      unitLabel={hasLoad ? unit : 'reps'}
      formatX={formatShortDate}
      emptyMessage={emptyMessage ?? 'No completed working sets yet.'}
    />
  )
}

export function ExerciseTrendStats({
  sessions,
  unit,
}: {
  sessions: ExerciseSession[]
  unit: WeightUnit
}) {
  const entries = sessions
    .map((session) => ({ session, working: workingSet(session) }))
    .filter((entry) => entry.working !== null)

  const bestWeight = entries.reduce<number | null>((best, entry) => {
    const weight = entry.working?.weightKg
    if (weight === null || weight === undefined) return best
    return best === null || weight > best ? weight : best
  }, null)

  const bestReps = entries.reduce<number | null>((best, entry) => {
    const reps = entry.working?.reps
    if (reps === null || reps === undefined) return best
    return best === null || reps > best ? reps : best
  }, null)

  const last = entries[entries.length - 1]
  const lastDate = last ? last.session.date : null

  return (
    <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
      <div className="px-4 py-3">
        <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-smoke">
          Best load
        </dt>
        <dd className="mt-1 font-mono text-sm font-semibold text-chalk">
          {bestWeight !== null ? formatWeight(bestWeight, unit) : '—'}
        </dd>
      </div>
      <div className="px-4 py-3">
        <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-smoke">
          Best reps
        </dt>
        <dd className="mt-1 font-mono text-sm font-semibold text-chalk">
          {bestReps !== null ? formatNumber(bestReps, 0) : '—'}
        </dd>
      </div>
      <div className="px-4 py-3">
        <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-smoke">
          Sessions
        </dt>
        <dd className="mt-1 font-mono text-sm font-semibold text-chalk">
          {entries.length}
          {lastDate ? (
            <span className="ml-1 text-[9px] font-normal text-smoke">
              · {formatDate(lastDate, 'short')}
            </span>
          ) : null}
        </dd>
      </div>
    </dl>
  )
}
