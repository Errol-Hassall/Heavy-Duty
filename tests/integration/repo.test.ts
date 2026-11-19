import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  WorkoutSaveExerciseInput,
  WorkoutSaveInput,
  WorkoutSaveSetInput,
} from '#/lib/types'

type DbModule = typeof import('#/server/db')
type RepoModule = typeof import('#/server/repo')

let dbModule: DbModule
let repo: RepoModule
let directory: string

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'heavy-duty-repo-'))
  process.env.DATABASE_PATH = join(directory, 'test.db')
  dbModule = await import('#/server/db')
  repo = await import('#/server/repo')
  // Force migrations and seeding before the first assertion.
  dbModule.getDb()
})

afterAll(() => {
  dbModule.closeDb()
  rmSync(directory, { recursive: true, force: true })
})

beforeEach(() => {
  dbModule.getDb().exec(`
    DELETE FROM workouts;
    DELETE FROM body_metrics;
    DELETE FROM exercises WHERE is_custom = 1;
  `)
})

function db() {
  return dbModule.getDb()
}

function countRows(table: string): number {
  const row = db().prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as {
    c: number
  }
  return Number(row.c)
}

function exerciseId(slug: string): number {
  const row = db()
    .prepare('SELECT id FROM exercises WHERE slug = ?')
    .get(slug) as { id: number } | undefined
  if (!row) throw new Error(`Missing seeded exercise: ${slug}`)
  return Number(row.id)
}

function working(weightKg: number | null, reps: number | null): WorkoutSaveSetInput {
  return { kind: 'working', position: 0, weightKg, reps }
}

function warmup(weightKg: number | null, reps: number | null): WorkoutSaveSetInput {
  return { kind: 'warmup', position: 0, weightKg, reps }
}

function entry(
  slug: string,
  sets: WorkoutSaveSetInput[],
  overrides: Partial<WorkoutSaveExerciseInput> = {},
): WorkoutSaveExerciseInput {
  return {
    exerciseId: exerciseId(slug),
    position: 0,
    supersetGroup: null,
    notes: null,
    sets,
    ...overrides,
  }
}

function payload(
  id: number,
  overrides: Partial<WorkoutSaveInput> = {},
): WorkoutSaveInput {
  return {
    id,
    date: '2026-11-18',
    title: 'Test session',
    status: 'completed',
    notes: null,
    exercises: [],
    ...overrides,
  }
}

describe('database bootstrap', () => {
  it('migrates to the current schema', () => {
    const version = db().prepare('PRAGMA user_version').get() as {
      user_version: number
    }
    expect(Number(version.user_version)).toBe(1)

    const tables = db()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>
    for (const table of [
      'exercises',
      'workouts',
      'workout_exercises',
      'workout_sets',
      'body_metrics',
    ]) {
      expect(tables.map((row) => row.name)).toContain(table)
    }
  })

  it('runs in WAL mode with foreign keys enabled', () => {
    const journal = db().prepare('PRAGMA journal_mode').get() as {
      journal_mode: string
    }
    const foreignKeys = db().prepare('PRAGMA foreign_keys').get() as {
      foreign_keys: number
    }
    expect(journal.journal_mode.toLowerCase()).toBe('wal')
    expect(Number(foreignKeys.foreign_keys)).toBe(1)
  })

  it('seeds the library idempotently', () => {
    expect(countRows('exercises')).toBe(36)
    dbModule.closeDb()
    dbModule.getDb()
    expect(countRows('exercises')).toBe(36)
  })
})

