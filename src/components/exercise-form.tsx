import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Field, Input, Select, Textarea } from '#/components/ui/field'
import { createExerciseFn, updateExerciseFn } from '#/server/api'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '#/lib/labels'
import { EQUIPMENT, MUSCLE_GROUPS } from '#/lib/types'
import type { Equipment, Exercise, MuscleGroup } from '#/lib/types'

export function ExerciseForm({
  onSaved,
  onCancel,
  initial,
  initialName = '',
}: {
  onSaved: (exercise: Exercise) => void
  onCancel?: () => void
  /** When set, the form edits this exercise instead of creating one. */
  initial?: Pick<Exercise, 'id' | 'name' | 'muscleGroup' | 'equipment' | 'notes'>
  initialName?: string
}) {
  const editing = initial !== undefined
  const [name, setName] = useState(initial?.name ?? initialName)
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(
    initial?.muscleGroup ?? 'chest',
  )
  const [equipment, setEquipment] = useState<Equipment>(
    initial?.equipment ?? 'barbell',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Give the exercise a name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const exercise = editing
        ? await updateExerciseFn({
            data: {
              id: initial.id,
              name: name.trim(),
              muscleGroup,
              equipment,
              notes: notes.trim() || null,
            },
          })
        : await createExerciseFn({
            data: {
              name: name.trim(),
              muscleGroup,
              equipment,
              notes: notes.trim() || null,
            },
          })
      setName('')
      setNotes('')
      onSaved(exercise)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save the exercise.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Exercise name" htmlFor="exercise-name">
        <Input
          id="exercise-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          placeholder="e.g. Machine Lateral Raise"
          maxLength={80}
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Muscle group" htmlFor="exercise-muscle">
          <Select
            id="exercise-muscle"
            value={muscleGroup}
            onChange={(event) =>
              setMuscleGroup(event.target.value as MuscleGroup)
            }
          >
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {MUSCLE_LABELS[group]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Equipment" htmlFor="exercise-equipment">
          <Select
            id="exercise-equipment"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value as Equipment)}
          >
            {EQUIPMENT.map((item) => (
              <option key={item} value={item}>
                {EQUIPMENT_LABELS[item]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Notes (optional)"
        htmlFor="exercise-notes"
        hint="Form cues or setup details you want to remember."
      >
        <Textarea
          id="exercise-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Seat height 4, neutral grip…"
          maxLength={1000}
          rows={2}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-xs text-ember-400">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {editing ? 'Save changes' : 'Create exercise'}
        </Button>
      </div>
    </form>
  )
}
