import { useMemo, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronRight, Dumbbell, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '#/components/ui/page-header'
import { Card } from '#/components/ui/card'
import { Dialog } from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/field'
import { ExerciseForm } from '#/components/exercise-form'
import { listExercisesFn } from '#/server/api'
import { relativeDate } from '#/lib/dates'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '#/lib/labels'
import { MUSCLE_GROUPS } from '#/lib/types'
import type { MuscleGroup } from '#/lib/types'
import { useUnit } from '#/lib/preferences'
import { formatWeight } from '#/lib/units'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/exercises/')({
  loader: () => listExercisesFn(),
  head: () => ({ meta: [{ title: 'Exercises — Heavy Duty' }] }),
  component: ExercisesPage,
})

type Filter = 'all' | MuscleGroup

function ExercisesPage() {
  const exercises = Route.useLoaderData()
  const router = useRouter()
  const unit = useUnit()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return exercises.filter((exercise) => {
      if (filter !== 'all' && exercise.muscleGroup !== filter) return false
      if (!needle) return true
      return (
        exercise.name.toLowerCase().includes(needle) ||
        exercise.equipment.toLowerCase().includes(needle)
      )
    })
  }, [exercises, filter, query])

  const grouped = useMemo(
    () =>
      MUSCLE_GROUPS.map((group) => ({
        group,
        items: filtered.filter((exercise) => exercise.muscleGroup === group),
      })).filter((entry) => entry.items.length > 0),
    [filtered],
  )

  const customCount = exercises.filter((exercise) => exercise.isCustom).length

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Exercises"
        description="Every movement you track. Open one for its full strength history."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New exercise
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or equipment"
            aria-label="Search exercises"
            className="pl-9 pr-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-smoke hover:text-chalk"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="hide-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All · {exercises.length}
          </FilterChip>
          {MUSCLE_GROUPS.map((group) => {
            const count = exercises.filter(
              (exercise) => exercise.muscleGroup === group,
            ).length
            return (
              <FilterChip
                key={group}
                active={filter === group}
                onClick={() => setFilter(group)}
              >
                {MUSCLE_LABELS[group]} · {count}
              </FilterChip>
            )
          })}
        </div>
      </div>

      {customCount > 0 ? (
        <p className="mb-4 text-[10px] uppercase tracking-[0.12em] text-smoke">
          {exercises.length} movements · {customCount} custom
        </p>
      ) : null}

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-900/40 px-6 py-14 text-center">
          <Dumbbell className="mb-3 h-6 w-6 text-smoke" />
          <h2 className="font-display text-lg uppercase tracking-tight">
            No exercises found
          </h2>
          <p className="mt-2 text-sm text-ash">
            Try a different search, or add the movement to your library.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 text-xs font-semibold uppercase tracking-wide text-acid-400 hover:text-acid-300"
          >
            Create an exercise
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-smoke">
                  {MUSCLE_LABELS[group]}
                </h2>
                <span className="font-mono text-[9px] text-smoke">
                  {items.length}
                </span>
              </div>
              <Card className="divide-y divide-line overflow-hidden">
                {items.map((exercise) => (
                  <Link
                    key={exercise.id}
                    to="/exercises/$exerciseId"
                    params={{ exerciseId: String(exercise.id) }}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-800/70 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-chalk">
                          {exercise.name}
                        </span>
                        {exercise.isCustom ? (
                          <span className="rounded border border-line px-1 py-0.5 text-[8px] uppercase tracking-wide text-smoke">
                            Custom
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-smoke">
                        {EQUIPMENT_LABELS[exercise.equipment]} ·{' '}
                        {exercise.sessionCount}{' '}
                        {exercise.sessionCount === 1 ? 'session' : 'sessions'}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {exercise.last ? (
                        <>
                          <p className="font-mono text-xs text-ash">
                            {formatWeight(exercise.last.weightKg, unit)}
                            {exercise.last.reps !== null
                              ? ` × ${exercise.last.reps}`
                              : ''}
                          </p>
                          <p className="mt-0.5 text-[9px] text-smoke">
                            {relativeDate(exercise.last.date)}
                          </p>
                        </>
                      ) : (
                        <span className="text-[9px] uppercase tracking-wide text-smoke">
                          Not logged
                        </span>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-smoke transition-transform group-hover:translate-x-0.5 group-hover:text-ash" />
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.12em] text-smoke">
        Missing a movement?{' '}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="text-acid-400 hover:text-acid-300"
        >
          Add your own
        </button>
      </p>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New exercise"
        description="Custom movements live alongside the Heavy Duty staples."
      >
        <ExerciseForm
          onSaved={async () => {
            setCreateOpen(false)
            await router.invalidate()
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Dialog>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
        active
          ? 'border-acid-400/50 bg-acid-400/10 text-acid-300'
          : 'border-line text-smoke hover:border-line-strong hover:text-ash',
      )}
    >
      {children}
    </button>
  )
}