describe('createWorkout', () => {
  it('creates a skeleton from a program template', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: 'chest-back',
    })
    const workout = repo.getWorkout(id)!

    expect(workout).toMatchObject({
      id,
      date: '2026-11-18',
      title: 'Chest & Back',
      status: 'in_progress',
      notes: null,
      templateSlug: 'chest-back',
    })
    expect(workout.exercises.map((exercise) => exercise.name)).toEqual([
      'Dumbbell Flye',
      'Incline Bench Press',
      'Machine Pullover',
      'Close-Grip Underhand Pulldown',
      'Deadlift',
    ])
    expect(workout.exercises.map((exercise) => exercise.position)).toEqual([
      0, 1, 2, 3, 4,
    ])
    expect(
      workout.exercises.map((exercise) => exercise.supersetGroup),
    ).toEqual([1, 1, null, null, null])
    expect(workout.exercises[0].notes).toMatch(/Superset/)
    expect(workout.exercises[4].notes).toMatch(/form breaks/)

    for (const exercise of workout.exercises) {
      expect(exercise.sets).toHaveLength(1)
      expect(exercise.sets[0]).toMatchObject({
        kind: 'working',
        weightKg: null,
        reps: null,
      })
      expect(exercise.last).toBeNull()
    }
  })

  it('creates a blank session with a fallback title', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
      title: '   ',
    })
    const workout = repo.getWorkout(id)!
    expect(workout.title).toBe('Custom session')
    expect(workout.templateSlug).toBeNull()
    expect(workout.exercises).toEqual([])
  })

  it('trims a custom title and ignores unknown templates', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: 'not-a-program',
      title: '  Morning session  ',
    })
    const workout = repo.getWorkout(id)!
    expect(workout.title).toBe('Morning session')
    expect(workout.templateSlug).toBeNull()
    expect(workout.exercises).toEqual([])
  })
})

describe('saveWorkout', () => {
  it('persists sets, warm-ups, notes, and normalized supersets', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: null,
    })

    repo.saveWorkout(
      payload(id, {
        title: '   ',
        status: 'completed',
        notes: '  Strong session  ',
        exercises: [
          entry(
            'dumbbell-flye',
            [warmup(40, 10), warmup(null, null), working(60, 8)],
            { position: 0, supersetGroup: 7, notes: '  Elbows tucked  ' },
          ),
          entry('incline-press', [working(70, 9)], {
            position: 1,
            supersetGroup: 7,
          }),
        ],
      }),
    )

    const workout = repo.getWorkout(id)!
    expect(workout.title).toBe('Custom session')
    expect(workout.status).toBe('completed')
    expect(workout.notes).toBe('Strong session')
    expect(workout.exercises).toHaveLength(2)

    const [flye, press] = workout.exercises
    expect(flye.notes).toBe('Elbows tucked')
    expect(flye.supersetGroup).toBe(1)
    expect(press.supersetGroup).toBe(1)
    expect(flye.sets.map((set) => set.kind)).toEqual(['warmup', 'working'])
    expect(flye.sets[0]).toMatchObject({ weightKg: 40, reps: 10 })
    expect(flye.sets[1]).toMatchObject({ weightKg: 60, reps: 8 })
    // An empty warm-up row is discarded.
    expect(press.sets).toHaveLength(1)
    expect(press.sets[0]).toMatchObject({ weightKg: 70, reps: 9 })
  })

  it('drops superset groups with only one member on a later save', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(id, {
        exercises: [entry('dumbbell-flye', [working(60, 8)], { supersetGroup: 5 })],
      }),
    )
    const workout = repo.getWorkout(id)!
    expect(workout.exercises[0].supersetGroup).toBeNull()
  })

  it('keeps exactly one working set per exercise', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(id, {
        exercises: [
          entry('dumbbell-flye', [
            warmup(30, 12),
            working(60, 8),
            working(80, 2),
          ]),
        ],
      }),
    )
    const workout = repo.getWorkout(id)!
    const workingSets = workout.exercises[0].sets.filter(
      (set) => set.kind === 'working',
    )
    expect(workingSets).toHaveLength(1)
    expect(workingSets[0]).toMatchObject({ weightKg: 60, reps: 8 })
    expect(workout.exercises[0].sets).toHaveLength(2)
  })

  it('replaces previous rows instead of appending', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(id, {
        exercises: [entry('dumbbell-flye', [working(60, 8)])],
      }),
    )
    repo.saveWorkout(
      payload(id, {
        date: '2026-11-19',
        exercises: [entry('incline-press', [working(70, 9)])],
      }),
    )
    const workout = repo.getWorkout(id)!
    expect(workout.date).toBe('2026-11-19')
    expect(workout.exercises).toHaveLength(1)
    expect(workout.exercises[0].name).toBe('Incline Bench Press')
  })

  it('throws for a missing workout', () => {
    expect(() => repo.saveWorkout(payload(999_999))).toThrow(/not found/i)
  })
})

