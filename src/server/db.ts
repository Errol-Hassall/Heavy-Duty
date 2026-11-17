import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SEED_EXERCISES } from './seed-data'

const MIGRATIONS: string[] = [
  `
  CREATE TABLE exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT NOT NULL,
    notes TEXT,
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed'
      CHECK (status IN ('in_progress', 'completed')),
    notes TEXT,
    template_slug TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    position INTEGER NOT NULL,
    superset_group INTEGER,
    notes TEXT
  );

  CREATE TABLE workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('warmup', 'working')),
    position INTEGER NOT NULL DEFAULT 0,
    weight_kg REAL,
    reps INTEGER
  );

  CREATE TABLE body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL,
    body_fat_pct REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_workouts_date ON workouts(date);
  CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
  CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);
  CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);
  `,
]

let database: DatabaseSync | null = null

/** Close the cached connection. Used by tests and graceful shutdown. */
export function closeDb(): void {
  if (!database) return
  database.close()
  database = null
}

function migrate(db: DatabaseSync) {
  const row = db.prepare('PRAGMA user_version').get() as
    | { user_version: number }
    | undefined
  const currentVersion = Number(row?.user_version ?? 0)

  for (let index = currentVersion; index < MIGRATIONS.length; index++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[index])
      db.exec(`PRAGMA user_version = ${index + 1}`)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

function seed(db: DatabaseSync) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO exercises (slug, name, muscle_group, equipment, notes, is_custom)
    VALUES (?, ?, ?, ?, ?, 0)
  `)
  db.exec('BEGIN')
  try {
    for (const exercise of SEED_EXERCISES) {
      insert.run(
        exercise.slug,
        exercise.name,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.notes ?? null,
      )
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function getDb(): DatabaseSync {
  if (database) return database

  const filename = resolve(
    process.env.DATABASE_PATH ?? 'data/heavy-duty.db',
  )
  mkdirSync(dirname(filename), { recursive: true })

  const db = new DatabaseSync(filename)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  migrate(db)
  seed(db)

  database = db
  return db
}
