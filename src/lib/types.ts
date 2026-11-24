export type WeightUnit = 'kg' | 'lb'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'calves'
  | 'abs'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'calves',
  'abs',
]

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
]

export type WorkoutStatus = 'in_progress' | 'completed'

export type SetKind = 'warmup' | 'working'

export interface Exercise {
  id: number
  slug: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  notes: string | null
  isCustom: boolean
}

export interface LastPerformance {
  date: string
  workoutId: number
  weightKg: number | null
  reps: number | null
}

export interface ExerciseListItem extends Exercise {
  sessionCount: number
  bestWeightKg: number | null
  last: LastPerformance | null
}

export interface WorkoutSet {
  id: number
  kind: SetKind
  position: number
  weightKg: number | null
  reps: number | null
}

export interface WorkoutExercise {
  id: number
  exerciseId: number
  slug: string
  name: string
  muscleGroup: MuscleGroup
  position: number
  supersetGroup: number | null
  notes: string | null
  sets: WorkoutSet[]
  last: LastPerformance | null
}

export interface WorkoutDetail {
  id: number
  date: string
  title: string
  status: WorkoutStatus
  notes: string | null
  templateSlug: string | null
  createdAt: string
  exercises: WorkoutExercise[]
}

export interface WorkoutListItem {
  id: number
  date: string
  title: string
  status: WorkoutStatus
  exerciseCount: number
  workingSetCount: number
  muscleGroups: MuscleGroup[]
}

export interface BodyMetric {
  id: number
  date: string
  weightKg: number
  bodyFatPct: number | null
  notes: string | null
}

export interface ExerciseSession {
  workoutId: number
  date: string
  sets: WorkoutSet[]
  notes: string | null
}

export interface ExerciseProgress {
  exercise: Exercise
  sessions: ExerciseSession[]
  bestWeightKg: number | null
}

export interface DashboardData {
  recent: WorkoutListItem[]
  lastCompleted: {
    id: number
    date: string
    title: string
    templateSlug: string | null
  } | null
  bodyweight: BodyMetric[]
  /**
   * Exercise count of the latest completed session per program template.
   * Only templates with a non-empty previous session appear, so consumers
   * fall back to the program's default list otherwise.
   */
  templateExerciseCounts: Record<string, number>
  totals: {
    workouts: number
    workingSets: number
    exercises: number
  }
}

export interface WorkoutSaveSetInput {
  kind: SetKind
  position: number
  weightKg: number | null
  reps: number | null
}

export interface WorkoutSaveExerciseInput {
  exerciseId: number
  position: number
  supersetGroup: number | null
  notes: string | null
  sets: WorkoutSaveSetInput[]
}

export interface WorkoutSaveInput {
  id: number
  date: string
  title: string
  status: WorkoutStatus
  notes: string | null
  exercises: WorkoutSaveExerciseInput[]
}
