import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { PageHeader } from '#/components/ui/page-header'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/field'
import { StartWorkoutButton } from '#/components/start-workout-button'
import { getDashboardFn } from '#/server/api'
import { PROGRAMS, nextProgram } from '#/lib/programs'
import { MUSCLE_LABELS } from '#/lib/labels'
import { formatDate, todayISO } from '#/lib/dates'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/workouts/new')({
  loader: () => getDashboardFn(),
  head: () => ({ meta: [{ title: 'New workout — Heavy Duty' }] }),
  component: NewWorkoutPage,
})

type Selection = string | 'blank'

function NewWorkoutPage() {
  const data = Route.useLoaderData()
  const suggestion = nextProgram(data.lastCompleted?.templateSlug ?? null)
  const [selected, setSelected] = useState<Selection>(suggestion.slug)
  const [date, setDate] = useState(todayISO())

  const program = PROGRAMS.find((item) => item.slug === selected) ?? null
  const isPast = date < todayISO()
  const exerciseCount = program?.exercises.length ?? 0

  return (
    <div>
      <Link
        to="/workouts"
        className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-smoke transition-colors hover:text-chalk"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Logbook
      </Link>

      <PageHeader
        eyebrow="New session"
        title="Start a workout"
        description="Pick a Heavy Duty program or start from a blank session. Warm-ups stay optional; the working set goes to failure."
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="session-date"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ash"
              >
                Session date
              </label>
              <Input
                id="session-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(event) => setDate(event.target.value || todayISO())}
                className="h-10 w-44 py-1.5 text-sm"
              />
            </div>
            <div className="pb-1">
              <Badge tone={isPast ? 'outline' : 'acid'}>
                {isPast ? 'Backfill · saved complete' : 'Live session'}
              </Badge>
              <p className="mt-1.5 text-[11px] text-smoke">
                {formatDate(date, 'medium')}
              </p>
            </div>
          </div>

          <div className="sm:w-64">
            <StartWorkoutButton
              key={`${selected}-${date}`}
              templateSlug={program?.slug ?? null}
              date={date}
              label={
                program ? `Start ${program.day}` : 'Start blank session'
              }
              block
            />
            <p className="mt-2 text-[10px] leading-relaxed text-smoke">
              {program
                ? `${exerciseCount} exercises loaded. Every working set is one set to failure.`
                : 'You will build the exercise list in the session editor.'}
            </p>
          </div>
        </div>
      </Card>

      <fieldset>
        <legend className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-smoke">
          Choose a program
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROGRAMS.map((item) => {
            const active = selected === item.slug
            const supersetCount = new Set(
              item.exercises
                .map((exercise) => exercise.superset)
                .filter((group) => group !== undefined),
            ).size
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => setSelected(item.slug)}
                aria-pressed={active}
                className={cn(
                  'relative rounded-xl border p-4 text-left transition-colors sm:p-5',
                  active
                    ? 'border-acid-400/60 bg-acid-400/[0.06]'
                    : 'border-line bg-ink-850 hover:border-line-strong hover:bg-ink-800',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        'text-[9px] font-semibold uppercase tracking-[0.16em]',
                        active ? 'text-acid-400' : 'text-smoke',
                      )}
                    >
                      {item.day}
                    </p>
                    <h3 className="mt-1 font-display text-lg uppercase leading-tight tracking-tight text-chalk">
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      active
                        ? 'border-acid-400 bg-acid-400 text-ink-950'
                        : 'border-line-strong text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ash">
                  {item.tagline}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.focus.map((group) => (
                    <span
                      key={group}
                      className="rounded bg-ink-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ash"
                    >
                      {MUSCLE_LABELS[group]}
                    </span>
                  ))}
                </div>
                <p className="mt-3 border-t border-line/70 pt-2.5 text-[10px] text-smoke">
                  {item.exercises.length} exercises
                  {supersetCount > 0
                    ? ` · ${supersetCount} supersets`
                    : ''}
                  {' · '}
                  {item.restDays}
                </p>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setSelected('blank')}
            aria-pressed={selected === 'blank'}
            className={cn(
              'relative rounded-xl border border-dashed p-4 text-left transition-colors sm:p-5',
              selected === 'blank'
                ? 'border-acid-400/60 bg-acid-400/[0.06]'
                : 'border-line bg-ink-900/40 hover:border-line-strong hover:bg-ink-850',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-[0.16em]',
                    selected === 'blank' ? 'text-acid-400' : 'text-smoke',
                  )}
                >
                  Custom
                </p>
                <h3 className="mt-1 font-display text-lg uppercase leading-tight tracking-tight text-chalk">
                  Blank session
                </h3>
              </div>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  selected === 'blank'
                    ? 'border-acid-400 bg-acid-400 text-ink-950'
                    : 'border-line-strong text-transparent',
                )}
              >
                <Plus className="h-3 w-3" />
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ash">
              Build your own exercise list and link movements into supersets as
              you go.
            </p>
            <p className="mt-3 border-t border-line/70 pt-2.5 text-[10px] text-smoke">
              Nothing preloaded
            </p>
          </button>
        </div>
      </fieldset>
    </div>
  )
}