describe('last performance', () => {
  it('uses the latest completed session before the current one', () => {
    const older = repo.createWorkout({
      date: '2026-11-10',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(older, {
        date: '2026-11-10',
        exercises: [entry('dumbbell-flye', [working(60, 8)])],
      }),
    )

    const middle = repo.createWorkout({
      date: '2026-11-17',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(middle, {
        date: '2026-11-17',
        exercises: [entry('dumbbell-flye', [working(65, 6)])],
      }),
    )

    const inProgress = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(inProgress, {
        status: 'in_progress',
        exercises: [entry('dumbbell-flye', [working(95, 3)])],
      }),
    )

    const current = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    const exercise = repo
      .getWorkout(current)!
      .exercises.find((item) => item.slug === 'dumbbell-flye')

    // The current workout has no movements yet, so verify against a saved one.
    expect(exercise).toBeUndefined()

    repo.saveWorkout(
      payload(current, {
        exercises: [entry('dumbbell-flye', [working(70, 5)])],
      }),
    )
    const last = repo
      .getWorkout(current)!
      .exercises[0].last
    expect(last).toMatchObject({
      workoutId: middle,
      date: '2026-11-17',
      weightKg: 65,
      reps: 6,
    })
    // The older completed session is ignored in favour of the closer one.
    expect(last?.workoutId).not.toBe(older)
    // In-progress sessions never become "last".
    expect(last?.weightKg).not.toBe(95)
  })

  it('keeps the last performance however long ago it was', () => {
    const old = repo.createWorkout({
      date: '2025-01-15',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(old, {
        date: '2025-01-15',
        exercises: [entry('dumbbell-flye', [working(50, 10)])],
      }),
    )

    const current = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(current, {
        status: 'in_progress',
        exercises: [entry('dumbbell-flye', [working(55, 8)])],
      }),
    )

    const last = repo.getWorkout(current)!.exercises[0].last
    expect(last).toMatchObject({
      workoutId: old,
      date: '2025-01-15',
      weightKg: 50,
      reps: 10,
    })
    expect(last?.workoutId).not.toBe(current)
  })

  it('records a bodyweight performance as the last result', () => {
    const old = repo.createWorkout({
      date: '2026-11-01',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(old, {
        date: '2026-11-01',
        exercises: [entry('pull-up', [working(null, 12)])],
      }),
    )

    const current = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(current, {
        status: 'in_progress',
        exercises: [entry('pull-up', [working(null, 9)])],
      }),
    )

    const last = repo.getWorkout(current)!.exercises[0].last
    expect(last).toMatchObject({
      workoutId: old,
      date: '2026-11-01',
      weightKg: null,
      reps: 12,
    })
  })

  it('includes a same-day session with a lower id', () => {
    const first = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(first, { exercises: [entry('deadlift', [working(100, 5)])] }),
    )
    const second = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(second, { exercises: [entry('deadlift', [working(110, 4)])] }),
    )
    const last = repo.getWorkout(second)!.exercises[0].last
    expect(last).toMatchObject({
      workoutId: first,
      weightKg: 100,
      reps: 5,
    })
  })
})

