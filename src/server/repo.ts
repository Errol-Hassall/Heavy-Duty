import type { DatabaseSync } from 'node:sqlite'
import { getDb } from './db'
import { getProgram } from '#/lib/programs'
import type {
  BodyMetric,
  DashboardData,
  Equipment,
  Exercise,
  ExerciseListItem,
  ExerciseProgress,
  ExerciseSession,
  LastPerformance,
  MuscleGroup,
  WorkoutDetail,
  WorkoutExercise,
  WorkoutListItem,
  WorkoutSaveInput,
  WorkoutSet,
  WorkoutStatus,
} from '#/lib/types'

type Row = Record<string, unknown>

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function bool(value: unknown): boolean {
  return Number(value) === 1
}

function mapExercise(row: Row): Exercise {
  return {
    id: Number(row.id),
    slug: str(row.slug),
    name: str(row.name),
    muscleGroup: str(row.muscle_group) as MuscleGroup,
    equipment: str(row.equipment) as Equipment,
    notes: row.notes === null ? null : str(row.notes),
    isCustom: bool(row.is_custom),
  }
}

function mapSet(row: Row): WorkoutSet {
  return {
    id: Number(row.id),
    kind: str(row.kind) === 'warmup' ? 'warmup' : 'working',
    position: Number(row.position ?? 0),
    weightKg: num(row.weight_kg),
    reps: num(row.reps),
  }
}

function mapBodyMetric(row: Row): BodyMetric {
  return {
    id: Number(row.id),
    date: str(row.date),
    weightKg: Number(row.weight_kg),
    bodyFatPct: num(row.body_fat_pct),
    notes: row.notes === null ? null : str(row.notes),
  }
}

export function listExercises(): ExerciseListItem[] {
  const db = getDb()
  const rows = db
    .prepare(
      `
      SELECT
        e.id, e.slug, e.name, e.muscle_group, e.equipment, e.notes, e.is_custom,
        (
          SELECT COUNT(DISTINCT w.id)
          FROM workout_exercises we
          JOIN workouts w ON w.id = we.workout_id
          WHERE we.exercise_id = e.id AND w.status = 'completed'
        ) AS session_count,
        (
          SELECT MAX(s.weight_kg)
          FROM workout_sets s
          JOIN workout_exercises we ON we.id = s.workout_exercise_id
          JOIN workouts w ON w.id = we.workout_id
          WHERE we.exercise_id = e.id
            AND s.kind = 'working'
            AND w.status = 'completed'
            AND s.reps IS NOT NULL
        ) AS best_weight
      FROM exercises e
      ORDER BY e.muscle_group ASC, e.name COLLATE NOCASE ASC
      `,
    )
    .all() as Row[]

  const latestRows = db
    .prepare(
      `
      SELECT exercise_id, workout_id, date, weight_kg, reps FROM (
        SELECT
          we.exercise_id,
          w.id AS workout_id,
          w.date,
          s.weight_kg,
          s.reps,
          ROW_NUMBER() OVER (
            PARTITION BY we.exercise_id
            ORDER BY w.date DESC, w.id DESC
          ) AS rn
        FROM workout_sets s
        JOIN workout_exercises we ON we.id = s.workout_exercise_id
        JOIN workouts w ON w.id = we.workout_id
        WHERE s.kind = 'working'
          AND w.status = 'completed'
          AND s.reps IS NOT NULL
      )
      WHERE rn = 1
      `,
    )
    .all() as Row[]

  const latestByExercise = new Map<number, LastPerformance>()
  for (const row of latestRows) {
    latestByExercise.set(Number(row.exercise_id), {
      date: str(row.date),
      workoutId: Number(row.workout_id),
      weightKg: num(row.weight_kg),
      reps: num(row.reps),
    })
  }

  return rows.map((row) => {
    const exercise = mapExercise(row)
    return {
      ...exercise,
      sessionCount: Number(row.session_count ?? 0),
      bestWeightKg: num(row.best_weight),
      last: latestByExercise.get(exercise.id) ?? null,
    }
  })
}

export function getExercise(id: number): Exercise | null {
  const row = getDb()
    .prepare('SELECT * FROM exercises WHERE id = ?')
    .get(id) as Row | undefined
  return row ? mapExercise(row) : null
}

