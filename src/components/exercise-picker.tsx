import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Dialog } from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/field'
import { Badge } from '#/components/ui/badge'
import { CreateExerciseForm } from '#/components/create-exercise-form'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '#/lib/labels'
import { MUSCLE_GROUPS } from '#/lib/types'
import type {
  Exercise,
  ExerciseListItem,
  MuscleGroup,
  WeightUnit,
} from '#/lib/types'
import { formatWeight } from '#/lib/units'
import { formatDate } from '#/lib/dates'
import { cn } from '#/lib/utils'

export function ExercisePicker({
  open,
  onClose,
  exercises,
  addedIds,
  unit,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  exercises: ExerciseListItem[]
  addedIds: number[]
  unit: WeightUnit
  onSelect: (exercise: Exercise) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | MuscleGroup>('all')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setFilter('all')
      setCreating(false)
    }
  }, [open])

  const added = useMemo(() => new Set(addedIds), [addedIds])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return exercises.filter((exercise) => {
      if (filter !== 'all' && exercise.muscleGroup !== filter) return false
      if (!needle) return true
      return (
        exercise.name.toLowerCase().includes(needle) ||
        exercise.equipment.includes(needle)
      )
    })
  }, [exercises, filter, query])

  const select = (exercise: Exercise) => {
    onSelect(exercise)
    onClose()
  }

  const handleCreated = (exercise: Exercise) => {
    select(exercise)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={creating ? 'New exercise' : 'Add exercise'}
      description={
        creating
          ? 'Add a movement that is not in the library yet.'
          : 'Only one working set per exercise. Warm-ups are optional.'
      }
      size="lg"
    >
      {creating ? (
        <CreateExerciseForm
          initialName={query}
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className="space-y-3.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search exercises"
                aria-label="Search exercises"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          <div className="hide-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <FilterChip
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All
            </FilterChip>
            {MUSCLE_GROUPS.map((group) => (
              <FilterChip
                key={group}
                active={filter === group}
                onClick={() => setFilter(group)}
              >
                {MUSCLE_LABELS[group]}
              </FilterChip>
            ))}
          </div>

          <div className="max-h-[52dvh] overflow-y-auto rounded-lg border border-line">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-ash">No exercises match.</p>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="mt-3 text-xs font-semibold uppercase tracking-wide text-acid-400 hover:text-acid-300"
                >
                  Create “{query.trim() || 'new exercise'}”
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((exercise) => {
                  const isAdded = added.has(exercise.id)
                  return (
                    <li key={exercise.id}>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => select(exercise)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors',
                          isAdded
                            ? 'cursor-not-allowed opacity-45'
                            : 'hover:bg-ink-800',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-chalk">
                            {exercise.name}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-smoke">
                            {MUSCLE_LABELS[exercise.muscleGroup]} ·{' '}
                            {EQUIPMENT_LABELS[exercise.equipment]}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {isAdded ? (
                            <Badge tone="muted">Added</Badge>
                          ) : exercise.last ? (
                            <>
                              <p className="font-mono text-[11px] text-ash">
                                {formatWeight(exercise.last.weightKg, unit)}
                                {exercise.last.reps
                                  ? ` × ${exercise.last.reps}`
                                  : ''}
                              </p>
                              <p className="mt-0.5 text-[9px] text-smoke">
                                {formatDate(exercise.last.date, 'short')}
                              </p>
                            </>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wide text-smoke">
                              New
                            </span>
                          )}
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-smoke" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Dialog>
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