describe('repeatWorkout', () => {
  it('copies structure and notes but clears the actual loads', () => {
    const source = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: 'chest-back',
    })
    repo.saveWorkout(
      payload(source, {
        notes: 'Good session',
        exercises: [
          entry(
            'dumbbell-flye',
            [warmup(40, 10), working(60, 8)],
            { position: 0, supersetGroup: 1, notes: 'Elbows tucked' },
          ),
          entry('incline-press', [working(70, 9)], {
            position: 1,
            supersetGroup: 1,
          }),
        ],
      }),
    )

    const repeatedId = repo.repeatWorkout(source, '2026-11-20')!
    const repeated = repo.getWorkout(repeatedId)!
    expect(repeated).toMatchObject({
      date: '2026-11-20',
      // The source workout was saved with a custom title, which carries over.
      title: 'Test session',
      status: 'in_progress',
      notes: 'Good session',
      templateSlug: 'chest-back',
    })
    expect(repeated.exercises).toHaveLength(2)
    expect(repeated.exercises[0]).toMatchObject({
      position: 0,
      supersetGroup: 1,
      notes: 'Elbows tucked',
    })
    expect(repeated.exercises[0].sets.map((set) => set.kind)).toEqual([
      'warmup',
      'working',
    ])
    expect(repeated.exercises[0].sets[0]).toMatchObject({
      weightKg: null,
      reps: null,
    })
    expect(repeated.exercises[0].sets[1]).toMatchObject({
      weightKg: null,
      reps: null,
    })

    const original = repo.getWorkout(source)!
    expect(original.status).toBe('completed')
    expect(original.exercises[0].sets[1]).toMatchObject({
      weightKg: 60,
      reps: 8,
    })
  })

  it('returns null for a missing source workout', () => {
    expect(repo.repeatWorkout(999_999, '2026-11-20')).toBeNull()
  })
})

describe('deleteWorkout', () => {
  it('cascades through exercises and sets', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: 'chest-back',
    })
    repo.saveWorkout(
      payload(id, {
        exercises: [
          entry('dumbbell-flye', [warmup(40, 10), working(60, 8)]),
        ],
      }),
    )
    expect(countRows('workouts')).toBe(1)
    expect(countRows('workout_exercises')).toBe(1)
    expect(countRows('workout_sets')).toBe(2)

    repo.deleteWorkout(id)
    expect(repo.getWorkout(id)).toBeNull()
    expect(countRows('workouts')).toBe(0)
    expect(countRows('workout_exercises')).toBe(0)
    expect(countRows('workout_sets')).toBe(0)
  })

  it('is a no-op for a missing workout', () => {
    expect(() => repo.deleteWorkout(999_999)).not.toThrow()
  })
})

describe('workout listings', () => {
  it('orders by date and id, honours the limit, and reports counts', () => {
    const older = repo.createWorkout({
      date: '2026-11-10',
      status: 'completed',
      templateSlug: 'chest-back',
    })
    repo.saveWorkout(
      payload(older, {
        date: '2026-11-10',
        exercises: [
          entry('dumbbell-flye', [working(60, 8)]),
          entry('incline-press', [working(70, 9)]),
        ],
      }),
    )

    const newer = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: 'legs-abs',
    })

    const list = repo.listWorkouts()
    expect(list.map((workout) => workout.id)).toEqual([newer, older])
    expect(list[0]).toMatchObject({
      status: 'in_progress',
      exerciseCount: 5,
      workingSetCount: 0,
    })
    expect(list[1]).toMatchObject({
      status: 'completed',
      exerciseCount: 2,
      workingSetCount: 2,
    })
    expect(list[1].muscleGroups).toEqual(['chest'])
    expect(repo.listWorkouts(1)).toHaveLength(1)
    expect(repo.listWorkouts(1)[0].id).toBe(newer)
  })

  it('counts only working sets with reps', () => {
    const id = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(id, {
        exercises: [
          entry('dumbbell-flye', [working(60, null)]),
          entry('deadlift', [working(null, 5)]),
        ],
      }),
    )
    expect(repo.listWorkouts()[0].workingSetCount).toBe(1)
  })
})

