import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Clock, Flame, Repeat, Target } from 'lucide-react'
import { PageHeader } from '#/components/ui/page-header'
import { Card, SectionLabel } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { StartWorkoutButton } from '#/components/start-workout-button'
import { buttonClass } from '#/components/ui/button'
import { PROGRAMS } from '#/lib/programs'
import { MUSCLE_LABELS, supersetLabels } from '#/lib/labels'

export const Route = createFileRoute('/programs')({
  head: () => ({ meta: [{ title: 'Programs — Heavy Duty' }] }),
  component: ProgramsPage,
})

const PRINCIPLES = [
  {
    icon: Target,
    title: 'One set to failure',
    body: 'A working set only counts when you cannot complete another rep with good form. Warm-ups are optional and never taken to failure.',
  },
  {
    icon: Clock,
    title: '96 hours minimum',
    body: 'Intensity drains recovery reserves. Train a muscle again only after at least four days — often longer when life stress is high.',
  },
  {
    icon: Repeat,
    title: 'Double progression',
    body: 'Start at 6 reps. Add a rep each session until you hit 10, then add 5–10% load and restart at 6. Beat the logbook, not your ego.',
  },
  {
    icon: Flame,
    title: 'No junk volume',
    body: 'One all-out set per exercise, five to seven exercises per session. If you can talk yourself into more, you did not train hard enough.',
  },
]

function ProgramsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="The system"
        title="Heavy Duty programs"
        description="Mike Mentzer’s minimal effective dose: brief, brutal sessions separated by deep recovery. Pick a rotation and repeat it until the numbers stop moving."
      />

      <Card className="mb-4 overflow-hidden border-acid-400/20 bg-[linear-gradient(150deg,rgba(207,247,90,0.1),rgba(207,247,90,0.015))]">
        <div className="p-5 sm:p-6">
          <p className="font-display text-lg uppercase leading-snug tracking-tight text-chalk sm:text-xl">
            “Train hard enough, briefly enough, and infrequently enough.”
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-smoke">
            Mike Mentzer · Heavy Duty
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ash">
            Most people overtrain and under-recover. The goal is not more work
            — it is the precise amount of stimulation needed to trigger growth,
            then enough rest to realise it.
          </p>
        </div>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((principle, index) => (
          <Card key={principle.title}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-ink-900">
                  <principle.icon className="h-4 w-4 text-acid-400" />
                </span>
                <span className="font-mono text-[10px] text-smoke">
                  0{index + 1}
                </span>
              </div>
              <h2 className="mt-3 font-display text-sm uppercase tracking-tight text-chalk">
                {principle.title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ash">
                {principle.body}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {PROGRAMS.map((program) => {
          const labels = supersetLabels(
            program.exercises.map((exercise) => exercise.superset ?? null),
          )
          return (
            <Card key={program.slug} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SectionLabel>{program.day}</SectionLabel>
                    {program.slug === 'full-body' ? (
                      <Badge tone="muted">Beginner</Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-1 font-display text-xl uppercase leading-tight tracking-tight text-chalk">
                    {program.name}
                  </h2>
                  <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-ash">
                    {program.description}
                  </p>
                </div>
                <StartWorkoutButton
                  templateSlug={program.slug}
                  label={`Start ${program.day}`}
                  size="md"
                />
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
                <ol className="space-y-2">
                  {program.exercises.map((exercise, index) => {
                    const label = labels[index]
                    return (
                      <li
                        key={exercise.slug}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={
                            label.isSuperset
                              ? 'mt-0.5 flex h-6 w-7 shrink-0 items-center justify-center rounded border border-acid-400/35 bg-acid-400/10 font-mono text-[9px] text-acid-300'
                              : 'mt-0.5 flex h-6 w-7 shrink-0 items-center justify-center rounded border border-line bg-ink-900 font-mono text-[9px] text-smoke'
                          }
                        >
                          {label.label || index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-chalk">{exercise.name}</p>
                          {exercise.note ? (
                            <p className="mt-0.5 text-[11px] leading-relaxed text-smoke">
                              {exercise.note}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>

                <div className="sm:w-52">
                  <div className="rounded-lg border border-line bg-ink-900/50 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
                      Session structure
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-ash">
                      {program.exercises.length} exercises
                      <br />
                      {program.exercises.filter((exercise) => exercise.superset)
                        .length}{' '}
                      involved in supersets
                    </p>
                    <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-smoke">
                      {program.restDays}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {program.focus.map((group) => (
                        <span
                          key={group}
                          className="rounded bg-ink-800 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-ash"
                        >
                          {MUSCLE_LABELS[group]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-line bg-ink-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-chalk">Not sure where to start?</p>
          <p className="mt-1 text-xs text-ash">
            Pick the full-body routine for your first two weeks, then move to
            the split as recovery allows.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/exercises"
            className={buttonClass('secondary', 'sm')}
          >
            Exercise library
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/workouts/new" className={buttonClass('primary', 'sm')}>
            Start a session
          </Link>
        </div>
      </div>
    </div>
  )
}
