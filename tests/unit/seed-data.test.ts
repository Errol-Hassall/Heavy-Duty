import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '#/server/seed-data'
import { EQUIPMENT, MUSCLE_GROUPS } from '#/lib/types'

describe('seed exercise data', () => {
  it('ships the expected library size', () => {
    expect(SEED_EXERCISES).toHaveLength(36)
  })

  it('has unique slugs and names', () => {
    expect(new Set(SEED_EXERCISES.map((exercise) => exercise.slug)).size).toBe(36)
    expect(new Set(SEED_EXERCISES.map((exercise) => exercise.name)).size).toBe(36)
  })

  it.each(SEED_EXERCISES)('$name is complete and valid', (exercise) => {
    expect(exercise.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(exercise.name.trim()).toBe(exercise.name)
    expect(exercise.name.length).toBeGreaterThanOrEqual(2)
    expect(MUSCLE_GROUPS).toContain(exercise.muscleGroup)
    expect(EQUIPMENT).toContain(exercise.equipment)
    if (exercise.notes !== undefined) {
      expect(exercise.notes.trim().length).toBeGreaterThan(0)
    }
  })

  it('covers every muscle group', () => {
    const groups = new Set(SEED_EXERCISES.map((exercise) => exercise.muscleGroup))
    for (const group of MUSCLE_GROUPS) expect(groups.has(group)).toBe(true)
  })
})
