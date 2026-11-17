import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  ChartLine,
  ChevronRight,
  Flame,
  Scale,
} from 'lucide-react'
import { BodyweightForm } from '#/components/bodyweight-form'
import { StartWorkoutButton } from '#/components/start-workout-button'
import { TrendChart } from '#/components/trend-chart'
import { Badge } from '#/components/ui/badge'
import { Card, SectionLabel } from '#/components/ui/card'
import { buttonClass } from '#/components/ui/button'
import { WorkoutRow } from '#/components/workout-row'
import { getDashboardFn } from '#/server/api'
import {
  addDaysISO,
  daysSince,
  formatDate,
  formatShortDate,
  relativeDate,
  todayISO,
} from '#/lib/dates'
import { supersetLabels } from '#/lib/labels'
import { nextProgram } from '#/lib/programs'
import { useUnit } from '#/lib/preferences'
import { toDisplayWeight, formatWeight, formatWeightDelta } from '#/lib/units'
import type { BodyMetric, DashboardData } from '#/lib/types'
import { formatNumber } from '#/lib/utils'

export const Route = createFileRoute('/')({
  loader: () => getDashboardFn(),
  head: () => ({ meta: [{ title: 'Today — Heavy Duty' }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()

  return (
    <div className="space-y-4 sm:space-y-5">
      <Hero data={data} />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <TodayCard data={data} />
        <BodyweightCard metrics={data.bodyweight} />
        <RecentCard recent={data.recent} />
        <TipCard />
      </div>
    </div>
  )
}

function Hero({ data }: { data: DashboardData }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-ink-850">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-acid-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
      />
      <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-smoke">
          {formatDate(todayISO(), 'long')}
        </p>
        <h1 className="mt-3 font-display text-[42px] uppercase leading-[0.86] tracking-tight text-chalk sm:text-6xl">
          Train less.
          <br />
          <span className="text-acid-400">Grow more.</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ash">
          One all-out working set per exercise. Long recovery. Beat the
          logbook or do not bother.
        </p>

        <div className="mt-6 grid max-w-md grid-cols-3 divide-x divide-line border-t border-line pt-4">
          <Stat value={data.totals.workouts} label="Sessions" />
          <Stat value={data.totals.workingSets} label="Sets to failure" />
          <Stat value={data.totals.exercises} label="Movements" />
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <p className="font-mono text-xl font-semibold tabular-nums text-chalk">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-smoke">
        {label}
      </p>
    </div>
  )
}

function TodayCard({ data }: { data: DashboardData }) {
  const inProgress = data.recent.find(
    (workout) => workout.status === 'in_progress',
  )
  const program = nextProgram(data.lastCompleted?.templateSlug ?? null)
  const labels = supersetLabels(
    program.exercises.map((exercise) => exercise.superset ?? null),
  )
  const lastDate = data.lastCompleted?.date ?? null
  const days = lastDate ? Math.max(0, daysSince(lastDate)) : null
  const ready = days === null || days >= 4
  const recoveryPct = days === null ? 0 : Math.min(100, (days / 4) * 100)

  return (
    <Card className="overflow-hidden lg:col-span-2">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionLabel>Today’s session</SectionLabel>
            <h2 className="mt-2 font-display text-2xl uppercase leading-tight tracking-tight text-chalk sm:text-3xl">
              {inProgress ? inProgress.title : program.name}
            </h2>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-smoke">
              {inProgress
                ? `Started ${relativeDate(inProgress.date).toLowerCase()}`
                : `${program.day} · ${program.exercises.length} exercises`}
            </p>
          </div>
          {days === null ? (
            <Badge tone="muted">Not started</Badge>
          ) : (
            <Badge tone={ready ? 'acid' : 'ember'}>
              {ready ? 'Recovered' : 'Recovering'}
            </Badge>
          )}
        </div>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
          {inProgress
            ? 'Your session is still open. Log the remaining sets and mark it complete when you are done.'
            : program.tagline}
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <ul className="space-y-1.5">
            {program.exercises.slice(0, 6).map((exercise, index) => {
              const label = labels[index]
              return (
                <li
                  key={exercise.slug}
                  className="flex items-center gap-2.5 text-[13px] text-ash"
                >
                  <span className="w-5 shrink-0 font-mono text-[10px] text-smoke">
                    {label.label || `${index + 1}.`}
                  </span>
                  <span className="truncate">{exercise.name}</span>
                  {label.isSuperset ? (
                    <span className="text-[9px] uppercase tracking-wide text-acid-400/80">
                      superset
                    </span>
                  ) : null}
                </li>
              )
            })}
            {program.exercises.length > 6 ? (
              <li className="pl-[30px] text-[11px] text-smoke">
                + {program.exercises.length - 6} more
              </li>
            ) : null}
          </ul>

          <div className="flex flex-col gap-2 sm:w-48">
            {inProgress ? (
              <Link
                to="/workouts/$workoutId"
                params={{ workoutId: String(inProgress.id) }}
                className={buttonClass('primary', 'lg', 'w-full')}
              >
                Resume session
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <StartWorkoutButton
                templateSlug={program.slug}
                label={`Start ${program.day}`}
                block
              />
            )}
            <Link
              to="/programs"
              className={buttonClass('secondary', 'md', 'w-full')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              All programs
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-smoke">
              Recovery
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-ash">
              {days === null
                ? 'Not started'
                : ready
                  ? '96h window cleared'
                  : `${days} of 4 days`}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
            <div
              className={
                ready
                  ? 'h-full rounded-full bg-acid-400'
                  : 'h-full rounded-full bg-ember-500'
              }
              style={{ width: `${Math.max(recoveryPct, days === null ? 0 : 8)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-smoke">
            {days === null
              ? 'Log your first session to start tracking recovery.'
              : ready
                ? 'At least 96 hours have passed. Train only if you feel fully recovered.'
                : `Mentzer recommended at least 96 hours between sessions. Give it ${4 - days} more ${4 - days === 1 ? 'day' : 'days'}.`}
          </p>
        </div>
      </div>
    </Card>
  )
}

function BodyweightCard({ metrics }: { metrics: BodyMetric[] }) {
  const unit = useUnit()
  const latest = metrics[metrics.length - 1]
  const cutoff = latest ? addDaysISO(latest.date, -30) : null
  const baseline =
    latest && cutoff
      ? ([...metrics].reverse().find((metric) => metric.date <= cutoff) ??
        metrics[0])
      : null
  const delta =
    latest && baseline && baseline.id !== latest.id
      ? latest.weightKg - baseline.weightKg
      : null

  const points = metrics.slice(-10).map((metric) => ({
    x: new Date(`${metric.date}T00:00:00`).getTime(),
    y: toDisplayWeight(metric.weightKg, unit),
    title: formatDate(metric.date, 'short'),
    value: formatWeight(metric.weightKg, unit),
    ariaLabel: `${formatDate(metric.date, 'medium')}: ${formatWeight(metric.weightKg, unit)}`,
  }))

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <SectionLabel>Bodyweight</SectionLabel>
          {latest ? (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tabular-nums text-chalk">
                {formatNumber(toDisplayWeight(latest.weightKg, unit), 1)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-smoke">
                {unit}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ash">No entries yet.</p>
          )}
        </div>
        <Link
          to="/progress"
          className="rounded-md p-1.5 text-smoke transition-colors hover:bg-ink-700 hover:text-chalk"
          aria-label="Open progress"
        >
          <ChartLine className="h-4 w-4" />
        </Link>
      </div>

      <div className="px-3 pt-3">
        {points.length >= 1 ? (
          <TrendChart
            points={points}
            height={120}
            unitLabel={unit}
            formatX={formatShortDate}
            accent="ember"
          />
        ) : (
          <div className="mx-2 flex h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-line text-center">
            <Scale className="mb-2 h-4 w-4 text-smoke" />
            <p className="px-4 text-[11px] leading-relaxed text-smoke">
              Log your weight to see the trend over time.
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-3">
        <div className="mb-3 flex items-center justify-between text-[11px]">
          <span className="text-smoke">
            {latest ? relativeDate(latest.date) : '—'}
          </span>
          {delta !== null ? (
            <span
              className={
                delta > 0
                  ? 'font-mono text-ember-400'
                  : delta < 0
                    ? 'font-mono text-acid-400'
                    : 'font-mono text-smoke'
              }
            >
              {formatWeightDelta(delta, unit)} / 30d
            </span>
          ) : (
            <span className="text-smoke">No 30-day baseline</span>
          )}
        </div>
        <BodyweightForm />
      </div>
    </Card>
  )
}

function RecentCard({ recent }: { recent: DashboardData['recent'] }) {
  return (
    <Card className="overflow-hidden lg:col-span-2">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <SectionLabel>Logbook</SectionLabel>
          <h2 className="mt-1 font-display text-lg uppercase tracking-tight text-chalk">
            Recent sessions
          </h2>
        </div>
        <Link
          to="/workouts"
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ash transition-colors hover:text-acid-400"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="border-t border-line px-5 py-10 text-center">
          <Flame className="mx-auto mb-3 h-5 w-5 text-smoke" />
          <p className="text-sm text-ash">No sessions logged yet.</p>
          <p className="mt-1 text-xs text-smoke">
            Your first workout starts the logbook.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {recent.slice(0, 4).map((workout) => (
            <WorkoutRow key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </Card>
  )
}

function TipCard() {
  return (
    <Card className="border-acid-400/25 bg-[linear-gradient(160deg,rgba(207,247,90,0.12),rgba(207,247,90,0.02))]">
      <div className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-acid-400">
          The Heavy Duty rule
        </p>
        <blockquote className="mt-3 font-display text-base uppercase leading-snug tracking-tight text-chalk">
          “Train hard enough, briefly enough, and infrequently enough.”
        </blockquote>
        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-smoke">
          Mike Mentzer
        </p>
        <Link
          to="/programs"
          className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-acid-300 transition-colors hover:text-acid-200"
        >
          Read the principles
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  )
}
