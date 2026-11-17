import { describe, expect, it } from 'vitest'
import {
  bodyMetricSchema,
  createWorkoutSchema,
  exerciseSchema,
  idSchema,
  isoDate,
  repeatWorkoutSchema,
  setSchema,
  workoutSaveSchema,
} from '#/server/schemas'

function validWorkout() {
  return {
    id: 1,
    date: '2026-11-18',
    title: 'Chest & Back',
    status: 'completed' as const,
    notes: null,
    exercises: [
      {
        exerciseId: 1,
        position: 0,
        supersetGroup: 1,
        notes: 'Slow eccentric',
        sets: [
          {
            kind: 'warmup' as const,
            position: 0,
            weightKg: 40,
            reps: 10,
          },
          {
            kind: 'working' as const,
            position: 1,
            weightKg: 60,
            reps: 8,
          },
        ],
      },
    ],
  }
}

describe('isoDate', () => {
  it('accepts real ISO dates', () => {
    expect(isoDate.safeParse('2026-11-18').success).toBe(true)
    expect(isoDate.safeParse('2024-02-29').success).toBe(true)
  })

  it('rejects impossible dates and other types', () => {
    expect(isoDate.safeParse('2026-02-29').success).toBe(false)
    expect(isoDate.safeParse('18/11/2026').success).toBe(false)
    expect(isoDate.safeParse(20261118).success).toBe(false)
  })
})

describe('idSchema', () => {
  it('accepts positive integers', () => {
    expect(idSchema.safeParse({ id: 1 }).success).toBe(true)
  })

  it('rejects zero, negatives, and fractions', () => {
    expect(idSchema.safeParse({ id: 0 }).success).toBe(false)
    expect(idSchema.safeParse({ id: -3 }).success).toBe(false)
    expect(idSchema.safeParse({ id: 1.5 }).success).toBe(false)
    expect(idSchema.safeParse({}).success).toBe(false)
  })
})

describe('setSchema', () => {
  const base = {
    kind: 'working',
    position: 0,
    weightKg: 60,
    reps: 8,
  }

  it('accepts a normal working set', () => {
    expect(setSchema.safeParse(base).success).toBe(true)
  })

  it('accepts bodyweight and missing values', () => {
    expect(
      setSchema.safeParse({ ...base, weightKg: null, reps: null }).success,
    ).toBe(true)
  })

  it('accepts the edges of the ranges', () => {
    expect(
      setSchema.safeParse({ ...base, weightKg: 2000, reps: 200 }).success,
    ).toBe(true)
    expect(
      setSchema.safeParse({ ...base, weightKg: 0, reps: 1 }).success,
    ).toBe(true)
  })

  it('rejects out-of-range values and bad kinds', () => {
    expect(setSchema.safeParse({ ...base, weightKg: -1 }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, weightKg: 2001 }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, reps: 0 }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, reps: 201 }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, reps: 7.5 }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, kind: 'drop' }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, position: -1 }).success).toBe(false)
    expect(setSchema.safeParse({ ...base, position: 51 }).success).toBe(false)
  })
})

