import type { Equipment, MuscleGroup } from '#/lib/types'

export interface SeedExercise {
  slug: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  notes?: string
}

export const SEED_EXERCISES: SeedExercise[] = [
  // Chest
  { slug: 'dumbbell-flye', name: 'Dumbbell Flye', muscleGroup: 'chest', equipment: 'dumbbell', notes: 'Slight bend in the elbows. Feel the stretch, do not let the shoulders roll forward.' },
  { slug: 'incline-press', name: 'Incline Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { slug: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { slug: 'flat-bench-press', name: 'Flat Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { slug: 'machine-chest-press', name: 'Machine Chest Press', muscleGroup: 'chest', equipment: 'machine' },
  { slug: 'pec-deck', name: 'Pec Deck', muscleGroup: 'chest', equipment: 'machine' },

  // Back
  { slug: 'machine-pullover', name: 'Machine Pullover', muscleGroup: 'back', equipment: 'machine' },
  { slug: 'close-grip-pulldown', name: 'Close-Grip Underhand Pulldown', muscleGroup: 'back', equipment: 'cable' },
  { slug: 'deadlift', name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell', notes: 'Heavy Duty exception: stop the set when your form breaks. Never grind out a failed rep.' },
  { slug: 'barbell-row', name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell' },
  { slug: 't-bar-row', name: 'T-Bar Row', muscleGroup: 'back', equipment: 'barbell' },
  { slug: 'pull-up', name: 'Pull-Up', muscleGroup: 'back', equipment: 'bodyweight', notes: 'Add weight once you can pass 10 clean reps.' },
  { slug: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
  { slug: 'dumbbell-shrug', name: 'Dumbbell Shrug', muscleGroup: 'back', equipment: 'dumbbell' },

  // Shoulders
  { slug: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', notes: 'Lead with the elbows. Stop when the form breaks, not when the burn starts.' },
  { slug: 'reverse-pec-deck', name: 'Reverse Pec Deck', muscleGroup: 'shoulders', equipment: 'machine' },
  { slug: 'overhead-press', name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell' },
  { slug: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell' },

  // Arms
  { slug: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'arms', equipment: 'barbell' },
  { slug: 'dumbbell-curl', name: 'Dumbbell Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
  { slug: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'arms', equipment: 'barbell' },
  { slug: 'triceps-pressdown', name: 'Triceps Pressdown', muscleGroup: 'arms', equipment: 'cable' },
  { slug: 'overhead-triceps-extension', name: 'Overhead Triceps Extension', muscleGroup: 'arms', equipment: 'cable' },
  { slug: 'close-grip-bench-press', name: 'Close-Grip Bench Press', muscleGroup: 'arms', equipment: 'barbell' },
  { slug: 'triceps-dip', name: 'Triceps Dip', muscleGroup: 'arms', equipment: 'bodyweight' },

  // Legs
  { slug: 'leg-extension', name: 'Leg Extension', muscleGroup: 'legs', equipment: 'machine' },
  { slug: 'leg-press', name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine' },
  { slug: 'squat', name: 'Barbell Squat', muscleGroup: 'legs', equipment: 'barbell' },
  { slug: 'hack-squat', name: 'Hack Squat', muscleGroup: 'legs', equipment: 'machine' },
  { slug: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell' },
  { slug: 'leg-curl', name: 'Lying Leg Curl', muscleGroup: 'legs', equipment: 'machine' },

  // Calves
  { slug: 'standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'machine', notes: 'Pause in the stretch at the bottom. No bouncing.' },
  { slug: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'calves', equipment: 'machine' },

  // Abs
  { slug: 'weighted-decline-situp', name: 'Weighted Decline Sit-Up', muscleGroup: 'abs', equipment: 'bodyweight' },
  { slug: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'abs', equipment: 'bodyweight' },
  { slug: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'abs', equipment: 'cable' },
]