export function getExerciseProgress(exerciseId: number): ExerciseProgress | null {
  const exercise = getExercise(exerciseId)
  if (!exercise) return null

  const rows = getDb()
    .prepare(
      `
      SELECT
        w.id AS workout_id,
        w.date,
        s.id, s.kind, s.position, s.weight_kg, s.reps,
        we.notes
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = ?
        AND w.status = 'completed'
        AND (s.weight_kg IS NOT NULL OR s.reps IS NOT NULL)
      ORDER BY w.date ASC, w.id ASC, s.position ASC
      `,
    )
    .all(exerciseId) as Row[]

  const sessionMap = new Map<number, ExerciseSession>()
  for (const row of rows) {
    const workoutId = Number(row.workout_id)
    let session = sessionMap.get(workoutId)
    if (!session) {
      session = {
        workoutId,
        date: str(row.date),
        sets: [],
        notes: row.notes === null ? null : str(row.notes),
      }
      sessionMap.set(workoutId, session)
    }
    session.sets.push(mapSet(row))
  }

  const sessions = [...sessionMap.values()].sort((a, b) => {
    if (a.date === b.date) return a.workoutId - b.workoutId
    return a.date < b.date ? -1 : 1
  })

  let bestWeightKg: number | null = null
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.kind !== 'working' || set.weightKg === null) continue
      if (set.weightKg > (bestWeightKg ?? 0)) bestWeightKg = set.weightKg
    }
  }

  return { exercise, sessions, bestWeightKg }
}

export function listWorkouts(limit?: number): WorkoutListItem[] {
  const db = getDb()
  const rows = db
    .prepare(
      `
      SELECT
        w.id, w.date, w.title, w.status,
        (
          SELECT COUNT(*)
          FROM workout_exercises we
          WHERE we.workout_id = w.id
        ) AS exercise_count,
        (
          SELECT COUNT(*)
          FROM workout_sets s
          JOIN workout_exercises we ON we.id = s.workout_exercise_id
          WHERE we.workout_id = w.id
            AND s.kind = 'working'
            AND s.reps IS NOT NULL
        ) AS working_set_count
      FROM workouts w
      ORDER BY w.date DESC, w.id DESC
      ${limit ? 'LIMIT ?' : ''}
      `,
    )
    .all(...(limit ? [limit] : [])) as Row[]

  const groups = db
    .prepare(
      `
      SELECT we.workout_id, e.muscle_group
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      GROUP BY we.workout_id, e.muscle_group
      `,
    )
    .all() as Row[]

  const groupsByWorkout = new Map<number, MuscleGroup[]>()
  for (const row of groups) {
    const workoutId = Number(row.workout_id)
    const list = groupsByWorkout.get(workoutId) ?? []
    list.push(str(row.muscle_group) as MuscleGroup)
    groupsByWorkout.set(workoutId, list)
  }

  return rows.map((row) => {
    const id = Number(row.id)
    return {
      id,
      date: str(row.date),
      title: str(row.title),
      status: str(row.status) as WorkoutStatus,
      exerciseCount: Number(row.exercise_count ?? 0),
      workingSetCount: Number(row.working_set_count ?? 0),
      muscleGroups: groupsByWorkout.get(id) ?? [],
    }
  })
}

function lastPerformanceFor(
  exerciseId: number,
  workoutId: number,
  date: string,
): LastPerformance | null {
  const row = getDb()
    .prepare(
      `
      SELECT w.id AS workout_id, w.date, s.weight_kg, s.reps
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = ?
        AND s.kind = 'working'
        AND w.status = 'completed'
        AND w.id != ?
        AND (w.date < ? OR (w.date = ? AND w.id < ?))
        AND s.reps IS NOT NULL
      ORDER BY w.date DESC, w.id DESC
      LIMIT 1
      `,
    )
    .get(exerciseId, workoutId, date, date, workoutId) as Row | undefined
  if (!row) return null
  return {
    workoutId: Number(row.workout_id),
    date: str(row.date),
    weightKg: num(row.weight_kg),
    reps: num(row.reps),
  }
}

