import { z } from 'zod'
import { isISODate } from '#/lib/dates'
import { EQUIPMENT, MUSCLE_GROUPS } from '#/lib/types'

export const isoDate = z
  .string()
  .refine(isISODate, { message: 'Use a valid date (YYYY-MM-DD)' })

export const idSchema = z.object({ id: z.number().int().positive() })

export const setSchema = z.object({
  kind: z.enum(['warmup', 'working']),
  position: z.number().int().min(0).max(50),
  weightKg: z.number().finite().min(0).max(2000).nullable(),
  reps: z.number().int().min(1).max(200).nullable(),
})

export const exerciseEntrySchema = z.object({
  exerciseId: z.number().int().positive(),
  position: z.number().int().min(0).max(100),
  supersetGroup: z.number().int().min(1).max(100).nullable(),
  notes: z.string().max(1000).nullable(),
  sets: z.array(setSchema).max(20),
})

export const workoutSaveSchema = z.object({
  id: z.number().int().positive(),
  date: isoDate,
  title: z.string().min(1).max(80),
  status: z.enum(['in_progress', 'completed']),
  notes: z.string().max(3000).nullable(),
  exercises: z.array(exerciseEntrySchema).max(60),
})

export const createWorkoutSchema = z.object({
  date: isoDate,
  status: z.enum(['in_progress', 'completed']),
  templateSlug: z.string().max(60).nullable(),
  title: z.string().max(80).optional(),
})

export const exerciseSchema = z.object({
  name: z.string().min(2).max(80),
  muscleGroup: z.enum(MUSCLE_GROUPS as [string, ...string[]]),
  equipment: z.enum(EQUIPMENT as [string, ...string[]]),
  notes: z.string().max(1000).nullable(),
})

export const updateExerciseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(80),
  muscleGroup: z.enum(MUSCLE_GROUPS as [string, ...string[]]),
  equipment: z.enum(EQUIPMENT as [string, ...string[]]),
  notes: z.string().max(1000).nullable(),
})

export const bodyMetricSchema = z.object({
  date: isoDate,
  weightKg: z.number().finite().min(20).max(500),
  bodyFatPct: z.number().finite().min(1).max(70).nullable(),
  notes: z.string().max(1000).nullable(),
})

export const repeatWorkoutSchema = z.object({
  id: z.number().int().positive(),
  date: isoDate,
})
