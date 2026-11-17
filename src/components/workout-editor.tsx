import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  LoaderCircle,
  NotebookPen,
  Plus,
  Repeat2,
  Trash2,
  TriangleAlert,
  Unlink,
  X,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { ConfirmDialog, Dialog } from '#/components/ui/dialog'
import { Input } from '#/components/ui/field'
import { ExercisePicker } from '#/components/exercise-picker'
import { RestTimer } from '#/components/rest-timer'
import {
  deleteWorkoutFn,
  repeatWorkoutFn,
  saveWorkoutFn,
} from '#/server/api'
import { relativeDate, todayISO } from '#/lib/dates'
import { MUSCLE_LABELS, supersetLabels } from '#/lib/labels'
import { useUnit } from '#/lib/preferences'
import { suggestNext } from '#/lib/progression'
import type {
  Exercise,
  ExerciseListItem,
  LastPerformance,
  MuscleGroup,
  SetKind,
  WeightUnit,
  WorkoutDetail,
  WorkoutSaveInput,
  WorkoutStatus,
} from '#/lib/types'
import {
  formatInputWeight,
  formatWeight,
  toDisplayWeight,
  toKg,
  weightStep,
} from '#/lib/units'
import { cn, formatNumber } from '#/lib/utils'

interface DraftSet {
  key: string
  kind: SetKind
  weight: string
  reps: string
}

interface DraftExercise {
  key: string
  exerciseId: number
  slug: string
  name: string
  muscleGroup: MuscleGroup
  supersetGroup: number | null
  notes: string
  notesOpen: boolean
  sets: DraftSet[]
  last: LastPerformance | null
}

interface Draft {
  date: string
  title: string
  status: WorkoutStatus
  notes: string
  notesOpen: boolean
  exercises: DraftExercise[]
}

let keyCounter = 0
function newKey(prefix: string): string {
  keyCounter += 1
  return `${prefix}-${keyCounter}`
}

function toDraft(workout: WorkoutDetail, unit: WeightUnit): Draft {
  return {
    date: workout.date,
    title: workout.title,
    status: workout.status,
    notes: workout.notes ?? '',
    notesOpen: Boolean(workout.notes),
    exercises: workout.exercises.map((exercise) => {
      const working = exercise.sets.find((set) => set.kind === 'working')
      const warmups = exercise.sets.filter((set) => set.kind === 'warmup')
      return {
        key: newKey('exercise'),
        exerciseId: exercise.exerciseId,
        slug: exercise.slug,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        supersetGroup: exercise.supersetGroup,
        notes: exercise.notes ?? '',
        notesOpen: Boolean(exercise.notes),
        last: exercise.last,
        sets: [
          ...warmups.map((set) => ({
            key: newKey('warmup'),
            kind: 'warmup' as const,
            weight: formatInputWeight(set.weightKg, unit),
            reps: set.reps === null ? '' : `${set.reps}`,
          })),
          {
            key: newKey('working'),
            kind: 'working' as const,
            weight: formatInputWeight(working?.weightKg ?? null, unit),
            reps: working?.reps === null || working?.reps === undefined ? '' : `${working.reps}`,
          },
        ],
      }
    }),
  }
}

function convertWeightText(
  text: string,
  from: WeightUnit,
  to: WeightUnit,
): string {
  if (from === to || !text.trim()) return text
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed)) return text
  return formatNumber(toDisplayWeight(toKg(parsed, from), to), 1)
}

function parseWeightKg(text: string, unit: WeightUnit): number | null {
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(toKg(parsed, unit) * 100) / 100
}

