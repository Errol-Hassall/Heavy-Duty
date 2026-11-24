import { createServerFn } from '@tanstack/react-start'
import { MUSCLE_GROUPS, EQUIPMENT } from '#/lib/types'
import {
  bodyMetricSchema,
  createWorkoutSchema,
  exerciseSchema,
  idSchema,
  repeatWorkoutSchema,
  updateExerciseSchema,
  workoutSaveSchema,
} from './schemas'
import * as repo from './repo'

export const getDashboardFn = createServerFn({ method: 'GET' }).handler(() =>
  repo.getDashboard(),
)

export const listWorkoutsFn = createServerFn({ method: 'GET' }).handler(() =>
  repo.listWorkouts(),
)

export const listExercisesFn = createServerFn({ method: 'GET' }).handler(() =>
  repo.listExercises(),
)

export const listBodyMetricsFn = createServerFn({ method: 'GET' }).handler(
  () => repo.listBodyMetrics(),
)

export const getWorkoutFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => repo.getWorkout(data.id))

export const getExerciseProgressFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => repo.getExerciseProgress(data.id))

export const createWorkoutFn = createServerFn({ method: 'POST' })
  .validator(createWorkoutSchema)
  .handler(({ data }) => repo.createWorkout(data))

export const repeatWorkoutFn = createServerFn({ method: 'POST' })
  .validator(repeatWorkoutSchema)
  .handler(({ data }) => {
    const id = repo.repeatWorkout(data.id, data.date)
    if (!id) throw new Error('Workout not found')
    return id
  })

export const saveWorkoutFn = createServerFn({ method: 'POST' })
  .validator(workoutSaveSchema)
  .handler(({ data }) => {
    repo.saveWorkout(data)
    return { ok: true as const }
  })

export const deleteWorkoutFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => {
    repo.deleteWorkout(data.id)
    return { ok: true as const }
  })

export const createExerciseFn = createServerFn({ method: 'POST' })
  .validator(exerciseSchema)
  .handler(({ data }) =>
    repo.createExercise({
      name: data.name,
      muscleGroup: data.muscleGroup as (typeof MUSCLE_GROUPS)[number],
      equipment: data.equipment as (typeof EQUIPMENT)[number],
      notes: data.notes,
    }),
  )

export const updateExerciseFn = createServerFn({ method: 'POST' })
  .validator(updateExerciseSchema)
  .handler(({ data }) => {
    const exercise = repo.updateExercise(data.id, {
      name: data.name,
      muscleGroup: data.muscleGroup as (typeof MUSCLE_GROUPS)[number],
      equipment: data.equipment as (typeof EQUIPMENT)[number],
      notes: data.notes,
    })
    if (!exercise) throw new Error('Exercise not found')
    return exercise
  })

export const deleteExerciseFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => {
    repo.deleteExercise(data.id)
    return { ok: true as const }
  })

export const saveBodyMetricFn = createServerFn({ method: 'POST' })
  .validator(bodyMetricSchema)
  .handler(({ data }) => {
    repo.upsertBodyMetric(data)
    return { ok: true as const }
  })

export const deleteBodyMetricFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => {
    repo.deleteBodyMetric(data.id)
    return { ok: true as const }
  })