describe('exercise library', () => {
  it('lists the seeded library with stats', () => {
    const exercises = repo.listExercises()
    expect(exercises).toHaveLength(36)
    expect(exercises.every((exercise) => exercise.sessionCount === 0)).toBe(true)
    expect(exercises.every((exercise) => exercise.last === null)).toBe(true)
    expect(exercises.every((exercise) => exercise.bestWeightKg === null)).toBe(
      true,
    )
    expect(repo.getExercise(999_999)).toBeNull()
  })

  it('creates custom exercises and de-duplicates slugs', () => {
    const first = repo.createExercise({
      name: '  Cable Y Raise!!  ',
      muscleGroup: 'shoulders',
      equipment: 'cable',
      notes: '  High pulley  ',
    })
    expect(first).toMatchObject({
      name: 'Cable Y Raise!!',
      slug: 'cable-y-raise',
      muscleGroup: 'shoulders',
      equipment: 'cable',
      notes: 'High pulley',
      isCustom: true,
    })

    const second = repo.createExercise({
      name: 'Cable Y Raise!!',
      muscleGroup: 'shoulders',
      equipment: 'cable',
      notes: null,
    })
    expect(second.slug).toBe('cable-y-raise-2')
    expect(second.id).not.toBe(first.id)
    expect(second.notes).toBeNull()
  })

  it('falls back to a generic slug when the name has no letters', () => {
    const exercise = repo.createExercise({
      name: '!!!',
      muscleGroup: 'arms',
      equipment: 'cable',
      notes: null,
    })
    expect(exercise.slug).toBe('exercise')
  })

  it('aggregates completed sessions, best load, and last performance', () => {
    const first = repo.createWorkout({
      date: '2026-11-10',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(first, {
        date: '2026-11-10',
        exercises: [entry('dumbbell-flye', [working(60, 8)])],
      }),
    )
    const second = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(second, {
        exercises: [entry('dumbbell-flye', [working(65, 6)])],
      }),
    )
    const pending = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(pending, {
        status: 'in_progress',
        exercises: [entry('dumbbell-flye', [working(100, 3)])],
      }),
    )

    const flye = repo
      .listExercises()
      .find((exercise) => exercise.slug === 'dumbbell-flye')!
    expect(flye.sessionCount).toBe(2)
    expect(flye.bestWeightKg).toBe(65)
    expect(flye.last).toMatchObject({
      workoutId: second,
      date: '2026-11-18',
      weightKg: 65,
      reps: 6,
    })
  })

  it('returns progress with ordered sessions and set details', () => {
    const first = repo.createWorkout({
      date: '2026-11-10',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(first, {
        date: '2026-11-10',
        exercises: [
          entry(
            'dumbbell-flye',
            [warmup(40, 10), working(60, 8)],
            { notes: 'Slow eccentric' },
          ),
        ],
      }),
    )
    const second = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: null,
    })
    repo.saveWorkout(
      payload(second, {
        exercises: [entry('dumbbell-flye', [working(65, 6)])],
      }),
    )

    const progress = repo.getExerciseProgress(exerciseId('dumbbell-flye'))!
    expect(progress.exercise.name).toBe('Dumbbell Flye')
    expect(progress.sessions.map((session) => session.date)).toEqual([
      '2026-11-10',
      '2026-11-18',
    ])
    expect(progress.sessions[0].sets.map((set) => set.kind)).toEqual([
      'warmup',
      'working',
    ])
    expect(progress.sessions[0].notes).toBe('Slow eccentric')
    expect(progress.bestWeightKg).toBe(65)
    expect(repo.getExerciseProgress(999_999)).toBeNull()
  })
})