function parseReps(text: string): number | null {
  const parsed = Number.parseInt(text, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.min(parsed, 200)
}

function countWorkingSets(draft: Draft): number {
  return draft.exercises.filter((exercise) =>
    exercise.sets.some(
      (set) =>
        set.kind === 'working' &&
        (set.reps.trim() !== '' || set.weight.trim() !== ''),
    ),
  ).length
}

function toPayload(
  draft: Draft,
  unit: WeightUnit,
  statusOverride?: WorkoutStatus,
): WorkoutSaveInput {
  return {
    id: 0,
    date: draft.date,
    title: draft.title.trim() || 'Custom session',
    status: statusOverride ?? draft.status,
    notes: draft.notes.trim() || null,
    exercises: draft.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      position: index,
      supersetGroup: exercise.supersetGroup,
      notes: exercise.notes.trim() || null,
      sets: exercise.sets.map((set, setIndex) => ({
        kind: set.kind,
        position: setIndex,
        weightKg: parseWeightKg(set.weight, unit),
        reps: parseReps(set.reps),
      })),
    })),
  }
}

export function WorkoutEditor({
  workout,
  exercises,
}: {
  workout: WorkoutDetail
  exercises: ExerciseListItem[]
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const unit = useUnit()

  const [draft, setDraft] = useState<Draft>(() => toDraft(workout, unit))
  const draftRef = useRef(draft)
  const unitRef = useRef(unit)
  const prevUnit = useRef(unit)
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>(
    'saved',
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveCount, setSaveCount] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerExercises, setPickerExercises] = useState(exercises)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [repeatBusy, setRepeatBusy] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [savingStream, setSavingStream] = useState(false)
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true))
  const initialRender = useRef(true)
  const saveStateRef = useRef(saveState)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    unitRef.current = unit
  }, [unit])

  useEffect(() => {
    saveStateRef.current = saveState
  }, [saveState])

  const persist = (
    options: { status?: WorkoutStatus; silent?: boolean } = {},
  ): Promise<boolean> => {
    const task = async (): Promise<boolean> => {
      if (!options.silent) setSaveState('saving')
      setSaveError(null)
      const payload = toPayload(
        draftRef.current,
        unitRef.current,
        options.status,
      )
      try {
        await saveWorkoutFn({
          data: { ...payload, id: workout.id },
        })
        setSaveState('saved')
        setSavedAt(new Date())
        setSaveCount((count) => count + 1)
        return true
      } catch (cause) {
        setSaveState('error')
        setSaveError(
          cause instanceof Error ? cause.message : 'Could not save changes.',
        )
        return false
      }
    }
    const next = saveChain.current.then(task, task)
    saveChain.current = next
    return next
  }

  // Debounced auto-save.
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    setSaveState('dirty')
    const timer = window.setTimeout(() => {
      void persist()
    }, 900)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // Flush a pending change if the tab is closed or backgrounded.
  useEffect(() => {
    const flush = () => {
      if (saveStateRef.current === 'dirty' || saveStateRef.current === 'error') {
        void persist({ silent: true })
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => window.removeEventListener('pagehide', flush)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Convert weights in the editor when the unit preference changes.
  useEffect(() => {
    if (prevUnit.current === unit) return
    const from = prevUnit.current
    prevUnit.current = unit
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weight: convertWeightText(set.weight, from, unit),
        })),
      })),
    }))
  }, [unit])

  const labels = useMemo(
    () => supersetLabels(draft.exercises.map((exercise) => exercise.supersetGroup)),
    [draft.exercises],
  )

  const workingSetCount = countWorkingSets(draft)

  const updateExercise = (
    key: string,
    updater: (exercise: DraftExercise) => DraftExercise,
  ) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.key === key ? updater(exercise) : exercise,
      ),
    }))
  }

  const updateSet = (
    exerciseKey: string,
    setKey: string,
    patch: Partial<Pick<DraftSet, 'weight' | 'reps'>>,
  ) => {
    updateExercise(exerciseKey, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.key === setKey ? { ...set, ...patch } : set,
      ),
    }))
  }

  const addWarmup = (exerciseKey: string) => {
    updateExercise(exerciseKey, (exercise) => {
      const workingIndex = exercise.sets.findIndex(
        (set) => set.kind === 'working',
      )
      const next = [...exercise.sets]
      next.splice(workingIndex < 0 ? next.length : workingIndex, 0, {
        key: newKey('warmup'),
        kind: 'warmup',
        weight: '',
        reps: '',
      })
      return { ...exercise, sets: next }
    })
  }

  const removeSet = (exerciseKey: string, setKey: string) => {
    updateExercise(exerciseKey, (exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((set) => set.key !== setKey || set.kind === 'working'),
    }))
  }

  const addExercise = (exercise: Exercise) => {
    const source = pickerExercises.find((item) => item.id === exercise.id)
    if (!source) {
      setPickerExercises((current) => [
        ...current,
        {
          ...exercise,
          sessionCount: 0,
          bestWeightKg: null,
          last: null,
        },
      ])
    }
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          key: newKey('exercise'),
          exerciseId: exercise.id,
          slug: exercise.slug,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          supersetGroup: null,
          notes: exercise.notes ?? '',
          notesOpen: false,
          last: source?.last ?? null,
          sets: [
            {
              key: newKey('working'),
              kind: 'working' as const,
              weight: '',
              reps: '',
            },
          ],
        },
      ],
    }))
  }

  const removeExercise = (key: string) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((exercise) => exercise.key !== key),
    }))
  }

  const moveExercise = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const target = index + direction
      if (target < 0 || target >= current.exercises.length) return current
      const next = [...current.exercises]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...current, exercises: next }
    })
  }

  const linkWithNext = (index: number) => {
    setDraft((current) => {
      const exercise = current.exercises[index]
      const next = current.exercises[index + 1]
      if (!exercise || !next) return current
      const currentGroup = exercise.supersetGroup
      const nextGroup = next.supersetGroup
      const maxGroup = Math.max(
        0,
        ...current.exercises.map((item) => item.supersetGroup ?? 0),
      )
      const group = currentGroup ?? nextGroup ?? maxGroup + 1
      return {
        ...current,
        exercises: current.exercises.map((item) => {
          const inGroup =
            item.key === exercise.key ||
            item.key === next.key ||
            (currentGroup !== null && item.supersetGroup === currentGroup) ||
            (nextGroup !== null && item.supersetGroup === nextGroup)
          return inGroup ? { ...item, supersetGroup: group } : item
        }),
      }
    })
  }

  const unlink = (key: string) => {
    setDraft((current) => {
      const exercise = current.exercises.find((item) => item.key === key)
      if (!exercise || exercise.supersetGroup === null) return current
      const group = exercise.supersetGroup
      const remaining = current.exercises.filter(
        (item) => item.supersetGroup === group && item.key !== key,
      )
      const keepGroup = remaining.length >= 2
      return {
        ...current,
        exercises: current.exercises.map((item) => {
          if (item.supersetGroup !== group) return item
          if (item.key === key) return { ...item, supersetGroup: null }
          return { ...item, supersetGroup: keepGroup ? group : null }
        }),
      }
    })
  }

  const handleFinish = async () => {
    setSavingStream(true)
    const current = draftRef.current
    if (current.status !== 'completed') {
      setDraft((value) => ({ ...value, status: 'completed' }))
      draftRef.current = { ...draftRef.current, status: 'completed' }
    }
    const ok = await persist({ status: 'completed' })
    setSavingStream(false)
    if (ok) {
      setFinishOpen(true)
      await router.invalidate()
    }
  }

  const handleReopen = async () => {
    setDraft((value) => ({ ...value, status: 'in_progress' }))
    draftRef.current = { ...draftRef.current, status: 'in_progress' }
    await persist({ status: 'in_progress' })
    await router.invalidate()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteWorkoutFn({ data: { id: workout.id } })
      await router.invalidate()
      await navigate({ to: '/workouts' })
    } finally {
      setDeleting(false)
    }
  }

  const handleRepeat = async () => {
    setRepeatBusy(true)
    try {
      await persist({ silent: true })
      const id = await repeatWorkoutFn({
        data: { id: workout.id, date: todayISO() },
      })
      await router.invalidate()
      await navigate({
        to: '/workouts/$workoutId',
        params: { workoutId: String(id) },
      })
    } finally {
      setRepeatBusy(false)
    }
  }

  const finishStats = useMemo(() => {
    let sets = 0
    let volumeKg = 0
    let topSet: { weightKg: number | null; reps: number | null } | null = null
    for (const exercise of draft.exercises) {
      for (const set of exercise.sets) {
        if (set.kind !== 'working') continue
        const reps = parseReps(set.reps)
        const weightKg = parseWeightKg(set.weight, unit)
        if (reps === null && weightKg === null) continue
        sets += 1
        if (weightKg !== null && reps !== null) {
          volumeKg += weightKg * reps
          if (!topSet || (topSet.weightKg ?? 0) < weightKg) {
            topSet = { weightKg, reps }
          }
        }
      }
    }
    return { sets, volumeKg, topSet }
  }, [draft, unit])

  return (
    <div className="space-y-4 pb-40">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-smoke transition-colors hover:text-chalk"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Logbook
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRepeat}
            disabled={repeatBusy}
            title="Repeat this session with today's date"
          >
            {repeatBusy ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Repeat2 className="h-3.5 w-3.5" />
            )}
            Repeat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-ember-400/80 hover:bg-ember-500/10 hover:text-ember-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <label className="sr-only" htmlFor="workout-title">
              Workout title
            </label>
            <input
              id="workout-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              onBlur={() => {
                if (!draft.title.trim()) {
                  setDraft((current) => ({
                    ...current,
                    title: 'Custom session',
                  }))
                }
              }}
              maxLength={80}
              className="w-full border-b border-transparent bg-transparent font-display text-[26px] uppercase leading-tight tracking-tight text-chalk outline-none transition-colors placeholder:text-smoke focus:border-line-strong sm:text-3xl"
              placeholder="Session title"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Input
              type="date"
              value={draft.date}
              max={todayISO()}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  date: event.target.value || todayISO(),
                }))
              }
              aria-label="Workout date"
              className="h-9 w-40 py-1 text-xs"
            />
            <Badge tone={draft.status === 'in_progress' ? 'acid' : 'outline'}>
              {draft.status === 'in_progress' ? 'In progress' : 'Completed'}
            </Badge>
            <span className="text-[11px] text-smoke">
              {relativeDate(draft.date)} · {draft.exercises.length}{' '}
              {draft.exercises.length === 1 ? 'exercise' : 'exercises'} ·{' '}
              {workingSetCount} logged
            </span>
            <div className="ml-auto flex items-center gap-2">
              {draft.status === 'completed' ? (
                <button
                  type="button"
                  onClick={handleReopen}
                  className="text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke underline-offset-4 transition-colors hover:text-chalk hover:underline"
                >
                  Reopen session
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    notesOpen: !current.notesOpen,
                  }))
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors',
                  draft.notesOpen
                    ? 'text-acid-300'
                    : 'text-smoke hover:text-chalk',
                )}
                aria-expanded={draft.notesOpen}
              >
                <NotebookPen className="h-3.5 w-3.5" />
                Session notes
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    draft.notesOpen && 'rotate-180',
                  )}
                />
              </button>
            </div>
          </div>

          {draft.notesOpen ? (
            <textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Energy, sleep, aches, gym conditions…"
              maxLength={3000}
              rows={3}
              className="w-full resize-y rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-sm leading-relaxed text-chalk placeholder:text-smoke focus:border-acid-400/70 focus:outline-none focus:ring-2 focus:ring-acid-400/15"
            />
          ) : null}

          <RestTimer />

          {saveState === 'error' ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ember-500/35 bg-ember-500/10 px-3 py-2.5 text-xs text-ember-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{saveError}</span>
              <button
                type="button"
                onClick={() => void persist()}
                className="font-semibold uppercase tracking-wide underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      {draft.exercises.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink-800">
              <Plus className="h-5 w-5 text-smoke" />
            </span>
            <h3 className="font-display text-lg uppercase tracking-tight">
              Empty session
            </h3>
            <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ash">
              Add the first exercise. One working set to failure is all it
              takes.
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add exercise
            </Button>
          </div>
        </Card>
      ) : (
        draft.exercises.map((exercise, index) => {
          const label = labels[index]
          const next = draft.exercises[index + 1]
          const target = suggestNext(exercise.last, unit)
          const groupCount =
            exercise.supersetGroup === null
              ? 0
              : draft.exercises.filter(
                  (item) => item.supersetGroup === exercise.supersetGroup,
                ).length
          return (
            <ExerciseCard
              key={exercise.key}
              exercise={exercise}
              index={index}
              label={label}
              unit={unit}
              target={target}
              groupCount={groupCount}
              canLink={Boolean(next)}
              onChangeSet={(setKey, patch) =>
                updateSet(exercise.key, setKey, patch)
              }
              onAddWarmup={() => addWarmup(exercise.key)}
              onRemoveSet={(setKey) => removeSet(exercise.key, setKey)}
              onUpdate={(updater) => updateExercise(exercise.key, updater)}
              onRemove={() => removeExercise(exercise.key)}
              onMove={(direction) => moveExercise(index, direction)}
              onLink={() => linkWithNext(index)}
              onUnlink={() => unlink(exercise.key)}
              isFirst={index === 0}
              isLast={index === draft.exercises.length - 1}
            />
          )
        })
      )}

      {draft.exercises.length > 0 ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-ink-900/40 px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ash transition-colors hover:border-acid-400/40 hover:text-acid-300"
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </button>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-[248px] md:px-10 md:pb-0">
        <div className="mx-auto flex max-w-5xl items-center gap-2 rounded-xl border border-line bg-ink-850/95 p-2 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setPickerOpen(true)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add exercise</span>
            <span className="sm:hidden">Add</span>
          </Button>

          <div
            data-save-state={saveState}
            data-save-count={saveCount}
            className="ml-1 hidden min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.1em] sm:flex"
          >
            {saveState === 'saving' ? (
              <>
                <LoaderCircle className="h-3 w-3 animate-spin text-smoke" />
                <span className="text-smoke">Saving…</span>
              </>
            ) : saveState === 'error' ? (
              <span className="text-ember-400">Not saved</span>
            ) : saveState === 'dirty' ? (
              <span className="text-smoke">Unsaved changes</span>
            ) : (
              <>
                <Check className="h-3 w-3 text-acid-400" />
                <span className="text-smoke">
                  Saved
                  {savedAt
                    ? ` ${savedAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {draft.status === 'completed' ? (
              <Button
                variant="secondary"
                size="md"
                onClick={handleReopen}
                disabled={savingStream}
              >
                Reopen
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="md"
              onClick={handleFinish}
              disabled={savingStream || draft.status === 'completed'}
              className="min-w-32"
            >
              {savingStream ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {draft.status === 'completed' ? 'Completed' : 'Finish workout'}
            </Button>
          </div>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={pickerExercises}
        addedIds={draft.exercises.map((exercise) => exercise.exerciseId)}
        unit={unit}
        onSelect={addExercise}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this session?"
        description="The workout and all of its sets will be permanently removed from your logbook."
        confirmLabel="Delete session"
        busy={deleting}
      />

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Session logged"
        description="Working sets were taken to failure. Now stay out of the gym and let the stimulus take effect."
        size="sm"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setFinishOpen(false)
                void navigate({ to: '/workouts' })
              }}
            >
              Back to logbook
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setFinishOpen(false)}
            >
              Stay here
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-ink-900/60">
          <div className="px-3 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
              Working sets
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-chalk">
              {finishStats.sets}
            </p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
              Total load
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-chalk">
              {finishStats.volumeKg > 0
                ? formatNumber(
                    toDisplayWeight(finishStats.volumeKg, unit),
                    0,
                  ) +
                  ` ${unit}`
                : '—'}
            </p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
              Top set
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-chalk">
              {finishStats.topSet
                ? `${formatWeight(finishStats.topSet.weightKg, unit)} × ${finishStats.topSet.reps}`
                : '—'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-smoke">
          Mentzer recommended at least 96 hours between sessions. Wait until
          you are fully recovered before the next one.
        </p>
      </Dialog>
    </div>
  )
}

function ExerciseCard({
  exercise,
  index,
  label,
  unit,
  target,
  groupCount,
  canLink,
  onChangeSet,
  onAddWarmup,
  onRemoveSet,
  onUpdate,
  onRemove,
  onMove,
  onLink,
  onUnlink,
  isFirst,
  isLast,
}: {
  exercise: DraftExercise
  index: number
  label: { label: string; isSuperset: boolean }
  unit: WeightUnit
  target: ReturnType<typeof suggestNext>
  groupCount: number
  canLink: boolean
  onChangeSet: (
    setKey: string,
    patch: Partial<Pick<DraftSet, 'weight' | 'reps'>>,
  ) => void
  onAddWarmup: () => void
  onRemoveSet: (setKey: string) => void
  onUpdate: (updater: (exercise: DraftExercise) => DraftExercise) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onLink: () => void
  onUnlink: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const working = exercise.sets.find((set) => set.kind === 'working')
  const warmups = exercise.sets.filter((set) => set.kind === 'warmup')
  const hint = exercise.last
    ? `Last ${formatWeight(exercise.last.weightKg, unit)}${
        exercise.last.reps !== null ? ` × ${exercise.last.reps}` : ''
      } · ${relativeDate(exercise.last.date)}`
    : 'First time logging this movement'

  return (
    <Card
      className={cn(
        'overflow-hidden',
        label.isSuperset && 'border-l-2 border-l-acid-400/60',
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold',
              label.isSuperset
                ? 'border-acid-400/40 bg-acid-400/10 text-acid-300'
                : 'border-line bg-ink-900 text-smoke',
            )}
          >
            {label.label || index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-chalk">
              {exercise.name}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
              <span>{MUSCLE_LABELS[exercise.muscleGroup]}</span>
              {label.isSuperset ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-acid-400/80">
                    Superset {label.label.charAt(0)}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="-mr-1 -mt-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={isFirst}
              aria-label="Move exercise up"
              className="rounded p-1.5 text-smoke transition-colors hover:bg-ink-700 hover:text-chalk disabled:opacity-25"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={isLast}
              aria-label="Move exercise down"
              className="rounded p-1.5 text-smoke transition-colors hover:bg-ink-700 hover:text-chalk disabled:opacity-25"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove exercise"
              className="rounded p-1.5 text-smoke transition-colors hover:bg-ember-500/10 hover:text-ember-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-line/70 bg-ink-900/50 px-2.5 py-1.5">
          <span className="text-[10px] text-smoke">{hint}</span>
          {target.kind === 'load' ? (
            <Badge tone="acid">Add weight</Badge>
          ) : target.kind === 'reps' ? (
            <span className="font-mono text-[10px] text-acid-300">
              Target {formatWeight(target.weightKg, unit)} × {target.reps}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-acid-300">
              Target {target.reps} reps
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {warmups.map((set, warmupIndex) => (
            <SetRow
              key={set.key}
              set={set}
              label={`Warm-up ${warmupIndex + 1}`}
              unit={unit}
              onChange={(patch) => onChangeSet(set.key, patch)}
              onRemove={() => onRemoveSet(set.key)}
            />
          ))}
          {working ? (
            <SetRow
              set={working}
              label="Working set"
              unit={unit}
              working
              targetReps={target.reps}
              targetWeight={formatInputWeight(target.weightKg, unit)}
              onChange={(patch) => onChangeSet(working.key, patch)}
            />
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onAddWarmup}
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke transition-colors hover:text-acid-300"
          >
            <Plus className="h-3 w-3" />
            Warm-up
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate((current) => ({
                ...current,
                notesOpen: !current.notesOpen,
              }))
            }
            aria-expanded={exercise.notesOpen}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors',
              exercise.notesOpen
                ? 'text-acid-300'
                : exercise.notes.trim()
                  ? 'text-ash hover:text-chalk'
                  : 'text-smoke hover:text-chalk',
            )}
          >
            <NotebookPen className="h-3 w-3" />
            Notes
            {exercise.notes.trim() && !exercise.notesOpen ? (
              <span className="h-1 w-1 rounded-full bg-acid-400" />
            ) : null}
          </button>
        </div>

        {exercise.notesOpen ? (
          <textarea
            value={exercise.notes}
            onChange={(event) =>
              onUpdate((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            placeholder="Form cues, seat height, how the set felt…"
            maxLength={1000}
            rows={2}
            className="mt-2 w-full resize-y rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm leading-relaxed text-chalk placeholder:text-smoke focus:border-acid-400/70 focus:outline-none focus:ring-2 focus:ring-acid-400/15"
          />
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <span className="text-[9px] uppercase tracking-[0.1em] text-smoke">
            {label.isSuperset
              ? `Superset · ${groupCount} exercises back-to-back`
              : 'One working set to failure'}
          </span>
          {label.isSuperset ? (
            <button
              type="button"
              onClick={onUnlink}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke transition-colors hover:text-ember-400"
            >
              <Unlink className="h-3 w-3" />
              Unlink
            </button>
          ) : canLink ? (
            <button
              type="button"
              onClick={onLink}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke transition-colors hover:text-acid-300"
            >
              <Link2 className="h-3 w-3" />
              Superset with next
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function SetRow({
  set,
  label,
  unit,
  working = false,
  targetReps,
  targetWeight,
  onChange,
  onRemove,
}: {
  set: DraftSet
  label: string
  unit: WeightUnit
  working?: boolean
  targetReps?: number
  targetWeight?: string
  onChange: (patch: Partial<Pick<DraftSet, 'weight' | 'reps'>>) => void
  onRemove?: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2',
        working
          ? 'border-acid-400/35 bg-acid-400/[0.045]'
          : 'border-line bg-ink-900/60',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[9px] font-semibold uppercase tracking-[0.14em]',
            working ? 'text-acid-300' : 'text-smoke',
          )}
        >
          {label}
          {working ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-smoke">
              · to failure
            </span>
          ) : null}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="rounded p-0.5 text-smoke transition-colors hover:text-ember-400"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            step={weightStep(unit)}
            min={0}
            value={set.weight}
            onChange={(event) => onChange({ weight: event.target.value })}
            placeholder={targetWeight || ''}
            aria-label={`${label} weight in ${unit}`}
            className="h-11 w-full rounded-md border border-line bg-ink-950/70 px-2.5 pr-9 font-mono text-lg tabular-nums text-chalk placeholder:text-smoke/70 focus:border-acid-400/70 focus:outline-none focus:ring-2 focus:ring-acid-400/15"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider text-smoke">
            {unit}
          </span>
        </div>
        <span aria-hidden className="text-xs text-smoke">
          ×
        </span>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            value={set.reps}
            onChange={(event) => onChange({ reps: event.target.value })}
            placeholder={targetReps ? `${targetReps}` : ''}
            aria-label={`${label} reps`}
            className="h-11 w-full rounded-md border border-line bg-ink-950/70 px-2.5 pr-10 font-mono text-lg tabular-nums text-chalk placeholder:text-smoke/70 focus:border-acid-400/70 focus:outline-none focus:ring-2 focus:ring-acid-400/15"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider text-smoke">
            reps
          </span>
        </div>
      </div>
    </div>
  )
}
