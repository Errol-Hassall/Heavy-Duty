import type { MuscleGroup } from './types'

export interface ProgramExercise {
  slug: string
  name: string
  superset?: number
  note?: string
}

export interface Program {
  slug: string
  day: string
  name: string
  tagline: string
  description: string
  focus: MuscleGroup[]
  restDays: string
  exercises: ProgramExercise[]
}

export const SPLIT_ROTATION = ['chest-back', 'legs-abs', 'shoulders-arms']

export const PROGRAMS: Program[] = [
  {
    slug: 'chest-back',
    day: 'Day 1',
    name: 'Chest & Back',
    tagline: 'Pre-exhaust the chest, then pull heavy.',
    description:
      'Flyes pre-fatigue the pecs so the incline press hits the chest instead of the front delts. Back work follows with one all-out pull before the deadlift.',
    focus: ['chest', 'back'],
    restDays: 'Rest 4–7 days before the next session.',
    exercises: [
      { slug: 'dumbbell-flye', name: 'Dumbbell Flye', superset: 1, note: 'Superset — move straight into the press.' },
      { slug: 'incline-press', name: 'Incline Bench Press', superset: 1 },
      { slug: 'machine-pullover', name: 'Machine Pullover' },
      { slug: 'close-grip-pulldown', name: 'Close-Grip Pulldown' },
      {
        slug: 'deadlift',
        name: 'Deadlift',
        note: 'Stop the set when your form breaks. Do not grind out a failed rep.',
      },
    ],
  },
  {
    slug: 'legs-abs',
    day: 'Day 2',
    name: 'Legs & Abs',
    tagline: 'One brutal set per movement. No junk volume.',
    description:
      'Leg extensions pre-exhaust the quads before the leg press. Calves and abs get the same treatment: one set, taken to genuine failure.',
    focus: ['legs', 'calves', 'abs'],
    restDays: 'Rest 4–7 days before the next session.',
    exercises: [
      { slug: 'leg-extension', name: 'Leg Extension', superset: 1, note: 'Superset — no rest before the press.' },
      { slug: 'leg-press', name: 'Leg Press', superset: 1 },
      { slug: 'leg-curl', name: 'Lying Leg Curl' },
      { slug: 'standing-calf-raise', name: 'Standing Calf Raise' },
      { slug: 'weighted-decline-situp', name: 'Weighted Decline Sit-Up' },
    ],
  },
  {
    slug: 'shoulders-arms',
    day: 'Day 3',
    name: 'Shoulders & Arms',
    tagline: 'Small muscles, full effort.',
    description:
      'Side and rear delts first, then arms. Take every working set to absolute failure with controlled form — the last rep should be a genuine struggle.',
    focus: ['shoulders', 'arms'],
    restDays: 'Rest 4–7 days before the next session.',
    exercises: [
      { slug: 'lateral-raise', name: 'Lateral Raise' },
      { slug: 'reverse-pec-deck', name: 'Reverse Pec Deck' },
      { slug: 'barbell-curl', name: 'Barbell Curl' },
      { slug: 'triceps-pressdown', name: 'Triceps Pressdown' },
      { slug: 'triceps-dip', name: 'Triceps Dip' },
    ],
  },
  {
    slug: 'full-body',
    day: 'Full body',
    name: 'Full Body Starter',
    tagline: 'Learn the movements. Build the habit.',
    description:
      'Mentzer’s full-body routine for beginners or a return to training. Two to three sessions per week, but only when you are fully recovered. Consolidate the list as you adapt.',
    focus: ['legs', 'back', 'chest', 'shoulders', 'arms'],
    restDays: 'Train 2–3 times a week, only when fully recovered.',
    exercises: [
      { slug: 'leg-extension', name: 'Leg Extension', superset: 1 },
      { slug: 'leg-press', name: 'Leg Press', superset: 1 },
      { slug: 'leg-curl', name: 'Lying Leg Curl' },
      { slug: 'standing-calf-raise', name: 'Standing Calf Raise' },
      {
        slug: 'deadlift',
        name: 'Deadlift',
        note: 'Stop the set when your form breaks. Do not take this to absolute failure.',
      },
      { slug: 'barbell-row', name: 'Barbell Row', superset: 2 },
      { slug: 'pull-up', name: 'Pull-Up', superset: 2 },
      { slug: 'dumbbell-flye', name: 'Dumbbell Flye', superset: 3 },
      { slug: 'incline-press', name: 'Incline Bench Press', superset: 3 },
      { slug: 'lateral-raise', name: 'Lateral Raise' },
      { slug: 'barbell-curl', name: 'Barbell Curl' },
      { slug: 'triceps-pressdown', name: 'Triceps Pressdown' },
    ],
  },
]

export function getProgram(slug: string | null | undefined): Program | null {
  if (!slug) return null
  return PROGRAMS.find((program) => program.slug === slug) ?? null
}

/**
 * Suggest the next session in the three-way split. A full-body session keeps
 * you on the full-body routine; the split starts with chest and back.
 */
export function nextProgram(lastTemplateSlug: string | null): Program {
  if (lastTemplateSlug === 'full-body') {
    return getProgram('full-body') ?? PROGRAMS[0]
  }
  const index = SPLIT_ROTATION.indexOf(lastTemplateSlug ?? '')
  if (index === -1) return getProgram(SPLIT_ROTATION[0]) ?? PROGRAMS[0]
  const nextSlug = SPLIT_ROTATION[(index + 1) % SPLIT_ROTATION.length]
  return getProgram(nextSlug) ?? PROGRAMS[0]
}