describe('body metrics', () => {
  it('starts empty and inserts entries', () => {
    expect(repo.listBodyMetrics()).toEqual([])
    repo.upsertBodyMetric({
      date: '2026-11-01',
      weightKg: 80,
      bodyFatPct: null,
      notes: null,
    })
    expect(repo.listBodyMetrics()).toHaveLength(1)
    expect(repo.listBodyMetrics()[0]).toMatchObject({
      date: '2026-11-01',
      weightKg: 80,
      bodyFatPct: null,
      notes: null,
    })
  })

  it('upserts one row per date', () => {
    repo.upsertBodyMetric({
      date: '2026-11-18',
      weightKg: 80,
      bodyFatPct: null,
      notes: 'Morning',
    })
    repo.upsertBodyMetric({
      date: '2026-11-18',
      weightKg: 82.5,
      bodyFatPct: 15,
      notes: 'After travel',
    })
    const metrics = repo.listBodyMetrics()
    expect(metrics).toHaveLength(1)
    expect(metrics[0]).toMatchObject({
      weightKg: 82.5,
      bodyFatPct: 15,
      notes: 'After travel',
    })
  })

  it('orders by date and deletes entries', () => {
    repo.upsertBodyMetric({
      date: '2026-11-18',
      weightKg: 82,
      bodyFatPct: null,
      notes: null,
    })
    repo.upsertBodyMetric({
      date: '2026-11-01',
      weightKg: 80,
      bodyFatPct: null,
      notes: null,
    })
    const metrics = repo.listBodyMetrics()
    expect(metrics.map((metric) => metric.date)).toEqual([
      '2026-11-01',
      '2026-11-18',
    ])

    repo.deleteBodyMetric(metrics[0].id)
    expect(repo.listBodyMetrics()).toHaveLength(1)
    expect(() => repo.deleteBodyMetric(999_999)).not.toThrow()
  })
})

describe('dashboard', () => {
  it('reports an empty first-run state', () => {
    const dashboard = repo.getDashboard()
    expect(dashboard.recent).toEqual([])
    expect(dashboard.lastCompleted).toBeNull()
    expect(dashboard.bodyweight).toEqual([])
    expect(dashboard.totals).toEqual({
      workouts: 0,
      workingSets: 0,
      exercises: 36,
    })
  })

  it('aggregates completed work and ignores open sessions', () => {
    const completed = repo.createWorkout({
      date: '2026-11-10',
      status: 'completed',
      templateSlug: 'chest-back',
    })
    repo.saveWorkout(
      payload(completed, {
        date: '2026-11-10',
        exercises: [
          entry('dumbbell-flye', [working(60, 8)]),
          entry('incline-press', [working(70, 9)]),
        ],
      }),
    )
    repo.upsertBodyMetric({
      date: '2026-11-18',
      weightKg: 82.5,
      bodyFatPct: null,
      notes: null,
    })
    const pending = repo.createWorkout({
      date: '2026-11-18',
      status: 'in_progress',
      templateSlug: 'legs-abs',
    })

    const dashboard = repo.getDashboard()
    expect(dashboard.totals).toEqual({
      workouts: 1,
      workingSets: 2,
      exercises: 36,
    })
    expect(dashboard.lastCompleted).toMatchObject({
      id: completed,
      date: '2026-11-10',
      // Saving the workout replaced the program title with the custom one.
      title: 'Test session',
      templateSlug: 'chest-back',
    })
    expect(dashboard.recent.map((workout) => workout.id)).toEqual([
      pending,
      completed,
    ])
    expect(dashboard.bodyweight).toHaveLength(1)
  })

  it('selects the most recent completed workout', () => {
    const older = repo.createWorkout({
      date: '2026-11-01',
      status: 'completed',
      templateSlug: 'chest-back',
    })
    const newer = repo.createWorkout({
      date: '2026-11-18',
      status: 'completed',
      templateSlug: 'legs-abs',
    })
    const dashboard = repo.getDashboard()
    expect(dashboard.lastCompleted?.id).toBe(newer)
    expect(dashboard.lastCompleted?.id).not.toBe(older)
  })

  it('limits the recent list but not the totals', () => {
    for (let index = 0; index < 8; index++) {
      repo.createWorkout({
        date: `2026-11-${String(index + 1).padStart(2, '0')}`,
        status: 'completed',
        templateSlug: null,
      })
    }
    const dashboard = repo.getDashboard()
    expect(dashboard.recent).toHaveLength(6)
    expect(dashboard.totals.workouts).toBe(8)
  })
})