describe('workoutSaveSchema', () => {
  it('accepts a complete workout', () => {
    expect(workoutSaveSchema.safeParse(validWorkout()).success).toBe(true)
  })

  it('accepts an empty exercise list', () => {
    expect(
      workoutSaveSchema.safeParse({ ...validWorkout(), exercises: [] }).success,
    ).toBe(true)
  })

  it('enforces title and date rules', () => {
    const workout = validWorkout()
    expect(workoutSaveSchema.safeParse({ ...workout, title: '' }).success).toBe(
      false,
    )
    expect(
      workoutSaveSchema.safeParse({ ...workout, title: 'x'.repeat(81) }).success,
    ).toBe(false)
    expect(
      workoutSaveSchema.safeParse({ ...workout, date: '2026-02-30' }).success,
    ).toBe(false)
  })

  it('enforces status and note limits', () => {
    const workout = validWorkout()
    expect(
      workoutSaveSchema.safeParse({ ...workout, status: 'archived' }).success,
    ).toBe(false)
    expect(
      workoutSaveSchema.safeParse({ ...workout, notes: 'x'.repeat(3001) })
        .success,
    ).toBe(false)
    expect(
      workoutSaveSchema.safeParse({ ...workout, notes: null }).success,
    ).toBe(true)
  })

  it('validates nested exercise entries', () => {
    const workout = validWorkout()
    expect(
      workoutSaveSchema.safeParse({
        ...workout,
        exercises: [
          {
            ...workout.exercises[0],
            exerciseId: 0,
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      workoutSaveSchema.safeParse({
        ...workout,
        exercises: [
          {
            ...workout.exercises[0],
            supersetGroup: 0,
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      workoutSaveSchema.safeParse({
        ...workout,
        exercises: [
          {
            ...workout.exercises[0],
            notes: 'x'.repeat(1001),
          },
        ],
      }).success,
    ).toBe(false)
  })
})

describe('createWorkoutSchema', () => {
  it('accepts a program session', () => {
    expect(
      createWorkoutSchema.safeParse({
        date: '2026-11-18',
        status: 'in_progress',
        templateSlug: 'chest-back',
      }).success,
    ).toBe(true)
  })

  it('accepts a blank, custom-titled session', () => {
    expect(
      createWorkoutSchema.safeParse({
        date: '2026-11-18',
        status: 'completed',
        templateSlug: null,
        title: 'Backfill',
      }).success,
    ).toBe(true)
  })

  it('rejects invalid dates and statuses', () => {
    expect(
      createWorkoutSchema.safeParse({
        date: 'not-a-date',
        status: 'in_progress',
        templateSlug: null,
      }).success,
    ).toBe(false)
    expect(
      createWorkoutSchema.safeParse({
        date: '2026-11-18',
        status: 'done',
        templateSlug: null,
      }).success,
    ).toBe(false)
  })
})

describe('exerciseSchema', () => {
  const base = {
    name: 'Cable Y Raise',
    muscleGroup: 'shoulders',
    equipment: 'cable',
    notes: null,
  }

  it('accepts a valid custom exercise', () => {
    expect(exerciseSchema.safeParse(base).success).toBe(true)
  })

  it('enforces name and note lengths', () => {
    expect(exerciseSchema.safeParse({ ...base, name: 'X' }).success).toBe(false)
    expect(
      exerciseSchema.safeParse({ ...base, name: 'x'.repeat(81) }).success,
    ).toBe(false)
    expect(
      exerciseSchema.safeParse({ ...base, notes: 'x'.repeat(1001) }).success,
    ).toBe(false)
  })

  it('rejects unknown muscle groups and equipment', () => {
    expect(
      exerciseSchema.safeParse({ ...base, muscleGroup: 'neck' }).success,
    ).toBe(false)
    expect(
      exerciseSchema.safeParse({ ...base, equipment: 'kettlebell' }).success,
    ).toBe(false)
  })
})

describe('bodyMetricSchema', () => {
  const base = {
    date: '2026-11-18',
    weightKg: 82.5,
    bodyFatPct: null,
    notes: null,
  }

  it('accepts a normal entry', () => {
    expect(bodyMetricSchema.safeParse(base).success).toBe(true)
  })

  it('accepts the weight boundaries', () => {
    expect(bodyMetricSchema.safeParse({ ...base, weightKg: 20 }).success).toBe(
      true,
    )
    expect(bodyMetricSchema.safeParse({ ...base, weightKg: 500 }).success).toBe(
      true,
    )
  })

  it('rejects weights outside 20–500 kg', () => {
    expect(bodyMetricSchema.safeParse({ ...base, weightKg: 19.99 }).success).toBe(
      false,
    )
    expect(bodyMetricSchema.safeParse({ ...base, weightKg: 500.01 }).success).toBe(
      false,
    )
    expect(bodyMetricSchema.safeParse({ ...base, weightKg: Number.NaN }).success).toBe(
      false,
    )
  })

  it('validates body-fat percentages', () => {
    expect(bodyMetricSchema.safeParse({ ...base, bodyFatPct: 1 }).success).toBe(
      true,
    )
    expect(bodyMetricSchema.safeParse({ ...base, bodyFatPct: 70 }).success).toBe(
      true,
    )
    expect(bodyMetricSchema.safeParse({ ...base, bodyFatPct: 0.9 }).success).toBe(
      false,
    )
    expect(bodyMetricSchema.safeParse({ ...base, bodyFatPct: 70.1 }).success).toBe(
      false,
    )
  })
})

describe('repeatWorkoutSchema', () => {
  it('accepts an id and date', () => {
    expect(
      repeatWorkoutSchema.safeParse({ id: 3, date: '2026-11-18' }).success,
    ).toBe(true)
  })

  it('rejects an invalid id or date', () => {
    expect(
      repeatWorkoutSchema.safeParse({ id: 0, date: '2026-11-18' }).success,
    ).toBe(false)
    expect(
      repeatWorkoutSchema.safeParse({ id: 3, date: '2026-11-31' }).success,
    ).toBe(false)
  })
})