export function getWorkout(id: number): WorkoutDetail | null {
  const db = getDb()
  const workoutRow = db
    .prepare('SELECT * FROM workouts WHERE id = ?')
    .get(id) as Row | undefined
  if (!workoutRow) return null

  const exerciseRows = db
    .prepare(
      `
      SELECT
        we.id, we.exercise_id, we.position, we.superset_group, we.notes,
        e.slug, e.name, e.muscle_group
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ?
      ORDER BY we.position ASC, we.id ASC
      `,
    )
    .all(id) as Row[]

  const setRows = db
    .prepare(
      `
      SELECT s.*
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s.workout_exercise_id
      WHERE we.workout_id = ?
      ORDER BY s.position ASC, s.id ASC
      `,
    )
    .all(id) as Row[]

  const setsByExercise = new Map<number, WorkoutSet[]>()
  for (const row of setRows) {
    const workoutExerciseId = Number(row.workout_exercise_id)
    const list = setsByExercise.get(workoutExerciseId) ?? []
    list.push(mapSet(row))
    setsByExercise.set(workoutExerciseId, list)
  }

  const exercises: WorkoutExercise[] = exerciseRows.map((row) => {
    const exerciseId = Number(row.exercise_id)
    const workoutExerciseId = Number(row.id)
    const sets = (setsByExercise.get(workoutExerciseId) ?? []).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'warmup' ? -1 : 1
      return a.position - b.position
    })
    return {
      id: workoutExerciseId,
      exerciseId,
      slug: str(row.slug),
      name: str(row.name),
      muscleGroup: str(row.muscle_group) as MuscleGroup,
      position: Number(row.position),
      supersetGroup: num(row.superset_group),
      notes: row.notes === null ? null : str(row.notes),
      sets,
      last: lastPerformanceFor(exerciseId, id, str(workoutRow.date)),
    }
  })

  return {
    id: Number(workoutRow.id),
    date: str(workoutRow.date),
    title: str(workoutRow.title),
    status: str(workoutRow.status) as WorkoutStatus,
    notes: workoutRow.notes === null ? null : str(workoutRow.notes),
    templateSlug:
      workoutRow.template_slug === null ? null : str(workoutRow.template_slug),
    createdAt: str(workoutRow.created_at),
    exercises,
  }
}

export interface CreateWorkoutInput {
  date: string
  status: WorkoutStatus
  templateSlug: string | null
  title?: string
}

interface ExerciseStructure {
  exerciseId: number
  position: number
  supersetGroup: number | null
  notes: string | null
  warmupPositions: number[]
}

/**
 * The latest completed session of this template as a list of exercises to
 * preload. Null when there is nothing to copy (first use, or the previous
 * session was left empty), so the caller falls back to the program's default
 * list.
 */
function latestSessionByTemplate(
  db: DatabaseSync,
  templateSlug: string,
): ExerciseStructure[] | null {
  const row = db
    .prepare(
      `SELECT id FROM workouts
       WHERE status = 'completed' AND template_slug = ?
       ORDER BY date DESC, id DESC
       LIMIT 1`,
    )
    .get(templateSlug) as Row | undefined
  if (!row) return null

  const workoutId = Number(row.id)
  const exerciseRows = db
    .prepare(
      `SELECT we.id, we.exercise_id, we.position, we.superset_group, we.notes
       FROM workout_exercises we
       WHERE we.workout_id = ?
       ORDER BY we.position ASC, we.id ASC`,
    )
    .all(workoutId) as Row[]
  if (exerciseRows.length === 0) return null

  const warmupsByExercise = new Map<number, number[]>()
  const setRows = db
    .prepare(
      `SELECT we.id AS workout_exercise_id, s.position
       FROM workout_sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       WHERE we.workout_id = ? AND s.kind = 'warmup'
       ORDER BY s.position ASC, s.id ASC`,
    )
    .all(workoutId) as Row[]
  for (const setRow of setRows) {
    const key = Number(setRow.workout_exercise_id)
    warmupsByExercise.set(key, [
      ...(warmupsByExercise.get(key) ?? []),
      Number(setRow.position),
    ])
  }

  return exerciseRows.map((exerciseRow) => ({
    exerciseId: Number(exerciseRow.exercise_id),
    position: Number(exerciseRow.position),
    supersetGroup: num(exerciseRow.superset_group),
    notes: exerciseRow.notes === null ? null : str(exerciseRow.notes),
    warmupPositions: warmupsByExercise.get(Number(exerciseRow.id)) ?? [],
  }))
}

function insertExerciseStructure(
  db: DatabaseSync,
  workoutId: number,
  items: ExerciseStructure[],
): void {
  const insertExercise = db.prepare(
    `INSERT INTO workout_exercises (workout_id, exercise_id, position, superset_group, notes)
     VALUES (?, ?, ?, ?, ?)`,
  )
  const insertSet = db.prepare(
    `INSERT INTO workout_sets (workout_exercise_id, kind, position, weight_kg, reps)
     VALUES (?, ?, ?, NULL, NULL)`,
  )
  for (const item of items) {
    const inserted = insertExercise.run(
      workoutId,
      item.exerciseId,
      item.position,
      item.supersetGroup,
      item.notes,
    )
    const workoutExerciseId = Number(inserted.lastInsertRowid)
    for (const position of item.warmupPositions) {
      insertSet.run(workoutExerciseId, 'warmup', position)
    }
    insertSet.run(workoutExerciseId, 'working', 0)
  }
}

export function createWorkout(input: CreateWorkoutInput): number {
  const db = getDb()
  const program = getProgram(input.templateSlug)
  const title = input.title?.trim() || program?.name || 'Custom session'

  // Preload the exercises from the latest completed session of this program;
  // the default list only applies on first use.
  const structure: ExerciseStructure[] = []
  if (program) {
    const previous = latestSessionByTemplate(db, program.slug)
    if (previous) {
      structure.push(...previous)
    } else {
      const findExercise = db.prepare('SELECT id FROM exercises WHERE slug = ?')
      program.exercises.forEach((exercise, index) => {
        const exerciseRow = findExercise.get(exercise.slug) as Row | undefined
        if (!exerciseRow) return
        structure.push({
          exerciseId: Number(exerciseRow.id),
          position: index,
          supersetGroup: exercise.superset ?? null,
          notes: exercise.note ?? null,
          warmupPositions: [],
        })
      })
    }
  }

  db.exec('BEGIN')
  try {
    const result = db
      .prepare(
        `INSERT INTO workouts (date, title, status, template_slug)
         VALUES (?, ?, ?, ?)`,
      )
      .run(input.date, title, input.status, program?.slug ?? null)
    const workoutId = Number(result.lastInsertRowid)

    insertExerciseStructure(db, workoutId, structure)

    db.exec('COMMIT')
    return workoutId
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function repeatWorkout(id: number, date: string): number | null {
  const db = getDb()
  const source = getWorkout(id)
  if (!source) return null

  db.exec('BEGIN')
  try {
    const result = db
      .prepare(
        `INSERT INTO workouts (date, title, status, template_slug, notes)
         VALUES (?, ?, 'in_progress', ?, ?)`,
      )
      .run(date, source.title, source.templateSlug, source.notes)
    const workoutId = Number(result.lastInsertRowid)

    insertExerciseStructure(
      db,
      workoutId,
      source.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        position: exercise.position,
        supersetGroup: exercise.supersetGroup,
        notes: exercise.notes,
        warmupPositions: exercise.sets
          .filter((set) => set.kind === 'warmup')
          .map((set) => set.position),
      })),
    )

    db.exec('COMMIT')
    return workoutId
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function saveWorkout(input: WorkoutSaveInput): void {
  const db = getDb()
  const existing = db
    .prepare('SELECT id, template_slug FROM workouts WHERE id = ?')
    .get(input.id) as Row | undefined
  if (!existing) throw new Error('Workout not found')

  // Normalise superset groups: only groups with at least two exercises survive.
  const groupCounts = new Map<number, number>()
  for (const exercise of input.exercises) {
    if (exercise.supersetGroup === null) continue
    groupCounts.set(
      exercise.supersetGroup,
      (groupCounts.get(exercise.supersetGroup) ?? 0) + 1,
    )
  }
  const groupOrder = new Map<number, number>()
  for (const exercise of input.exercises) {
    const group = exercise.supersetGroup
    if (group !== null && (groupCounts.get(group) ?? 0) > 1) {
      if (!groupOrder.has(group)) groupOrder.set(group, groupOrder.size + 1)
    }
  }

  db.exec('BEGIN')
  try {
    db.prepare(
      `UPDATE workouts
       SET date = ?, title = ?, status = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      input.date,
      input.title.trim() || 'Custom session',
      input.status,
      input.notes?.trim() || null,
      input.id,
    )

    db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(
      input.id,
    )

    const insertExercise = db.prepare(
      `INSERT INTO workout_exercises (workout_id, exercise_id, position, superset_group, notes)
       VALUES (?, ?, ?, ?, ?)`,
    )
    const insertSet = db.prepare(
      `INSERT INTO workout_sets (workout_exercise_id, kind, position, weight_kg, reps)
       VALUES (?, ?, ?, ?, ?)`,
    )

    input.exercises.forEach((exercise, index) => {
      const group =
        exercise.supersetGroup === null
          ? null
          : (groupOrder.get(exercise.supersetGroup) ?? null)
      const inserted = insertExercise.run(
        input.id,
        exercise.exerciseId,
        index,
        group,
        exercise.notes?.trim() || null,
      )
      const workoutExerciseId = Number(inserted.lastInsertRowid)

      const warmups = exercise.sets.filter(
        (set) =>
          set.kind === 'warmup' &&
          (set.weightKg !== null || set.reps !== null),
      )
      const working = exercise.sets.find((set) => set.kind === 'working') ?? {
        kind: 'working' as const,
        position: 0,
        weightKg: null,
        reps: null,
      }

      warmups.forEach((set, warmupIndex) => {
        insertSet.run(
          workoutExerciseId,
          'warmup',
          warmupIndex,
          set.weightKg,
          set.reps,
        )
      })
      insertSet.run(
        workoutExerciseId,
        'working',
        0,
        working.weightKg,
        working.reps,
      )
    })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function deleteWorkout(id: number): void {
  getDb().prepare('DELETE FROM workouts WHERE id = ?').run(id)
}

export function createExercise(input: {
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  notes: string | null
}): Exercise {
  const db = getDb()
  const base = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'exercise'

  let slug = base
  let suffix = 2
  const exists = db.prepare('SELECT 1 FROM exercises WHERE slug = ?')
  while (exists.get(slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  const result = db
    .prepare(
      `INSERT INTO exercises (slug, name, muscle_group, equipment, notes, is_custom)
       VALUES (?, ?, ?, ?, ?, 1)`,
    )
    .run(
      slug,
      input.name.trim(),
      input.muscleGroup,
      input.equipment,
      input.notes?.trim() || null,
    )

  const row = db
    .prepare('SELECT * FROM exercises WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Row
  return mapExercise(row)
}

export function listBodyMetrics(): BodyMetric[] {
  const rows = getDb()
    .prepare('SELECT * FROM body_metrics ORDER BY date ASC, id ASC')
    .all() as Row[]
  return rows.map(mapBodyMetric)
}

export function upsertBodyMetric(input: {
  date: string
  weightKg: number
  bodyFatPct: number | null
  notes: string | null
}): void {
  getDb()
    .prepare(
      `INSERT INTO body_metrics (date, weight_kg, body_fat_pct, notes)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         weight_kg = excluded.weight_kg,
         body_fat_pct = excluded.body_fat_pct,
         notes = excluded.notes`,
    )
    .run(input.date, input.weightKg, input.bodyFatPct, input.notes)
}

export function deleteBodyMetric(id: number): void {
  getDb().prepare('DELETE FROM body_metrics WHERE id = ?').run(id)
}

export function getDashboard(): DashboardData {
  const db = getDb()
  const lastCompletedRow = db
    .prepare(
      `SELECT id, date, title, template_slug
       FROM workouts
       WHERE status = 'completed'
       ORDER BY date DESC, id DESC
       LIMIT 1`,
    )
    .get() as Row | undefined

  const totals = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM workouts WHERE status = 'completed') AS workouts,
        (
          SELECT COUNT(*)
          FROM workout_sets s
          JOIN workout_exercises we ON we.id = s.workout_exercise_id
          JOIN workouts w ON w.id = we.workout_id
          WHERE s.kind = 'working' AND w.status = 'completed' AND s.reps IS NOT NULL
        ) AS working_sets,
        (SELECT COUNT(*) FROM exercises) AS exercises`,
    )
    .get() as Row

  const templateRows = db
    .prepare(
      `
      SELECT template_slug, exercise_count FROM (
        SELECT
          w.template_slug,
          COUNT(we.id) AS exercise_count,
          ROW_NUMBER() OVER (
            PARTITION BY w.template_slug
            ORDER BY w.date DESC, w.id DESC
          ) AS rn
        FROM workouts w
        LEFT JOIN workout_exercises we ON we.workout_id = w.id
        WHERE w.status = 'completed'
          AND w.template_slug IS NOT NULL
        GROUP BY w.id, w.template_slug
      )
      WHERE rn = 1 AND exercise_count > 0
      `,
    )
    .all() as Row[]

  const templateExerciseCounts: Record<string, number> = {}
  for (const row of templateRows) {
    templateExerciseCounts[str(row.template_slug)] = Number(row.exercise_count)
  }

  return {
    recent: listWorkouts(6),
    lastCompleted: lastCompletedRow
      ? {
          id: Number(lastCompletedRow.id),
          date: str(lastCompletedRow.date),
          title: str(lastCompletedRow.title),
          templateSlug:
            lastCompletedRow.template_slug === null
              ? null
              : str(lastCompletedRow.template_slug),
        }
      : null,
    bodyweight: listBodyMetrics(),
    templateExerciseCounts,
    totals: {
      workouts: Number(totals.workouts ?? 0),
      workingSets: Number(totals.working_sets ?? 0),
      exercises: Number(totals.exercises ?? 0),
    },
  }
}
